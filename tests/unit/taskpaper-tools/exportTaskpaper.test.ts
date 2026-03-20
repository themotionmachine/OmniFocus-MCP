import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T016: Unit tests for exportTaskpaper primitive

const { exportTaskpaper, generateExportScript } = await import(
  '../../../src/tools/primitives/exportTaskpaper.js'
);

describe('exportTaskpaper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return transport text on project scope success (FR-003)', async () => {
    const mockResponse = {
      success: true,
      transportText: '- Buy milk @errands\n- Buy eggs @errands',
      summary: { totalItems: 2, tasks: 2, projects: 0, maxDepth: 0 },
      warnings: []
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await exportTaskpaper({ projectId: 'proj-123', status: 'active' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transportText).toContain('Buy milk');
      expect(result.summary.totalItems).toBe(2);
    }
  });

  it('should handle folder scope with recursive traversal (FR-004)', async () => {
    const mockResponse = {
      success: true,
      transportText: 'Project A:\n\t- Task 1\nProject B:\n\t- Task 2',
      summary: { totalItems: 4, tasks: 2, projects: 2, maxDepth: 1 },
      warnings: []
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await exportTaskpaper({ folderId: 'fold-123', status: 'active' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.projects).toBe(2);
    }
  });

  it('should handle taskIds scope with input-order preservation (FR-005)', async () => {
    const mockResponse = {
      success: true,
      transportText: '- Task B\n- Task A',
      summary: { totalItems: 2, tasks: 2, projects: 0, maxDepth: 0 },
      warnings: []
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await exportTaskpaper({
      taskIds: ['id-b', 'id-a'],
      status: 'active'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transportText).toContain('Task B');
    }
  });

  it('should apply status filter (FR-003)', async () => {
    const mockResponse = {
      success: true,
      transportText: '- Completed task @done(2026-03-20)',
      summary: { totalItems: 1, tasks: 1, projects: 0, maxDepth: 0 },
      warnings: []
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await exportTaskpaper({ projectId: 'proj-123', status: 'completed' });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalledTimes(1);
    const scriptArg = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(scriptArg).toContain('completed');
  });

  it('should return empty transport text for empty project', async () => {
    const mockResponse = {
      success: true,
      transportText: '',
      summary: { totalItems: 0, tasks: 0, projects: 0, maxDepth: 0 },
      warnings: []
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await exportTaskpaper({ projectId: 'proj-123', status: 'active' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transportText).toBe('');
      expect(result.summary.totalItems).toBe(0);
    }
  });

  it('should handle item-not-found error', async () => {
    const mockResponse = {
      success: false,
      error: 'Project not found: proj-999'
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await exportTaskpaper({ projectId: 'proj-999', status: 'active' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not found');
    }
  });

  it('should include warnings for non-fatal issues', async () => {
    const mockResponse = {
      success: true,
      transportText: '- \n',
      summary: { totalItems: 1, tasks: 1, projects: 0, maxDepth: 0 },
      warnings: [{ line: 1, message: 'Empty task name', content: '- ' }]
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await exportTaskpaper({ projectId: 'proj-123', status: 'active' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toBe('Empty task name');
    }
  });

  it('should handle null OmniJS result', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue(null);

    const result = await exportTaskpaper({ projectId: 'proj-123', status: 'active' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

describe('generateExportScript', () => {
  it('should generate script for project scope', () => {
    const script = generateExportScript({ projectId: 'proj-123', status: 'active' });

    expect(script).toContain('Project.byIdentifier');
    expect(script).toContain('proj-123');
    expect(script).toContain('JSON.stringify');
  });

  it('should generate script for folder scope', () => {
    const script = generateExportScript({ folderId: 'fold-123', status: 'active' });

    expect(script).toContain('Folder.byIdentifier');
    expect(script).toContain('fold-123');
  });

  it('should generate script for taskIds scope', () => {
    const script = generateExportScript({ taskIds: ['id-1', 'id-2'], status: 'active' });

    expect(script).toContain('Task.byIdentifier');
    expect(script).toContain('id-1');
    expect(script).toContain('id-2');
  });

  it('should include status filter in script', () => {
    const script = generateExportScript({ projectId: 'proj-123', status: 'completed' });

    expect(script).toContain('completed');
  });

  it('should include date formatting logic', () => {
    const script = generateExportScript({ projectId: 'proj-123', status: 'active' });

    expect(script).toContain('getFullYear');
    expect(script).toContain('getMonth');
    expect(script).toContain('getDate');
  });
});
