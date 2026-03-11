/**
 * CLI Interface for Obsidian-OmniFocus Sync
 *
 * Provides a command-line interface for synchronizing tasks between
 * Obsidian markdown vaults and OmniFocus.
 */

import { readFileSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SyncStateManager } from '../sync/syncState.js';
import { BatchSyncManager } from '../sync/batchSync.js';
import { BidirectionalSyncManager } from '../sync/bidirectionalSync.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CliConfig {
  vaultPath: string;
  syncStatePath: string;
  defaultProject: string | null;
  syncCompleted: boolean;
  preserveHierarchy: boolean;
  conflictResolution: 'obsidian-wins' | 'omnifocus-wins' | 'manual';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYNC_DIR = '.omnifocus-sync';
const CONFIG_FILE = 'config.json';
const STATE_FILE = 'state.json';

const VALID_COMMANDS = ['push', 'pull', 'status', 'init', 'resolve'] as const;

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

function defaultConfig(vaultPath: string): CliConfig {
  return {
    vaultPath,
    syncStatePath: vaultPath ? join(vaultPath, SYNC_DIR, STATE_FILE) : '',
    defaultProject: null,
    syncCompleted: false,
    preserveHierarchy: true,
    conflictResolution: 'manual',
  };
}

export function loadConfig(configPath?: string): CliConfig {
  const envVaultPath = process.env['OBSIDIAN_VAULT_PATH'] ?? '';
  const defaults = defaultConfig(envVaultPath);

  const resolvedConfigPath = configPath ?? (envVaultPath ? join(envVaultPath, SYNC_DIR, CONFIG_FILE) : '');

  let fileConfig: Partial<CliConfig> = {};
  if (resolvedConfigPath) {
    try {
      const raw = readFileSync(resolvedConfigPath, 'utf-8');
      fileConfig = JSON.parse(raw) as Partial<CliConfig>;
    } catch {
      // File doesn't exist or is unreadable — fall back to env / defaults.
    }
  }

  const config: CliConfig = {
    vaultPath:
      fileConfig.vaultPath ??
      process.env['OBSIDIAN_VAULT_PATH'] ??
      defaults.vaultPath,
    syncStatePath:
      fileConfig.syncStatePath ??
      process.env['OMNIFOCUS_SYNC_STATE'] ??
      defaults.syncStatePath,
    defaultProject:
      fileConfig.defaultProject ??
      process.env['OMNIFOCUS_DEFAULT_PROJECT'] ??
      defaults.defaultProject,
    syncCompleted: fileConfig.syncCompleted ?? defaults.syncCompleted,
    preserveHierarchy: fileConfig.preserveHierarchy ?? defaults.preserveHierarchy,
    conflictResolution: fileConfig.conflictResolution ?? defaults.conflictResolution,
  };

  // Derive syncStatePath if still empty but vaultPath is set
  if (!config.syncStatePath && config.vaultPath) {
    config.syncStatePath = join(config.vaultPath, SYNC_DIR, STATE_FILE);
  }

  return config;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

export function parseArgs(
  args: string[],
): { command: string; options: Record<string, string | boolean> } {
  const options: Record<string, string | boolean> = {};
  let command = '';

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);

      // Boolean flags
      if (key === 'dry-run' || key === 'verbose') {
        options[key] = true;
        i++;
        continue;
      }

      // Options that take a value
      if (['vault', 'project', 'file', 'config'].includes(key)) {
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          options[key] = next;
          i += 2;
          continue;
        }
      }

      // Unknown flag — treat as boolean
      options[key] = true;
      i++;
      continue;
    }

    // Positional — first positional is the command
    if (!command) {
      command = arg;
    }
    i++;
  }

  if (!command) {
    command = 'status';
  }

  if (!(VALID_COMMANDS as readonly string[]).includes(command)) {
    throw new Error(
      `Unknown command: "${command}". Valid commands: ${VALID_COMMANDS.join(', ')}`,
    );
  }

  return { command, options };
}

// ---------------------------------------------------------------------------
// Command implementations
// ---------------------------------------------------------------------------

export async function commandInit(config: CliConfig): Promise<void> {
  if (!config.vaultPath) {
    throw new Error('Vault path is required. Use --vault <path> or set OBSIDIAN_VAULT_PATH.');
  }

  const syncDir = join(config.vaultPath, SYNC_DIR);
  await mkdir(syncDir, { recursive: true });

  const configFilePath = join(syncDir, CONFIG_FILE);

  const savedConfig: Partial<CliConfig> = {
    vaultPath: config.vaultPath,
    syncStatePath: config.syncStatePath,
    defaultProject: config.defaultProject,
    syncCompleted: config.syncCompleted,
    preserveHierarchy: config.preserveHierarchy,
    conflictResolution: config.conflictResolution,
  };

  await writeFile(configFilePath, JSON.stringify(savedConfig, null, 2), 'utf-8');
}

