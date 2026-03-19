import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateSelectItemsScript,
  selectItems
} from '../../../src/tools/primitives/selectItems.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T065: Unit tests for selectItems primitive

describe('selectItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should select single item', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [{ itemId: 'task-abc', itemName: 'My Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    const result = await selectItems({ items: [{ id: 'task-abc' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].success).toBe(true);
  });

  it('should select multiple items', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        { itemId: 'task-1', itemName: 'T1', itemType: 'task', success: true },
        { itemId: 'task-2', itemName: 'T2', itemType: 'task', success: true }
      ],
      summary: { total: 2, succeeded: 2, failed: 0 }
    });
    const result = await selectItems({ items: [{ id: 'task-1' }, { id: 'task-2' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.summary.succeeded).toBe(2);
  });

  it('should pass extending=false (replace selection) by default', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    await selectItems({ items: [{ id: 'task-abc' }] });
    const script = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(script).toContain('var extending = false');
  });

  it('should pass extending=true (add to selection)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    await selectItems({ items: [{ id: 'task-abc' }], extending: true });
    const script = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(script).toContain('var extending = true');
  });

  it('should return NOT_FOUND', async () => {
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
    const result = await selectItems({ items: [{ id: 'bad' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].code).toBe('NOT_FOUND');
  });

  it('should return NODE_NOT_FOUND', async () => {
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
    const result = await selectItems({ items: [{ id: 'task-hidden' }] });
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
    const result = await selectItems({ items: [{ name: 'Review' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].code).toBe('DISAMBIGUATION_REQUIRED');
  });

  it('should fail on version guard', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'select_items requires OmniFocus 4.0'
    });
    const result = await selectItems({ items: [{ id: 'task-abc' }] });
    expect(result.success).toBe(false);
  });

  it('should fail on window guard', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({ success: false, error: 'No OmniFocus window' });
    const result = await selectItems({ items: [{ id: 'task-abc' }] });
    expect(result.success).toBe(false);
  });

  it('should fail on content tree guard', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'Content tree not available'
    });
    const result = await selectItems({ items: [{ id: 'task-abc' }] });
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
    const result = await selectItems({ items: [{ id: 'good' }, { id: 'bad' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    }
  });
});

describe('generateSelectItemsScript', () => {
  it('should produce valid OmniJS script', () => {
    const script = generateSelectItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toMatch(/^\(function\(\)/);
  });

  it('should include version, window, and content tree guards', () => {
    const script = generateSelectItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain("Version('4.0')");
    expect(script).toContain('document.windows[0]');
    expect(script).toContain('win.content');
  });

  it('should include pre-flight reveal before select (FR-017)', () => {
    const script = generateSelectItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('tree.reveal');
    expect(script).toContain('tree.select');
  });

  it('should include 4-type resolution', () => {
    const script = generateSelectItemsScript({ items: [{ id: 'task-abc' }] });
    expect(script).toContain('Task.byIdentifier');
    expect(script).toContain('Project.byIdentifier');
    expect(script).toContain('Folder.byIdentifier');
    expect(script).toContain('Tag.byIdentifier');
  });

  it('should embed extending flag', () => {
    const scriptTrue = generateSelectItemsScript({ items: [{ id: 'task-abc' }], extending: true });
    expect(scriptTrue).toContain('var extending = true');

    const scriptDefault = generateSelectItemsScript({ items: [{ id: 'task-abc' }] });
    expect(scriptDefault).toContain('var extending = false');
  });
});
