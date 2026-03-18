import { describe, expect, it } from 'vitest';
import {
  MarkCompleteErrorSchema,
  MarkCompleteInputSchema,
  MarkCompleteResponseSchema,
  MarkCompleteSuccessSchema
} from '../../../src/contracts/status-tools/mark-complete.js';
import { StatusBatchItemResultSchema } from '../../../src/contracts/status-tools/shared/index.js';

// Contract tests for mark-complete schemas

describe('MarkCompleteInputSchema', () => {
  describe('items array (required, min 1, max 100)', () => {
    it('should accept single-item array with id', () => {
      const result = MarkCompleteInputSchema.safeParse({
        items: [{ id: 'task-abc' }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept single-item array with name', () => {
      const result = MarkCompleteInputSchema.safeParse({
        items: [{ name: 'Buy groceries' }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept item with both id and name', () => {
      const result = MarkCompleteInputSchema.safeParse({
        items: [{ id: 'task-abc', name: 'Buy groceries' }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept multi-item array', () => {
      const result = MarkCompleteInputSchema.safeParse({
        items: [{ id: 'task-1' }, { id: 'task-2' }, { name: 'Task Three' }]
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty items array (min 1)', () => {
      const result = MarkCompleteInputSchema.safeParse({ items: [] });
      expect(result.success).toBe(false);
    });

    it('should reject items array with more than 100 items (max 100)', () => {
      const items = Array.from({ length: 101 }, (_, i) => ({ id: `task-${i}` }));
      const result = MarkCompleteInputSchema.safeParse({ items });
      expect(result.success).toBe(false);
    });

    it('should accept exactly 100 items (boundary)', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: `task-${i}` }));
      const result = MarkCompleteInputSchema.safeParse({ items });
      expect(result.success).toBe(true);
    });

    it('should reject items with neither id nor name', () => {
      const result = MarkCompleteInputSchema.safeParse({
        items: [{}]
      });
      expect(result.success).toBe(false);
    });

    it('should reject items with empty id and empty name', () => {
      const result = MarkCompleteInputSchema.safeParse({
        items: [{ id: '', name: '' }]
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing items field', () => {
      const result = MarkCompleteInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('completionDate (optional ISO 8601 string)', () => {
    it('should accept input without completionDate (optional)', () => {
      const result = MarkCompleteInputSchema.safeParse({
        items: [{ id: 'task-abc' }]
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completionDate).toBeUndefined();
      }
    });

    it('should accept a valid ISO 8601 completionDate', () => {
      const result = MarkCompleteInputSchema.safeParse({
        items: [{ id: 'task-abc' }],
        completionDate: '2026-03-01T10:00:00.000Z'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.completionDate).toBe('2026-03-01T10:00:00.000Z');
      }
    });

    it('should accept a date-only string as completionDate', () => {
      const result = MarkCompleteInputSchema.safeParse({
        items: [{ id: 'task-abc' }],
        completionDate: '2026-03-01'
      });
      expect(result.success).toBe(true);
    });

    it('should accept completionDate: undefined explicitly', () => {
      const result = MarkCompleteInputSchema.safeParse({
        items: [{ id: 'task-abc' }],
        completionDate: undefined
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('MarkCompleteSuccessSchema', () => {
  const validSummary = { total: 2, succeeded: 1, failed: 1 };

  const validSuccessResult = {
    itemId: 'task-abc',
    itemName: 'Buy groceries',
    itemType: 'task',
    success: true
  };

  const validFailureResult = {
    itemId: 'bad-id',
    itemName: '',
    itemType: 'task',
    success: false,
    error: 'Item not found: bad-id',
    code: 'NOT_FOUND'
  };

  it('should accept valid response with results array and summary', () => {
    const result = MarkCompleteSuccessSchema.safeParse({
      success: true,
      results: [validSuccessResult, validFailureResult],
      summary: validSummary
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty results array', () => {
    const result = MarkCompleteSuccessSchema.safeParse({
      success: true,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should require success to be literal true', () => {
    const result = MarkCompleteSuccessSchema.safeParse({
      success: false,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(false);
  });

  it('should require results array', () => {
    const result = MarkCompleteSuccessSchema.safeParse({
      success: true,
      summary: validSummary
    });
    expect(result.success).toBe(false);
  });

  it('should require summary object', () => {
    const result = MarkCompleteSuccessSchema.safeParse({
      success: true,
      results: []
    });
    expect(result.success).toBe(false);
  });

  describe('summary fields (all non-negative integers)', () => {
    it('should accept summary with total, succeeded, failed as non-negative integers', () => {
      const result = MarkCompleteSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: 3, succeeded: 2, failed: 1 }
      });
      expect(result.success).toBe(true);
    });

    it('should accept summary with all zeros', () => {
      const result = MarkCompleteSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: 0, succeeded: 0, failed: 0 }
      });
      expect(result.success).toBe(true);
    });

    it('should reject summary with negative total', () => {
      const result = MarkCompleteSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: -1, succeeded: 0, failed: 0 }
      });
      expect(result.success).toBe(false);
    });

    it('should reject summary with negative succeeded', () => {
      const result = MarkCompleteSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: 0, succeeded: -1, failed: 0 }
      });
      expect(result.success).toBe(false);
    });

    it('should reject summary with negative failed', () => {
      const result = MarkCompleteSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: 0, succeeded: 0, failed: -1 }
      });
      expect(result.success).toBe(false);
    });
  });

  describe('results containing StatusBatchItemResult objects', () => {
    it('should accept results with success items', () => {
      const result = MarkCompleteSuccessSchema.safeParse({
        success: true,
        results: [
          {
            itemId: 'task-1',
            itemName: 'Task One',
            itemType: 'task',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });
      expect(result.success).toBe(true);
    });

    it('should accept results with ALREADY_COMPLETED code (idempotent)', () => {
      const result = MarkCompleteSuccessSchema.safeParse({
        success: true,
        results: [
          {
            itemId: 'task-1',
            itemName: 'Task One',
            itemType: 'task',
            success: true,
            code: 'ALREADY_COMPLETED'
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });
      expect(result.success).toBe(true);
    });

    it('should accept results with DISAMBIGUATION_REQUIRED code and candidates', () => {
      const result = MarkCompleteSuccessSchema.safeParse({
        success: true,
        results: [
          {
            itemId: '',
            itemName: 'Duplicate Task',
            itemType: 'task',
            success: false,
            error: "Multiple items match 'Duplicate Task'. Use ID.",
            code: 'DISAMBIGUATION_REQUIRED',
            candidates: [
              { id: 'task-1', name: 'Duplicate Task', type: 'task' },
              { id: 'task-2', name: 'Duplicate Task', type: 'project' }
            ]
          }
        ],
        summary: { total: 1, succeeded: 0, failed: 1 }
      });
      expect(result.success).toBe(true);
    });

    it('should accept mixed success and failure results', () => {
      const result = MarkCompleteSuccessSchema.safeParse({
        success: true,
        results: [validSuccessResult, validFailureResult],
        summary: validSummary
      });
      expect(result.success).toBe(true);
    });

    it('should accept project type in results', () => {
      const result = MarkCompleteSuccessSchema.safeParse({
        success: true,
        results: [
          {
            itemId: 'proj-abc',
            itemName: 'My Project',
            itemType: 'project',
            success: true
          }
        ],
        summary: { total: 1, succeeded: 1, failed: 0 }
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('MarkCompleteErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = MarkCompleteErrorSchema.safeParse({
      success: false,
      error: 'OmniFocus is not running'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toBe('OmniFocus is not running');
    }
  });

  it('should require success to be literal false', () => {
    const result = MarkCompleteErrorSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should require error field', () => {
    const result = MarkCompleteErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('MarkCompleteResponseSchema (discriminated union)', () => {
  it('should parse success=true correctly', () => {
    const result = MarkCompleteResponseSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-abc',
          itemName: 'Buy groceries',
          itemType: 'task',
          success: true
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(true);
    }
  });

  it('should parse success=false correctly', () => {
    const result = MarkCompleteResponseSchema.safeParse({
      success: false,
      error: 'OmniFocus is not running'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      if (!result.data.success) {
        expect(result.data.error).toBe('OmniFocus is not running');
      }
    }
  });

  it('should reject when success is missing', () => {
    const result = MarkCompleteResponseSchema.safeParse({
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(false);
  });

  it('should reject success=true without required success fields', () => {
    const result = MarkCompleteResponseSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success=false without error field', () => {
    const result = MarkCompleteResponseSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('StatusBatchItemResultSchema (re-used for mark_complete results)', () => {
  it('should accept ALREADY_COMPLETED with success=true', () => {
    const result = StatusBatchItemResultSchema.safeParse({
      itemId: 'task-abc',
      itemName: 'My task',
      itemType: 'task',
      success: true,
      code: 'ALREADY_COMPLETED'
    });
    expect(result.success).toBe(true);
  });

  it('should accept NOT_FOUND with success=false', () => {
    const result = StatusBatchItemResultSchema.safeParse({
      itemId: 'task-xyz',
      itemName: '',
      itemType: 'task',
      success: false,
      error: 'Item not found: task-xyz',
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });
});
