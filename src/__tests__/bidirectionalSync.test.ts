import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BidirectionalSyncManager,
  type PullOptions,
  type OmniFocusTaskState,
} from '../sync/bidirectionalSync.js';
import { SyncStateManager, type SyncRecord } from '../sync/syncState.js';

// Mock fs module
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import * as fs from 'node:fs/promises';

const mockReadFile = fs.readFile as ReturnType<typeof vi.fn>;
const mockWriteFile = fs.writeFile as ReturnType<typeof vi.fn>;

function makeOmniFocusTask(overrides: Partial<OmniFocusTaskState> = {}): OmniFocusTaskState {
  return {
    id: 'of-task-1',
    name: 'Test Task',
    completed: false,
    completionDate: null,
    dueDate: null,
    deferDate: null,
    flagged: false,
    note: '',
    tags: [],
    ...overrides,
  };
}

function makePullOptions(overrides: Partial<PullOptions> = {}): PullOptions {
  return {
    vaultPath: '/vault',
    dryRun: false,
    pullCompleted: true,
    pullModified: true,
    conflictResolution: 'manual',
    ...overrides,
  };
}

function makeSyncRecord(overrides: Partial<SyncRecord> = {}): SyncRecord {
  return {
    omnifocusId: 'of-task-1',
    markdownFile: '/vault/tasks.md',
    lineNumber: 0,
    taskName: 'Test Task',
    lastSyncedAt: '2026-01-01T00:00:00.000Z',
    lastModifiedAt: '2026-01-01T00:00:00.000Z',
    syncDirection: 'bidirectional',
    checksum: 'initial-checksum',
    status: 'synced',
    ...overrides,
  };
}

