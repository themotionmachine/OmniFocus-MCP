import { describe, expect, it } from 'vitest';
import {
  EditProjectInputSchema,
  EditProjectResponseSchema
} from '../../../src/contracts/project-tools/edit-project.js';

describe('EditProjectInputSchema', () => {
  describe('Identification - at least one of id or name required', () => {
    it('should accept valid input with id only', () => {
      const validInput = {
        id: 'proj-123',
        newName: 'Updated Name'
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept valid input with name only', () => {
      const validInput = {
        name: 'Old Name',
        newName: 'Updated Name'
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept both id and name (id takes precedence)', () => {
      const validInput = {
        id: 'proj-123',
        name: 'Old Name',
        newName: 'Updated Name'
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject when neither id nor name provided', () => {
      const invalidInput = {
        newName: 'Updated Name'
      };
      const result = EditProjectInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one of id or name is required');
      }
    });
  });

  describe('Editable Properties - all optional', () => {
    it('should accept newName', () => {
      const validInput = {
        id: 'proj-123',
        newName: 'Updated Project Name'
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty newName', () => {
      const invalidInput = {
        id: 'proj-123',
        newName: ''
      };
      const result = EditProjectInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept note', () => {
      const validInput = {
        id: 'proj-123',
        note: 'Updated note content'
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty note (to clear)', () => {
      const validInput = {
        id: 'proj-123',
        note: ''
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept all valid status values', () => {
      const statuses = ['Active', 'OnHold', 'Done', 'Dropped'];
      for (const status of statuses) {
        const input = {
          id: 'proj-123',
          status
        };
        const result = EditProjectInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status value', () => {
      const invalidInput = {
        id: 'proj-123',
        status: 'Invalid'
      };
      const result = EditProjectInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept sequential (boolean)', () => {
      const validInput = {
        id: 'proj-123',
        sequential: true
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept containsSingletonActions (boolean)', () => {
      const validInput = {
        id: 'proj-123',
        containsSingletonActions: true
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept completedByChildren (boolean)', () => {
      const validInput = {
        id: 'proj-123',
        completedByChildren: true
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept defaultSingletonActionHolder (boolean)', () => {
      const validInput = {
        id: 'proj-123',
        defaultSingletonActionHolder: true
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept flagged (boolean)', () => {
      const validInput = {
        id: 'proj-123',
        flagged: true
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept shouldUseFloatingTimeZone (boolean)', () => {
      const validInput = {
        id: 'proj-123',
        shouldUseFloatingTimeZone: true
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept estimatedMinutes (number)', () => {
      const validInput = {
        id: 'proj-123',
        estimatedMinutes: 120
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept updating multiple properties', () => {
      const validInput = {
        id: 'proj-123',
        newName: 'New Name',
        status: 'Active',
        sequential: true,
        flagged: true,
        note: 'New note'
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe('Nullable Properties - null to clear', () => {
    it('should accept deferDate as ISO 8601 string', () => {
      const validInput = {
        id: 'proj-123',
        deferDate: '2025-01-15T09:00:00.000Z'
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept deferDate as null (to clear)', () => {
      const validInput = {
        id: 'proj-123',
        deferDate: null
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept dueDate as ISO 8601 string', () => {
      const validInput = {
        id: 'proj-123',
        dueDate: '2025-01-20T17:00:00.000Z'
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept dueDate as null (to clear)', () => {
      const validInput = {
        id: 'proj-123',
        dueDate: null
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept reviewInterval with valid structure', () => {
      const validInput = {
        id: 'proj-123',
        reviewInterval: {
          steps: 14,
          unit: 'days'
        }
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept all valid reviewInterval units', () => {
      const units = ['days', 'weeks', 'months', 'years'];
      for (const unit of units) {
        const input = {
          id: 'proj-123',
          reviewInterval: { steps: 1, unit }
        };
        const result = EditProjectInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should accept reviewInterval as null (to clear)', () => {
      const validInput = {
        id: 'proj-123',
        reviewInterval: null
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject reviewInterval with invalid unit', () => {
      const invalidInput = {
        id: 'proj-123',
        reviewInterval: {
          steps: 14,
          unit: 'hours'
        }
      };
      const result = EditProjectInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject reviewInterval with steps < 1', () => {
      const invalidInput = {
        id: 'proj-123',
        reviewInterval: {
          steps: 0,
          unit: 'days'
        }
      };
      const result = EditProjectInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept estimatedMinutes as null (to clear)', () => {
      const validInput = {
        id: 'proj-123',
        estimatedMinutes: null
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe('Project Type - both sequential and containsSingletonActions allowed', () => {
    it('should accept sequential: true', () => {
      const validInput = {
        id: 'proj-123',
        sequential: true
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept containsSingletonActions: true', () => {
      const validInput = {
        id: 'proj-123',
        containsSingletonActions: true
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept both sequential and containsSingletonActions set to true (auto-clear is runtime)', () => {
      const validInput = {
        id: 'proj-123',
        sequential: true,
        containsSingletonActions: true
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      // Schema intentionally allows both=true; auto-clear handled by primitive
      expect(result.success).toBe(true);
    });

    it('should accept both sequential and containsSingletonActions set to false', () => {
      const validInput = {
        id: 'proj-123',
        sequential: false,
        containsSingletonActions: false
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept sequential: true, containsSingletonActions: false', () => {
      const validInput = {
        id: 'proj-123',
        sequential: true,
        containsSingletonActions: false
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept sequential: false, containsSingletonActions: true', () => {
      const validInput = {
        id: 'proj-123',
        sequential: false,
        containsSingletonActions: true
      };
      const result = EditProjectInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });
});

describe('EditProjectResponseSchema', () => {
  it('should accept success response with id and name', () => {
    const validResponse = {
      success: true,
      id: 'proj-123',
      name: 'Updated Project Name'
    };
    const result = EditProjectResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should reject success response without id', () => {
    const invalidResponse = {
      success: true,
      name: 'Updated Project Name'
    };
    const result = EditProjectResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject success response without name', () => {
    const invalidResponse = {
      success: true,
      id: 'proj-123'
    };
    const result = EditProjectResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should accept error response', () => {
    const validResponse = {
      success: false,
      error: "Project 'proj-123' not found"
    };
    const result = EditProjectResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const invalidResponse = {
      success: false
    };
    const result = EditProjectResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should accept disambiguation error response', () => {
    const validResponse = {
      success: false,
      error: "Ambiguous project name 'Marketing'. Found 2 matches.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['proj-123', 'proj-456']
    };
    const result = EditProjectResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });
});
