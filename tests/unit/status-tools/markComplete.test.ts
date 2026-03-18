import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateMarkCompleteScript,
  markComplete
} from '../../../src/tools/primitives/markComplete.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// Unit tests for markComplete primitive

describe('markComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('single task by ID', () => {
    it('should mark a single task complete by ID successfully', async () => {
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

      const result = await markComplete({ items: [{ id: 'task-abc' }] });

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

    it('should call executeOmniJS with generated script containing task id', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      await markComplete({ items: [{ id: 'task-abc' }] });

      expect(executeOmniJS).toHaveBeenCalledOnce();
      const calledScript = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(typeof calledScript).toBe('string');
      expect(calledScript).toContain('task-abc');
    });
  });

  describe('single task by name', () => {
    it('should mark a single task complete by name when unique', async () => {
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

      const result = await markComplete({ items: [{ name: 'Buy groceries' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].itemName).toBe('Buy groceries');
        expect(result.results[0].success).toBe(true);
      }
    });
  });

  describe('project completion', () => {
    it('should mark a project complete by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'proj-abc',
            itemName: 'Work Projects',
            itemType: 'project',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markComplete({ items: [{ id: 'proj-abc' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].itemType).toBe('project');
        expect(result.results[0].success).toBe(true);
      }
    });
  });

  describe('optional completionDate', () => {
    it('should pass completionDate to executeOmniJS script', async () => {
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

      await markComplete({
        items: [{ id: 'task-abc' }],
        completionDate: '2026-03-01T10:00:00.000Z'
      });

      const calledScript = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(calledScript).toContain('2026-03-01T10:00:00.000Z');
    });

    it('should work without completionDate (uses null/current date)', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-abc',
            itemName: 'Task',
            itemType: 'task',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markComplete({ items: [{ id: 'task-abc' }] });

      expect(result.success).toBe(true);
      expect(executeOmniJS).toHaveBeenCalledOnce();
    });
  });

  describe('idempotent behavior (ALREADY_COMPLETED)', () => {
    it('should return success=true with ALREADY_COMPLETED code for already-completed task', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-done',
            itemName: 'Already Done',
            itemType: 'task',
            success: true,
            code: 'ALREADY_COMPLETED'
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await markComplete({ items: [{ id: 'task-done' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].code).toBe('ALREADY_COMPLETED');
      }
    });
  });

  describe('disambiguation', () => {
    it('should return DISAMBIGUATION_REQUIRED when name matches multiple items', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: '',
            itemName: 'Meeting',
            itemType: 'task',
            success: false,
            error: "Multiple items match 'Meeting'. Use ID for precision.",
            code: 'DISAMBIGUATION_REQUIRED',
            candidates: [
              { id: 'task-1', name: 'Meeting', type: 'task' },
              { id: 'task-2', name: 'Meeting', type: 'task' }
            ]
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await markComplete({ items: [{ name: 'Meeting' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        const itemResult = result.results[0];
        expect(itemResult.success).toBe(false);
        expect(itemResult.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(itemResult.candidates).toHaveLength(2);
        expect(itemResult.candidates?.[0].id).toBe('task-1');
      }
    });
  });

  describe('batch with partial failure (NOT_FOUND)', () => {
    it('should return success for found items and NOT_FOUND for missing ones', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-good',
            itemName: 'Good Task',
            itemType: 'task',
            success: true
          },
          {
            itemId: 'task-missing',
            itemName: '',
            itemType: 'task',
            success: false,
            error: 'Item not found: task-missing',
            code: 'NOT_FOUND'
          }
        ],
        summary: { total: 2, succeeded: 1, failed: 1 }
      });

      const result = await markComplete({
        items: [{ id: 'task-good' }, { id: 'task-missing' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
        expect(result.results[1].code).toBe('NOT_FOUND');
        expect(result.summary.succeeded).toBe(1);
        expect(result.summary.failed).toBe(1);
      }
    });

    it('should preserve original array indices in results', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: '',
            itemName: 'NotFound',
            itemType: 'task',
            success: false,
            error: 'Item not found: NotFound',
            code: 'NOT_FOUND'
          },
          {
            itemId: 'task-2',
            itemName: 'Found Task',
            itemType: 'task',
            success: true
          }
        ],
        summary: { total: 2, succeeded: 1, failed: 1 }
      });

      const result = await markComplete({
        items: [{ name: 'NotFound' }, { id: 'task-2' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[1].success).toBe(true);
        expect(result.results[1].itemId).toBe('task-2');
      }
    });
  });

  describe('batch with duplicate identifiers', () => {
    it('should return ALREADY_COMPLETED for second occurrence of same task', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-abc',
            itemName: 'Buy groceries',
            itemType: 'task',
            success: true
          },
          {
            itemId: 'task-abc',
            itemName: 'Buy groceries',
            itemType: 'task',
            success: true,
            code: 'ALREADY_COMPLETED'
          }
        ],
        summary: { total: 2, succeeded: 2, failed: 0 }
      });

      const result = await markComplete({
        items: [{ id: 'task-abc' }, { id: 'task-abc' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].code).toBeUndefined();
        expect(result.results[1].success).toBe(true);
        expect(result.results[1].code).toBe('ALREADY_COMPLETED');
      }
    });
  });

  describe('OmniJS error handling', () => {
    it('should return structured error on OmniJS catastrophic failure', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'OmniFocus is not running'
      });

      const result = await markComplete({ items: [{ id: 'task-abc' }] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('OmniFocus is not running');
      }
    });

    it('should propagate errors from executeOmniJS rejection', async () => {
      vi.mocked(executeOmniJS).mockRejectedValue(new Error('Script execution failed'));

      await expect(markComplete({ items: [{ id: 'task-abc' }] })).rejects.toThrow(
        'Script execution failed'
      );
    });
  });
});

