import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  convertTasksToProjects,
  generateConvertTasksToProjectsScript
} from '../../../src/tools/primitives/convertTasksToProjects.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('convertTasksToProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with newId and newName for converted projects', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: 'task1',
          itemName: 'My Task',
          itemType: 'task',
          success: true,
          newId: 'new-proj-id',
          newName: 'My Task'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });

    const result = await convertTasksToProjects({ items: [{ id: 'task1' }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].newId).toBe('new-proj-id');
    }
  });

  it('returns error when target folder not found', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Folder 'bad-id' not found",
      code: 'TARGET_NOT_FOUND'
    });

    const result = await convertTasksToProjects({
      items: [{ id: 'task1' }],
      targetFolderId: 'bad-id'
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('TARGET_NOT_FOUND');
  });

  it('handles ALREADY_A_PROJECT per-item error', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: 'task1',
          itemName: 'Existing Project Root',
          itemType: 'project',
          success: false,
          error: 'Task is already a project root',
          code: 'ALREADY_A_PROJECT'
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });

    const result = await convertTasksToProjects({ items: [{ id: 'task1' }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].code).toBe('ALREADY_A_PROJECT');
    }
  });
});

describe('generateConvertTasksToProjectsScript', () => {
  it('generates script with library root placement when no folder specified', () => {
    const script = generateConvertTasksToProjectsScript({ items: [{ id: 'task1' }] });

    expect(script).toContain('library');
    expect(script).toContain('convertTasksToProjects');
    expect(script).toContain('(function()');
  });

  it('generates script with targetFolderId', () => {
    const script = generateConvertTasksToProjectsScript({
      items: [{ id: 'task1' }],
      targetFolderId: 'folder-id'
    });

    expect(script).toContain('folder-id');
    expect(script).toContain('Folder.byIdentifier');
    expect(script).toContain('TARGET_NOT_FOUND');
  });

  it('generates script with targetFolderName', () => {
    const script = generateConvertTasksToProjectsScript({
      items: [{ id: 'task1' }],
      targetFolderName: 'Work Folder'
    });

    expect(script).toContain('Work Folder');
    expect(script).toContain('flattenedFolders');
  });

  it('targetFolderId takes precedence over targetFolderName', () => {
    const script = generateConvertTasksToProjectsScript({
      items: [{ id: 'task1' }],
      targetFolderId: 'folder-id',
      targetFolderName: 'Work Folder'
    });

    // Should use ID lookup first
    expect(script).toContain('folder-id');
  });

  it('generates ALREADY_A_PROJECT check for project root tasks', () => {
    const script = generateConvertTasksToProjectsScript({ items: [{ id: 'task1' }] });

    expect(script).toContain('ALREADY_A_PROJECT');
  });

  it('generates convertTasksToProjects API call', () => {
    const script = generateConvertTasksToProjectsScript({ items: [{ id: 'task1' }] });

    expect(script).toContain('convertTasksToProjects([');
  });

  it('generates newId and newName extraction', () => {
    const script = generateConvertTasksToProjectsScript({ items: [{ id: 'task1' }] });

    expect(script).toContain('newId');
    expect(script).toContain('newName');
    expect(script).toContain('primaryKey');
  });

  it('generates NOT_FOUND for missing tasks', () => {
    const script = generateConvertTasksToProjectsScript({ items: [{ id: 'task1' }] });

    expect(script).toContain('NOT_FOUND');
  });

  it('generates DISAMBIGUATION_REQUIRED for name lookup', () => {
    const script = generateConvertTasksToProjectsScript({ items: [{ name: 'Ambiguous Task' }] });

    expect(script).toContain('DISAMBIGUATION_REQUIRED');
  });

  it('generates OPERATION_FAILED for per-item errors', () => {
    const script = generateConvertTasksToProjectsScript({ items: [{ id: 'task1' }] });

    expect(script).toContain('OPERATION_FAILED');
  });
});
