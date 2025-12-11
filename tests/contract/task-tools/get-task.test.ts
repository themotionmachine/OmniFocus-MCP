import { describe, expect, it } from 'vitest';
import {
  GetTaskErrorSchema,
  GetTaskInputSchema,
  GetTaskResponseSchema,
  GetTaskSuccessSchema
} from '../../../src/contracts/task-tools/index.js';

describe('GetTaskInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept id only', () => {
      const result = GetTaskInputSchema.safeParse({
        id: 'task123'
      });
      expect(result.success).toBe(true);
    });

    it('should accept name only', () => {
      const result = GetTaskInputSchema.safeParse({
        name: 'My Task'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both id and name (id takes precedence)', () => {
      const result = GetTaskInputSchema.safeParse({
        id: 'task123',
        name: 'My Task'
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty string for id', () => {
      const result = GetTaskInputSchema.safeParse({
        id: ''
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty string for name', () => {
      const result = GetTaskInputSchema.safeParse({
        name: ''
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with special characters', () => {
      const result = GetTaskInputSchema.safeParse({
        name: 'Task: Work / Review (2025)'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('refine validation - at least one of id or name required', () => {
    it('should reject empty object (neither id nor name)', () => {
      const result = GetTaskInputSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('At least one of id or name is required');
      }
    });

    it('should reject object with only undefined id', () => {
      const result = GetTaskInputSchema.safeParse({
        id: undefined
      });
      expect(result.success).toBe(false);
    });

    it('should reject object with only undefined name', () => {
      const result = GetTaskInputSchema.safeParse({
        name: undefined
      });
      expect(result.success).toBe(false);
    });

    it('should reject object with both id and name undefined', () => {
      const result = GetTaskInputSchema.safeParse({
        id: undefined,
        name: undefined
      });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid inputs', () => {
    it('should reject null', () => {
      const result = GetTaskInputSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject string', () => {
      const result = GetTaskInputSchema.safeParse('task123');
      expect(result.success).toBe(false);
    });

    it('should reject array', () => {
      const result = GetTaskInputSchema.safeParse(['task123']);
      expect(result.success).toBe(false);
    });

    it('should reject number id', () => {
      const result = GetTaskInputSchema.safeParse({
        id: 123
      });
      expect(result.success).toBe(false);
    });

    it('should reject number name', () => {
      const result = GetTaskInputSchema.safeParse({
        name: 123
      });
      expect(result.success).toBe(false);
    });

    it('should reject null id', () => {
      const result = GetTaskInputSchema.safeParse({
        id: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject null name', () => {
      const result = GetTaskInputSchema.safeParse({
        name: null
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetTaskSuccessSchema', () => {
  const validTaskFull = {
    // Identity
    id: 'task123',
    name: 'Test Task',
    note: '',

    // Status
    taskStatus: 'Available',
    completed: false,
    flagged: false,
    effectiveFlagged: false,

    // Dates (writable)
    deferDate: null,
    dueDate: null,
    plannedDate: null,

    // Dates (computed/read-only)
    effectiveDeferDate: null,
    effectiveDueDate: null,
    effectivePlannedDate: null,
    completionDate: null,
    dropDate: null,
    added: null,
    modified: null,

    // Time Estimation
    estimatedMinutes: null,

    // Hierarchy Configuration
    sequential: false,
    completedByChildren: false,
    shouldUseFloatingTimeZone: false,

    // Hierarchy Status
    hasChildren: false,
    inInbox: true,

    // Relationships
    containingProject: null,
    parent: null,
    tags: []
  };

  describe('valid success responses', () => {
    it('should accept success with minimal TaskFull', () => {
      const result = GetTaskSuccessSchema.safeParse({
        success: true,
        task: validTaskFull
      });
      expect(result.success).toBe(true);
    });

    it('should accept success with complete TaskFull', () => {
      const result = GetTaskSuccessSchema.safeParse({
        success: true,
        task: {
          ...validTaskFull,
          note: 'Task notes here',
          completed: true,
          flagged: true,
          effectiveFlagged: true,
          deferDate: '2025-01-15T09:00:00.000Z',
          dueDate: '2025-01-20T17:00:00.000Z',
          plannedDate: '2025-01-18T10:00:00.000Z',
          effectiveDeferDate: '2025-01-15T09:00:00.000Z',
          effectiveDueDate: '2025-01-20T17:00:00.000Z',
          effectivePlannedDate: '2025-01-18T10:00:00.000Z',
          completionDate: '2025-01-19T14:30:00.000Z',
          added: '2025-01-10T08:00:00.000Z',
          modified: '2025-01-19T14:30:00.000Z',
          estimatedMinutes: 60,
          sequential: true,
          completedByChildren: true,
          shouldUseFloatingTimeZone: true,
          hasChildren: true,
          inInbox: false,
          containingProject: { id: 'proj123', name: 'My Project' },
          parent: { id: 'parent123', name: 'Parent Task' },
          tags: [
            { id: 'tag1', name: 'Work' },
            { id: 'tag2', name: 'Urgent' }
          ]
        }
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing success field', () => {
      const result = GetTaskSuccessSchema.safeParse({
        task: validTaskFull
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing task field', () => {
      const result = GetTaskSuccessSchema.safeParse({
        success: true
      });
      expect(result.success).toBe(false);
    });
  });

  describe('literal validation', () => {
    it('should reject success: false', () => {
      const result = GetTaskSuccessSchema.safeParse({
        success: false,
        task: validTaskFull
      });
      expect(result.success).toBe(false);
    });

    it('should reject success: "true"', () => {
      const result = GetTaskSuccessSchema.safeParse({
        success: 'true',
        task: validTaskFull
      });
      expect(result.success).toBe(false);
    });
  });

  describe('task field validation', () => {
    it('should reject null task', () => {
      const result = GetTaskSuccessSchema.safeParse({
        success: true,
        task: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty object task', () => {
      const result = GetTaskSuccessSchema.safeParse({
        success: true,
        task: {}
      });
      expect(result.success).toBe(false);
    });

    it('should reject task with missing required fields', () => {
      const result = GetTaskSuccessSchema.safeParse({
        success: true,
        task: {
          id: 'task123',
          name: 'Test Task'
          // Missing many required fields
        }
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetTaskErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept error with message', () => {
      const result = GetTaskErrorSchema.safeParse({
        success: false,
        error: 'Task not found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept error with detailed message', () => {
      const result = GetTaskErrorSchema.safeParse({
        success: false,
        error: "Task 'task123' not found"
      });
      expect(result.success).toBe(true);
    });

    it('should accept error with empty string', () => {
      const result = GetTaskErrorSchema.safeParse({
        success: false,
        error: ''
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing success field', () => {
      const result = GetTaskErrorSchema.safeParse({
        error: 'Task not found'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing error field', () => {
      const result = GetTaskErrorSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });
  });

  describe('literal validation', () => {
    it('should reject success: true', () => {
      const result = GetTaskErrorSchema.safeParse({
        success: true,
        error: 'Task not found'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject number error', () => {
      const result = GetTaskErrorSchema.safeParse({
        success: false,
        error: 123
      });
      expect(result.success).toBe(false);
    });

    it('should reject null error', () => {
      const result = GetTaskErrorSchema.safeParse({
        success: false,
        error: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject object error', () => {
      const result = GetTaskErrorSchema.safeParse({
        success: false,
        error: { message: 'Task not found' }
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetTaskResponseSchema', () => {
  const validTaskFull = {
    // Identity
    id: 'task123',
    name: 'Test Task',
    note: '',

    // Status
    taskStatus: 'Available',
    completed: false,
    flagged: false,
    effectiveFlagged: false,

    // Dates (writable)
    deferDate: null,
    dueDate: null,
    plannedDate: null,

    // Dates (computed/read-only)
    effectiveDeferDate: null,
    effectiveDueDate: null,
    effectivePlannedDate: null,
    completionDate: null,
    dropDate: null,
    added: null,
    modified: null,

    // Time Estimation
    estimatedMinutes: null,

    // Hierarchy Configuration
    sequential: false,
    completedByChildren: false,
    shouldUseFloatingTimeZone: false,

    // Hierarchy Status
    hasChildren: false,
    inInbox: true,

    // Relationships
    containingProject: null,
    parent: null,
    tags: []
  };

  describe('union - success response', () => {
    it('should accept success response', () => {
      const result = GetTaskResponseSchema.safeParse({
        success: true,
        task: validTaskFull
      });
      expect(result.success).toBe(true);
    });
  });

  describe('union - error response', () => {
    it('should accept standard error response', () => {
      const result = GetTaskResponseSchema.safeParse({
        success: false,
        error: 'Task not found'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('union - disambiguation error response', () => {
    it('should accept disambiguation error with 2 matches', () => {
      const result = GetTaskResponseSchema.safeParse({
        success: false,
        error: 'Multiple tasks found with name "Test Task"',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['task1', 'task2']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error with 3 matches', () => {
      const result = GetTaskResponseSchema.safeParse({
        success: false,
        error: 'Multiple tasks found',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['task1', 'task2', 'task3']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error with many matches', () => {
      const result = GetTaskResponseSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2', 'id3', 'id4', 'id5']
      });
      expect(result.success).toBe(true);
    });
  });

  describe('union - invalid responses', () => {
    it('should reject response with success=true and error field', () => {
      const result = GetTaskResponseSchema.safeParse({
        success: true,
        error: 'Should not have error with success'
      });
      expect(result.success).toBe(false);
    });

    it('should reject response with success=false and task field', () => {
      const result = GetTaskResponseSchema.safeParse({
        success: false,
        task: validTaskFull
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty object', () => {
      const result = GetTaskResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = GetTaskResponseSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });

  describe('union - disambiguation edge cases', () => {
    it('should accept disambiguation with single matching ID (matches GetTaskErrorSchema fallback)', () => {
      // Union allows this because GetTaskErrorSchema matches first
      // In practice, primitives should never return this invalid state
      const result = GetTaskResponseSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation with empty matchingIds (matches GetTaskErrorSchema fallback)', () => {
      // Union allows this because GetTaskErrorSchema matches first
      // In practice, primitives should never return this invalid state
      const result = GetTaskResponseSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: []
      });
      expect(result.success).toBe(true);
    });

    it('should accept wrong code for disambiguation (matches GetTaskErrorSchema fallback)', () => {
      // Union allows this because GetTaskErrorSchema matches first
      // In practice, primitives should never return this invalid state
      const result = GetTaskResponseSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'NOT_FOUND',
        matchingIds: ['id1', 'id2']
      });
      expect(result.success).toBe(true);
    });
  });
});
