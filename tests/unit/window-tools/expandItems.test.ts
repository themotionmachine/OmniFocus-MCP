import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  expandItems,
  generateExpandItemsScript
} from '../../../src/tools/primitives/expandItems.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T031: Unit tests for expandItems primitive

describe('expandItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('single item expand', () => {
    it('should expand a task successfully by ID', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [{ itemId: 'task-abc', itemName: 'My Task', itemType: 'task', success: true }],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await expandItems({ items: [{ id: 'task-abc' }] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].itemType).toBe('task');
      }
    });
  });

  describe('expand completely (recursive)', () => {
    it('should pass completely flag to OmniJS script', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [{ itemId: 'task-abc', itemName: 'Task', itemType: 'task', success: true }],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      await expandItems({ items: [{ id: 'task-abc' }], completely: true });
      const script = vi.mocked(executeOmniJS).mock.calls[0][0];
      expect(script).toContain('true');
    });
  });

  describe('already expanded (ALREADY_EXPANDED no-op)', () => {
    it('should return ALREADY_EXPANDED when node is already expanded', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-abc',
            itemName: 'My Task',
            itemType: 'task',
            success: true,
            code: 'ALREADY_EXPANDED'
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });

      const result = await expandItems({ items: [{ id: 'task-abc' }] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].code).toBe('ALREADY_EXPANDED');
      }
    });
  });

  describe('NOT_FOUND', () => {
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

      const result = await expandItems({ items: [{ id: 'bad-id' }] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].code).toBe('NOT_FOUND');
      }
    });
  });

  describe('NODE_NOT_FOUND', () => {
    it('should return NODE_NOT_FOUND when item not visible', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: 'task-hidden',
            itemName: 'Hidden',
            itemType: 'task',
            success: false,
            error: 'Item exists but is not visible',
            code: 'NODE_NOT_FOUND'
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await expandItems({ items: [{ id: 'task-hidden' }] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].code).toBe('NODE_NOT_FOUND');
      }
    });
  });

  describe('disambiguation', () => {
    it('should return DISAMBIGUATION_REQUIRED with candidates', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          {
            itemId: '',
            itemName: 'Review',
            itemType: 'task',
            success: false,
            error: 'Multiple matches',
            code: 'DISAMBIGUATION_REQUIRED',
            candidates: [
              { id: 't1', name: 'Review', type: 'task' },
              { id: 'p1', name: 'Review', type: 'project' }
            ]
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });

      const result = await expandItems({ items: [{ name: 'Review' }] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.results[0].candidates).toHaveLength(2);
      }
    });
  });

  describe('version guard', () => {
    it('should return error when OF version too old', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'expand_items requires OmniFocus 4.0 or later.'
      });
      const result = await expandItems({ items: [{ id: 'task-abc' }] });
      expect(result.success).toBe(false);
    });
  });

  describe('window guard', () => {
    it('should return error when no window', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'No OmniFocus window is open.'
      });
      const result = await expandItems({ items: [{ id: 'task-abc' }] });
      expect(result.success).toBe(false);
    });
  });

  describe('content tree guard', () => {
    it('should return error when content tree not available', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: false,
        error: 'Content tree not available.'
      });
      const result = await expandItems({ items: [{ id: 'task-abc' }] });
      expect(result.success).toBe(false);
    });
  });

  describe('batch partial failures', () => {
    it('should return mixed results', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        results: [
          { itemId: 'task-good', itemName: 'Good', itemType: 'task', success: true },
          {
            itemId: 'bad',
            itemName: '',
            itemType: 'task',
            success: false,
            error: 'Not found',
            code: 'NOT_FOUND'
          }
        ],
        summary: { total: 2, succeeded: 1, failed: 1 }
      });

      const result = await expandItems({ items: [{ id: 'task-good' }, { id: 'bad' }] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
      }
    });
  });
});

describe('generateExpandItemsScript', () => {
  it('should produce a valid OmniJS script', () => {
    const script = generateExpandItemsScript({ items: [{ id: 'task-abc' }] });
    expect(typeof script).toBe('string');
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\)\(\);$/);
  });

  it('should include version check for OF 4.0', () => {
    const script = generateExpandItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain("Version('4.0')");
  });

  it('should include window and content tree checks', () => {
    const script = generateExpandItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('document.windows[0]');
    expect(script).toContain('win.content');
  });

  it('should include node.expand call', () => {
    const script = generateExpandItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('.expand(');
  });

  it('should include ALREADY_EXPANDED check', () => {
    const script = generateExpandItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('ALREADY_EXPANDED');
    expect(script).toContain('isExpanded');
  });

  it('should include 4-type resolution', () => {
    const script = generateExpandItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('Task.byIdentifier');
    expect(script).toContain('Project.byIdentifier');
    expect(script).toContain('Folder.byIdentifier');
    expect(script).toContain('Tag.byIdentifier');
  });

  it('should embed completely flag', () => {
    const scriptTrue = generateExpandItemsScript({ items: [{ id: 'task-abc' }], completely: true });
    expect(scriptTrue).toContain('var completely = true');

    const scriptDefault = generateExpandItemsScript({ items: [{ id: 'task-abc' }] });
    expect(scriptDefault).toContain('var completely = false');
  });
});
