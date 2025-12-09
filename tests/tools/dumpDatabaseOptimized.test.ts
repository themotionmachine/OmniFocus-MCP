import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../src/utils/cacheManager.js', () => ({
  getCacheManager: vi.fn()
}));

vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

vi.mock('../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/mock_script.js',
    cleanup: vi.fn()
  }))
}));

vi.mock('../../src/tools/dumpDatabase.js', () => ({
  dumpDatabase: vi.fn()
}));

import { dumpDatabase } from '../../src/tools/dumpDatabase.js';
import {
  dumpDatabaseOptimized,
  getChangesSince,
  getDatabaseStats
} from '../../src/tools/dumpDatabaseOptimized.js';
import type { OmnifocusDatabase } from '../../src/types.js';
import { getCacheManager } from '../../src/utils/cacheManager.js';
import { executeOmniFocusScript } from '../../src/utils/scriptExecution.js';

const mockGetCacheManager = vi.mocked(getCacheManager);
const mockDumpDatabase = vi.mocked(dumpDatabase);
const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('dumpDatabaseOptimized', () => {
  const mockDatabase: OmnifocusDatabase = {
    exportDate: '2024-12-25T00:00:00Z',
    tasks: [],
    projects: {},
    folders: {},
    tags: {}
  };

  const mockCacheManager = {
    get: vi.fn(),
    set: vi.fn(),
    trackHit: vi.fn(),
    trackMiss: vi.fn(),
    getStats: vi.fn(() => ({
      entries: 1,
      sizeEstimateMB: 0.5,
      oldestEntry: new Date(),
      hitRate: 50
    }))
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockGetCacheManager.mockReturnValue(
      mockCacheManager as unknown as ReturnType<typeof getCacheManager>
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('dumpDatabaseOptimized', () => {
    it('should return cached data on cache hit', async () => {
      mockCacheManager.get.mockResolvedValue(mockDatabase);

      const result = await dumpDatabaseOptimized();

      expect(result).toEqual(mockDatabase);
      expect(mockCacheManager.trackHit).toHaveBeenCalled();
      expect(mockDumpDatabase).not.toHaveBeenCalled();
    });

    it('should fetch fresh data on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockDumpDatabase.mockResolvedValue(mockDatabase);

      const result = await dumpDatabaseOptimized();

      expect(result).toEqual(mockDatabase);
      expect(mockCacheManager.trackMiss).toHaveBeenCalled();
      expect(mockDumpDatabase).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith('full-dump', mockDatabase);
    });

    it('should force refresh when forceRefresh is true', async () => {
      mockCacheManager.get.mockResolvedValue(mockDatabase);
      mockDumpDatabase.mockResolvedValue(mockDatabase);

      const result = await dumpDatabaseOptimized({ forceRefresh: true });

      expect(result).toEqual(mockDatabase);
      expect(mockCacheManager.trackMiss).toHaveBeenCalled();
      expect(mockDumpDatabase).toHaveBeenCalled();
    });

    it('should use custom cache key when provided', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockDumpDatabase.mockResolvedValue(mockDatabase);

      await dumpDatabaseOptimized({ cacheKey: 'custom-key' });

      expect(mockCacheManager.get).toHaveBeenCalledWith('custom-key');
      expect(mockCacheManager.set).toHaveBeenCalledWith('custom-key', mockDatabase);
    });
  });

  describe('getDatabaseStats', () => {
    it('should return database statistics', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        taskCount: 100,
        activeTaskCount: 75,
        projectCount: 20,
        activeProjectCount: 15,
        folderCount: 5,
        tagCount: 30,
        overdueCount: 10,
        nextActionCount: 25,
        flaggedCount: 5,
        inboxCount: 3,
        lastModified: '2024-12-25T10:00:00Z'
      });

      const result = await getDatabaseStats();

      expect(result.taskCount).toBe(100);
      expect(result.activeTaskCount).toBe(75);
      expect(result.projectCount).toBe(20);
      expect(result.overdueCount).toBe(10);
      expect(result.flaggedCount).toBe(5);
    });

    it('should throw error when script returns error', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        error: 'Failed to get database stats'
      });

      await expect(getDatabaseStats()).rejects.toThrow('Failed to get database stats');
    });
  });

  describe('getChangesSince', () => {
    it('should return changes since specified date', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        newTasks: [{ id: 'new-task', name: 'New Task' }],
        updatedTasks: [{ id: 'updated-task', name: 'Updated Task' }],
        completedTasks: [{ id: 'completed-task', name: 'Completed Task' }],
        newProjects: [{ id: 'new-project', name: 'New Project' }],
        updatedProjects: []
      });

      const result = await getChangesSince(new Date('2024-12-20'));

      expect(result.newTasks).toHaveLength(1);
      expect(result.updatedTasks).toHaveLength(1);
      expect(result.completedTasks).toHaveLength(1);
      expect(result.newProjects).toHaveLength(1);
      expect(result.updatedProjects).toHaveLength(0);
    });

    it('should throw error when script returns error', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        error: 'Failed to get changes'
      });

      await expect(getChangesSince(new Date())).rejects.toThrow('Failed to get changes');
    });

    it('should handle empty change sets', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        newTasks: [],
        updatedTasks: [],
        completedTasks: [],
        newProjects: [],
        updatedProjects: []
      });

      const result = await getChangesSince(new Date());

      expect(result.newTasks).toEqual([]);
      expect(result.updatedTasks).toEqual([]);
    });
  });
});
