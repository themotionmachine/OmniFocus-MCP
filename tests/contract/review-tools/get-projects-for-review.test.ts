import { describe, expect, it } from 'vitest';
import {
  GetProjectsForReviewErrorSchema,
  GetProjectsForReviewInputSchema,
  GetProjectsForReviewResponseSchema,
  GetProjectsForReviewSuccessSchema
} from '../../../src/contracts/review-tools/get-projects-for-review.js';

describe('GetProjectsForReviewInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept empty object (all defaults)', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeFuture).toBe(false);
        expect(result.data.futureDays).toBe(7);
        expect(result.data.includeAll).toBe(false);
        expect(result.data.includeInactive).toBe(false);
        expect(result.data.limit).toBe(100);
      }
    });

    it('should accept all parameters simultaneously', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({
        includeFuture: true,
        futureDays: 14,
        includeAll: false,
        includeInactive: true,
        folderId: 'folder-123',
        folderName: 'Work',
        limit: 50
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeFuture).toBe(true);
        expect(result.data.futureDays).toBe(14);
        expect(result.data.includeInactive).toBe(true);
        expect(result.data.folderId).toBe('folder-123');
        expect(result.data.folderName).toBe('Work');
        expect(result.data.limit).toBe(50);
      }
    });

    it('should accept folderId only', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ folderId: 'folder-abc' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.folderId).toBe('folder-abc');
        expect(result.data.folderName).toBeUndefined();
      }
    });

    it('should accept folderName only', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ folderName: 'Personal' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.folderName).toBe('Personal');
        expect(result.data.folderId).toBeUndefined();
      }
    });

    it('should accept both folderId and folderName together (ID takes precedence)', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({
        folderId: 'folder-123',
        folderName: 'Work'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.folderId).toBe('folder-123');
        expect(result.data.folderName).toBe('Work');
      }
    });

    it('should accept limit: 1 (lower boundary)', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ limit: 1 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1);
      }
    });

    it('should accept limit: 1000 (upper boundary)', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ limit: 1000 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1000);
      }
    });

    it('should accept folderId: "abc123"', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ folderId: 'abc123' });
      expect(result.success).toBe(true);
    });

    it('should accept futureDays: 365', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ futureDays: 365 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.futureDays).toBe(365);
      }
    });

    it('should accept includeAll: true which overrides date filters', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({
        includeAll: true,
        includeFuture: true,
        futureDays: 30
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeAll).toBe(true);
      }
    });

    it('should accept includeInactive: true', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ includeInactive: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeInactive).toBe(true);
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject limit: 0 (below minimum)', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit: 1001 (above maximum)', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ limit: 1001 });
      expect(result.success).toBe(false);
    });

    it('should reject limit: 50.5 (non-integer)', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ limit: 50.5 });
      expect(result.success).toBe(false);
    });

    it('should reject futureDays: 0 (below minimum)', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ futureDays: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject futureDays: -1 (negative)', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ futureDays: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject folderId: "" (empty string)', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ folderId: '' });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean includeFuture', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ includeFuture: 'true' });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean includeAll', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ includeAll: 1 });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean includeInactive', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ includeInactive: 'yes' });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer futureDays', () => {
      const result = GetProjectsForReviewInputSchema.safeParse({ futureDays: 7.5 });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetProjectsForReviewSuccessSchema', () => {
  const validProject = {
    id: 'proj-1',
    name: 'Weekly Review',
    status: 'Active',
    flagged: false,
    reviewInterval: { steps: 7, unit: 'days' },
    lastReviewDate: '2025-12-23T00:00:00.000Z',
    nextReviewDate: '2025-12-30T00:00:00.000Z',
    remainingCount: 3
  };

  it('should accept success response with empty projects array', () => {
    const result = GetProjectsForReviewSuccessSchema.safeParse({
      success: true,
      projects: [],
      totalCount: 0,
      dueCount: 0,
      upcomingCount: 0
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with projects and counts', () => {
    const result = GetProjectsForReviewSuccessSchema.safeParse({
      success: true,
      projects: [validProject],
      totalCount: 1,
      dueCount: 1,
      upcomingCount: 0
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projects).toHaveLength(1);
      expect(result.data.totalCount).toBe(1);
      expect(result.data.dueCount).toBe(1);
      expect(result.data.upcomingCount).toBe(0);
    }
  });

  it('should accept success response with null lastReviewDate', () => {
    const result = GetProjectsForReviewSuccessSchema.safeParse({
      success: true,
      projects: [{ ...validProject, lastReviewDate: null }],
      totalCount: 1,
      dueCount: 0,
      upcomingCount: 1
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with null reviewInterval', () => {
    const result = GetProjectsForReviewSuccessSchema.safeParse({
      success: true,
      projects: [{ ...validProject, reviewInterval: null }],
      totalCount: 1,
      dueCount: 1,
      upcomingCount: 0
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without required count fields', () => {
    const result = GetProjectsForReviewSuccessSchema.safeParse({
      success: true,
      projects: []
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response with invalid project data', () => {
    const result = GetProjectsForReviewSuccessSchema.safeParse({
      success: true,
      projects: [{ id: 'proj-1', name: 'Test' }], // Missing required fields
      totalCount: 1,
      dueCount: 1,
      upcomingCount: 0
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative totalCount', () => {
    const result = GetProjectsForReviewSuccessSchema.safeParse({
      success: true,
      projects: [],
      totalCount: -1,
      dueCount: 0,
      upcomingCount: 0
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer dueCount', () => {
    const result = GetProjectsForReviewSuccessSchema.safeParse({
      success: true,
      projects: [],
      totalCount: 0,
      dueCount: 1.5,
      upcomingCount: 0
    });
    expect(result.success).toBe(false);
  });
});

describe('GetProjectsForReviewErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = GetProjectsForReviewErrorSchema.safeParse({
      success: false,
      error: "Folder 'xyz' not found"
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response with optional code', () => {
    const result = GetProjectsForReviewErrorSchema.safeParse({
      success: false,
      error: "Folder 'xyz' not found",
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('NOT_FOUND');
    }
  });

  it('should reject error response without error message', () => {
    const result = GetProjectsForReviewErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response with success: true', () => {
    const result = GetProjectsForReviewErrorSchema.safeParse({
      success: true,
      error: 'Error message'
    });
    expect(result.success).toBe(false);
  });
});

describe('GetProjectsForReviewResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = GetProjectsForReviewResponseSchema.safeParse({
      success: true,
      projects: [],
      totalCount: 0,
      dueCount: 0,
      upcomingCount: 0
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = GetProjectsForReviewResponseSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
  });

  it('should discriminate between success and error', () => {
    const successResult = GetProjectsForReviewResponseSchema.parse({
      success: true,
      projects: [
        {
          id: 'proj-1',
          name: 'Weekly Review',
          status: 'Active',
          flagged: false,
          reviewInterval: { steps: 7, unit: 'days' },
          lastReviewDate: null,
          nextReviewDate: '2025-12-30T00:00:00.000Z',
          remainingCount: 0
        }
      ],
      totalCount: 1,
      dueCount: 1,
      upcomingCount: 0
    });
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.projects).toHaveLength(1);
      expect(successResult.totalCount).toBe(1);
    }

    const errorResult = GetProjectsForReviewResponseSchema.parse({
      success: false,
      error: 'Error message'
    });
    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toBe('Error message');
    }
  });

  it('should reject mixed success/error response missing projects', () => {
    const result = GetProjectsForReviewResponseSchema.safeParse({
      success: true,
      error: 'Should not have error with success'
    });
    expect(result.success).toBe(false);
  });
});