describe('generateMarkCompleteScript', () => {
  it('should produce a valid OmniJS script string', () => {
    const script = generateMarkCompleteScript({ items: [{ id: 'task-abc' }] });
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should include IIFE wrapper', () => {
    const script = generateMarkCompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\)\(\);$/);
  });

  it('should include try-catch error handling', () => {
    const script = generateMarkCompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('try');
    expect(script).toContain('catch');
    expect(script).toContain('JSON.stringify');
  });

  it('should embed item identifiers in the script', () => {
    const script = generateMarkCompleteScript({
      items: [{ id: 'task-abc' }, { name: 'My Task' }]
    });
    expect(script).toContain('task-abc');
    expect(script).toContain('My Task');
  });

  it('should include Task.byIdentifier for ID lookup', () => {
    const script = generateMarkCompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('Task.byIdentifier');
  });

  it('should include Project.byIdentifier fallback for ID lookup', () => {
    const script = generateMarkCompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('Project.byIdentifier');
  });

  it('should include flattenedTasks for name lookup', () => {
    const script = generateMarkCompleteScript({ items: [{ name: 'My Task' }] });
    expect(script).toContain('flattenedTasks');
  });

  it('should include flattenedProjects for name lookup', () => {
    const script = generateMarkCompleteScript({ items: [{ name: 'My Task' }] });
    expect(script).toContain('flattenedProjects');
  });

  it('should include markComplete() call', () => {
    const script = generateMarkCompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('markComplete');
  });

  it('should include error codes for all error conditions', () => {
    const script = generateMarkCompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('NOT_FOUND');
    expect(script).toContain('DISAMBIGUATION_REQUIRED');
    expect(script).toContain('ALREADY_COMPLETED');
  });

  it('should include summary object in return', () => {
    const script = generateMarkCompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('summary');
    expect(script).toContain('succeeded');
    expect(script).toContain('failed');
  });

  it('should include completionDate when provided', () => {
    const script = generateMarkCompleteScript({
      items: [{ id: 'task-abc' }],
      completionDate: '2026-03-01T10:00:00.000Z'
    });
    expect(script).toContain('2026-03-01T10:00:00.000Z');
  });

  it('should use null for completionDate when not provided', () => {
    const script = generateMarkCompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('null');
  });

  it('should properly escape special characters in task names', () => {
    const script = generateMarkCompleteScript({
      items: [{ name: 'Task "Alpha" & Beta' }]
    });
    expect(typeof script).toBe('string');
    expect(script).toContain('Task \\"Alpha\\" & Beta');
  });

  it('should include candidates for disambiguation', () => {
    const script = generateMarkCompleteScript({ items: [{ name: 'My Task' }] });
    expect(script).toContain('candidates');
  });

  it('should include itemType field in results', () => {
    const script = generateMarkCompleteScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('itemType');
  });
});
