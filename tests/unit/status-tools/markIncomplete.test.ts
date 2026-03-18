import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateMarkIncompleteScript,
  markIncomplete
} from '../../../src/tools/primitives/markIncomplete.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T010: Unit tests for markIncomplete primitive

describe('markIncomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reopen completed task', () => {
    it('should reopen a completed task using markIncomplete()', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-abc',
            itemName: 'Buy groceries',
            itemType: 'task',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markIncomplete({ items: [{ id: 'task-abc' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].itemId).toBe('task-abc');
        expect(result.results[0].itemType).toBe('task');
        expect(result.summary.total).toBe(1);
        expect(result.summary.succeeded).toBe(1);
        expect(result.summary.failed).toBe(0);
      }
    });
  });

  describe('reopen dropped task', () => {
    it('should reopen a dropped task using active = true', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-dropped',
            itemName: 'Dropped Task',
            itemType: 'task',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markIncomplete({ items: [{ id: 'task-dropped' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].itemId).toBe('task-dropped');
      }
    });
  });

  describe('reopen completed project', () => {
    it('should reopen a completed project using markIncomplete()', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'proj-done',
            itemName: 'Done Project',
            itemType: 'project',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markIncomplete({ items: [{ id: 'proj-done' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].itemType).toBe('project');
      }
    });
  });

  describe('reopen dropped project', () => {
    it('should reopen a dropped project using status = Project.Status.Active', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'proj-dropped',
            itemName: 'Dropped Project',
            itemType: 'project',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markIncomplete({ items: [{ id: 'proj-dropped' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].itemType).toBe('project');
      }
    });
  });

  describe('idempotent: ALREADY_ACTIVE', () => {
    it('should return success with ALREADY_ACTIVE for an already-active item', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-active',
            itemName: 'Active Task',
            itemType: 'task',
            success: true,
            code: 'ALREADY_ACTIVE'
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markIncomplete({ items: [{ id: 'task-active' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].code).toBe('ALREADY_ACTIVE');
      }
    });
  });

  describe('batch with mixed states', () => {
    it('should handle batch with completed + dropped + active items', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-completed',
            itemName: 'Completed Task',
            itemType: 'task',
            success: true
          },
          {
            itemId: 'task-dropped',
            itemName: 'Dropped Task',
            itemType: 'task',
            success: true
          },
          {
            itemId: 'task-active',
            itemName: 'Active Task',
            itemType: 'task',
            success: true,
            code: 'ALREADY_ACTIVE'
          }
        ],
        summary: { total: 3, succeeded: 3, failed: 0 }
      });

      const result = await markIncomplete({
        items: [{ id: 'task-completed' }, { id: 'task-dropped' }, { id: 'task-active' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(3);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(true);
        expect(result.results[2].success).toBe(true);
        expect(result.results[2].code).toBe('ALREADY_ACTIVE');
        expect(result.summary.total).toBe(3);
        expect(result.summary.succeeded).toBe(3);
        expect(result.summary.failed).toBe(0);
      }
    });
  });

  describe('NOT_FOUND', () => {
    it('should return NOT_FOUND when item ID does not exist', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'bad-id',
            itemName: '',
            itemType: 'task',
            success: false,
            error: 'Item not found: bad-id',
            code: 'NOT_FOUND'
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await markIncomplete({ items: [{ id: 'bad-id' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('NOT_FOUND');
        expect(result.results[0].error).toContain('not found');
        expect(result.summary.failed).toBe(1);
      }
    });
  });

  describe('disambiguation', () => {
    it('should return DISAMBIGUATION_REQUIRED with candidates when name matches multiple items', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: '',
            itemName: 'Home',
            itemType: 'task',
            success: false,
            error: "Multiple items match 'Home'. Use ID.",
            code: 'DISAMBIGUATION_REQUIRED',
            candidates: [
              { id: 'task-home-1', name: 'Home', type: 'task' },
              { id: 'proj-home-1', name: 'Home', type: 'project' }
            ]
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await markIncomplete({ items: [{ name: 'Home' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        const itemResult = result.results[0];
        expect(itemResult.success).toBe(false);
        expect(itemResult.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(itemResult.candidates).toHaveLength(2);
        expect(itemResult.candidates?.[0].id).toBe('task-home-1');
        expect(itemResult.candidates?.[1].id).toBe('proj-home-1');
      }
    });
  });

  describe('catastrophic failure', () => {
    it('should return structured error on OmniJS failure', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'OmniFocus is not running'
      });

      const result = await markIncomplete({ items: [{ id: 'task-abc' }] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('OmniFocus is not running');
      }
    });

    it('should propagate errors from executeOmniJS rejection', async () => {
      vi.mocked(executeOmniJS).mockRejectedValue(new Error('Script execution failed'));

      await expect(markIncomplete({ items: [{ id: 'task-abc' }] })).rejects.toThrow(
        'Script execution failed'
      );
    });
  });

  describe('lookup by name', () => {
    it('should accept item lookup by name (unique match)', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-resolved',
            itemName: 'Buy groceries',
            itemType: 'task',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markIncomplete({ items: [{ name: 'Buy groceries' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].itemName).toBe('Buy groceries');
        expect(result.results[0].success).toBe(true);
      }
    });
  });

  describe('script call', () => {
    it('should call executeOmniJS with generated script', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      await markIncomplete({ items: [{ id: 'task-abc' }] });

      expect(executeOmniJS).toHaveBeenCalledOnce();
      const calledScript = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(typeof calledScript).toBe('string');
      expect(calledScript).toContain('task-abc');
    });
  });
});

