import { describe, expect, it } from 'vitest';
import {
  RevealItemsErrorSchema,
  RevealItemsInputSchema,
  RevealItemsResponseSchema,
  RevealItemsSuccessSchema
} from '../../../src/contracts/window-tools/reveal-items.js';

// T015: Contract tests for reveal-items schemas

describe('RevealItemsInputSchema', () => {
  it('should accept single item with id', () => {
    const result = RevealItemsInputSchema.safeParse({ items: [{ id: 'task-123' }] });
    expect(result.success).toBe(true);
  });

  it('should accept single item with name', () => {
    const result = RevealItemsInputSchema.safeParse({ items: [{ name: 'My Task' }] });
    expect(result.success).toBe(true);
  });

  it('should accept 10 items (max boundary)', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: `item-${i}` }));
    const result = RevealItemsInputSchema.safeParse({ items });
    expect(result.success).toBe(true);
  });

  it('should reject empty items array (min 1)', () => {
    const result = RevealItemsInputSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('should reject 11 items (max 10)', () => {
    const items = Array.from({ length: 11 }, (_, i) => ({ id: `item-${i}` }));
    const result = RevealItemsInputSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });

  it('should reject items with neither id nor name', () => {
    const result = RevealItemsInputSchema.safeParse({ items: [{}] });
    expect(result.success).toBe(false);
  });

  it('should reject missing items field', () => {
    const result = RevealItemsInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('RevealItemsSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = RevealItemsSuccessSchema.safeParse({
      success: true,
      results: [{ itemId: 'task-123', itemName: 'My Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should reject success=false', () => {
    const result = RevealItemsSuccessSchema.safeParse({
      success: false,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(false);
  });
});

describe('RevealItemsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = RevealItemsErrorSchema.safeParse({
      success: false,
      error: 'No window open'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success=true', () => {
    const result = RevealItemsErrorSchema.safeParse({
      success: true,
      error: 'Error'
    });
    expect(result.success).toBe(false);
  });
});

describe('RevealItemsResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = RevealItemsResponseSchema.safeParse({
      success: true,
      results: [{ itemId: 'task-123', itemName: 'My Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = RevealItemsResponseSchema.safeParse({
      success: false,
      error: 'Content tree not available'
    });
    expect(result.success).toBe(true);
  });

  it('should reject response without success field', () => {
    const result = RevealItemsResponseSchema.safeParse({
      error: 'Missing discriminator'
    });
    expect(result.success).toBe(false);
  });
});
