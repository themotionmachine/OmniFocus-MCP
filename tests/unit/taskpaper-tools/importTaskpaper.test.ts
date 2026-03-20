import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T011: Unit tests for importTaskpaper primitive

// Dynamically import after mock setup
const { importTaskpaper, generateImportScript } = await import(
  '../../../src/tools/primitives/importTaskpaper.js'
);

describe('importTaskpaper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return created items on success (FR-001)', async () => {
    const mockResponse = {
      success: true,
      items: [
        { id: 'task-1', name: 'Buy milk', type: 'task' },
        { id: 'task-2', name: 'Buy eggs', type: 'task' }
      ],
      summary: { totalCreated: 2, tasks: 2, projects: 0, movedToProject: false }
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await importTaskpaper({ text: '- Buy milk\n- Buy eggs' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('task-1');
      expect(result.summary.totalCreated).toBe(2);
    }
  });

  it('should pass targetProjectId to script when provided (FR-002)', async () => {
    const mockResponse = {
      success: true,
      items: [{ id: 'task-1', name: 'Task', type: 'task' }],
      summary: { totalCreated: 1, tasks: 1, projects: 0, movedToProject: true }
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await importTaskpaper({
      text: '- Task',
      targetProjectId: 'proj-123'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.movedToProject).toBe(true);
    }
    // Verify the script was called (contains the project ID reference)
    expect(executeOmniJS).toHaveBeenCalledTimes(1);
    const scriptArg = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(scriptArg).toContain('proj-123');
  });

  it('should reject whitespace-only text (FR-008)', async () => {
    const result = await importTaskpaper({ text: '   \n\t\n  ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('empty');
    }
    expect(executeOmniJS).not.toHaveBeenCalled();
  });

  it('should handle empty byParsingTransportText result', async () => {
    const mockResponse = {
      success: true,
      items: [],
      summary: { totalCreated: 0, tasks: 0, projects: 0, movedToProject: false }
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await importTaskpaper({ text: '- Some text' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toHaveLength(0);
      expect(result.summary.totalCreated).toBe(0);
    }
  });

  it('should collect nested task IDs recursively (FR-001)', async () => {
    const mockResponse = {
      success: true,
      items: [
        { id: 'task-1', name: 'Parent', type: 'task' },
        { id: 'task-2', name: 'Child 1', type: 'task' },
        { id: 'task-3', name: 'Child 2', type: 'task' }
      ],
      summary: { totalCreated: 3, tasks: 3, projects: 0, movedToProject: false }
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await importTaskpaper({ text: '- Parent\n\t- Child 1\n\t- Child 2' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toHaveLength(3);
    }
  });

  it('should handle special characters in transport text (FR-009)', async () => {
    const mockResponse = {
      success: true,
      items: [{ id: 'task-1', name: 'Task with "quotes" and \\backslash', type: 'task' }],
      summary: { totalCreated: 1, tasks: 1, projects: 0, movedToProject: false }
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await importTaskpaper({
      text: '- Task with "quotes" and \\backslash'
    });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalledTimes(1);
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = {
      success: false,
      error: 'OmniFocus script error'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await importTaskpaper({ text: '- Some task' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('OmniFocus script error');
    }
  });

  it('should handle null OmniJS result', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue(null);

    const result = await importTaskpaper({ text: '- Some task' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe('generateImportScript', () => {
  it('should generate script with text-only input (FR-001)', () => {
    const script = generateImportScript('- Buy milk');

    expect(script).toContain('byParsingTransportText');
    expect(script).toContain('Buy milk');
    expect(script).toContain('JSON.stringify');
  });

  it('should generate script with targetProjectId (FR-002)', () => {
    const script = generateImportScript('- Buy milk', 'proj-123');

    expect(script).toContain('byParsingTransportText');
    expect(script).toContain('proj-123');
    expect(script).toContain('moveTasks');
  });

  it('should not include moveTasks when no targetProjectId', () => {
    const script = generateImportScript('- Buy milk');

    expect(script).not.toContain('moveTasks');
  });

  it('should escape special characters in transport text', () => {
    const script = generateImportScript('- Task with "quotes" and \\path');

    // Should not break the script string
    expect(script).toContain('byParsingTransportText');
  });
});
