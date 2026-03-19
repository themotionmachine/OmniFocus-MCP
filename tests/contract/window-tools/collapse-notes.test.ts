import { describe, expect, it } from 'vitest';
import {
  CollapseNotesErrorSchema,
  CollapseNotesInputSchema,
  CollapseNotesResponseSchema,
  CollapseNotesSuccessSchema
} from '../../../src/contracts/window-tools/collapse-notes.js';

// T019: Contract tests for collapse-notes schemas

describe('CollapseNotesInputSchema', () => {
  it('should accept single item with id', () => {
    const result = CollapseNotesInputSchema.safeParse({ items: [{ id: 'task-123' }] });
    expect(result.success).toBe(true);
  });

  it('should accept items with completely=true', () => {
    const result = CollapseNotesInputSchema.safeParse({
      items: [{ id: 'task-123' }],
      completely: true
    });
    expect(result.success).toBe(true);
  });

  it('should accept items without completely (optional)', () => {
    const result = CollapseNotesInputSchema.safeParse({ items: [{ name: 'My Task' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completely).toBeUndefined();
    }
  });

  it('should accept 50 items (max boundary)', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }));
    const result = CollapseNotesInputSchema.safeParse({ items });
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const result = CollapseNotesInputSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('should reject 51 items (max 50)', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `item-${i}` }));
    const result = CollapseNotesInputSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });
});

describe('CollapseNotesSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = CollapseNotesSuccessSchema.safeParse({
      success: true,
      results: [{ itemId: 'task-123', itemName: 'My Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });
});

describe('CollapseNotesErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = CollapseNotesErrorSchema.safeParse({
      success: false,
      error: 'Content tree not available'
    });
    expect(result.success).toBe(true);
  });
});

describe('CollapseNotesResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = CollapseNotesResponseSchema.safeParse({
      success: true,
      results: [{ itemId: 'task-123', itemName: 'Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = CollapseNotesResponseSchema.safeParse({
      success: false,
      error: 'No window'
    });
    expect(result.success).toBe(true);
  });
});
