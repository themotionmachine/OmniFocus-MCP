#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import {
  createDangerousGrantToken,
  createExactDangerousGrantClaims,
} from './tools/dangerousGrant.js';

type CliOptions = {
  tool?: string;
  argsJson?: string;
  privateKeyPath?: string;
  privateKeyEnv?: string;
  privateKeyRef?: string;
  expiresInSeconds: number;
  reason?: string;
};

function main(): void {
  const options = parseArgs(process.argv.slice(2));

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
    expiresInSeconds: 300,
  };

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
  const sources = [
    options.privateKeyPath,
    options.privateKeyEnv,
    options.privateKeyRef,
  ].filter(Boolean);

  if (sources.length !== 1) {
    fail('Specify exactly one private key source: --private-key-ref, --private-key-path, or --private-key-env.');
  }

  if (options.privateKeyPath) {
    return readFileSync(options.privateKeyPath, 'utf-8');
  }

  if (options.privateKeyEnv) {
    const value = process.env[options.privateKeyEnv];
    if (!value) {
      fail(`Environment variable ${options.privateKeyEnv} is empty or unset.`);
    }
    return value;
  }

  if (options.privateKeyRef) {
    return execFileSync('op', [
      'read',
      '--no-newline',
      options.privateKeyRef,
    ], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  }

  fail('Missing private key source.');
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
`);
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

main();
