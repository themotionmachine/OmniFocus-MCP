#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  DANGEROUS_GRANT_SSH_SIGNATURE_NAMESPACE,
  createDangerousGrantToken,
  createExactDangerousGrantClaims,
  createSshSignatureDangerousGrantToken,
  inspectDangerousGrantPrivateKey,
  inspectDangerousGrantPublicKey,
  resetDangerousGrantReplayCache,
  validateDangerousGrant,
} from './tools/dangerousGrant.js';

type CliOptions = {
  tool?: string;
  argsJson?: string;
  privateKeyPath?: string;
  privateKeyEnv?: string;
  privateKeyRef?: string;
  sshSigningKeyPath?: string;
  sshSigningKeyEnv?: string;
  sshSigningKeyRef?: string;
  publicKeyPath?: string;
  publicKeyEnv?: string;
  publicKeyRef?: string;
  sshAuthSock?: string;
  expiresInSeconds: number;
  reason?: string;
  command: 'create' | 'doctor';
  signer?: 'jwt' | 'ssh-signature';
};

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  if (options.command === 'doctor') {
    runDoctor(options);
    return;
  }

  if (!options.tool || !options.argsJson) {
    fail('Usage: omnifocus-mcp-grant --tool <name> --args-json <json> [(--private-key-ref <op-ref> | --private-key-path <path> | --private-key-env <env>) | --signer ssh-signature (--ssh-signing-key-ref <op-ref> | --ssh-signing-key-path <path> | --ssh-signing-key-env <env>)] [--reason <text>] [--expires-in <seconds>]');
  }

  const args = parseJsonObject(options.argsJson);
  const claims = createExactDangerousGrantClaims({
    toolName: options.tool,
    args,
    expiresInSeconds: options.expiresInSeconds,
    reason: options.reason,
  });

  const signer = selectedSigner(options);
  if (signer === 'jwt') {
    const privateKey = readPrivateKey(options);
    process.stdout.write(`${createDangerousGrantToken(claims, privateKey)}\n`);
    return;
  }

  const signingKey = resolveSshSigningKeyPath(options);
  try {
    process.stdout.write(`${createSshSignatureDangerousGrantToken(claims, signingKey.path, options.sshAuthSock)}\n`);
  } finally {
    signingKey.cleanup();
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    command: 'create',
    expiresInSeconds: 300,
  };

  if (argv[0] === 'doctor') {
    options.command = 'doctor';
    argv = argv.slice(1);
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value) {
        fail(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    switch (arg) {
      case '--tool':
        options.tool = next();
        break;
      case '--args-json':
        options.argsJson = next();
        break;
      case '--private-key-path':
        options.privateKeyPath = next();
        break;
      case '--private-key-env':
        options.privateKeyEnv = next();
        break;
      case '--private-key-ref':
        options.privateKeyRef = next();
        break;
      case '--ssh-signing-key-path':
        options.sshSigningKeyPath = next();
        break;
      case '--ssh-signing-key-env':
        options.sshSigningKeyEnv = next();
        break;
      case '--ssh-signing-key-ref':
        options.sshSigningKeyRef = next();
        break;
      case '--public-key-path':
        options.publicKeyPath = next();
        break;
      case '--public-key-env':
        options.publicKeyEnv = next();
        break;
      case '--public-key-ref':
        options.publicKeyRef = next();
        break;
      case '--ssh-auth-sock':
        options.sshAuthSock = next();
        break;
      case '--expires-in':
        options.expiresInSeconds = Number(next());
        if (!Number.isInteger(options.expiresInSeconds) || options.expiresInSeconds <= 0) {
          fail('--expires-in must be a positive integer.');
        }
        break;
      case '--reason':
        options.reason = next();
        break;
      case '--signer': {
        const value = next();
        if (value !== 'jwt' && value !== 'ssh-signature') {
          fail('--signer must be "jwt" or "ssh-signature".');
        }
        options.signer = value;
        break;
      }
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        fail(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function runDoctor(options: CliOptions): void {
  const privateSourceCount = countKeySources(options.privateKeyPath, options.privateKeyEnv, options.privateKeyRef);
  const sshSigningSourceCount = countKeySources(options.sshSigningKeyPath, options.sshSigningKeyEnv, options.sshSigningKeyRef);
  const publicSourceCount = countKeySources(options.publicKeyPath, options.publicKeyEnv, options.publicKeyRef);
  const hasPrivate = privateSourceCount === 1;
  const hasSshSigningKey = sshSigningSourceCount === 1;
  const hasPublic = publicSourceCount === 1;

  if (privateSourceCount > 1) {
    fail('Specify at most one private key source: --private-key-ref, --private-key-path, or --private-key-env.');
  }
  if (sshSigningSourceCount > 1) {
    fail('Specify at most one SSH signing key source: --ssh-signing-key-ref, --ssh-signing-key-path, or --ssh-signing-key-env.');
  }
  if (hasPrivate && hasSshSigningKey) {
    fail('Specify either a JWT private key source or an SSH signing key source, not both.');
  }
  if (publicSourceCount > 1) {
    fail('Specify at most one public key source: --public-key-ref, --public-key-path, or --public-key-env.');
  }

  if (!hasPrivate && !hasSshSigningKey && !hasPublic) {
    fail('Usage: omnifocus-mcp-grant doctor [(--private-key-ref <op-ref> | --private-key-path <path> | --private-key-env <env>) | --signer ssh-signature (--ssh-signing-key-ref <op-ref> | --ssh-signing-key-path <path> | --ssh-signing-key-env <env>)] [(--public-key-ref <op-ref> | --public-key-path <path> | --public-key-env <env>)]');
  }

  const privateKey = hasPrivate ? readPrivateKey(options) : undefined;
  const sshSigningKey = hasSshSigningKey ? resolveSshSigningKeyPath(options) : undefined;
  const publicKey = hasPublic ? readPublicKey(options) : undefined;
  const privateKeyInfo = privateKey ? inspectDangerousGrantPrivateKey(privateKey) : undefined;
  const sshSignerInfo = sshSigningKey ? {
    supported: true,
    backend: 'ssh-signature',
    noExport: true,
    keySource: sshSigningKey.source,
    command: 'ssh-keygen -Y sign',
    namespace: DANGEROUS_GRANT_SSH_SIGNATURE_NAMESPACE,
    authSock: options.sshAuthSock ? 'explicit' : 'environment',
  } : undefined;
  const publicKeyInfo = publicKey ? inspectDangerousGrantPublicKey(publicKey) : undefined;
  let roundTrip: Record<string, unknown> | undefined;

  try {
    roundTrip = privateKey && publicKey
      ? runDoctorRoundTrip(privateKey, publicKey)
      : sshSigningKey && publicKey
        ? runDoctorSshRoundTrip(sshSigningKey.path, publicKey, options.sshAuthSock)
        : undefined;

    process.stdout.write(`${JSON.stringify({
      privateKey: privateKeyInfo,
      sshSigner: sshSignerInfo,
      publicKey: publicKeyInfo,
      roundTrip,
    }, null, 2)}\n`);
  } finally {
    sshSigningKey?.cleanup();
  }
}

function runDoctorRoundTrip(privateKey: string, publicKey: string): Record<string, unknown> {
  const args = { doctor: true };
  try {
    resetDangerousGrantReplayCache();
    const claims = createExactDangerousGrantClaims({
      toolName: 'grant_doctor',
      args,
      expiresInSeconds: 60,
      reason: 'grant doctor compatibility check',
    });
    const token = createDangerousGrantToken(claims, privateKey);
    const result = validateDangerousGrant(
      'grant_doctor',
      { ...args, dangerousGrant: token },
      { OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY: publicKey },
    );

    return {
      supported: result.valid,
      reason: result.reason,
    };
  } catch (error) {
    return {
      supported: false,
      reason: (error as Error).message,
    };
  }
}

function runDoctorSshRoundTrip(signingKeyPath: string, publicKey: string, sshAuthSock?: string): Record<string, unknown> {
  const args = { doctor: true };
  try {
    resetDangerousGrantReplayCache();
    const claims = createExactDangerousGrantClaims({
      toolName: 'grant_doctor',
      args,
      expiresInSeconds: 60,
      reason: 'grant doctor SSH signature compatibility check',
    });
    const token = createSshSignatureDangerousGrantToken(claims, signingKeyPath, sshAuthSock);
    const result = validateDangerousGrant(
      'grant_doctor',
      { ...args, dangerousGrant: token },
      { OMNIFOCUS_MCP_DANGEROUS_GRANT_PUBLIC_KEY: publicKey },
    );

    return {
      supported: result.valid,
      backend: 'ssh-signature',
      reason: result.reason,
    };
  } catch (error) {
    return {
      supported: false,
      backend: 'ssh-signature',
      reason: (error as Error).message,
    };
  }
}

function parseJsonObject(json: string): Record<string, unknown> {
  try {
    const value = JSON.parse(json);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail('--args-json must be a JSON object.');
    }
    return value;
  } catch (error) {
    fail(`Invalid --args-json: ${(error as Error).message}`);
  }
}

function readPrivateKey(options: CliOptions): string {
  if (!hasExactlyOneKeySource(options.privateKeyPath, options.privateKeyEnv, options.privateKeyRef)) {
    fail('Specify exactly one private key source: --private-key-ref, --private-key-path, or --private-key-env.');
  }

  return readKeyFromSource({
    path: options.privateKeyPath,
    env: options.privateKeyEnv,
    ref: options.privateKeyRef,
    envLabel: 'private',
  });
}

function selectedSigner(options: CliOptions): 'jwt' | 'ssh-signature' {
  const privateSourceCount = countKeySources(options.privateKeyPath, options.privateKeyEnv, options.privateKeyRef);
  const sshSigningSourceCount = countKeySources(options.sshSigningKeyPath, options.sshSigningKeyEnv, options.sshSigningKeyRef);

  if (privateSourceCount > 0 && sshSigningSourceCount > 0) {
    fail('Specify either a JWT private key source or an SSH signing key source, not both.');
  }

  const signer = options.signer ?? (sshSigningSourceCount > 0 ? 'ssh-signature' : 'jwt');
  if (signer === 'jwt' && sshSigningSourceCount > 0) {
    fail('--signer jwt cannot be used with --ssh-signing-key-* options.');
  }
  if (signer === 'ssh-signature' && privateSourceCount > 0) {
    fail('--signer ssh-signature cannot be used with --private-key-* options.');
  }

  return signer;
}

function resolveSshSigningKeyPath(options: CliOptions): { path: string; source: 'path' | 'env' | 'ref'; cleanup: () => void } {
  if (!hasExactlyOneKeySource(options.sshSigningKeyPath, options.sshSigningKeyEnv, options.sshSigningKeyRef)) {
    fail('Specify exactly one SSH signing key source: --ssh-signing-key-ref, --ssh-signing-key-path, or --ssh-signing-key-env.');
  }

  if (options.sshSigningKeyPath) {
    return { path: options.sshSigningKeyPath, source: 'path', cleanup: () => undefined };
  }

  const key = readKeyFromSource({
    env: options.sshSigningKeyEnv,
    ref: options.sshSigningKeyRef,
    envLabel: 'SSH signing',
  });
  assertNoPrivateKeyMaterial(key, '--ssh-signing-key-ref/--ssh-signing-key-env');

  const directory = mkdtempSync(join(tmpdir(), 'omnifocus-mcp-grant-signer-'));
  const path = join(directory, 'signing-key.pub');
  writeFileSync(path, key.endsWith('\n') ? key : `${key}\n`, { mode: 0o600 });

  return {
    path,
    source: options.sshSigningKeyEnv ? 'env' : 'ref',
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}

function readPublicKey(options: CliOptions): string {
  if (!hasExactlyOneKeySource(options.publicKeyPath, options.publicKeyEnv, options.publicKeyRef)) {
    fail('Specify exactly one public key source: --public-key-ref, --public-key-path, or --public-key-env.');
  }

  return readKeyFromSource({
    path: options.publicKeyPath,
    env: options.publicKeyEnv,
    ref: options.publicKeyRef,
    envLabel: 'public',
  });
}

function readKeyFromSource(source: {
  path?: string;
  env?: string;
  ref?: string;
  envLabel: string;
}): string {
  if (source.path) {
    return readFileSync(source.path, 'utf-8');
  }

  if (source.env) {
    const value = process.env[source.env];
    if (!value) {
      fail(`Environment variable ${source.env} is empty or unset.`);
    }
    return value;
  }

  if (source.ref) {
    try {
      return execFileSync('op', [
        'read',
        '--no-newline',
        source.ref,
      ], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const stderr = (error as { stderr?: Buffer }).stderr?.toString().trim();
      fail(`Failed to read ${source.envLabel} key from 1Password${stderr ? `: ${stderr}` : '.'}`);
    }
  }

  fail(`Missing ${source.envLabel} key source.`);
}

function assertNoPrivateKeyMaterial(value: string, label: string): void {
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)) {
    fail(`${label} appears to contain private key material. For no-export SSH signing, point it at a public key field; for compatibility JWT signing, use --private-key-ref instead.`);
  }
}

function hasExactlyOneKeySource(...sources: Array<string | undefined>): boolean {
  return countKeySources(...sources) === 1;
}

function countKeySources(...sources: Array<string | undefined>): number {
  return sources.filter(Boolean).length;
}

function printHelp(): void {
  process.stdout.write(`Create a short-lived dangerous-operation grant.

Examples:
  omnifocus-mcp-grant \\
    --tool remove_item \\
    --args-json '{"name":"TEST: item","itemType":"task"}' \\
    --private-key-ref 'op://Private/SSH Key/private key?ssh-format=openssh' \\
    --reason 'cleanup test data'

  omnifocus-mcp-grant \\
    --signer ssh-signature \\
    --tool remove_item \\
    --args-json '{"name":"TEST: item","itemType":"task"}' \\
    --ssh-signing-key-ref 'op://Private/SSH Key/public key' \\
    --ssh-auth-sock "$HOME/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock" \\
    --reason 'cleanup test data'

The args JSON must match the destructive MCP tool arguments exactly, excluding
the dangerousGrant field that this command creates. Ed25519 keys sign with
EdDSA; RSA keys sign with RS256. The ssh-signature signer uses ssh-keygen -Y
sign and can use a public key identity backed by the 1Password SSH agent, so
private key material does not enter the Node process.

Diagnostics:
  omnifocus-mcp-grant doctor \\
    --private-key-ref 'op://Private/SSH Key/private key?ssh-format=openssh' \\
    --public-key-ref 'op://Private/SSH Key/public key'

  omnifocus-mcp-grant doctor \\
    --signer ssh-signature \\
    --ssh-signing-key-ref 'op://Private/SSH Key/public key' \\
    --ssh-auth-sock "$HOME/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock" \\
    --public-key-ref 'op://Private/SSH Key/public key'
`);
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

main();
