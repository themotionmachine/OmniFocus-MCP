#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import {
  createDangerousGrantToken,
  createExactDangerousGrantClaims,
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
  publicKeyPath?: string;
  publicKeyEnv?: string;
  publicKeyRef?: string;
  expiresInSeconds: number;
  reason?: string;
  command: 'create' | 'doctor';
};

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  if (options.command === 'doctor') {
    runDoctor(options);
    return;
  }

  if (!options.tool || !options.argsJson) {
    fail('Usage: omnifocus-mcp-grant --tool <name> --args-json <json> (--private-key-ref <op-ref> | --private-key-path <path> | --private-key-env <env>) [--reason <text>] [--expires-in <seconds>]');
  }

  const args = parseJsonObject(options.argsJson);
  const privateKey = readPrivateKey(options);
  const claims = createExactDangerousGrantClaims({
    toolName: options.tool,
    args,
    expiresInSeconds: options.expiresInSeconds,
    reason: options.reason,
  });

  process.stdout.write(`${createDangerousGrantToken(claims, privateKey)}\n`);
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
      case '--public-key-path':
        options.publicKeyPath = next();
        break;
      case '--public-key-env':
        options.publicKeyEnv = next();
        break;
      case '--public-key-ref':
        options.publicKeyRef = next();
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
  const publicSourceCount = countKeySources(options.publicKeyPath, options.publicKeyEnv, options.publicKeyRef);
  const hasPrivate = privateSourceCount === 1;
  const hasPublic = publicSourceCount === 1;

  if (privateSourceCount > 1) {
    fail('Specify at most one private key source: --private-key-ref, --private-key-path, or --private-key-env.');
  }
  if (publicSourceCount > 1) {
    fail('Specify at most one public key source: --public-key-ref, --public-key-path, or --public-key-env.');
  }

  if (!hasPrivate && !hasPublic) {
    fail('Usage: omnifocus-mcp-grant doctor [(--private-key-ref <op-ref> | --private-key-path <path> | --private-key-env <env>)] [(--public-key-ref <op-ref> | --public-key-path <path> | --public-key-env <env>)]');
  }

  const privateKey = hasPrivate ? readPrivateKey(options) : undefined;
  const publicKey = hasPublic ? readPublicKey(options) : undefined;
  const privateKeyInfo = privateKey ? inspectDangerousGrantPrivateKey(privateKey) : undefined;
  const publicKeyInfo = publicKey ? inspectDangerousGrantPublicKey(publicKey) : undefined;
  const roundTrip = privateKey && publicKey
    ? runDoctorRoundTrip(privateKey, publicKey)
    : undefined;

  process.stdout.write(`${JSON.stringify({
    privateKey: privateKeyInfo,
    publicKey: publicKeyInfo,
    roundTrip,
  }, null, 2)}\n`);
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

The args JSON must match the destructive MCP tool arguments exactly, excluding
the dangerousGrant field that this command creates. Ed25519 keys sign with
EdDSA; RSA keys sign with RS256.

Diagnostics:
  omnifocus-mcp-grant doctor \\
    --private-key-ref 'op://Private/SSH Key/private key?ssh-format=openssh' \\
    --public-key-ref 'op://Private/SSH Key/public key'
`);
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

main();
