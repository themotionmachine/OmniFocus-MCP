import { describe, expect, it } from 'vitest';
import {
  SetPlannedDateErrorSchema,
  SetPlannedDateInputSchema,
  SetPlannedDateResponseSchema,
  SetPlannedDateSuccessSchema
} from '../../../src/contracts/task-tools/index.js';

describe('SetPlannedDateInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept id with ISO 8601 plannedDate', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: 'task123',
        plannedDate: '2025-01-18T10:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with ISO 8601 plannedDate', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        name: 'My Task',
        plannedDate: '2025-01-18T10:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both id and name (id takes precedence)', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: 'task123',
        name: 'My Task',
        plannedDate: '2025-01-18T10:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept null plannedDate (clear planned date)', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: 'task123',
        plannedDate: null
      });
      expect(result.success).toBe(true);
    });

    it('should accept plannedDate with various ISO 8601 formats', () => {
      const formats = [
        '2025-01-18T10:00:00.000Z',
        '2025-01-18T10:00:00Z',
        '2025-01-18T10:00:00.123Z',
        '2025-12-31T23:59:59.999Z'
      ];

      for (const date of formats) {
        const result = SetPlannedDateInputSchema.safeParse({
          id: 'task123',
          plannedDate: date
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('required field validation', () => {
    it('should reject when neither id nor name is provided', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        plannedDate: '2025-01-18T10:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject when both id and name are undefined', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: undefined,
        name: undefined,
        plannedDate: '2025-01-18T10:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing plannedDate', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: 'task123'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject non-string id', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: 123,
        plannedDate: '2025-01-18T10:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string name', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        name: 123,
        plannedDate: '2025-01-18T10:00:00.000Z'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string plannedDate', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: 'task123',
        plannedDate: 123
      });
      expect(result.success).toBe(false);
    });

    it('should reject boolean plannedDate', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: 'task123',
        plannedDate: false
      });
      expect(result.success).toBe(false);
    });

    it('should reject undefined plannedDate', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: 'task123',
        plannedDate: undefined
      });
      expect(result.success).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should accept empty string id', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: '',
        plannedDate: null
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty string name', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        name: '',
        plannedDate: null
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty string plannedDate', () => {
      const result = SetPlannedDateInputSchema.safeParse({
        id: 'task123',
        plannedDate: ''
      });
      expect(result.success).toBe(true); // Schema accepts any string
    });
  });
});

describe('SetPlannedDateSuccessSchema', () => {
  describe('valid success responses', () => {
    it('should accept valid success response', () => {
      const result = SetPlannedDateSuccessSchema.safeParse({
        success: true,
        id: 'task123',
        name: 'My Task'
      });
      expect(result.success).toBe(true);
    });

    it('should accept success with empty name', () => {
      const result = SetPlannedDateSuccessSchema.safeParse({
        success: true,
        id: 'task123',
        name: ''
      });
      expect(result.success).toBe(true);
    });

    it('should accept success with special characters in name', () => {
      const result = SetPlannedDateSuccessSchema.safeParse({
        success: true,
        id: 'task123',
        name: 'Task: Work / Personal (2025)'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing success field', () => {
      const result = SetPlannedDateSuccessSchema.safeParse({
        id: 'task123',
        name: 'My Task'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id field', () => {
      const result = SetPlannedDateSuccessSchema.safeParse({
        success: true,
        name: 'My Task'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name field', () => {
      const result = SetPlannedDateSuccessSchema.safeParse({
        success: true,
        id: 'task123'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('literal field validation', () => {
    it('should reject success: false', () => {
      const result = SetPlannedDateSuccessSchema.safeParse({
        success: false,
        id: 'task123',
        name: 'My Task'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean success', () => {
      const result = SetPlannedDateSuccessSchema.safeParse({
        success: 'true',
        id: 'task123',
        name: 'My Task'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject non-string id', () => {
      const result = SetPlannedDateSuccessSchema.safeParse({
        success: true,
        id: 123,
        name: 'My Task'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string name', () => {
      const result = SetPlannedDateSuccessSchema.safeParse({
        success: true,
        id: 'task123',
        name: 123
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetPlannedDateErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept task not found error', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        success: false,
        error: "Task 'task123' not found"
      });
      expect(result.success).toBe(true);
    });

    it('should accept version error', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        success: false,
        error: 'Planned date requires OmniFocus v4.7 or later'
      });
      expect(result.success).toBe(true);
    });

    it('should accept migration error', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        success: false,
        error:
          'Planned date requires database migration. Please open OmniFocus preferences to migrate.'
      });
      expect(result.success).toBe(true);
    });

    it('should accept generic error message', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        success: false,
        error: 'Something went wrong'
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty error string', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        success: false,
        error: ''
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing success field', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        error: 'Error message'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing error field', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });
  });

  describe('literal field validation', () => {
    it('should reject success: true', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        success: true,
        error: 'Error message'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean success', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        success: 'false',
        error: 'Error message'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject non-string error', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        success: false,
        error: 123
      });
      expect(result.success).toBe(false);
    });

    it('should reject null error', () => {
      const result = SetPlannedDateErrorSchema.safeParse({
        success: false,
        error: null
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('SetPlannedDateResponseSchema', () => {
  describe('valid responses', () => {
    it('should accept success response', () => {
      const result = SetPlannedDateResponseSchema.safeParse({
        success: true,
        id: 'task123',
        name: 'My Task'
      });
      expect(result.success).toBe(true);
    });

    it('should accept standard error response', () => {
      const result = SetPlannedDateResponseSchema.safeParse({
        success: false,
        error: "Task 'task123' not found"
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error response', () => {
      const result = SetPlannedDateResponseSchema.safeParse({
        success: false,
        error: 'Multiple tasks found with name "My Task"',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation with 3+ matches', () => {
      const result = SetPlannedDateResponseSchema.safeParse({
        success: false,
        error: 'Multiple tasks found',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2', 'id3', 'id4']
      });
      expect(result.success).toBe(true);
    });
  });

  describe('union type discrimination', () => {
    it('should distinguish success from error by success field', () => {
      const successResult = SetPlannedDateResponseSchema.safeParse({
        success: true,
        id: 'task123',
        name: 'My Task'
      });
      expect(successResult.success).toBe(true);

      const errorResult = SetPlannedDateResponseSchema.safeParse({
        success: false,
        error: 'Error message'
      });
      expect(errorResult.success).toBe(true);
    });

    it('should distinguish standard error from disambiguation by code field', () => {
      const standardError = SetPlannedDateResponseSchema.safeParse({
        success: false,
        error: 'Task not found'
      });
      expect(standardError.success).toBe(true);

      const disambiguationError = SetPlannedDateResponseSchema.safeParse({
        success: false,
        error: 'Multiple matches',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2']
      });
      expect(disambiguationError.success).toBe(true);
    });
  });

  describe('invalid responses', () => {
    it('should reject success response missing id', () => {
      const result = SetPlannedDateResponseSchema.safeParse({
        success: true,
        name: 'My Task'
      });
      expect(result.success).toBe(false);
    });

    it('should reject error response missing error field', () => {
      const result = SetPlannedDateResponseSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });

    it('should reject completely invalid object', () => {
      const result = SetPlannedDateResponseSchema.safeParse({
        invalid: 'data'
      });
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = SetPlannedDateResponseSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject empty object', () => {
      const result = SetPlannedDateResponseSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
