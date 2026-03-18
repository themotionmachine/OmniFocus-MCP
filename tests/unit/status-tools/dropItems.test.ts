import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dropItems, generateDropItemsScript } from '../../../src/tools/primitives/dropItems.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T011: Unit tests for dropItems primitive

describe('dropItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('drop task by ID', () => {
    it('should drop a task successfully by ID', async () => {
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

      const result = await dropItems({ items: [{ id: 'task-abc' }] });

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

    it('should call executeOmniJS with generated script', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      await dropItems({ items: [{ id: 'task-abc' }] });

      expect(executeOmniJS).toHaveBeenCalledOnce();
      const calledScript = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(typeof calledScript).toBe('string');
      expect(calledScript).toContain('task-abc');
    });
  });

  describe('drop project by ID', () => {
    it('should drop a project by setting status=Dropped', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'proj-abc',
            itemName: 'Old Project',
            itemType: 'project',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await dropItems({ items: [{ id: 'proj-abc' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].itemType).toBe('project');
        expect(result.results[0].success).toBe(true);
      }
    });
  });

  describe('version check failure', () => {
    it('should return success=false when version check fails (catastrophic)', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'drop_items requires OmniFocus 3.8 or later. Current version: 3.7'
      });

      const result = await dropItems({ items: [{ id: 'task-abc' }] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('drop_items requires OmniFocus 3.8');
      }
    });
  });

  describe('idempotent: ALREADY_DROPPED', () => {
    it('should return success=true with ALREADY_DROPPED code for already-dropped task', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-abc',
            itemName: 'Already Dropped',
            itemType: 'task',
            success: true,
            code: 'ALREADY_DROPPED'
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await dropItems({ items: [{ id: 'task-abc' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].code).toBe('ALREADY_DROPPED');
      }
    });

    it('should return ALREADY_DROPPED for already-dropped project', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'proj-abc',
            itemName: 'Old Project',
            itemType: 'project',
            success: true,
            code: 'ALREADY_DROPPED'
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await dropItems({ items: [{ id: 'proj-abc' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].code).toBe('ALREADY_DROPPED');
      }
    });
  });

  describe('allOccurrences parameter', () => {
    it('should pass allOccurrences=false for single-occurrence drop', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-repeat',
            itemName: 'Weekly Review',
            itemType: 'task',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      await dropItems({ items: [{ id: 'task-repeat' }], allOccurrences: false });

      expect(executeOmniJS).toHaveBeenCalledOnce();
      const script = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(script).toContain('false');
    });

    it('should default allOccurrences to true', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-abc',
            itemName: 'My Task',
            itemType: 'task',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      await dropItems({ items: [{ id: 'task-abc' }] });

      const script = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(script).toContain('true');
    });
  });

  describe('NOT_FOUND error', () => {
    it('should return NOT_FOUND when item does not exist', async () => {
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

      const result = await dropItems({ items: [{ id: 'bad-id' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('NOT_FOUND');
        expect(result.summary.failed).toBe(1);
      }
    });
  });

  describe('disambiguation', () => {
    it('should return DISAMBIGUATION_REQUIRED with candidates when name is ambiguous', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: '',
            itemName: 'Review',
            itemType: 'task',
            success: false,
            error: "Multiple items match 'Review'. Use ID for precision.",
            code: 'DISAMBIGUATION_REQUIRED',
            candidates: [
              { id: 'task-1', name: 'Review', type: 'task' },
              { id: 'proj-1', name: 'Review', type: 'project' }
            ]
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await dropItems({ items: [{ name: 'Review' }] });

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

  describe('partial batch failure', () => {
    it('should return per-item results with mixed success/failure', async () => {
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

      const result = await dropItems({
        items: [{ id: 'task-good' }, { id: 'task-missing' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
        expect(result.summary.succeeded).toBe(1);
        expect(result.summary.failed).toBe(1);
      }
    });
  });

  describe('OmniJS error handling', () => {
    it('should return structured error on catastrophic OmniJS failure', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'OmniFocus is not running'
      });

      const result = await dropItems({ items: [{ id: 'task-abc' }] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('OmniFocus is not running');
      }
    });

    it('should propagate errors from executeOmniJS rejection', async () => {
      vi.mocked(executeOmniJS).mockRejectedValue(new Error('Script execution failed'));

      await expect(dropItems({ items: [{ id: 'task-abc' }] })).rejects.toThrow(
        'Script execution failed'
      );
    });
  });
});

describe('generateDropItemsScript', () => {
  it('should produce a valid OmniJS script string', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should include IIFE wrapper', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\)\(\);$/);
  });

  it('should include try-catch error handling', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('try');
    expect(script).toContain('catch');
    expect(script).toContain('JSON.stringify');
  });

  it('should include version check (fail-fast before processing)', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('app.userVersion');
    expect(script).toContain('Version');
    expect(script).toContain('3.8');
  });

  it('should include task.drop() call for task dropping', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('.drop(');
  });

  it('should include Project.Status.Dropped for project dropping', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('Project.Status.Dropped');
  });

  it('should embed item identifiers in the script', () => {
    const script = generateDropItemsScript({
      items: [{ id: 'task-abc' }, { name: 'My Work' }]
    });
    expect(script).toContain('task-abc');
    expect(script).toContain('My Work');
  });

  it('should embed allOccurrences value in the script', () => {
    const scriptTrue = generateDropItemsScript({
      items: [{ id: 'task-abc' }],
      allOccurrences: true
    });
    expect(scriptTrue).toContain('true');

    const scriptFalse = generateDropItemsScript({
      items: [{ id: 'task-abc' }],
      allOccurrences: false
    });
    expect(scriptFalse).toContain('false');
  });

  it('should include Task.byIdentifier for ID lookup', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('Task.byIdentifier');
  });

  it('should include Project.byIdentifier for ID lookup', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('Project.byIdentifier');
  });

  it('should include flattenedTasks filter for name lookup', () => {
    const script = generateDropItemsScript({ items: [{ name: 'My Task' }] });
    expect(script).toContain('flattenedTasks');
  });

  it('should include flattenedProjects filter for name lookup', () => {
    const script = generateDropItemsScript({ items: [{ name: 'My Project' }] });
    expect(script).toContain('flattenedProjects');
  });

  it('should include ALREADY_DROPPED idempotent check', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('ALREADY_DROPPED');
  });

  it('should include NOT_FOUND error code', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('NOT_FOUND');
  });

  it('should include DISAMBIGUATION_REQUIRED error code', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('DISAMBIGUATION_REQUIRED');
  });

  it('should include summary object in return', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('summary');
    expect(script).toContain('succeeded');
    expect(script).toContain('failed');
  });

  it('should properly handle special characters in item names via JSON.stringify', () => {
    const script = generateDropItemsScript({
      items: [{ name: 'Task "Alpha" & Beta' }]
    });
    expect(typeof script).toBe('string');
    expect(script).toContain('Task \\"Alpha\\" & Beta');
  });

  it('should include dropDate null check for task already-dropped detection', () => {
    const script = generateDropItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('dropDate');
  });
});