describe('BidirectionalSyncManager', () => {
  let manager: BidirectionalSyncManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new BidirectionalSyncManager('/tmp/test-sync-state.json');

    mockReadFile.mockImplementation((path: string) => {
      if (path === '/tmp/test-sync-state.json') {
        return Promise.reject(new Error('ENOENT'));
      }
      return Promise.resolve('- [ ] Test Task <!-- omnifocus:of-task-1 -->');
    });
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('pullFromOmniFocus', () => {
    it('should skip tasks not in sync state', async () => {
      const tasks = [makeOmniFocusTask()];
      const options = makePullOptions();

      const result = await manager.pullFromOmniFocus(tasks, options);

      expect(result.updated).toHaveLength(0);
      expect(result.completed).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should mark completed tasks in markdown', async () => {
      const record = makeSyncRecord();
      const stateData = {
        version: 1,
        lastFullSync: null,
        records: { 'of-task-1': record },
        conflicts: [],
      };

      mockReadFile.mockImplementation((path: string) => {
        if (path === '/tmp/test-sync-state.json') {
          return Promise.resolve(JSON.stringify(stateData));
        }
        return Promise.resolve('- [ ] Test Task <!-- omnifocus:of-task-1 -->');
      });

      const tasks = [makeOmniFocusTask({ completed: true, completionDate: '2026-03-01' })];
      // Use omnifocus-wins to bypass conflict detection (checksums won't match fresh state)
      const options = makePullOptions({ pullCompleted: true, conflictResolution: 'omnifocus-wins' });

      const result = await manager.pullFromOmniFocus(tasks, options);

      expect(result.completed).toHaveLength(1);
      expect(result.completed[0].name).toBe('Test Task');
      expect(result.completed[0].omnifocusId).toBe('of-task-1');
    });

    it('should handle file not found errors gracefully', async () => {
      const record = makeSyncRecord({ markdownFile: '/vault/missing.md' });
      const stateData = {
        version: 1,
        lastFullSync: null,
        records: { 'of-task-1': record },
        conflicts: [],
      };

      mockReadFile.mockImplementation((path: string) => {
        if (path === '/tmp/test-sync-state.json') {
          return Promise.resolve(JSON.stringify(stateData));
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const tasks = [makeOmniFocusTask({ completed: true })];
      const options = makePullOptions();

      const result = await manager.pullFromOmniFocus(tasks, options);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('File not found');
    });

    it('should return dry-run results without writing files', async () => {
      const record = makeSyncRecord();
      const stateData = {
        version: 1,
        lastFullSync: null,
        records: { 'of-task-1': record },
        conflicts: [],
      };

      mockReadFile.mockImplementation((path: string) => {
        if (path === '/tmp/test-sync-state.json') {
          return Promise.resolve(JSON.stringify(stateData));
        }
        return Promise.resolve('- [ ] Test Task <!-- omnifocus:of-task-1 -->');
      });

      const tasks = [makeOmniFocusTask({ completed: true })];
      // Use omnifocus-wins to bypass conflict detection (checksums won't match fresh state)
      const options = makePullOptions({ dryRun: true, pullCompleted: true, conflictResolution: 'omnifocus-wins' });

      const result = await manager.pullFromOmniFocus(tasks, options);

      expect(result.dryRun).toBe(true);
      expect(result.completed).toHaveLength(1);
      const writeCallsForMd = (mockWriteFile as any).mock.calls.filter(
        (call: any[]) => String(call[0]).endsWith('.md'),
      );
      expect(writeCallsForMd).toHaveLength(0);
    });
  });

  describe('detectConflicts', () => {
    it('should return no-conflict when nothing changed', () => {
      const sm = new SyncStateManager('/tmp/x');
      const syncRecord = {
        checksum: sm.computeChecksum('file content'),
        omnifocusChecksum: sm.computeChecksum('Test Task|incomplete||||'),
      };
      const task = makeOmniFocusTask();

      const result = manager.detectConflicts(syncRecord, 'file content', task);
      expect(result).toBe('no-conflict');
    });

    it('should detect obsidian-modified when only file changed', () => {
      const sm = new SyncStateManager('/tmp/x');
      const syncRecord = {
        checksum: sm.computeChecksum('old file content'),
        omnifocusChecksum: sm.computeChecksum('Test Task|incomplete||||'),
      };
      const task = makeOmniFocusTask();

      const result = manager.detectConflicts(syncRecord, 'new file content', task);
      expect(result).toBe('obsidian-modified');
    });

    it('should detect omnifocus-modified when only task changed', () => {
      const sm = new SyncStateManager('/tmp/x');
      const syncRecord = {
        checksum: sm.computeChecksum('file content'),
        omnifocusChecksum: sm.computeChecksum('Old Task|incomplete||||'),
      };
      const task = makeOmniFocusTask({ name: 'Changed Task' });

      const result = manager.detectConflicts(syncRecord, 'file content', task);
      expect(result).toBe('omnifocus-modified');
    });

    it('should detect both-modified when both changed', () => {
      const syncRecord = {
        checksum: 'old-obs-checksum',
        omnifocusChecksum: 'old-of-checksum',
      };
      const task = makeOmniFocusTask({ name: 'Changed' });

      const result = manager.detectConflicts(syncRecord, 'changed content', task);
      expect(result).toBe('both-modified');
    });
  });

  describe('updateMarkdownFile', () => {
    it('should apply line updates correctly', async () => {
      const content = 'line 0\nline 1\nline 2\nline 3';
      const updates = [
        { lineNumber: 1, newLine: 'updated line 1' },
        { lineNumber: 3, newLine: 'updated line 3' },
      ];

      const result = await manager.updateMarkdownFile('/vault/test.md', content, updates);

      expect(result).toBe('line 0\nupdated line 1\nline 2\nupdated line 3');
    });

    it('should handle empty updates', async () => {
      const content = 'line 0\nline 1';
      const result = await manager.updateMarkdownFile('/vault/test.md', content, []);
      expect(result).toBe(content);
    });

    it('should skip out-of-bounds line numbers', async () => {
      const content = 'line 0\nline 1';
      const updates = [{ lineNumber: 10, newLine: 'out of bounds' }];
      const result = await manager.updateMarkdownFile('/vault/test.md', content, updates);
      expect(result).toBe(content);
    });
  });

  describe('formatPullReport', () => {
    it('should format a report with completed and updated tasks', () => {
      const result = {
        updated: [
          { name: 'Updated Task', omnifocusId: 'of-1', file: 'a.md', changes: ['name changed'] },
        ],
        completed: [
          { name: 'Done Task', omnifocusId: 'of-2', file: 'b.md' },
        ],
        conflicts: [],
        errors: [],
        dryRun: false,
      };

      const report = manager.formatPullReport(result);
      expect(report).toContain('Pull Report');
      expect(report).toContain('LIVE');
      expect(report).toContain('Completed (1)');
      expect(report).toContain('Done Task');
      expect(report).toContain('Updated (1)');
      expect(report).toContain('Updated Task');
      expect(report).toContain('name changed');
    });

    it('should indicate dry-run mode', () => {
      const result = {
        updated: [],
        completed: [],
        conflicts: [],
        errors: [],
        dryRun: true,
      };

      const report = manager.formatPullReport(result);
      expect(report).toContain('DRY RUN');
    });

    it('should report no changes when nothing happened', () => {
      const result = {
        updated: [],
        completed: [],
        conflicts: [],
        errors: [],
        dryRun: false,
      };

      const report = manager.formatPullReport(result);
      expect(report).toContain('No changes detected');
    });

    it('should report conflicts', () => {
      const result = {
        updated: [],
        completed: [],
        conflicts: [
          {
            name: 'Conflicted',
            omnifocusId: 'of-3',
            file: 'c.md',
            obsidianContent: 'obs',
            omnifocusContent: 'of',
          },
        ],
        errors: [],
        dryRun: false,
      };

      const report = manager.formatPullReport(result);
      expect(report).toContain('Conflicts (1)');
      expect(report).toContain('Conflicted');
    });

    it('should report errors', () => {
      const result = {
        updated: [],
        completed: [],
        conflicts: [],
        errors: [{ name: 'Bad Task', error: 'something failed' }],
        dryRun: false,
      };

      const report = manager.formatPullReport(result);
      expect(report).toContain('Errors (1)');
      expect(report).toContain('something failed');
    });
  });
});
