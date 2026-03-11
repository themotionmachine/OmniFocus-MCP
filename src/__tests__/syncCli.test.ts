import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseArgs, loadConfig } from '../cli/syncCli.js';

describe('parseArgs', () => {
  it('should parse push command', () => {
    const result = parseArgs(['push']);
    expect(result.command).toBe('push');
  });

  it('should parse pull command', () => {
    const result = parseArgs(['pull']);
    expect(result.command).toBe('pull');
  });

  it('should parse status command', () => {
    const result = parseArgs(['status']);
    expect(result.command).toBe('status');
  });

  it('should parse init command', () => {
    const result = parseArgs(['init']);
    expect(result.command).toBe('init');
  });

  it('should parse resolve command', () => {
    const result = parseArgs(['resolve']);
    expect(result.command).toBe('resolve');
  });

  it('should default to status when no command given', () => {
    const result = parseArgs([]);
    expect(result.command).toBe('status');
  });

  it('should throw for unknown commands', () => {
    expect(() => parseArgs(['unknown'])).toThrow('Unknown command');
  });

  it('should parse --dry-run flag', () => {
    const result = parseArgs(['push', '--dry-run']);
    expect(result.options['dry-run']).toBe(true);
  });

  it('should parse --verbose flag', () => {
    const result = parseArgs(['push', '--verbose']);
    expect(result.options['verbose']).toBe(true);
  });

  it('should parse --vault with value', () => {
    const result = parseArgs(['push', '--vault', '/path/to/vault']);
    expect(result.options['vault']).toBe('/path/to/vault');
  });

  it('should parse --project with value', () => {
    const result = parseArgs(['push', '--project', 'Work']);
    expect(result.options['project']).toBe('Work');
  });

  it('should parse --file with value', () => {
    const result = parseArgs(['push', '--file', 'tasks.md']);
    expect(result.options['file']).toBe('tasks.md');
  });

  it('should parse --config with value', () => {
    const result = parseArgs(['status', '--config', '/path/config.json']);
    expect(result.options['config']).toBe('/path/config.json');
  });

  it('should handle multiple options together', () => {
    const result = parseArgs(['push', '--dry-run', '--vault', '/vault', '--verbose']);
    expect(result.command).toBe('push');
    expect(result.options['dry-run']).toBe(true);
    expect(result.options['verbose']).toBe(true);
    expect(result.options['vault']).toBe('/vault');
  });
});

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should return default values when no config or env vars', () => {
    delete process.env['OBSIDIAN_VAULT_PATH'];
    delete process.env['OMNIFOCUS_SYNC_STATE'];
    delete process.env['OMNIFOCUS_DEFAULT_PROJECT'];

    const config = loadConfig();
    expect(config.syncCompleted).toBe(false);
    expect(config.preserveHierarchy).toBe(true);
    expect(config.conflictResolution).toBe('manual');
    expect(config.defaultProject).toBeNull();
  });

  it('should use OBSIDIAN_VAULT_PATH env var', () => {
    process.env['OBSIDIAN_VAULT_PATH'] = '/my/vault';
    delete process.env['OMNIFOCUS_SYNC_STATE'];
    delete process.env['OMNIFOCUS_DEFAULT_PROJECT'];

    const config = loadConfig();
    expect(config.vaultPath).toBe('/my/vault');
  });

  it('should use OMNIFOCUS_DEFAULT_PROJECT env var', () => {
    process.env['OBSIDIAN_VAULT_PATH'] = '/vault';
    process.env['OMNIFOCUS_DEFAULT_PROJECT'] = 'My Project';
    delete process.env['OMNIFOCUS_SYNC_STATE'];

    const config = loadConfig();
    expect(config.defaultProject).toBe('My Project');
  });

  it('should derive syncStatePath from vaultPath', () => {
    process.env['OBSIDIAN_VAULT_PATH'] = '/my/vault';
    delete process.env['OMNIFOCUS_SYNC_STATE'];
    delete process.env['OMNIFOCUS_DEFAULT_PROJECT'];

    const config = loadConfig();
    expect(config.syncStatePath).toContain('.omnifocus-sync');
    expect(config.syncStatePath).toContain('state.json');
  });
});
