import { describe, expect, it } from 'vitest';
import {
  GetProjectErrorSchema,
  GetProjectInputSchema,
  GetProjectResponseSchema,
  GetProjectSuccessSchema
} from '../../../src/contracts/project-tools/index.js';

describe('GetProjectInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept id only', () => {
      const result = GetProjectInputSchema.safeParse({
        id: 'proj123'
      });
      expect(result.success).toBe(true);
    });

    it('should accept name only', () => {
      const result = GetProjectInputSchema.safeParse({
        name: 'My Project'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both id and name (id takes precedence)', () => {
      const result = GetProjectInputSchema.safeParse({
        id: 'proj123',
        name: 'My Project'
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty string for id', () => {
      const result = GetProjectInputSchema.safeParse({
        id: ''
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty string for name', () => {
      const result = GetProjectInputSchema.safeParse({
        name: ''
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with special characters', () => {
      const result = GetProjectInputSchema.safeParse({
        name: 'Project: Work / Review (2025)'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('refine validation - at least one of id or name required', () => {
    it('should reject empty object (neither id nor name)', () => {
      const result = GetProjectInputSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('At least one of id or name is required');
      }
    });

    it('should reject object with only undefined id', () => {
      const result = GetProjectInputSchema.safeParse({
        id: undefined
      });
      expect(result.success).toBe(false);
    });

    it('should reject object with only undefined name', () => {
      const result = GetProjectInputSchema.safeParse({
        name: undefined
      });
      expect(result.success).toBe(false);
    });

    it('should reject object with both id and name undefined', () => {
      const result = GetProjectInputSchema.safeParse({
        id: undefined,
        name: undefined
      });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid inputs', () => {
    it('should reject null', () => {
      const result = GetProjectInputSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject string', () => {
      const result = GetProjectInputSchema.safeParse('proj123');
      expect(result.success).toBe(false);
    });

    it('should reject array', () => {
      const result = GetProjectInputSchema.safeParse(['proj123']);
      expect(result.success).toBe(false);
    });

    it('should reject number id', () => {
      const result = GetProjectInputSchema.safeParse({
        id: 123
      });
      expect(result.success).toBe(false);
    });

    it('should reject number name', () => {
      const result = GetProjectInputSchema.safeParse({
        name: 123
      });
      expect(result.success).toBe(false);
    });

    it('should reject null id', () => {
      const result = GetProjectInputSchema.safeParse({
        id: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject null name', () => {
      const result = GetProjectInputSchema.safeParse({
        name: null
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetProjectSuccessSchema', () => {
  const validProjectFull = {
    // Identity
    id: 'proj123',
    name: 'Test Project',
    note: '',

    // Status
    status: 'Active' as const,
    completed: false,
    flagged: false,
    effectiveFlagged: false,

    // Project Type
    sequential: false,
    containsSingletonActions: false,
    projectType: 'parallel' as const,

    // Completion Behavior
    completedByChildren: false,
    defaultSingletonActionHolder: false,

    // Dates (writable)
    deferDate: null,
    dueDate: null,

    // Dates (computed/read-only)
    effectiveDeferDate: null,
    effectiveDueDate: null,
    completionDate: null,
    dropDate: null,

    // Time Estimation
    estimatedMinutes: null,

    // Review Settings
    reviewInterval: null,
    lastReviewDate: null,
    nextReviewDate: null,

    // Repetition
    repetitionRule: null,

    // Timezone
    shouldUseFloatingTimeZone: false,

    // Hierarchy Status
    hasChildren: false,

    // Next Action
    nextTask: null,

    // Relationships
    parentFolder: null,
    tags: [],

    // Statistics
    taskCount: 0,
    remainingCount: 0
  };

  describe('valid success responses', () => {
    it('should accept success with minimal ProjectFull', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: true,
        project: validProjectFull
      });
      expect(result.success).toBe(true);
    });

    it('should accept success with complete ProjectFull', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: true,
        project: {
          ...validProjectFull,
          note: 'Project notes here',
          status: 'OnHold',
          completed: true,
          flagged: true,
          effectiveFlagged: true,
          sequential: true,
          projectType: 'sequential',
          completedByChildren: true,
          defaultSingletonActionHolder: true,
          deferDate: '2025-01-15T09:00:00.000Z',
          dueDate: '2025-01-20T17:00:00.000Z',
          effectiveDeferDate: '2025-01-15T09:00:00.000Z',
          effectiveDueDate: '2025-01-20T17:00:00.000Z',
          completionDate: '2025-01-19T14:30:00.000Z',
          dropDate: null,
          estimatedMinutes: 120,
          reviewInterval: { steps: 14, unit: 'days' },
          lastReviewDate: '2025-01-10T08:00:00.000Z',
          nextReviewDate: '2025-01-24T08:00:00.000Z',
          repetitionRule: 'FREQ=WEEKLY;INTERVAL=1',
          shouldUseFloatingTimeZone: true,
          hasChildren: true,
          nextTask: { id: 'task123', name: 'Next Task' },
          parentFolder: { id: 'folder123', name: 'Work' },
          tags: [
            { id: 'tag1', name: 'Work' },
            { id: 'tag2', name: 'Urgent' }
          ],
          taskCount: 5,
          remainingCount: 3
        }
      });
      expect(result.success).toBe(true);
    });

    it('should accept single-actions project type', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: true,
        project: {
          ...validProjectFull,
          containsSingletonActions: true,
          projectType: 'single-actions'
        }
      });
      expect(result.success).toBe(true);
    });

    it('should accept all project statuses', () => {
      const statuses = ['Active', 'OnHold', 'Done', 'Dropped'] as const;
      for (const status of statuses) {
        const result = GetProjectSuccessSchema.safeParse({
          success: true,
          project: {
            ...validProjectFull,
            status
          }
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('required fields', () => {
    it('should reject missing success field', () => {
      const result = GetProjectSuccessSchema.safeParse({
        project: validProjectFull
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing project field', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: true
      });
      expect(result.success).toBe(false);
    });
  });

  describe('literal validation', () => {
    it('should reject success: false', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: false,
        project: validProjectFull
      });
      expect(result.success).toBe(false);
    });

    it('should reject success: "true"', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: 'true',
        project: validProjectFull
      });
      expect(result.success).toBe(false);
    });
  });

  describe('project field validation', () => {
    it('should reject null project', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: true,
        project: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty object project', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: true,
        project: {}
      });
      expect(result.success).toBe(false);
    });

    it('should reject project with missing required fields', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: true,
        project: {
          id: 'proj123',
          name: 'Test Project'
          // Missing many required fields
        }
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid project status', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: true,
        project: {
          ...validProjectFull,
          status: 'InvalidStatus'
        }
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid project type', () => {
      const result = GetProjectSuccessSchema.safeParse({
        success: true,
        project: {
          ...validProjectFull,
          projectType: 'invalid-type'
        }
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetProjectErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept error with message', () => {
      const result = GetProjectErrorSchema.safeParse({
        success: false,
        error: 'Project not found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept error with detailed message', () => {
      const result = GetProjectErrorSchema.safeParse({
        success: false,
        error: "Project 'proj123' not found"
      });
      expect(result.success).toBe(true);
    });

    it('should accept error with empty string', () => {
      const result = GetProjectErrorSchema.safeParse({
        success: false,
        error: ''
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing success field', () => {
      const result = GetProjectErrorSchema.safeParse({
        error: 'Project not found'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing error field', () => {
      const result = GetProjectErrorSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });
  });

  describe('literal validation', () => {
    it('should reject success: true', () => {
      const result = GetProjectErrorSchema.safeParse({
        success: true,
        error: 'Project not found'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject number error', () => {
      const result = GetProjectErrorSchema.safeParse({
        success: false,
        error: 123
      });
      expect(result.success).toBe(false);
    });

    it('should reject null error', () => {
      const result = GetProjectErrorSchema.safeParse({
        success: false,
        error: null
      });
      expect(result.success).toBe(false);
    });

    it('should reject object error', () => {
      const result = GetProjectErrorSchema.safeParse({
        success: false,
        error: { message: 'Project not found' }
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetProjectResponseSchema', () => {
  const validProjectFull = {
    // Identity
    id: 'proj123',
    name: 'Test Project',
    note: '',

    // Status
    status: 'Active' as const,
    completed: false,
    flagged: false,
    effectiveFlagged: false,

    // Project Type
    sequential: false,
    containsSingletonActions: false,
    projectType: 'parallel' as const,

    // Completion Behavior
    completedByChildren: false,
    defaultSingletonActionHolder: false,

    // Dates (writable)
    deferDate: null,
    dueDate: null,

    // Dates (computed/read-only)
    effectiveDeferDate: null,
    effectiveDueDate: null,
    completionDate: null,
    dropDate: null,

    // Time Estimation
    estimatedMinutes: null,

    // Review Settings
    reviewInterval: null,
    lastReviewDate: null,
    nextReviewDate: null,

    // Repetition
    repetitionRule: null,

    // Timezone
    shouldUseFloatingTimeZone: false,

    // Hierarchy Status
    hasChildren: false,

    // Next Action
    nextTask: null,

    // Relationships
    parentFolder: null,
    tags: [],

    // Statistics
    taskCount: 0,
    remainingCount: 0
  };

  describe('union - success response', () => {
    it('should accept success response', () => {
      const result = GetProjectResponseSchema.safeParse({
        success: true,
        project: validProjectFull
      });
      expect(result.success).toBe(true);
    });
  });

  describe('union - error response', () => {
    it('should accept standard error response', () => {
      const result = GetProjectResponseSchema.safeParse({
        success: false,
        error: 'Project not found'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('union - disambiguation error response', () => {
    it('should accept disambiguation error with 2 matches', () => {
      const result = GetProjectResponseSchema.safeParse({
        success: false,
        error: 'Multiple projects found with name "Test Project"',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['proj1', 'proj2']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error with 3 matches', () => {
      const result = GetProjectResponseSchema.safeParse({
        success: false,
        error: 'Multiple projects found',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['proj1', 'proj2', 'proj3']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error with many matches', () => {
      const result = GetProjectResponseSchema.safeParse({
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
      const result = GetProjectResponseSchema.safeParse({
        success: true,
        error: 'Should not have error with success'
      });
      expect(result.success).toBe(false);
    });

    it('should reject response with success=false and project field', () => {
      const result = GetProjectResponseSchema.safeParse({
        success: false,
        project: validProjectFull
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty object', () => {
      const result = GetProjectResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = GetProjectResponseSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });

  describe('union - disambiguation edge cases', () => {
    it('should accept disambiguation with single matching ID (matches GetProjectErrorSchema fallback)', () => {
      // Union allows this because GetProjectErrorSchema matches first
      // In practice, primitives should never return this invalid state
      const result = GetProjectResponseSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation with empty matchingIds (matches GetProjectErrorSchema fallback)', () => {
      // Union allows this because GetProjectErrorSchema matches first
      // In practice, primitives should never return this invalid state
      const result = GetProjectResponseSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: []
      });
      expect(result.success).toBe(true);
    });

    it('should accept wrong code for disambiguation (matches GetProjectErrorSchema fallback)', () => {
      // Union allows this because GetProjectErrorSchema matches first
      // In practice, primitives should never return this invalid state
      const result = GetProjectResponseSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'NOT_FOUND',
        matchingIds: ['id1', 'id2']
      });
      expect(result.success).toBe(true);
    });
  });
});
