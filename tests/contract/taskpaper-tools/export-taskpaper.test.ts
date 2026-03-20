import { describe, expect, it } from 'vitest';
import {
  ExportTaskpaperErrorSchema,
  ExportTaskpaperInputSchema,
  ExportTaskpaperResponseSchema,
  ExportTaskpaperSuccessSchema
} from '../../../src/contracts/taskpaper-tools/export-taskpaper.js';
import { ExportSummarySchema } from '../../../src/contracts/taskpaper-tools/shared/index.js';

// T015: Contract tests for export_taskpaper schemas

describe('ExportTaskpaperInputSchema', () => {
  describe('valid inputs - single scope', () => {
    it('should accept projectId-only', () => {
      const result = ExportTaskpaperInputSchema.safeParse({ projectId: 'proj-123' });
      expect(result.success).toBe(true);
    });

    it('should accept folderId-only', () => {
      const result = ExportTaskpaperInputSchema.safeParse({ folderId: 'fold-123' });
      expect(result.success).toBe(true);
    });

    it('should accept taskIds-only', () => {
      const result = ExportTaskpaperInputSchema.safeParse({ taskIds: ['task-1', 'task-2'] });
      expect(result.success).toBe(true);
    });

    it('should apply default status of active', () => {
      const result = ExportTaskpaperInputSchema.safeParse({ projectId: 'proj-123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
    });

    it('should accept all status filter values', () => {
      for (const status of ['active', 'completed', 'dropped', 'all']) {
        const result = ExportTaskpaperInputSchema.safeParse({
          projectId: 'proj-123',
          status
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('invalid inputs - scope mutual exclusion', () => {
    it('should reject zero scopes', () => {
      const result = ExportTaskpaperInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject projectId + folderId', () => {
      const result = ExportTaskpaperInputSchema.safeParse({
        projectId: 'proj-123',
        folderId: 'fold-123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject projectId + taskIds', () => {
      const result = ExportTaskpaperInputSchema.safeParse({
        projectId: 'proj-123',
        taskIds: ['task-1']
      });
      expect(result.success).toBe(false);
    });

    it('should reject all three scopes', () => {
      const result = ExportTaskpaperInputSchema.safeParse({
        projectId: 'proj-123',
        folderId: 'fold-123',
        taskIds: ['task-1']
      });
      expect(result.success).toBe(false);
    });
  });

  describe('taskIds bounds', () => {
    it('should accept 1 task ID (min)', () => {
      const result = ExportTaskpaperInputSchema.safeParse({ taskIds: ['task-1'] });
      expect(result.success).toBe(true);
    });

    it('should accept 100 task IDs (max)', () => {
      const ids = Array.from({ length: 100 }, (_, i) => `task-${i}`);
      const result = ExportTaskpaperInputSchema.safeParse({ taskIds: ids });
      expect(result.success).toBe(true);
    });

    it('should reject empty taskIds array', () => {
      const result = ExportTaskpaperInputSchema.safeParse({ taskIds: [] });
      expect(result.success).toBe(false);
    });

    it('should reject 101 task IDs', () => {
      const ids = Array.from({ length: 101 }, (_, i) => `task-${i}`);
      const result = ExportTaskpaperInputSchema.safeParse({ taskIds: ids });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid status', () => {
    it('should reject invalid status value', () => {
      const result = ExportTaskpaperInputSchema.safeParse({
        projectId: 'proj-123',
        status: 'invalid'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('ExportSummarySchema', () => {
  it('should accept valid summary', () => {
    const result = ExportSummarySchema.safeParse({
      totalItems: 10,
      tasks: 8,
      projects: 2,
      maxDepth: 3
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative values', () => {
    const result = ExportSummarySchema.safeParse({
      totalItems: -1,
      tasks: 0,
      projects: 0,
      maxDepth: 0
    });
    expect(result.success).toBe(false);
  });
});

describe('ExportTaskpaperSuccessSchema', () => {
  it('should accept success response with transportText, summary, and warnings', () => {
    const result = ExportTaskpaperSuccessSchema.safeParse({
      success: true,
      transportText: '- Buy milk @errands',
      summary: { totalItems: 1, tasks: 1, projects: 0, maxDepth: 0 },
      warnings: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with warnings', () => {
    const result = ExportTaskpaperSuccessSchema.safeParse({
      success: true,
      transportText: '- \n',
      summary: { totalItems: 1, tasks: 1, projects: 0, maxDepth: 0 },
      warnings: [{ line: 1, message: 'Empty task name', content: '- ' }]
    });
    expect(result.success).toBe(true);
  });
});

describe('ExportTaskpaperErrorSchema', () => {
  it('should accept error response', () => {
    const result = ExportTaskpaperErrorSchema.safeParse({
      success: false,
      error: 'Project not found'
    });
    expect(result.success).toBe(true);
  });
});

describe('ExportTaskpaperResponseSchema', () => {
  it('should accept success variant', () => {
    const result = ExportTaskpaperResponseSchema.safeParse({
      success: true,
      transportText: '- Task',
      summary: { totalItems: 1, tasks: 1, projects: 0, maxDepth: 0 },
      warnings: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept error variant', () => {
    const result = ExportTaskpaperResponseSchema.safeParse({
      success: false,
      error: 'Export failed'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid discriminator', () => {
    const result = ExportTaskpaperResponseSchema.safeParse({
      success: 'maybe'
    });
    expect(result.success).toBe(false);
  });
});
