import { beforeEach, describe, expect, it, vi } from 'vitest';
import { focusItems, generateFocusItemsScript } from '../../../src/tools/primitives/focusItems.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T051: Unit tests for focusItems primitive

describe('focusItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should focus on project successfully', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [{ itemId: 'proj-123', itemName: 'My Project', itemType: 'project', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    const result = await focusItems({ items: [{ id: 'proj-123' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].itemType).toBe('project');
    }
  });

  it('should focus on folder successfully', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [{ itemId: 'folder-123', itemName: 'My Folder', itemType: 'folder', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    const result = await focusItems({ items: [{ id: 'folder-123' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].itemType).toBe('folder');
  });

  it('should focus on multiple targets', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        { itemId: 'proj-1', itemName: 'P1', itemType: 'project', success: true },
        { itemId: 'folder-1', itemName: 'F1', itemType: 'folder', success: true }
      ],
      summary: { total: 2, succeeded: 2, failed: 0 }
    });
    const result = await focusItems({ items: [{ id: 'proj-1' }, { id: 'folder-1' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.summary.succeeded).toBe(2);
  });

  it('should reject task with INVALID_TYPE', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: 'task-123',
          itemName: 'My Task',
          itemType: 'task',
          success: false,
          error: 'Tasks cannot be focused',
          code: 'INVALID_TYPE'
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    const result = await focusItems({ items: [{ id: 'task-123' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].code).toBe('INVALID_TYPE');
      expect(result.results[0].itemType).toBe('task');
    }
  });

  it('should reject tag with INVALID_TYPE', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: 'tag-123',
          itemName: 'My Tag',
          itemType: 'tag',
          success: false,
          error: 'Tags cannot be focused',
          code: 'INVALID_TYPE'
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    const result = await focusItems({ items: [{ id: 'tag-123' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].code).toBe('INVALID_TYPE');
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
    const result = await focusItems({ items: [{ id: 'bad' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].code).toBe('NOT_FOUND');
  });

  it('should return DISAMBIGUATION_REQUIRED', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: '',
          itemName: 'Work',
          itemType: 'task',
          success: false,
          code: 'DISAMBIGUATION_REQUIRED',
          error: 'Multiple',
          candidates: [
            { id: 'p1', name: 'Work', type: 'project' },
            { id: 'f1', name: 'Work', type: 'folder' }
          ]
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    const result = await focusItems({ items: [{ name: 'Work' }] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.results[0].code).toBe('DISAMBIGUATION_REQUIRED');
  });

  it('should fail on version guard', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'focus_items requires OmniFocus 4.0'
    });
    const result = await focusItems({ items: [{ id: 'proj-123' }] });
    expect(result.success).toBe(false);
  });

  it('should fail on window guard', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({ success: false, error: 'No OmniFocus window' });
    const result = await focusItems({ items: [{ id: 'proj-123' }] });
    expect(result.success).toBe(false);
  });

  it('should handle batch with valid and invalid mix', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        { itemId: 'proj-1', itemName: 'Project', itemType: 'project', success: true },
        {
          itemId: 'task-1',
          itemName: 'Task',
          itemType: 'task',
          success: false,
          error: 'Tasks cannot be focused',
          code: 'INVALID_TYPE'
        }
      ],
      summary: { total: 2, succeeded: 1, failed: 1 }
    });
    const result = await focusItems({ items: [{ id: 'proj-1' }, { id: 'task-1' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].code).toBe('INVALID_TYPE');
    }
  });
});

describe('generateFocusItemsScript', () => {
  it('should produce valid OmniJS script', () => {
    const script = generateFocusItemsScript({ items: [{ id: 'proj-123' }] });
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toContain('win.focus');
  });

  it('should include version and window guards but NOT content tree guard', () => {
    const script = generateFocusItemsScript({ items: [{ id: 'proj-123' }] });
    expect(script).toContain("Version('4.0')");
    expect(script).toContain('document.windows[0]');
    // Focus does NOT need content tree
    expect(script).not.toContain('win.content');
  });

  it('should include INVALID_TYPE check for task/tag rejection', () => {
    const script = generateFocusItemsScript({ items: [{ id: 'proj-123' }] });
    expect(script).toContain('INVALID_TYPE');
  });

  it('should include 4-type resolution', () => {
    const script = generateFocusItemsScript({ items: [{ id: 'proj-123' }] });
    expect(script).toContain('Task.byIdentifier');
    expect(script).toContain('Project.byIdentifier');
    expect(script).toContain('Folder.byIdentifier');
    expect(script).toContain('Tag.byIdentifier');
  });
});
