import { describe, expect, it } from 'vitest';
import {
  ConvertTasksToProjectsErrorSchema,
  ConvertTasksToProjectsInputSchema,
  ConvertTasksToProjectsResponseSchema,
  ConvertTasksToProjectsSuccessSchema
} from '../../../src/contracts/bulk-tools/index.js';

describe('ConvertTasksToProjectsInputSchema', () => {
  it('accepts items without target folder (library root default)', () => {
    const result = ConvertTasksToProjectsInputSchema.safeParse({
      items: [{ id: 'task1' }]
    });
    expect(result.success).toBe(true);
  });

  it('accepts items with targetFolderId', () => {
    const result = ConvertTasksToProjectsInputSchema.safeParse({
      items: [{ id: 'task1' }],
      targetFolderId: 'folder1'
    });
    expect(result.success).toBe(true);
  });

  it('accepts items with targetFolderName', () => {
    const result = ConvertTasksToProjectsInputSchema.safeParse({
      items: [{ id: 'task1' }],
      targetFolderName: 'My Folder'
    });
    expect(result.success).toBe(true);
  });

  it('accepts items with both targetFolderId and targetFolderName', () => {
    const result = ConvertTasksToProjectsInputSchema.safeParse({
      items: [{ id: 'task1' }],
      targetFolderId: 'folder1',
      targetFolderName: 'My Folder'
    });
    expect(result.success).toBe(true);
  });

  it('accepts up to 100 items', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `task${i}` }));
    const result = ConvertTasksToProjectsInputSchema.safeParse({ items });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = ConvertTasksToProjectsInputSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 items', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ id: `task${i}` }));
    const result = ConvertTasksToProjectsInputSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });
});

describe('ConvertTasksToProjectsSuccessSchema', () => {
  it('accepts success with newId and newName', () => {
    const result = ConvertTasksToProjectsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task1',
          itemName: 'My Task',
          itemType: 'task',
          success: true,
          newId: 'new-project-id',
          newName: 'My Task'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('accepts ALREADY_A_PROJECT error result in results array', () => {
    const result = ConvertTasksToProjectsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task1',
          itemName: 'Existing Project',
          itemType: 'project',
          success: false,
          error: 'Task is already a project root',
          code: 'ALREADY_A_PROJECT'
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    expect(result.success).toBe(true);
  });
});

describe('ConvertTasksToProjectsErrorSchema', () => {
  it('accepts error with TARGET_NOT_FOUND code', () => {
    const result = ConvertTasksToProjectsErrorSchema.safeParse({
      success: false,
      error: "Folder 'unknown-id' not found",
      code: 'TARGET_NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });
});

describe('ConvertTasksToProjectsResponseSchema', () => {
  it('discriminates on success: true', () => {
    const result = ConvertTasksToProjectsResponseSchema.safeParse({
      success: true,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('discriminates on success: false', () => {
    const result = ConvertTasksToProjectsResponseSchema.safeParse({
      success: false,
      error: 'Target folder not found',
      code: 'TARGET_NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });
});
