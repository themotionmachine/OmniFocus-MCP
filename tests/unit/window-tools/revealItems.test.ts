import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateRevealItemsScript,
  revealItems
} from '../../../src/tools/primitives/revealItems.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T024: Unit tests for revealItems primitive

describe('revealItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('single item reveal by ID', () => {
    it('should reveal a task successfully by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          { itemId: 'task-abc', itemName: 'Buy groceries', itemType: 'task', success: true }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await revealItems({ items: [{ id: 'task-abc' }] });

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

      await revealItems({ items: [{ id: 'task-abc' }] });

      expect(executeOmniJS).toHaveBeenCalledOnce();
      const calledScript = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(typeof calledScript).toBe('string');
      expect(calledScript).toContain('task-abc');
    });
  });

  describe('multiple items reveal (batch)', () => {
    it('should reveal multiple items in a batch', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          { itemId: 'task-1', itemName: 'Task 1', itemType: 'task', success: true },
          { itemId: 'proj-1', itemName: 'Project 1', itemType: 'project', success: true }
        ],
        summary: { total: 2, succeeded: 2, failed: 0 }
      });

      const result = await revealItems({
        items: [{ id: 'task-1' }, { id: 'proj-1' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(2);
        expect(result.summary.succeeded).toBe(2);
      }
    });
  });

  describe('item not found (NOT_FOUND)', () => {
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

      const result = await revealItems({ items: [{ id: 'bad-id' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('NOT_FOUND');
        expect(result.summary.failed).toBe(1);
      }
    });
  });

  describe('name disambiguation (DISAMBIGUATION_REQUIRED)', () => {
    it('should return DISAMBIGUATION_REQUIRED with candidates', async () => {
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

      const result = await revealItems({ items: [{ name: 'Review' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.results[0].candidates).toHaveLength(2);
      }
    });
  });

  describe('node not visible (NODE_NOT_FOUND)', () => {
    it('should return NODE_NOT_FOUND when item exists but is not visible', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-hidden',
            itemName: 'Hidden Task',
            itemType: 'task',
            success: false,
            error: 'Item exists but is not visible in the current perspective',
            code: 'NODE_NOT_FOUND'
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await revealItems({ items: [{ id: 'task-hidden' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].code).toBe('NODE_NOT_FOUND');
      }
    });
  });

  describe('version guard (OF4+ required)', () => {
    it('should return success=false when version check fails', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'reveal_items requires OmniFocus 4.0 or later. Current version: 3.14'
      });

      const result = await revealItems({ items: [{ id: 'task-abc' }] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('reveal_items requires OmniFocus 4.0');
      }
    });
  });

  describe('window guard (no window)', () => {
    it('should return success=false when no window is open', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'No OmniFocus window is open. UI operations require an active window.'
      });

      const result = await revealItems({ items: [{ id: 'task-abc' }] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('No OmniFocus window');
      }
    });
  });

  describe('content tree guard', () => {
    it('should return success=false when content tree not available', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error:
          'Content tree not available. UI control operations require a fully loaded OmniFocus window.'
      });

      const result = await revealItems({ items: [{ id: 'task-abc' }] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Content tree not available');
      }
    });
  });

  describe('partial failure in batch', () => {
    it('should return per-item results with mixed success/failure', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          { itemId: 'task-good', itemName: 'Good Task', itemType: 'task', success: true },
          {
            itemId: 'bad-id',
            itemName: '',
            itemType: 'task',
            success: false,
            error: 'Item not found: bad-id',
            code: 'NOT_FOUND'
          }
        ],
        summary: { total: 2, succeeded: 1, failed: 1 }
      });

      const result = await revealItems({
        items: [{ id: 'task-good' }, { id: 'bad-id' }]
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

  describe('4-type resolution order', () => {
    it('should resolve project type correctly', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          { itemId: 'proj-123', itemName: 'My Project', itemType: 'project', success: true }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await revealItems({ items: [{ id: 'proj-123' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].itemType).toBe('project');
      }
    });

    it('should resolve folder type correctly', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          { itemId: 'folder-123', itemName: 'My Folder', itemType: 'folder', success: true }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await revealItems({ items: [{ id: 'folder-123' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].itemType).toBe('folder');
      }
    });

    it('should resolve tag type correctly', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [{ itemId: 'tag-123', itemName: 'My Tag', itemType: 'tag', success: true }],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await revealItems({ items: [{ id: 'tag-123' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].itemType).toBe('tag');
      }
    });
  });

  describe('OmniJS error handling', () => {
    it('should propagate errors from executeOmniJS rejection', async () => {
      vi.mocked(executeOmniJS).mockRejectedValue(new Error('Script execution failed'));

      await expect(revealItems({ items: [{ id: 'task-abc' }] })).rejects.toThrow(
        'Script execution failed'
      );
    });
  });
});

describe('generateRevealItemsScript', () => {
  it('should produce a valid OmniJS script string', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should include IIFE wrapper', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\)\(\);$/);
  });

  it('should include try-catch error handling', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('try');
    expect(script).toContain('catch');
    expect(script).toContain('JSON.stringify');
  });

  it('should include version check for OF 4.0', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('app.userVersion');
    expect(script).toContain("Version('4.0')");
  });

  it('should include window check', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('document.windows[0]');
    expect(script).toContain('No OmniFocus window');
  });

  it('should include content tree check', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('win.content');
    expect(script).toContain('Content tree not available');
  });

  it('should include 4-type resolution (Task, Project, Folder, Tag)', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('Task.byIdentifier');
    expect(script).toContain('Project.byIdentifier');
    expect(script).toContain('Folder.byIdentifier');
    expect(script).toContain('Tag.byIdentifier');
  });

  it('should include tree.reveal call', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('tree.reveal');
  });

  it('should include NOT_FOUND error code', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('NOT_FOUND');
  });

  it('should include NODE_NOT_FOUND error code', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('NODE_NOT_FOUND');
  });

  it('should include DISAMBIGUATION_REQUIRED error code', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('DISAMBIGUATION_REQUIRED');
  });

  it('should include name search for all 4 collections', () => {
    const script = generateRevealItemsScript({ items: [{ name: 'My Task' }] });
    expect(script).toContain('flattenedTasks');
    expect(script).toContain('flattenedProjects');
    expect(script).toContain('flattenedFolders');
    expect(script).toContain('flattenedTags');
  });

  it('should embed item identifiers in the script', () => {
    const script = generateRevealItemsScript({
      items: [{ id: 'task-abc' }, { name: 'My Work' }]
    });
    expect(script).toContain('task-abc');
    expect(script).toContain('My Work');
  });

  it('should include summary object in return', () => {
    const script = generateRevealItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('summary');
    expect(script).toContain('succeeded');
    expect(script).toContain('failed');
  });

  it('should handle special characters in item names via JSON.stringify', () => {
    const script = generateRevealItemsScript({
      items: [{ name: 'Task "Alpha" & Beta' }]
    });
    expect(typeof script).toBe('string');
    expect(script).toContain('Task \\"Alpha\\" & Beta');
  });
});
