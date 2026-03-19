import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateSearchTasksScript,
  searchTasks
} from '../../../src/tools/primitives/searchTasks.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T007: Unit tests for searchTasks primitive

describe('searchTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return matching tasks on success', async () => {
    const mockResponse = {
      success: true,
      results: [
        {
          id: 'task-1',
          name: 'Buy groceries',
          status: 'available',
          projectName: 'Personal',
          flagged: false
        }
      ],
      totalMatches: 1
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchTasks({ query: 'groceries', limit: 50, status: 'active' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Buy groceries');
      expect(result.totalMatches).toBe(1);
    }
  });

  it('should return empty results when no matches', async () => {
    const mockResponse = {
      success: true,
      results: [],
      totalMatches: 0
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchTasks({ query: 'nonexistent', limit: 50, status: 'active' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = { success: false, error: 'Script execution failed' };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchTasks({ query: 'test', limit: 50, status: 'active' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Script execution failed');
    }
  });

  it('should pass generated script to executeOmniJS', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({ success: true, results: [], totalMatches: 0 });

    await searchTasks({ query: 'test', limit: 10, status: 'completed' });

    expect(executeOmniJS).toHaveBeenCalledOnce();
    const script = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(script).toContain('var query = "test"');
    expect(script).toContain('var limit = 10');
    expect(script).toContain('var statusFilter = "completed"');
  });
});

describe('generateSearchTasksScript', () => {
  it('should generate script with query and default params', () => {
    const script = generateSearchTasksScript({
      query: 'groceries',
      limit: 50,
      status: 'active'
    });

    expect(script).toContain('var query = "groceries"');
    expect(script).toContain('var limit = 50');
    expect(script).toContain('var statusFilter = "active"');
  });

  it('should contain case-insensitive matching via toLowerCase', () => {
    const script = generateSearchTasksScript({
      query: 'test',
      limit: 50,
      status: 'active'
    });

    expect(script).toContain('query.toLowerCase()');
    expect(script).toContain('task.name.toLowerCase().includes(queryLower)');
  });

  it('should contain root task skip pattern', () => {
    const script = generateSearchTasksScript({
      query: 'test',
      limit: 50,
      status: 'active'
    });

    expect(script).toContain('task.containingProject !== null');
    expect(script).toContain('task.id.primaryKey === task.containingProject.id.primaryKey');
  });

  it('should contain status filter mapping for active filter', () => {
    const script = generateSearchTasksScript({
      query: 'test',
      limit: 50,
      status: 'active'
    });

    expect(script).toContain('Task.Status.Available');
    expect(script).toContain('Task.Status.Blocked');
    expect(script).toContain('Task.Status.DueSoon');
    expect(script).toContain('Task.Status.Next');
    expect(script).toContain('Task.Status.Overdue');
  });

  it('should contain completed status filter', () => {
    const script = generateSearchTasksScript({
      query: 'test',
      limit: 50,
      status: 'completed'
    });

    expect(script).toContain('statusFilter === "completed"');
    expect(script).toContain('Task.Status.Completed');
  });

  it('should apply result limit via slice', () => {
    const script = generateSearchTasksScript({
      query: 'test',
      limit: 10,
      status: 'active'
    });

    expect(script).toContain('matches.slice(0, limit)');
    expect(script).toContain('var limit = 10');
  });

  it('should compute totalMatches before applying limit', () => {
    const script = generateSearchTasksScript({
      query: 'test',
      limit: 50,
      status: 'active'
    });

    expect(script).toContain('var totalMatches = matches.length');
  });

  it('should map task status values to lowercase strings', () => {
    const script = generateSearchTasksScript({
      query: 'test',
      limit: 50,
      status: 'active'
    });

    expect(script).toContain('return "available"');
    expect(script).toContain('return "blocked"');
    expect(script).toContain('return "completed"');
    expect(script).toContain('return "dropped"');
    expect(script).toContain('return "dueSoon"');
    expect(script).toContain('return "next"');
    expect(script).toContain('return "overdue"');
  });

  it('should resolve projectName with Inbox for inbox tasks', () => {
    const script = generateSearchTasksScript({
      query: 'test',
      limit: 50,
      status: 'active'
    });

    expect(script).toContain('task.inInbox');
    expect(script).toContain('projectName = "Inbox"');
    expect(script).toContain('task.containingProject.name');
  });

  it('should include flagged property in result', () => {
    const script = generateSearchTasksScript({
      query: 'test',
      limit: 50,
      status: 'active'
    });

    expect(script).toContain('flagged: task.flagged');
  });

  it('should escape special characters in query', () => {
    const script = generateSearchTasksScript({
      query: 'test "quotes" and \\backslash',
      limit: 50,
      status: 'active'
    });

    expect(script).toContain('test \\"quotes\\" and \\\\backslash');
  });

  it('should wrap script in IIFE with try-catch', () => {
    const script = generateSearchTasksScript({
      query: 'test',
      limit: 50,
      status: 'active'
    });

    expect(script).toMatch(/^\(function\(\) \{/);
    expect(script).toContain('} catch (e) {');
    expect(script).toContain('e.message || String(e)');
    expect(script).toMatch(/\}\)\(\);$/);
  });
});
