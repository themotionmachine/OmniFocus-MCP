import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BatchSyncManager,
  computeChecksum,
  type SyncOptions,
  type SyncResult,
  type ObsidianTask,
  type ParsedMarkdownFile,
  type SyncStateRecord,
} from '../sync/batchSync.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<ObsidianTask> = {}): ObsidianTask {
  return {
    name: 'Test task',
    completed: false,
    lineNumber: 1,
    omnifocusId: undefined,
    note: '',
    dueDate: undefined,
    deferDate: undefined,
    flagged: false,
    estimatedMinutes: undefined,
    tags: [],
    projectName: undefined,
    children: [],
    indentLevel: 0,
    ...overrides,
  } as ObsidianTask;
}

function makeOptions(overrides: Partial<SyncOptions> = {}): SyncOptions {
  return {
    dryRun: false,
    vaultPath: '/vault',
    syncCompleted: true,
    preserveHierarchy: true,
    ...overrides,
  };
}

function makeParsedFile(
  filePath: string,
  tasks: ObsidianTask[],
): ParsedMarkdownFile {
  return { filePath, tasks };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BatchSyncManager', () => {
  let manager: BatchSyncManager;

  beforeEach(() => {
    manager = new BatchSyncManager('/tmp/test-sync-state.json');
  });

  // -----------------------------------------------------------------------
  // Dry-run mode
  // -----------------------------------------------------------------------

  describe('dry-run mode', () => {
    it('should return correct preview without side effects', async () => {
      const task = makeTask({ name: 'New task', lineNumber: 5 });
      const parsed = makeParsedFile('notes.md', [task]);
      const options = makeOptions({ dryRun: true });

      const result = await manager.syncFile('notes.md', '', options, parsed);

      expect(result.dryRun).toBe(true);
      expect(result.created).toHaveLength(1);
      expect(result.created[0].name).toBe('New task');
      expect(result.created[0].file).toBe('notes.md');
      expect(result.created[0].lineNumber).toBe(5);

      // Sync state should NOT be updated in dry-run mode
      const state = manager.getSyncState();
      expect(state.size).toBe(0);
    });

    it('should not modify sync state for existing tasks in dry-run mode', async () => {
      const stateKey = 'notes.md:10';
      const task = makeTask({
        name: 'Existing task',
        lineNumber: 10,
        omnifocusId: 'of-123',
      });

      // Set up existing sync state with a different checksum to trigger update
      manager.setSyncStateRecord(stateKey, {
        omnifocusId: 'of-123',
        checksum: 'old-checksum',
        lastSynced: '2026-01-01T00:00:00.000Z',
      });

      const parsed = makeParsedFile('notes.md', [task]);
      const options = makeOptions({ dryRun: true });

      const result = await manager.syncFile('notes.md', '', options, parsed);

      expect(result.updated).toHaveLength(1);
      // Sync state checksum should remain unchanged
      const record = manager.getSyncState().get(stateKey);
      expect(record?.checksum).toBe('old-checksum');
    });
  });

  // -----------------------------------------------------------------------
  // New task identification
  // -----------------------------------------------------------------------

  describe('new task identification', () => {
    it('should correctly identify new tasks for creation', async () => {
      const tasks = [
        makeTask({ name: 'Task A', lineNumber: 1 }),
        makeTask({ name: 'Task B', lineNumber: 2 }),
      ];
      const parsed = makeParsedFile('project.md', tasks);
      const options = makeOptions();

      const result = await manager.syncFile('project.md', '', options, parsed);

      expect(result.created).toHaveLength(2);
      expect(result.created[0].name).toBe('Task A');
      expect(result.created[1].name).toBe('Task B');
      // Each created task should get an omnifocusId
      expect(result.created[0].omnifocusId).toBeTruthy();
      expect(result.created[1].omnifocusId).toBeTruthy();
    });

    it('should use the task omnifocusId if already present', async () => {
      const task = makeTask({
        name: 'Task with ID',
        lineNumber: 3,
        omnifocusId: 'existing-id-42',
      });
      const parsed = makeParsedFile('file.md', [task]);
      const options = makeOptions();

      const result = await manager.syncFile('file.md', '', options, parsed);

      // No existing state => treated as new
      expect(result.created).toHaveLength(1);
      expect(result.created[0].omnifocusId).toBe('existing-id-42');
    });

    it('should populate sync state after creating tasks in normal mode', async () => {
      const task = makeTask({ name: 'Brand new', lineNumber: 7 });
      const parsed = makeParsedFile('doc.md', [task]);
      const options = makeOptions({ dryRun: false });

      await manager.syncFile('doc.md', '', options, parsed);

      const state = manager.getSyncState();
      expect(state.size).toBe(1);
      const record = state.get('doc.md:7');
      expect(record).toBeDefined();
      expect(record?.checksum).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Unchanged tasks are skipped
  // -----------------------------------------------------------------------

  describe('unchanged task skipping', () => {
    it('should skip already-synced unchanged tasks', async () => {
      const task = makeTask({
        name: 'Synced task',
        lineNumber: 4,
        omnifocusId: 'of-synced-1',
      });

      // Compute the checksum that the manager would produce for this task
      const contentForChecksum = JSON.stringify({
        name: task.name,
        completed: task.completed,
        note: task.note ?? '',
        dueDate: task.dueDate ?? '',
        deferDate: task.deferDate ?? '',
        flagged: task.flagged ?? false,
        estimatedMinutes: task.estimatedMinutes ?? 0,
        tags: task.tags ?? [],
        projectName: task.projectName ?? '',
      });
      const checksum = computeChecksum(contentForChecksum);

      manager.setSyncStateRecord('file.md:4', {
        omnifocusId: 'of-synced-1',
        checksum,
        lastSynced: '2026-01-01T00:00:00.000Z',
      });

      const parsed = makeParsedFile('file.md', [task]);
      const options = makeOptions();

      const result = await manager.syncFile('file.md', '', options, parsed);

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain('unchanged');
      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Modified task detection
  // -----------------------------------------------------------------------

  describe('modified task detection', () => {
    it('should identify modified tasks for update', async () => {
      const task = makeTask({
        name: 'Updated task name',
        lineNumber: 10,
        omnifocusId: 'of-mod-1',
      });

      // Store a record with a checksum that doesn't match current content
      manager.setSyncStateRecord('file.md:10', {
        omnifocusId: 'of-mod-1',
        checksum: 'stale-checksum-abc',
        lastSynced: '2026-01-01T00:00:00.000Z',
      });

      const parsed = makeParsedFile('file.md', [task]);
      const options = makeOptions();

      const result = await manager.syncFile('file.md', '', options, parsed);

      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].name).toBe('Updated task name');
      expect(result.updated[0].omnifocusId).toBe('of-mod-1');
    });

    it('should update sync state checksum after updating in normal mode', async () => {
      const task = makeTask({
        name: 'Changed task',
        lineNumber: 3,
        omnifocusId: 'of-mod-2',
      });

      manager.setSyncStateRecord('file.md:3', {
        omnifocusId: 'of-mod-2',
        checksum: 'old-checksum',
        lastSynced: '2026-01-01T00:00:00.000Z',
      });

      const parsed = makeParsedFile('file.md', [task]);
      const options = makeOptions({ dryRun: false });

      await manager.syncFile('file.md', '', options, parsed);

      const record = manager.getSyncState().get('file.md:3');
      expect(record).toBeDefined();
      expect(record?.checksum).not.toBe('old-checksum');
    });
  });

  // -----------------------------------------------------------------------
  // Completed task handling
  // -----------------------------------------------------------------------

  describe('completed task handling', () => {
    it('should skip completed tasks when syncCompleted=false', async () => {
      const task = makeTask({
        name: 'Done task',
        lineNumber: 6,
        completed: true,
      });
      const parsed = makeParsedFile('done.md', [task]);
      const options = makeOptions({ syncCompleted: false });

      const result = await manager.syncFile('done.md', '', options, parsed);

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].name).toBe('Done task');
      expect(result.skipped[0].reason).toContain('completed');
      expect(result.created).toHaveLength(0);
    });

    it('should sync completed tasks when syncCompleted=true', async () => {
      const task = makeTask({
        name: 'Done but synced',
        lineNumber: 8,
        completed: true,
      });
      const parsed = makeParsedFile('done.md', [task]);
      const options = makeOptions({ syncCompleted: true });

      const result = await manager.syncFile('done.md', '', options, parsed);

      expect(result.created).toHaveLength(1);
      expect(result.created[0].name).toBe('Done but synced');
    });
  });

  // -----------------------------------------------------------------------
  // formatSyncReport
  // -----------------------------------------------------------------------

  describe('formatSyncReport', () => {
    it('should produce readable output for a mixed result', () => {
      const result: SyncResult = {
        created: [
          { name: 'New task', omnifocusId: 'of-1', file: 'a.md', lineNumber: 1 },
        ],
        updated: [
          { name: 'Changed task', omnifocusId: 'of-2', file: 'b.md', lineNumber: 5 },
        ],
        skipped: [
          { name: 'Skipped task', reason: 'unchanged', file: 'c.md', lineNumber: 10 },
        ],
        errors: [
          { name: 'Bad task', error: 'parse failure', file: 'd.md', lineNumber: 20 },
        ],
        dryRun: false,
      };

      const report = manager.formatSyncReport(result);

      expect(report).toContain('Sync Report');
      expect(report).toContain('Created (1)');
      expect(report).toContain('New task');
      expect(report).toContain('Updated (1)');
      expect(report).toContain('Changed task');
      expect(report).toContain('Skipped (1)');
      expect(report).toContain('Skipped task');
      expect(report).toContain('Errors (1)');
      expect(report).toContain('Bad task');
      expect(report).toContain('Total tasks processed: 4');
    });

    it('should indicate dry run in the report header', () => {
      const result: SyncResult = {
        created: [],
        updated: [],
        skipped: [],
        errors: [],
        dryRun: true,
      };

      const report = manager.formatSyncReport(result);
      expect(report).toContain('dry run');
    });

    it('should handle empty results gracefully', () => {
      const result: SyncResult = {
        created: [],
        updated: [],
        skipped: [],
        errors: [],
        dryRun: false,
      };

      const report = manager.formatSyncReport(result);
      expect(report).toContain('Total tasks processed: 0');
      expect(report).not.toContain('Created');
      expect(report).not.toContain('Updated');
      expect(report).not.toContain('Skipped');
      expect(report).not.toContain('Errors');
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('should capture errors for individual tasks without aborting', async () => {
      // Create a subclass that throws on a specific task to simulate an error
      class FailingBatchSyncManager extends BatchSyncManager {
        private failOnTask: string;

        constructor(syncStatePath: string, failOnTask: string) {
          super(syncStatePath);
          this.failOnTask = failOnTask;
        }

        async syncFile(
          filePath: string,
          content: string,
          options: SyncOptions,
          parsedFile?: ParsedMarkdownFile,
        ): Promise<SyncResult> {
          // Override to inject failure for specific task
          return super.syncFile(filePath, content, options, parsedFile);
        }
      }

      // We can test error handling by passing tasks to the base syncFile
      // and verifying errors are collected. Since processTask is private,
      // we test via a file with no parsedFile (empty tasks) and through
      // the syncVault path with a non-existent file.
      const failingManager = new (class extends BatchSyncManager {
        protected override async readFile(_filePath: string): Promise<string> {
          throw new Error('File not found: missing.md');
        }
      })('/tmp/test.json');

      const options = makeOptions({ files: ['missing.md'] });
      const result = await failingManager.syncVault(options);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('File not found');
      expect(result.errors[0].file).toBe('missing.md');
    });

    it('should return empty results for a file with no tasks', async () => {
      const parsed = makeParsedFile('empty.md', []);
      const options = makeOptions();

      const result = await manager.syncFile('empty.md', '', options, parsed);

      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Hierarchy / children
  // -----------------------------------------------------------------------

  describe('task hierarchy', () => {
    it('should process nested children tasks', async () => {
      const child = makeTask({ name: 'Subtask', lineNumber: 3, indentLevel: 1 });
      const parent = makeTask({
        name: 'Parent',
        lineNumber: 2,
        children: [child],
        indentLevel: 0,
      });
      const parsed = makeParsedFile('hierarchy.md', [parent]);
      const options = makeOptions({ preserveHierarchy: true });

      const result = await manager.syncFile('hierarchy.md', '', options, parsed);

      expect(result.created).toHaveLength(2);
      expect(result.created.map((e) => e.name)).toContain('Parent');
      expect(result.created.map((e) => e.name)).toContain('Subtask');
    });
  });

  // -----------------------------------------------------------------------
  // previewSync
  // -----------------------------------------------------------------------

  describe('previewSync', () => {
    it('should force dryRun=true regardless of input', async () => {
      // Override readFile to avoid real FS access
      const mgr = new (class extends BatchSyncManager {
        protected override async readFile(_filePath: string): Promise<string> {
          return '- [ ] A task';
        }
      })('/tmp/test.json');

      const options = makeOptions({ dryRun: false, files: ['test.md'] });
      const result = await mgr.previewSync(options);

      expect(result.dryRun).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // syncVault
  // -----------------------------------------------------------------------

  describe('syncVault', () => {
    it('should aggregate results from multiple files', async () => {
      const mgr = new (class extends BatchSyncManager {
        protected override async readFile(_filePath: string): Promise<string> {
          return '';
        }

        override async syncFile(
          filePath: string,
          content: string,
          options: SyncOptions,
          _parsedFile?: ParsedMarkdownFile,
        ): Promise<SyncResult> {
          // Simulate one created task per file
          return {
            created: [
              {
                name: `Task from ${filePath}`,
                omnifocusId: `of-${filePath}`,
                file: filePath,
                lineNumber: 1,
              },
            ],
            updated: [],
            skipped: [],
            errors: [],
            dryRun: options.dryRun,
          };
        }
      })('/tmp/test.json');

      const options = makeOptions({
        files: ['file1.md', 'file2.md', 'file3.md'],
      });

      const result = await mgr.syncVault(options);

      expect(result.created).toHaveLength(3);
      expect(result.created.map((e) => e.file)).toEqual([
        'file1.md',
        'file2.md',
        'file3.md',
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // computeChecksum utility
  // -----------------------------------------------------------------------

  describe('computeChecksum', () => {
    it('should produce consistent results for the same input', () => {
      const a = computeChecksum('hello world');
      const b = computeChecksum('hello world');
      expect(a).toBe(b);
    });

    it('should produce different results for different input', () => {
      const a = computeChecksum('hello');
      const b = computeChecksum('world');
      expect(a).not.toBe(b);
    });

    it('should return an 8-character hex string', () => {
      const result = computeChecksum('test');
      expect(result).toMatch(/^[0-9a-f]{8}$/);
    });
  });
});
