import { describe, expect, it } from 'vitest';
import {
  SelectItemsErrorSchema,
  SelectItemsInputSchema,
  SelectItemsResponseSchema,
  SelectItemsSuccessSchema
} from '../../../src/contracts/window-tools/select-items.js';

// T022: Contract tests for select-items schemas

describe('SelectItemsInputSchema', () => {
  it('should accept single item with id', () => {
    const result = SelectItemsInputSchema.safeParse({ items: [{ id: 'task-123' }] });
    expect(result.success).toBe(true);
  });

  it('should accept items with extending=true', () => {
    const result = SelectItemsInputSchema.safeParse({
      items: [{ id: 'task-123' }],
      extending: true
    });
    expect(result.success).toBe(true);
  });

  it('should accept items with extending=false', () => {
    const result = SelectItemsInputSchema.safeParse({
      items: [{ id: 'task-123' }],
      extending: false
    });
    expect(result.success).toBe(true);
  });

  it('should accept items without extending (optional, default false)', () => {
    const result = SelectItemsInputSchema.safeParse({ items: [{ name: 'My Task' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extending).toBeUndefined();
    }
  });

  it('should accept 100 items (max boundary)', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `item-${i}` }));
    const result = SelectItemsInputSchema.safeParse({ items });
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const result = SelectItemsInputSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('should reject 101 items (max 100)', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ id: `item-${i}` }));
    const result = SelectItemsInputSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });

  it('should reject items with neither id nor name', () => {
    const result = SelectItemsInputSchema.safeParse({ items: [{}] });
    expect(result.success).toBe(false);
  });
});

describe('SelectItemsSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = SelectItemsSuccessSchema.safeParse({
      success: true,
      results: [{ itemId: 'task-123', itemName: 'My Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });
});

describe('SelectItemsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = SelectItemsErrorSchema.safeParse({
      success: false,
      error: 'Content tree not available'
    });
    expect(result.success).toBe(true);
  });
});

describe('SelectItemsResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = SelectItemsResponseSchema.safeParse({
      success: true,
      results: [{ itemId: 'task-123', itemName: 'Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = SelectItemsResponseSchema.safeParse({
      success: false,
      error: 'No window'
    });
    expect(result.success).toBe(true);
  });
});
