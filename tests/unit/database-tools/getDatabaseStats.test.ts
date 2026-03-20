import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateGetDatabaseStatsScript,
  getDatabaseStats
} from '../../../src/tools/primitives/getDatabaseStats.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T037: Unit tests for getDatabaseStats primitive

describe('getDatabaseStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return stats on success', async () => {
    const mockResponse = {
      success: true,
      tasks: { available: 10, blocked: 3, completed: 50, dropped: 2, total: 65 },
      projects: { active: 5, onHold: 2, completed: 10, dropped: 1, total: 18 },
      folders: 8,
      tags: 15,
      inbox: 3
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getDatabaseStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks.total).toBe(65);
      expect(result.projects.total).toBe(18);
      expect(result.folders).toBe(8);
      expect(result.tags).toBe(15);
      expect(result.inbox).toBe(3);
    }
  });

  it('should return empty stats for empty database', async () => {
    const mockResponse = {
      success: true,
      tasks: { available: 0, blocked: 0, completed: 0, dropped: 0, total: 0 },
      projects: { active: 0, onHold: 0, completed: 0, dropped: 0, total: 0 },
      folders: 0,
      tags: 0,
      inbox: 0
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getDatabaseStats();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tasks.total).toBe(0);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = { success: false, error: 'Script failed' };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getDatabaseStats();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Script failed');
    }
  });
});

describe('generateGetDatabaseStatsScript', () => {
  it('should contain root task skip pattern', () => {
    const script = generateGetDatabaseStatsScript();

    expect(script).toContain('task.containingProject !== null');
    expect(script).toContain('task.id.primaryKey === task.containingProject.id.primaryKey');
  });

  it('should group tasks by status (Available+DueSoon+Next+Overdue -> available)', () => {
    const script = generateGetDatabaseStatsScript();

    expect(script).toContain('Task.Status.Completed');
    expect(script).toContain('Task.Status.Dropped');
    expect(script).toContain('Task.Status.Blocked');
    // Available, DueSoon, Next, Overdue go to the else branch (available++)
    expect(script).toContain('available++');
  });

  it('should map project statuses', () => {
    const script = generateGetDatabaseStatsScript();

    expect(script).toContain('Project.Status.Active');
    expect(script).toContain('Project.Status.OnHold');
    expect(script).toContain('Project.Status.Done');
    expect(script).toContain('Project.Status.Dropped');
  });

  it('should use .length for folders, tags, and inbox', () => {
    const script = generateGetDatabaseStatsScript();

    expect(script).toContain('flattenedFolders.length');
    expect(script).toContain('flattenedTags.length');
    expect(script).toContain('inbox.length');
  });

  it('should compute total as sum of parts', () => {
    const script = generateGetDatabaseStatsScript();

    expect(script).toContain('total: available + blocked + completed + dropped');
    expect(script).toContain('total: projActive + projOnHold + projCompleted + projDropped');
  });

  it('should iterate flattenedTasks and flattenedProjects', () => {
    const script = generateGetDatabaseStatsScript();

    expect(script).toContain('flattenedTasks.forEach');
    expect(script).toContain('flattenedProjects.forEach');
  });

  it('should wrap script in IIFE with try-catch', () => {
    const script = generateGetDatabaseStatsScript();

    expect(script).toMatch(/^\(function\(\) \{/);
    expect(script).toContain('} catch (e) {');
    expect(script).toMatch(/\}\)\(\);$/);
  });
});
