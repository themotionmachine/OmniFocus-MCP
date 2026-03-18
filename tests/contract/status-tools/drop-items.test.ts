import { describe, expect, it } from 'vitest';
import {
  DropItemsErrorSchema,
  DropItemsInputSchema,
  DropItemsResponseSchema,
  DropItemsSuccessSchema
} from '../../../src/contracts/status-tools/drop-items.js';

// T010: Contract tests for drop-items schemas

describe('DropItemsInputSchema', () => {
  describe('items array (required, min 1, max 100)', () => {
    it('should accept single-item array with id', () => {
      const result = DropItemsInputSchema.safeParse({
        items: [{ id: 'task-123' }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept single-item array with name', () => {
      const result = DropItemsInputSchema.safeParse({
        items: [{ name: 'My Task' }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept item with both id and name', () => {
      const result = DropItemsInputSchema.safeParse({
        items: [{ id: 'task-123', name: 'My Task' }]
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty items array (min 1)', () => {
      const result = DropItemsInputSchema.safeParse({ items: [] });
      expect(result.success).toBe(false);
    });

    it('should reject items array with more than 100 items (max 100)', () => {
      const items = Array.from({ length: 101 }, (_, i) => ({ id: `item-${i}` }));
      const result = DropItemsInputSchema.safeParse({ items });
      expect(result.success).toBe(false);
    });

    it('should accept exactly 100 items (boundary)', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: `item-${i}` }));
      const result = DropItemsInputSchema.safeParse({ items });
      expect(result.success).toBe(true);
    });

    it('should reject items with neither id nor name (ItemIdentifier refinement)', () => {
      const result = DropItemsInputSchema.safeParse({
        items: [{}]
      });
      expect(result.success).toBe(false);
    });

    it('should reject items with empty id and empty name', () => {
      const result = DropItemsInputSchema.safeParse({
        items: [{ id: '', name: '' }]
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing items field', () => {
      const result = DropItemsInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('allOccurrences (optional boolean, default true)', () => {
    it('should default allOccurrences to true when not provided', () => {
      const result = DropItemsInputSchema.safeParse({
        items: [{ id: 'task-123' }]
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allOccurrences).toBe(true);
      }
    });

    it('should accept allOccurrences=true explicitly', () => {
      const result = DropItemsInputSchema.safeParse({
        items: [{ id: 'task-123' }],
        allOccurrences: true
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allOccurrences).toBe(true);
      }
    });

    it('should accept allOccurrences=false for single-occurrence drop', () => {
      const result = DropItemsInputSchema.safeParse({
        items: [{ id: 'task-123' }],
        allOccurrences: false
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allOccurrences).toBe(false);
      }
    });

    it('should reject non-boolean allOccurrences', () => {
      const result = DropItemsInputSchema.safeParse({
        items: [{ id: 'task-123' }],
        allOccurrences: 'yes'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('multi-item batches', () => {
    it('should accept array of 3 items with mixed id/name', () => {
      const result = DropItemsInputSchema.safeParse({
        items: [{ id: 'task-1' }, { name: 'Task Two' }, { id: 'proj-3', name: 'Project Three' }]
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('DropItemsSuccessSchema', () => {
  const validSummary = {
    total: 2,
    succeeded: 1,
    failed: 1
  };

  const validTaskResult = {
    itemId: 'task-abc',
    itemName: 'Buy groceries',
    itemType: 'task',
    success: true
  };

  it('should accept valid response with results array and summary', () => {
    const result = DropItemsSuccessSchema.safeParse({
      success: true,
      results: [validTaskResult],
      summary: validSummary
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty results array', () => {
    const result = DropItemsSuccessSchema.safeParse({
      success: true,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should require success to be literal true', () => {
    const result = DropItemsSuccessSchema.safeParse({
      success: false,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(false);
  });

  it('should accept result with ALREADY_DROPPED code (idempotent success)', () => {
    const result = DropItemsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-abc',
          itemName: 'Already Dropped Task',
          itemType: 'task',
          success: true,
          code: 'ALREADY_DROPPED'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results[0].code).toBe('ALREADY_DROPPED');
    }
  });

  it('should accept result with NOT_FOUND error', () => {
    const result = DropItemsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'bad-id',
          itemName: '',
          itemType: 'task',
          success: false,
          error: 'Item not found: bad-id',
          code: 'NOT_FOUND'
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    expect(result.success).toBe(true);
  });

  it('should accept project itemType', () => {
    const result = DropItemsSuccessSchema.safeParse({
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

  it('should accept disambiguation result with candidates', () => {
    const result = DropItemsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: '',
          itemName: 'Duplicate',
          itemType: 'task',
          success: false,
          error: "Multiple items match 'Duplicate'. Use ID.",
          code: 'DISAMBIGUATION_REQUIRED',
          candidates: [
            { id: 'task-1', name: 'Duplicate', type: 'task' },
            { id: 'task-2', name: 'Duplicate', type: 'task' }
          ]
        }
      ],
      summary: { total: 1, succeeded: 0, failed: 1 }
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results[0].candidates).toHaveLength(2);
    }
  });

  describe('summary fields (all non-negative integers)', () => {
    it('should accept summary with positive counts', () => {
      const result = DropItemsSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: 3, succeeded: 2, failed: 1 }
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative total', () => {
      const result = DropItemsSuccessSchema.safeParse({
        success: true,
        results: [],
        summary: { total: -1, succeeded: 0, failed: 0 }
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing summary field', () => {
      const result = DropItemsSuccessSchema.safeParse({
        success: true,
        results: []
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('DropItemsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = DropItemsErrorSchema.safeParse({
      success: false,
      error: 'drop_items requires OmniFocus 3.8 or later. Current version: 3.7'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error).toContain('drop_items requires OmniFocus');
    }
  });

  it('should accept generic catastrophic error', () => {
    const result = DropItemsErrorSchema.safeParse({
      success: false,
      error: 'OmniFocus is not running'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success: true', () => {
    const result = DropItemsErrorSchema.safeParse({
      success: true,
      error: 'Something failed'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing error field', () => {
    const result = DropItemsErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('DropItemsResponseSchema (discriminated union)', () => {
  it('should parse success=true correctly', () => {
    const result = DropItemsResponseSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-abc',
          itemName: 'My Task',
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

  it('should parse success=false correctly (version check failure)', () => {
    const result = DropItemsResponseSchema.safeParse({
      success: false,
      error: 'drop_items requires OmniFocus 3.8 or later. Current version: 3.7'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
      if (!result.data.success) {
        expect(result.data.error).toContain('drop_items requires OmniFocus');
      }
    }
  });

  it('should parse success=false for OmniFocus unreachable', () => {
    const result = DropItemsResponseSchema.safeParse({
      success: false,
      error: 'OmniFocus is not running'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.success).toBe(false);
    }
  });

  it('should reject when success is missing', () => {
    const result = DropItemsResponseSchema.safeParse({
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(false);
  });

  it('should reject success=true without required fields', () => {
    const result = DropItemsResponseSchema.safeParse({
      success: true,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success=false without error field', () => {
    const result = DropItemsResponseSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});
