import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  SyncStateManager,
  embedOmniFocusId,
  extractOmniFocusId,
  type SyncRecord,
  type ConflictRecord,
  type SyncState,
} from '../sync/syncState.js';

function makeSyncRecord(overrides: Partial<SyncRecord> = {}): SyncRecord {
  return {
    omnifocusId: 'of-task-001',
    markdownFile: 'projects/myproject.md',
    lineNumber: 10,
    taskName: 'Test task',
    lastSyncedAt: '2026-01-01T00:00:00.000Z',
    lastModifiedAt: '2026-01-01T00:00:00.000Z',
    syncDirection: 'bidirectional',
    checksum: 'abc123',
    status: 'synced',
    ...overrides,
  };
}

describe('SyncStateManager', () => {
  let tmpDir: string;
  let stateFilePath: string;
  let manager: SyncStateManager;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'sync-test-'));
    stateFilePath = join(tmpDir, 'sync-state.json');
    manager = new SyncStateManager(stateFilePath);
  });

  afterEach(async () => {
    try {
      await unlink(stateFilePath);
    } catch {
      // file may not exist
    }
  });

  describe('load and save', () => {
    it('should return empty state when file does not exist', async () => {
      const state = await manager.load();
      expect(state.version).toBe(1);
      expect(state.lastFullSync).toBeNull();
      expect(state.records).toEqual({});
      expect(state.conflicts).toEqual([]);
    });

    it('should persist state to disk and reload it', async () => {
      const record = makeSyncRecord();
      manager.upsertRecord(record);

      const state = await manager.load();
      state.records[record.omnifocusId] = record;
      state.lastFullSync = '2026-03-01T00:00:00.000Z';
      await manager.save(state);

      const manager2 = new SyncStateManager(stateFilePath);
      const loaded = await manager2.load();
      expect(loaded.version).toBe(1);
      expect(loaded.lastFullSync).toBe('2026-03-01T00:00:00.000Z');
      expect(loaded.records['of-task-001']).toEqual(record);
    });

    it('should write valid JSON to disk', async () => {
      const state = await manager.load();
      await manager.save(state);
      const raw = await readFile(stateFilePath, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    });
  });

  describe('upsert and retrieve records', () => {
    it('should upsert and get a record', async () => {
      await manager.load();
      const record = makeSyncRecord();
      manager.upsertRecord(record);

      const fetched = manager.getRecord('of-task-001');
      expect(fetched).toEqual(record);
    });

    it('should return null for non-existent record', async () => {
      await manager.load();
      expect(manager.getRecord('nonexistent')).toBeNull();
    });

    it('should overwrite existing record on upsert', async () => {
      await manager.load();
      manager.upsertRecord(makeSyncRecord());
      manager.upsertRecord(makeSyncRecord({ taskName: 'Updated task' }));

      const fetched = manager.getRecord('of-task-001');
      expect(fetched?.taskName).toBe('Updated task');
    });
  });

  describe('delete records', () => {
    it('should delete an existing record', async () => {
      await manager.load();
      manager.upsertRecord(makeSyncRecord());
      manager.deleteRecord('of-task-001');

      expect(manager.getRecord('of-task-001')).toBeNull();
    });

    it('should not throw when deleting a non-existent record', async () => {
      await manager.load();
      expect(() => manager.deleteRecord('nonexistent')).not.toThrow();
    });
  });

  describe('findByMarkdownFile', () => {
    it('should find records matching the given file path', async () => {
      await manager.load();
      manager.upsertRecord(makeSyncRecord({ omnifocusId: 'a', markdownFile: 'file1.md' }));
      manager.upsertRecord(makeSyncRecord({ omnifocusId: 'b', markdownFile: 'file1.md' }));
      manager.upsertRecord(makeSyncRecord({ omnifocusId: 'c', markdownFile: 'file2.md' }));

      const results = manager.findByMarkdownFile('file1.md');
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.omnifocusId).sort()).toEqual(['a', 'b']);
    });

    it('should return empty array when no records match', async () => {
      await manager.load();
      expect(manager.findByMarkdownFile('missing.md')).toEqual([]);
    });
  });

  describe('conflict detection and resolution', () => {
    it('should add and find conflicts', async () => {
      await manager.load();
      const conflict: ConflictRecord = {
        omnifocusId: 'of-task-001',
        detectedAt: '2026-03-01T00:00:00.000Z',
        obsidianContent: '- [ ] Task from obsidian',
        omnifocusContent: 'Task from OmniFocus',
        resolution: 'pending',
      };
      manager.addConflict(conflict);

      const conflicts = manager.findConflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toEqual(conflict);
    });

    it('should resolve a conflict by omnifocusId', async () => {
      await manager.load();
      manager.addConflict({
        omnifocusId: 'of-task-001',
        detectedAt: '2026-03-01T00:00:00.000Z',
        obsidianContent: '- [ ] Task',
        omnifocusContent: 'Task',
        resolution: 'pending',
      });

      manager.resolveConflict('of-task-001', 'obsidian-wins');
      const conflicts = manager.findConflicts();
      expect(conflicts[0].resolution).toBe('obsidian-wins');
    });

    it('should handle resolving a non-existent conflict gracefully', async () => {
      await manager.load();
      expect(() => manager.resolveConflict('nonexistent', 'manual')).not.toThrow();
    });
  });

  describe('checksum and change detection', () => {
    it('should produce consistent checksums', async () => {
      await manager.load();
      const a = manager.computeChecksum('hello world');
      const b = manager.computeChecksum('hello world');
      expect(a).toBe(b);
    });

    it('should produce different checksums for different content', async () => {
      await manager.load();
      const a = manager.computeChecksum('hello');
      const b = manager.computeChecksum('world');
      expect(a).not.toBe(b);
    });

    it('should detect new content when no record exists', async () => {
      await manager.load();
      expect(manager.detectChanges('new-id', 'some content')).toBe('new');
    });

    it('should detect unchanged content', async () => {
      await manager.load();
      const content = 'task content here';
      const checksum = manager.computeChecksum(content);
      manager.upsertRecord(makeSyncRecord({ omnifocusId: 'det-1', checksum }));

      expect(manager.detectChanges('det-1', content)).toBe('unchanged');
    });

    it('should detect modified content', async () => {
      await manager.load();
      const checksum = manager.computeChecksum('original content');
      manager.upsertRecord(makeSyncRecord({ omnifocusId: 'det-2', checksum }));

      expect(manager.detectChanges('det-2', 'modified content')).toBe('modified');
    });
  });

  describe('getStats', () => {
    it('should return accurate stats', async () => {
      await manager.load();
      manager.upsertRecord(makeSyncRecord({ omnifocusId: 'a', status: 'synced' }));
      manager.upsertRecord(makeSyncRecord({ omnifocusId: 'b', status: 'synced' }));
      manager.upsertRecord(makeSyncRecord({ omnifocusId: 'c', status: 'modified' }));
      manager.upsertRecord(makeSyncRecord({ omnifocusId: 'd', status: 'conflict' }));
      manager.addConflict({
        omnifocusId: 'd',
        detectedAt: '2026-03-01T00:00:00.000Z',
        obsidianContent: 'x',
        omnifocusContent: 'y',
        resolution: 'pending',
      });

      const stats = manager.getStats();
      expect(stats.total).toBe(4);
      expect(stats.synced).toBe(2);
      expect(stats.modified).toBe(1);
      expect(stats.conflicts).toBe(1);
    });

    it('should return zeros for empty state', async () => {
      await manager.load();
      const stats = manager.getStats();
      expect(stats).toEqual({ total: 0, synced: 0, modified: 0, conflicts: 0 });
    });
  });
});

describe('embedOmniFocusId / extractOmniFocusId', () => {
  it('should round-trip an ID through embed and extract', () => {
    const line = '- [ ] My task';
    const id = 'of-abc-123';
    const embedded = embedOmniFocusId(line, id);
    const extracted = extractOmniFocusId(embedded);
    expect(extracted).toBe(id);
  });

  it('should embed an ID as an HTML comment', () => {
    const result = embedOmniFocusId('- [ ] Task', 'id-42');
    expect(result).toBe('- [ ] Task <!-- omnifocus:id-42 -->');
  });

  it('should extract an ID from a line with an embedded comment', () => {
    const result = extractOmniFocusId('- [x] Done task <!-- omnifocus:xyz789 -->');
    expect(result).toBe('xyz789');
  });

  it('should return null when no ID is present', () => {
    expect(extractOmniFocusId('- [ ] Just a normal task')).toBeNull();
  });

  it('should handle IDs with various characters', () => {
    const id = 'abc_DEF-123.456';
    const embedded = embedOmniFocusId('- [ ] Task', id);
    expect(extractOmniFocusId(embedded)).toBe(id);
  });
});
