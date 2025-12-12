import { describe, expect, it } from 'vitest';
import {
  ListProjectsErrorSchema,
  ListProjectsInputSchema,
  ListProjectsResponseSchema,
  ListProjectsSuccessSchema
} from '../../../src/contracts/project-tools/list-projects.js';

describe('ListProjectsInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept empty object (all defaults)', () => {
      const result = ListProjectsInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeCompleted).toBe(false); // default
        expect(result.data.reviewStatus).toBe('any'); // default
        expect(result.data.limit).toBe(100); // default
      }
    });

    it('should accept folderId filter', () => {
      const result = ListProjectsInputSchema.safeParse({ folderId: 'folder-123' });
      expect(result.success).toBe(true);
    });

    it('should accept folderName filter', () => {
      const result = ListProjectsInputSchema.safeParse({ folderName: 'Work' });
      expect(result.success).toBe(true);
    });

    it('should accept both folderId and folderName (ID takes precedence)', () => {
      const result = ListProjectsInputSchema.safeParse({
        folderId: 'folder-123',
        folderName: 'Work'
      });
      expect(result.success).toBe(true);
    });

    it('should accept single status filter', () => {
      const result = ListProjectsInputSchema.safeParse({ status: ['Active'] });
      expect(result.success).toBe(true);
    });

    it('should accept multiple status filters', () => {
      const result = ListProjectsInputSchema.safeParse({
        status: ['Active', 'OnHold']
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid status values', () => {
      const result = ListProjectsInputSchema.safeParse({
        status: ['Active', 'OnHold', 'Done', 'Dropped']
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty status array', () => {
      const result = ListProjectsInputSchema.safeParse({ status: [] });
      expect(result.success).toBe(true);
    });

    it('should accept reviewStatus: due', () => {
      const result = ListProjectsInputSchema.safeParse({ reviewStatus: 'due' });
      expect(result.success).toBe(true);
    });

    it('should accept reviewStatus: upcoming', () => {
      const result = ListProjectsInputSchema.safeParse({ reviewStatus: 'upcoming' });
      expect(result.success).toBe(true);
    });

    it('should accept reviewStatus: any', () => {
      const result = ListProjectsInputSchema.safeParse({ reviewStatus: 'any' });
      expect(result.success).toBe(true);
    });

    it('should accept flagged: true', () => {
      const result = ListProjectsInputSchema.safeParse({ flagged: true });
      expect(result.success).toBe(true);
    });

    it('should accept flagged: false', () => {
      const result = ListProjectsInputSchema.safeParse({ flagged: false });
      expect(result.success).toBe(true);
    });

    it('should accept includeCompleted: true', () => {
      const result = ListProjectsInputSchema.safeParse({ includeCompleted: true });
      expect(result.success).toBe(true);
    });

    it('should accept includeCompleted: false', () => {
      const result = ListProjectsInputSchema.safeParse({ includeCompleted: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeCompleted).toBe(false);
      }
    });

    it('should accept dueBefore date filter', () => {
      const result = ListProjectsInputSchema.safeParse({ dueBefore: '2025-12-31T23:59:59Z' });
      expect(result.success).toBe(true);
    });

    it('should accept dueAfter date filter', () => {
      const result = ListProjectsInputSchema.safeParse({ dueAfter: '2025-01-01T00:00:00Z' });
      expect(result.success).toBe(true);
    });

    it('should accept both dueBefore and dueAfter', () => {
      const result = ListProjectsInputSchema.safeParse({
        dueAfter: '2025-01-01T00:00:00Z',
        dueBefore: '2025-12-31T23:59:59Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept deferBefore date filter', () => {
      const result = ListProjectsInputSchema.safeParse({ deferBefore: '2025-12-31T23:59:59Z' });
      expect(result.success).toBe(true);
    });

    it('should accept deferAfter date filter', () => {
      const result = ListProjectsInputSchema.safeParse({ deferAfter: '2025-01-01T00:00:00Z' });
      expect(result.success).toBe(true);
    });

    it('should accept both deferBefore and deferAfter', () => {
      const result = ListProjectsInputSchema.safeParse({
        deferAfter: '2025-01-01T00:00:00Z',
        deferBefore: '2025-12-31T23:59:59Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept limit parameter', () => {
      const result = ListProjectsInputSchema.safeParse({ limit: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should accept minimum limit (1)', () => {
      const result = ListProjectsInputSchema.safeParse({ limit: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept maximum limit (1000)', () => {
      const result = ListProjectsInputSchema.safeParse({ limit: 1000 });
      expect(result.success).toBe(true);
    });

    it('should accept all filter combinations', () => {
      const result = ListProjectsInputSchema.safeParse({
        folderId: 'folder-123',
        folderName: 'Work',
        status: ['Active', 'OnHold'],
        reviewStatus: 'due',
        flagged: true,
        includeCompleted: false,
        dueBefore: '2025-12-31T23:59:59Z',
        dueAfter: '2025-01-01T00:00:00Z',
        deferBefore: '2025-12-31T23:59:59Z',
        deferAfter: '2025-01-01T00:00:00Z',
        limit: 200
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid status value', () => {
      const result = ListProjectsInputSchema.safeParse({ status: ['InvalidStatus'] });
      expect(result.success).toBe(false);
    });

    it('should reject invalid status (lowercase)', () => {
      const result = ListProjectsInputSchema.safeParse({ status: ['active'] });
      expect(result.success).toBe(false);
    });

    it('should reject invalid reviewStatus value', () => {
      const result = ListProjectsInputSchema.safeParse({ reviewStatus: 'overdue' });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean flagged', () => {
      const result = ListProjectsInputSchema.safeParse({ flagged: 'yes' });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean includeCompleted', () => {
      const result = ListProjectsInputSchema.safeParse({ includeCompleted: 'true' });
      expect(result.success).toBe(false);
    });

    it('should reject non-string date filters', () => {
      const result = ListProjectsInputSchema.safeParse({ dueBefore: 1234567890 });
      expect(result.success).toBe(false);
    });

    it('should reject limit less than 1', () => {
      const result = ListProjectsInputSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 1000', () => {
      const result = ListProjectsInputSchema.safeParse({ limit: 1001 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer limit', () => {
      const result = ListProjectsInputSchema.safeParse({ limit: 50.5 });
      expect(result.success).toBe(false);
    });

    it('should reject non-string folderId', () => {
      const result = ListProjectsInputSchema.safeParse({ folderId: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject non-string folderName', () => {
      const result = ListProjectsInputSchema.safeParse({ folderName: 123 });
      expect(result.success).toBe(false);
    });
  });
});

describe('ListProjectsSuccessSchema', () => {
  it('should accept success response with empty projects array', () => {
    const result = ListProjectsSuccessSchema.safeParse({
      success: true,
      projects: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with projects', () => {
    const result = ListProjectsSuccessSchema.safeParse({
      success: true,
      projects: [
        {
          id: 'proj-1',
          name: 'Website Redesign',
          status: 'Active',
          flagged: true,
          projectType: 'parallel',
          deferDate: null,
          dueDate: '2025-12-31T23:59:59Z',
          nextReviewDate: null,
          parentFolderId: 'folder-1',
          parentFolderName: 'Work',
          taskCount: 10,
          remainingCount: 5
        },
        {
          id: 'proj-2',
          name: 'Research',
          status: 'OnHold',
          flagged: false,
          projectType: 'sequential',
          deferDate: '2025-01-15T00:00:00Z',
          dueDate: null,
          nextReviewDate: '2025-02-01T00:00:00Z',
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 3,
          remainingCount: 3
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without projects array', () => {
    const result = ListProjectsSuccessSchema.safeParse({
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response with invalid project data', () => {
    const result = ListProjectsSuccessSchema.safeParse({
      success: true,
      projects: [
        {
          id: 'proj-1',
          name: 'Test Project'
          // Missing required fields
        }
      ]
    });
    expect(result.success).toBe(false);
  });
});

describe('ListProjectsErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = ListProjectsErrorSchema.safeParse({
      success: false,
      error: "Folder 'xyz' not found"
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = ListProjectsErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response with success: true', () => {
    const result = ListProjectsErrorSchema.safeParse({
      success: true,
      error: 'Error message'
    });
    expect(result.success).toBe(false);
  });
});

describe('ListProjectsResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = ListProjectsResponseSchema.safeParse({
      success: true,
      projects: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = ListProjectsResponseSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
  });

  it('should discriminate between success and error', () => {
    const successResult = ListProjectsResponseSchema.parse({
      success: true,
      projects: [
        {
          id: '1',
          name: 'Test',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          deferDate: null,
          dueDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 0,
          remainingCount: 0
        }
      ]
    });
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.projects).toHaveLength(1);
    }

    const errorResult = ListProjectsResponseSchema.parse({
      success: false,
      error: 'Error message'
    });
    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toBe('Error message');
    }
  });

  it('should reject mixed success/error response', () => {
    const result = ListProjectsResponseSchema.safeParse({
      success: true,
      error: 'Should not have error with success'
    });
    expect(result.success).toBe(false);
  });
});
