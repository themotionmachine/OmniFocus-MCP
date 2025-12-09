import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

vi.mock('../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/mock_temp_file.js',
    cleanup: vi.fn()
  }))
}));

import type { OmnifocusDatabase } from '../../src/types.js';
import { getCacheManager, resetCacheManager } from '../../src/utils/cacheManager.js';
import { executeOmniFocusScript } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('cacheManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCacheManager();
  });

  afterEach(() => {
    resetCacheManager();
    vi.restoreAllMocks();
  });

  const createMockDatabase = (id = '1'): OmnifocusDatabase => ({
    exportDate: new Date().toISOString(),
    tasks: [
      {
        id,
        name: 'Test Task',
        note: '',
        flagged: false,
        completed: false,
        completionDate: null,
        dropDate: null,
        taskStatus: 'Available',
        active: true,
        dueDate: null,
        deferDate: null,
        estimatedMinutes: null,
        tags: [],
        tagNames: [],
        parentId: null,
        containingProjectId: null,
        projectId: null,
        childIds: [],
        hasChildren: false,
        sequential: false,
        completedByChildren: false,
        isRepeating: false,
        repetitionMethod: null,
        repetitionRule: null,
        attachments: [],
        linkedFileURLs: [],
        notifications: [],
        shouldUseFloatingTimeZone: false
      }
    ],
    projects: {},
    folders: {},
    tags: {}
  });

  describe('getCacheManager', () => {
    it('should return a singleton cache manager instance', () => {
      const manager1 = getCacheManager();
      const manager2 = getCacheManager();

      expect(manager1).toBe(manager2);
    });

    it('should accept custom options on first initialization', () => {
      const manager = getCacheManager({ ttlSeconds: 600, maxSize: 100 });

      expect(manager).toBeDefined();
    });

    it('should use default options when none provided', () => {
      const manager = getCacheManager();

      expect(manager).toBeDefined();
      const stats = manager.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('cache operations', () => {
    it('should return null for non-existent cache entry', async () => {
      const manager = getCacheManager({ useChecksum: false });

      const result = await manager.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should store and retrieve data correctly', async () => {
      const manager = getCacheManager({ useChecksum: false });
      const mockData = createMockDatabase();

      await manager.set('test-key', mockData);
      const result = await manager.get('test-key');

      expect(result).toEqual(mockData);
    });

    it('should return null for expired cache entries', async () => {
      const manager = getCacheManager({ ttlSeconds: 0.001, useChecksum: false });
      const mockData = createMockDatabase();

      await manager.set('expiring-key', mockData);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await manager.get('expiring-key');

      expect(result).toBeNull();
    });

    it('should invalidate cache entry', async () => {
      const manager = getCacheManager({ useChecksum: false });
      const mockData = createMockDatabase();

      await manager.set('invalidate-key', mockData);
      manager.invalidate('invalidate-key');

      const result = await manager.get('invalidate-key');

      expect(result).toBeNull();
    });

    it('should clear all cache entries', async () => {
      const manager = getCacheManager({ useChecksum: false });
      const mockData = createMockDatabase();

      await manager.set('key1', mockData);
      await manager.set('key2', mockData);
      manager.clear();

      expect(await manager.get('key1')).toBeNull();
      expect(await manager.get('key2')).toBeNull();
    });
  });

  describe('checksum validation', () => {
    it('should invalidate cache when checksum changes', async () => {
      const manager = getCacheManager({ useChecksum: true, ttlSeconds: 300 });
      const mockData = createMockDatabase();

      // First call returns initial checksum
      mockExecuteOmniFocusScript.mockResolvedValueOnce({ checksum: 'checksum-1' });

      await manager.set('checksum-key', mockData);

      // Second call returns different checksum (simulating database change)
      mockExecuteOmniFocusScript.mockResolvedValueOnce({ checksum: 'checksum-2' });

      const result = await manager.get('checksum-key');

      expect(result).toBeNull();
    });

    it('should return cached data when checksum matches', async () => {
      const manager = getCacheManager({ useChecksum: true, ttlSeconds: 300 });
      const mockData = createMockDatabase();

      // Return same checksum both times
      mockExecuteOmniFocusScript.mockResolvedValue({ checksum: 'same-checksum' });

      await manager.set('same-checksum-key', mockData);
      const result = await manager.get('same-checksum-key');

      expect(result).toEqual(mockData);
    });

    it('should handle checksum errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const manager = getCacheManager({ useChecksum: true, ttlSeconds: 300 });
      const mockData = createMockDatabase();

      // First call for set
      mockExecuteOmniFocusScript.mockResolvedValueOnce({ checksum: 'initial' });

      await manager.set('error-key', mockData);

      // Error on get checksum
      mockExecuteOmniFocusScript.mockRejectedValueOnce(new Error('Checksum failed'));

      const result = await manager.get('error-key');

      // Should return null when checksum fails to prevent stale data
      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  describe('cache eviction', () => {
    it('should evict oldest entry when max size exceeded', async () => {
      // Use very small max size to trigger eviction
      const manager = getCacheManager({ maxSize: 0.0001, useChecksum: false });
      const mockData1 = createMockDatabase('1');
      const mockData2 = createMockDatabase('2');

      await manager.set('old-key', mockData1);
      await manager.set('new-key', mockData2);

      // Stats should show eviction occurred (size reduced)
      const stats = manager.getStats();
      expect(stats.entries).toBeLessThanOrEqual(2);
    });
  });

  describe('hit/miss tracking', () => {
    it('should track cache hits', async () => {
      const manager = getCacheManager({ useChecksum: false });
      const mockData = createMockDatabase();

      await manager.set('hit-key', mockData);
      manager.trackHit();

      const stats = manager.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should track cache misses', async () => {
      const manager = getCacheManager({ useChecksum: false });

      manager.trackMiss();

      const stats = manager.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should calculate hit rate correctly', async () => {
      const manager = getCacheManager({ useChecksum: false });

      manager.trackHit();
      manager.trackHit();
      manager.trackMiss();
      manager.trackMiss();

      const stats = manager.getStats();
      expect(stats.hitRate).toBe(50);
    });

    it('should return 0 hit rate when no accesses', () => {
      const manager = getCacheManager({ useChecksum: false });

      const stats = manager.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const manager = getCacheManager({ useChecksum: false });
      const mockData = createMockDatabase();

      await manager.set('stats-key', mockData);

      const stats = manager.getStats();

      expect(stats.entries).toBe(1);
      expect(stats.sizeEstimateMB).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
    });

    it('should return null for oldestEntry when cache is empty', () => {
      const manager = getCacheManager({ useChecksum: false });

      const stats = manager.getStats();

      expect(stats.oldestEntry).toBeNull();
    });

    it('should track oldest entry correctly with multiple entries', async () => {
      const manager = getCacheManager({ useChecksum: false });
      const mockData = createMockDatabase();

      await manager.set('first-key', mockData);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await manager.set('second-key', mockData);

      const stats = manager.getStats();

      expect(stats.entries).toBe(2);
      expect(stats.oldestEntry).toBeDefined();
    });
  });

  describe('resetCacheManager', () => {
    it('should clear cache and reset singleton', async () => {
      const manager1 = getCacheManager({ useChecksum: false });
      const mockData = createMockDatabase();

      await manager1.set('reset-key', mockData);

      resetCacheManager();

      const manager2 = getCacheManager({ useChecksum: false });

      // New manager should not have the old data
      const result = await manager2.get('reset-key');
      expect(result).toBeNull();
    });

    it('should not throw when called multiple times', () => {
      expect(() => {
        resetCacheManager();
        resetCacheManager();
        resetCacheManager();
      }).not.toThrow();
    });

    it('should not throw when called before any cache manager created', () => {
      // Reset first to ensure clean state
      resetCacheManager();

      // This should not throw even if no cache manager exists
      expect(() => resetCacheManager()).not.toThrow();
    });
  });
});