export async function commandStatus(config: CliConfig): Promise<string> {
  if (!config.syncStatePath) {
    return 'No sync state found. Run "init" to set up sync.';
  }

  const stateManager = new SyncStateManager(config.syncStatePath);
  await stateManager.load();

  const stats = stateManager.getStats();
  const conflicts = stateManager.findConflicts();

  const lines: string[] = [
    'Sync Status',
    '===========',
    `Total synced items: ${stats.total}`,
    `Modified: ${stats.modified}`,
    `Conflicts: ${stats.conflicts}`,
    `Vault: ${config.vaultPath}`,
    `State file: ${config.syncStatePath}`,
  ];

  if (config.defaultProject) {
    lines.push(`Default project: ${config.defaultProject}`);
  }

  if (conflicts.length > 0) {
    lines.push('');
    lines.push('Pending conflicts:');
    for (const conflict of conflicts) {
      const status = conflict.resolution === 'pending' ? 'PENDING' : String(conflict.resolution);
      lines.push(`  - ${conflict.omnifocusId}: ${status}`);
    }
  }

  return lines.join('\n');
}

export async function commandPush(
  config: CliConfig,
  options: Record<string, string | boolean>,
): Promise<string> {
  if (!config.vaultPath) {
    throw new Error('Vault path is required. Use --vault <path> or set OBSIDIAN_VAULT_PATH.');
  }

  const dryRun = options['dry-run'] === true;
  const syncStatePath = config.syncStatePath || join(config.vaultPath, SYNC_DIR, STATE_FILE);

  const batchManager = new BatchSyncManager(syncStatePath);

  const syncOptions = {
    dryRun,
    vaultPath: config.vaultPath,
    projectName: (typeof options['project'] === 'string' ? options['project'] : undefined) ??
      config.defaultProject ??
      undefined,
    syncCompleted: config.syncCompleted,
    preserveHierarchy: config.preserveHierarchy,
    files: typeof options['file'] === 'string' ? [options['file']] : undefined,
  };

  const result = await batchManager.syncVault(syncOptions);
  return batchManager.formatSyncReport(result);
}

export async function commandPull(
  config: CliConfig,
  options: Record<string, string | boolean>,
): Promise<string> {
  if (!config.vaultPath) {
    throw new Error('Vault path is required. Use --vault <path> or set OBSIDIAN_VAULT_PATH.');
  }

  const dryRun = options['dry-run'] === true;
  const syncStatePath = config.syncStatePath || join(config.vaultPath, SYNC_DIR, STATE_FILE);

  const biSyncManager = new BidirectionalSyncManager(syncStatePath);

  const pullOptions = {
    vaultPath: config.vaultPath,
    dryRun,
    pullCompleted: config.syncCompleted,
    pullModified: true,
    conflictResolution: config.conflictResolution,
  };

  // In a real implementation, this would fetch tasks from OmniFocus.
  // For now we call with an empty task list — actual OmniFocus task
  // retrieval will be wired in when the OmniFocus bridge is available.
  const result = await biSyncManager.pullFromOmniFocus([], pullOptions);
  return biSyncManager.formatPullReport(result);
}

export async function commandResolve(config: CliConfig): Promise<string> {
  if (!config.syncStatePath) {
    return 'No sync state found. Run "init" to set up sync.';
  }

  const stateManager = new SyncStateManager(config.syncStatePath);
  await stateManager.load();

  const conflicts = stateManager.findConflicts();

  if (conflicts.length === 0) {
    return 'No conflicts found.';
  }

  const lines: string[] = [
    `Found ${conflicts.length} conflict(s):`,
    '',
  ];

  for (const conflict of conflicts) {
    lines.push(`  - ${conflict.omnifocusId}: ${conflict.resolution ?? 'pending'}`);
    lines.push(`    Obsidian: ${conflict.obsidianContent}`);
    lines.push(`    OmniFocus: ${conflict.omnifocusContent}`);
    lines.push('');
  }

  lines.push(`Resolution strategy: ${config.conflictResolution}`);
  lines.push('Use --config to change conflict resolution strategy.');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runCli(args: string[]): Promise<void> {
  try {
    const { command, options } = parseArgs(args);

    // If --config is specified, load from that path
    const configPath = typeof options['config'] === 'string' ? options['config'] : undefined;
    const config = loadConfig(configPath);

    // Override vault path if --vault is specified
    if (typeof options['vault'] === 'string') {
      config.vaultPath = resolve(options['vault']);
      if (!config.syncStatePath) {
        config.syncStatePath = join(config.vaultPath, SYNC_DIR, STATE_FILE);
      }
    }

    // Override project if --project is specified
    if (typeof options['project'] === 'string') {
      config.defaultProject = options['project'];
    }

    let output: string;

    switch (command) {
      case 'init':
        await commandInit(config);
        output = `Initialized sync directory at ${join(config.vaultPath, SYNC_DIR)}`;
        break;
      case 'status':
        output = await commandStatus(config);
        break;
      case 'push':
        output = await commandPush(config, options);
        break;
      case 'pull':
        output = await commandPull(config, options);
        break;
      case 'resolve':
        output = await commandResolve(config);
        break;
      default:
        output = `Unknown command: ${command}`;
    }

    console.log(output);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}
