import { describe, expect, it } from 'vitest';
import {
  ExpandNotesErrorSchema,
  ExpandNotesInputSchema,
  ExpandNotesResponseSchema,
  ExpandNotesSuccessSchema
} from '../../../src/contracts/window-tools/expand-notes.js';

// T018: Contract tests for expand-notes schemas

describe('ExpandNotesInputSchema', () => {
  it('should accept single item with id', () => {
    const result = ExpandNotesInputSchema.safeParse({ items: [{ id: 'task-123' }] });
    expect(result.success).toBe(true);
  });

  it('should accept items with completely=true', () => {
    const result = ExpandNotesInputSchema.safeParse({
      items: [{ id: 'task-123' }],
      completely: true
    });
    expect(result.success).toBe(true);
  });

  it('should accept items without completely (optional)', () => {
    const result = ExpandNotesInputSchema.safeParse({ items: [{ name: 'My Task' }] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completely).toBeUndefined();
    }
  });

  it('should accept 50 items (max boundary)', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: `item-${i}` }));
    const result = ExpandNotesInputSchema.safeParse({ items });
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const result = ExpandNotesInputSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('should reject 51 items (max 50)', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `item-${i}` }));
    const result = ExpandNotesInputSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });
});

describe('ExpandNotesSuccessSchema', () => {
  it('should accept valid success response with NO_NOTE no-op', () => {
    const result = ExpandNotesSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'task-123',
          itemName: 'My Task',
          itemType: 'task',
          success: true,
          code: 'NO_NOTE'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });
});

describe('ExpandNotesErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = ExpandNotesErrorSchema.safeParse({
      success: false,
      error: 'Version too old'
    });
    expect(result.success).toBe(true);
  });
});

describe('ExpandNotesResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = ExpandNotesResponseSchema.safeParse({
      success: true,
      results: [{ itemId: 'task-123', itemName: 'Task', itemType: 'task', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = ExpandNotesResponseSchema.safeParse({
      success: false,
      error: 'No window'
    });
    expect(result.success).toBe(true);
  });
});
