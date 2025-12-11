import { describe, expect, it } from 'vitest';
import {
  ListTasksErrorSchema,
  ListTasksInputSchema,
  ListTasksResponseSchema,
  ListTasksSuccessSchema
} from '../../../src/contracts/task-tools/list-tasks.js';

// T006: Contract test for ListTasksInputSchema
describe('ListTasksInputSchema', () => {
  describe('empty input (all optional)', () => {
    it('should accept empty input object', () => {
      const result = ListTasksInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should apply default values for empty input', () => {
      const result = ListTasksInputSchema.safeParse({});
      if (result.success) {
        expect(result.data.includeCompleted).toBe(false);
        expect(result.data.tagFilterMode).toBe('any');
        expect(result.data.limit).toBe(100);
        expect(result.data.flatten).toBe(true);
      }
    });
  });

  describe('container filters', () => {
    it('should accept projectId filter', () => {
      const result = ListTasksInputSchema.safeParse({ projectId: 'proj123' });
      expect(result.success).toBe(true);
    });

    it('should accept projectName filter', () => {
      const result = ListTasksInputSchema.safeParse({ projectName: 'My Project' });
      expect(result.success).toBe(true);
    });

    it('should accept folderId filter', () => {
      const result = ListTasksInputSchema.safeParse({ folderId: 'folder123' });
      expect(result.success).toBe(true);
    });

    it('should accept folderName filter', () => {
      const result = ListTasksInputSchema.safeParse({ folderName: 'Work' });
      expect(result.success).toBe(true);
    });

    it('should accept both projectId and projectName (ID takes precedence)', () => {
      const result = ListTasksInputSchema.safeParse({
        projectId: 'proj123',
        projectName: 'My Project'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both folderId and folderName (ID takes precedence)', () => {
      const result = ListTasksInputSchema.safeParse({
        folderId: 'folder123',
        folderName: 'Work'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('tag filters', () => {
    it('should accept tagIds array', () => {
      const result = ListTasksInputSchema.safeParse({ tagIds: ['tag1', 'tag2'] });
      expect(result.success).toBe(true);
    });

    it('should accept tagNames array', () => {
      const result = ListTasksInputSchema.safeParse({ tagNames: ['Work', 'Urgent'] });
      expect(result.success).toBe(true);
    });

    it('should accept empty tagIds array (treated as no filter)', () => {
      const result = ListTasksInputSchema.safeParse({ tagIds: [] });
      expect(result.success).toBe(true);
    });

    it('should accept empty tagNames array (treated as no filter)', () => {
      const result = ListTasksInputSchema.safeParse({ tagNames: [] });
      expect(result.success).toBe(true);
    });

    it('should accept tagFilterMode "any"', () => {
      const result = ListTasksInputSchema.safeParse({ tagFilterMode: 'any' });
      expect(result.success).toBe(true);
    });

    it('should accept tagFilterMode "all"', () => {
      const result = ListTasksInputSchema.safeParse({ tagFilterMode: 'all' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid tagFilterMode', () => {
      const result = ListTasksInputSchema.safeParse({ tagFilterMode: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should default tagFilterMode to "any"', () => {
      const result = ListTasksInputSchema.safeParse({});
      if (result.success) {
        expect(result.data.tagFilterMode).toBe('any');
      }
    });

    it('should accept both tagIds and tagNames with custom mode', () => {
      const result = ListTasksInputSchema.safeParse({
        tagIds: ['tag1'],
        tagNames: ['Work'],
        tagFilterMode: 'all'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('status filters', () => {
    it('should accept valid status array with single value', () => {
      const result = ListTasksInputSchema.safeParse({ status: ['Available'] });
      expect(result.success).toBe(true);
    });

    it('should accept valid status array with multiple values', () => {
      const result = ListTasksInputSchema.safeParse({
        status: ['Available', 'Next', 'Overdue']
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid status values', () => {
      const result = ListTasksInputSchema.safeParse({
        status: ['Available', 'Blocked', 'Completed', 'Dropped', 'DueSoon', 'Next', 'Overdue']
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty status array (treated as no filter)', () => {
      const result = ListTasksInputSchema.safeParse({ status: [] });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status value', () => {
      const result = ListTasksInputSchema.safeParse({ status: ['InvalidStatus'] });
      expect(result.success).toBe(false);
    });

    it('should reject lowercase status value', () => {
      const result = ListTasksInputSchema.safeParse({ status: ['available'] });
      expect(result.success).toBe(false);
    });

    it('should accept flagged filter as true', () => {
      const result = ListTasksInputSchema.safeParse({ flagged: true });
      expect(result.success).toBe(true);
    });

    it('should accept flagged filter as false', () => {
      const result = ListTasksInputSchema.safeParse({ flagged: false });
      expect(result.success).toBe(true);
    });

    it('should reject non-boolean flagged value', () => {
      const result = ListTasksInputSchema.safeParse({ flagged: 'true' });
      expect(result.success).toBe(false);
    });

    it('should accept includeCompleted as true', () => {
      const result = ListTasksInputSchema.safeParse({ includeCompleted: true });
      expect(result.success).toBe(true);
    });

    it('should accept includeCompleted as false', () => {
      const result = ListTasksInputSchema.safeParse({ includeCompleted: false });
      expect(result.success).toBe(true);
    });

    it('should default includeCompleted to false', () => {
      const result = ListTasksInputSchema.safeParse({});
      if (result.success) {
        expect(result.data.includeCompleted).toBe(false);
      }
    });
  });

  describe('date filters', () => {
    it('should accept dueBefore filter', () => {
      const result = ListTasksInputSchema.safeParse({ dueBefore: '2025-12-31T23:59:59.999Z' });
      expect(result.success).toBe(true);
    });

    it('should accept dueAfter filter', () => {
      const result = ListTasksInputSchema.safeParse({ dueAfter: '2025-01-01T00:00:00.000Z' });
      expect(result.success).toBe(true);
    });

    it('should accept deferBefore filter', () => {
      const result = ListTasksInputSchema.safeParse({ deferBefore: '2025-12-31T23:59:59.999Z' });
      expect(result.success).toBe(true);
    });

    it('should accept deferAfter filter', () => {
      const result = ListTasksInputSchema.safeParse({ deferAfter: '2025-01-01T00:00:00.000Z' });
      expect(result.success).toBe(true);
    });

    it('should accept plannedBefore filter (v4.7+)', () => {
      const result = ListTasksInputSchema.safeParse({ plannedBefore: '2025-12-31T23:59:59.999Z' });
      expect(result.success).toBe(true);
    });

    it('should accept plannedAfter filter (v4.7+)', () => {
      const result = ListTasksInputSchema.safeParse({ plannedAfter: '2025-01-01T00:00:00.000Z' });
      expect(result.success).toBe(true);
    });

    it('should accept completedBefore filter', () => {
      const result = ListTasksInputSchema.safeParse({
        completedBefore: '2025-12-31T23:59:59.999Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept completedAfter filter', () => {
      const result = ListTasksInputSchema.safeParse({ completedAfter: '2025-01-01T00:00:00.000Z' });
      expect(result.success).toBe(true);
    });

    it('should accept all date filters together', () => {
      const result = ListTasksInputSchema.safeParse({
        dueBefore: '2025-12-31T23:59:59.999Z',
        dueAfter: '2025-01-01T00:00:00.000Z',
        deferBefore: '2025-12-31T23:59:59.999Z',
        deferAfter: '2025-01-01T00:00:00.000Z',
        plannedBefore: '2025-12-31T23:59:59.999Z',
        plannedAfter: '2025-01-01T00:00:00.000Z',
        completedBefore: '2025-12-31T23:59:59.999Z',
        completedAfter: '2025-01-01T00:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('result options', () => {
    it('should accept limit within valid range', () => {
      const result = ListTasksInputSchema.safeParse({ limit: 50 });
      expect(result.success).toBe(true);
    });

    it('should accept limit at minimum (1)', () => {
      const result = ListTasksInputSchema.safeParse({ limit: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept limit at maximum (1000)', () => {
      const result = ListTasksInputSchema.safeParse({ limit: 1000 });
      expect(result.success).toBe(true);
    });

    it('should default limit to 100', () => {
      const result = ListTasksInputSchema.safeParse({});
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it('should reject limit less than 1', () => {
      const result = ListTasksInputSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 1000', () => {
      const result = ListTasksInputSchema.safeParse({ limit: 1001 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer limit', () => {
      const result = ListTasksInputSchema.safeParse({ limit: 50.5 });
      expect(result.success).toBe(false);
    });

    it('should reject string limit', () => {
      const result = ListTasksInputSchema.safeParse({ limit: '100' });
      expect(result.success).toBe(false);
    });

    it('should accept flatten as true', () => {
      const result = ListTasksInputSchema.safeParse({ flatten: true });
      expect(result.success).toBe(true);
    });

    it('should accept flatten as false', () => {
      const result = ListTasksInputSchema.safeParse({ flatten: false });
      expect(result.success).toBe(true);
    });

    it('should default flatten to true', () => {
      const result = ListTasksInputSchema.safeParse({});
      if (result.success) {
        expect(result.data.flatten).toBe(true);
      }
    });

    it('should reject non-boolean flatten', () => {
      const result = ListTasksInputSchema.safeParse({ flatten: 'true' });
      expect(result.success).toBe(false);
    });
  });

  describe('complex filter combinations', () => {
    it('should accept all filters combined', () => {
      const result = ListTasksInputSchema.safeParse({
        projectId: 'proj123',
        projectName: 'My Project',
        folderId: 'folder123',
        folderName: 'Work',
        tagIds: ['tag1', 'tag2'],
        tagNames: ['Work', 'Urgent'],
        tagFilterMode: 'all',
        status: ['Available', 'Next'],
        flagged: true,
        includeCompleted: true,
        dueBefore: '2025-12-31T23:59:59.999Z',
        dueAfter: '2025-01-01T00:00:00.000Z',
        deferBefore: '2025-12-31T23:59:59.999Z',
        deferAfter: '2025-01-01T00:00:00.000Z',
        plannedBefore: '2025-12-31T23:59:59.999Z',
        plannedAfter: '2025-01-01T00:00:00.000Z',
        completedBefore: '2025-12-31T23:59:59.999Z',
        completedAfter: '2025-01-01T00:00:00.000Z',
        limit: 200,
        flatten: false
      });
      expect(result.success).toBe(true);
    });

    it('should accept container + tag filters', () => {
      const result = ListTasksInputSchema.safeParse({
        projectId: 'proj123',
        tagIds: ['tag1'],
        tagFilterMode: 'any'
      });
      expect(result.success).toBe(true);
    });

    it('should accept status + date filters', () => {
      const result = ListTasksInputSchema.safeParse({
        status: ['Available', 'Next'],
        dueBefore: '2025-12-31T23:59:59.999Z',
        includeCompleted: false
      });
      expect(result.success).toBe(true);
    });

    it('should accept tag + status filters', () => {
      const result = ListTasksInputSchema.safeParse({
        tagNames: ['Work'],
        status: ['Overdue'],
        flagged: true
      });
      expect(result.success).toBe(true);
    });
  });
});

// T006: Contract test for ListTasksSuccessSchema
describe('ListTasksSuccessSchema', () => {
  it('should accept success response with empty tasks array', () => {
    const result = ListTasksSuccessSchema.safeParse({
      success: true,
      tasks: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with valid task summaries', () => {
    const result = ListTasksSuccessSchema.safeParse({
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Test Task',
          taskStatus: 'Available',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: [],
          tagNames: []
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with multiple tasks', () => {
    const result = ListTasksSuccessSchema.safeParse({
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          taskStatus: 'Available',
          flagged: false,
          deferDate: null,
          dueDate: null,
          plannedDate: null,
          projectId: null,
          projectName: null,
          tagIds: [],
          tagNames: []
        },
        {
          id: 'task2',
          name: 'Task 2',
          taskStatus: 'Next',
          flagged: true,
          deferDate: '2025-01-15T09:00:00.000Z',
          dueDate: '2025-01-20T17:00:00.000Z',
          plannedDate: '2025-01-18T10:00:00.000Z',
          projectId: 'proj123',
          projectName: 'My Project',
          tagIds: ['tag1'],
          tagNames: ['Work']
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without tasks field', () => {
    const result = ListTasksSuccessSchema.safeParse({
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: false in success schema', () => {
    const result = ListTasksSuccessSchema.safeParse({
      success: false,
      tasks: []
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-array tasks field', () => {
    const result = ListTasksSuccessSchema.safeParse({
      success: true,
      tasks: 'not-an-array'
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid task summary in tasks array', () => {
    const result = ListTasksSuccessSchema.safeParse({
      success: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task 1'
          // Missing required fields
        }
      ]
    });
    expect(result.success).toBe(false);
  });
});

// T006: Contract test for ListTasksErrorSchema
describe('ListTasksErrorSchema', () => {
  it('should accept error response with error message', () => {
    const result = ListTasksErrorSchema.safeParse({
      success: false,
      error: 'An error occurred'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response with detailed message', () => {
    const result = ListTasksErrorSchema.safeParse({
      success: false,
      error: 'Project "abc123" not found'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response with empty error message', () => {
    const result = ListTasksErrorSchema.safeParse({
      success: false,
      error: ''
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error field', () => {
    const result = ListTasksErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject success: true in error schema', () => {
    const result = ListTasksErrorSchema.safeParse({
      success: true,
      error: 'Error message'
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-string error field', () => {
    const result = ListTasksErrorSchema.safeParse({
      success: false,
      error: 123
    });
    expect(result.success).toBe(false);
  });
});

// T006: Contract test for ListTasksResponseSchema (discriminated union)
describe('ListTasksResponseSchema', () => {
  it('should accept success response', () => {
    const result = ListTasksResponseSchema.safeParse({
      success: true,
      tasks: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = ListTasksResponseSchema.safeParse({
      success: false,
      error: 'An error occurred'
    });
    expect(result.success).toBe(true);
  });

  it('should reject response with wrong fields for success', () => {
    const result = ListTasksResponseSchema.safeParse({
      success: true,
      error: 'Should have tasks field'
    });
    expect(result.success).toBe(false);
  });

  it('should reject response with wrong fields for error', () => {
    const result = ListTasksResponseSchema.safeParse({
      success: false,
      tasks: []
    });
    expect(result.success).toBe(false);
  });

  it('should reject response without success field', () => {
    const result = ListTasksResponseSchema.safeParse({
      tasks: []
    });
    expect(result.success).toBe(false);
  });

  it('should reject completely invalid response', () => {
    const result = ListTasksResponseSchema.safeParse({
      invalid: 'data'
    });
    expect(result.success).toBe(false);
  });
});