describe('generateMarkIncompleteScript', () => {
  it('should produce a valid OmniJS script string', () => {
    const script = generateMarkIncompleteScript({ items: [{ id: 'task-abc' }] });
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should include IIFE wrapper', () => {
    const script = generateMarkIncompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\)\(\);$/);
  });

  it('should include try-catch error handling', () => {
    const script = generateMarkIncompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('try');
    expect(script).toContain('catch');
    expect(script).toContain('JSON.stringify');
  });

  it('should embed item identifiers in the script', () => {
    const script = generateMarkIncompleteScript({
      items: [{ id: 'task-abc' }, { name: 'My Task' }]
    });
    expect(script).toContain('task-abc');
    expect(script).toContain('My Task');
  });

  it('should include state detection logic for tasks', () => {
    const script = generateMarkIncompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('item.completed');
    expect(script).toContain('markIncomplete');
    expect(script).toContain('item.active');
  });

  it('should include state detection logic for projects', () => {
    const script = generateMarkIncompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('Project.Status');
    expect(script).toContain('Project.Status.Active');
  });

  it('should include ALREADY_ACTIVE no-op handling', () => {
    const script = generateMarkIncompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('ALREADY_ACTIVE');
  });

  it('should include Task.byIdentifier and Project.byIdentifier for ID lookup', () => {
    const script = generateMarkIncompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('Task.byIdentifier');
    expect(script).toContain('Project.byIdentifier');
  });

  it('should include flattenedTasks and flattenedProjects for name lookup', () => {
    const script = generateMarkIncompleteScript({ items: [{ name: 'My Task' }] });
    expect(script).toContain('flattenedTasks');
    expect(script).toContain('flattenedProjects');
  });

  it('should include error codes for all error conditions', () => {
    const script = generateMarkIncompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('NOT_FOUND');
    expect(script).toContain('DISAMBIGUATION_REQUIRED');
    expect(script).toContain('ALREADY_ACTIVE');
  });

  it('should include summary object in return', () => {
    const script = generateMarkIncompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('summary');
    expect(script).toContain('succeeded');
    expect(script).toContain('failed');
  });

  it('should include dropDate check for dropped task detection', () => {
    const script = generateMarkIncompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('dropDate');
  });

  it('should properly escape special characters in item names', () => {
    const script = generateMarkIncompleteScript({
      items: [{ name: 'Task "Alpha" & Beta' }]
    });
    expect(typeof script).toBe('string');
    expect(script).toContain('Task \\"Alpha\\" & Beta');
  });
});
