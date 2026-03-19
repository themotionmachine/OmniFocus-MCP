import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  collapseItems,
  generateCollapseItemsScript
} from '../../../src/tools/primitives/collapseItems.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T032: Unit tests for collapseItems primitive

describe('collapseItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should collapse a task successfully', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [{ itemId: 'task-abc', itemName: 'My Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    const result = await collapseItems({ items: [{ id: 'task-abc' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].success).toBe(true);
  });

  it('should return ALREADY_COLLAPSED when node is already collapsed', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: 'task-abc',
          itemName: 'Task',
          itemType: 'task',
          success: true,
          code: 'ALREADY_COLLAPSED'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    const result = await collapseItems({ items: [{ id: 'task-abc' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].code).toBe('ALREADY_COLLAPSED');
  });

  it('should return NOT_FOUND when item does not exist', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: 'bad',
          itemName: '',
          itemType: 'task',
          success: false,
          error: 'Not found',
          code: 'NOT_FOUND'
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    const result = await collapseItems({ items: [{ id: 'bad' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].code).toBe('NOT_FOUND');
  });

  it('should return NODE_NOT_FOUND when item not visible', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: 'task-hidden',
          itemName: 'Hidden',
          itemType: 'task',
          success: false,
          error: 'Not visible',
          code: 'NODE_NOT_FOUND'
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    const result = await collapseItems({ items: [{ id: 'task-hidden' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].code).toBe('NODE_NOT_FOUND');
  });

  it('should return DISAMBIGUATION_REQUIRED', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: '',
          itemName: 'Review',
          itemType: 'task',
          success: false,
          code: 'DISAMBIGUATION_REQUIRED',
          error: 'Multiple',
          candidates: [{ id: 't1', name: 'Review', type: 'task' }]
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    const result = await collapseItems({ items: [{ name: 'Review' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].code).toBe('DISAMBIGUATION_REQUIRED');
  });

  it('should fail on version guard', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'collapse_items requires OmniFocus 4.0'
    });
    const result = await collapseItems({ items: [{ id: 'task-abc' }] });
    expect(result.success).toBe(false);
  });

  it('should fail on window guard', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({ success: false, error: 'No OmniFocus window' });
    const result = await collapseItems({ items: [{ id: 'task-abc' }] });
    expect(result.success).toBe(false);
  });

  it('should fail on content tree guard', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'Content tree not available'
    });
    const result = await collapseItems({ items: [{ id: 'task-abc' }] });
    expect(result.success).toBe(false);
  });

  it('should handle batch partial failures', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        { itemId: 'good', itemName: 'Good', itemType: 'task', success: true },
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
    const result = await collapseItems({ items: [{ id: 'good' }, { id: 'bad' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    }
  });
});

describe('generateCollapseItemsScript', () => {
  it('should produce valid OmniJS script', () => {
    const script = generateCollapseItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toContain('.collapse(');
    expect(script).toContain('ALREADY_COLLAPSED');
    expect(script).toContain('isExpanded');
  });

  it('should include guards and 4-type resolution', () => {
    const script = generateCollapseItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain("Version('4.0')");
    expect(script).toContain('win.content');
    expect(script).toContain('Task.byIdentifier');
    expect(script).toContain('Tag.byIdentifier');
  });

  it('should embed completely flag', () => {
    const script = generateCollapseItemsScript({ items: [{ id: 'task-abc' }], completely: true });
    expect(script).toContain('var completely = true');
  });
});
