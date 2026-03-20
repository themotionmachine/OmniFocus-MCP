import { describe, expect, it } from 'vitest';
import {
  ImportTaskpaperErrorSchema,
  ImportTaskpaperInputSchema,
  ImportTaskpaperResponseSchema,
  ImportTaskpaperSuccessSchema
} from '../../../src/contracts/taskpaper-tools/import-taskpaper.js';
import {
  CreatedItemSchema,
  ImportSummarySchema
} from '../../../src/contracts/taskpaper-tools/shared/index.js';

// T010: Contract tests for import_taskpaper schemas

describe('ImportTaskpaperInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid text', () => {
      const result = ImportTaskpaperInputSchema.safeParse({ text: '- Buy milk' });
      expect(result.success).toBe(true);
    });

    it('should accept text with targetProjectId', () => {
      const result = ImportTaskpaperInputSchema.safeParse({
        text: '- Buy milk',
        targetProjectId: 'abc123'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetProjectId).toBe('abc123');
      }
    });

    it('should accept text without targetProjectId', () => {
      const result = ImportTaskpaperInputSchema.safeParse({ text: '- Buy milk' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetProjectId).toBeUndefined();
      }
    });

    it('should accept multi-line transport text', () => {
      const text = '- Task 1\n\t- Subtask 1\n- Task 2';
      const result = ImportTaskpaperInputSchema.safeParse({ text });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty string (FR-008)', () => {
      const result = ImportTaskpaperInputSchema.safeParse({ text: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing text', () => {
      const result = ImportTaskpaperInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string text', () => {
      const result = ImportTaskpaperInputSchema.safeParse({ text: 123 });
      expect(result.success).toBe(false);
    });
  });
});

describe('CreatedItemSchema', () => {
  it('should accept valid created item', () => {
    const result = CreatedItemSchema.safeParse({
      id: 'task-id-123',
      name: 'Buy milk',
      type: 'task'
    });
    expect(result.success).toBe(true);
  });

  it('should accept project type', () => {
    const result = CreatedItemSchema.safeParse({
      id: 'proj-id-456',
      name: 'Shopping',
      type: 'project'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid type', () => {
    const result = CreatedItemSchema.safeParse({
      id: 'id',
      name: 'test',
      type: 'folder'
    });
    expect(result.success).toBe(false);
  });
});

describe('ImportSummarySchema', () => {
  it('should accept valid summary', () => {
    const result = ImportSummarySchema.safeParse({
      totalCreated: 5,
      tasks: 4,
      projects: 1,
      movedToProject: false
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative counts', () => {
    const result = ImportSummarySchema.safeParse({
      totalCreated: -1,
      tasks: 0,
      projects: 0,
      movedToProject: false
    });
    expect(result.success).toBe(false);
  });
});

describe('ImportTaskpaperSuccessSchema', () => {
  it('should accept success response with items and summary', () => {
    const result = ImportTaskpaperSuccessSchema.safeParse({
      success: true,
      items: [{ id: 'id1', name: 'Task 1', type: 'task' }],
      summary: { totalCreated: 1, tasks: 1, projects: 0, movedToProject: false }
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with empty items', () => {
    const result = ImportTaskpaperSuccessSchema.safeParse({
      success: true,
      items: [],
      summary: { totalCreated: 0, tasks: 0, projects: 0, movedToProject: false }
    });
    expect(result.success).toBe(true);
  });
});

describe('ImportTaskpaperErrorSchema', () => {
  it('should accept error response', () => {
    const result = ImportTaskpaperErrorSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
  });
});

describe('ImportTaskpaperResponseSchema', () => {
  it('should accept success variant', () => {
    const result = ImportTaskpaperResponseSchema.safeParse({
      success: true,
      items: [{ id: 'id1', name: 'Task 1', type: 'task' }],
      summary: { totalCreated: 1, tasks: 1, projects: 0, movedToProject: false }
    });
    expect(result.success).toBe(true);
  });

  it('should accept error variant', () => {
    const result = ImportTaskpaperResponseSchema.safeParse({
      success: false,
      error: 'Import failed'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid discriminator', () => {
    const result = ImportTaskpaperResponseSchema.safeParse({
      success: 'maybe',
      items: []
    });
    expect(result.success).toBe(false);
  });
});
