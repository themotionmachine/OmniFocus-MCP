import { describe, expect, it } from 'vitest';
import {
  UndoErrorSchema,
  UndoInputSchema,
  UndoResponseSchema,
  UndoSuccessSchema
} from '../../../src/contracts/database-tools/undo.js';

// T064: Contract tests for Undo schemas

describe('UndoInputSchema', () => {
  it('should accept empty object', () => {
    expect(UndoInputSchema.safeParse({}).success).toBe(true);
  });
});

describe('UndoSuccessSchema', () => {
  it('should accept success with performed=true', () => {
    const valid = { success: true, performed: true, canUndo: true, canRedo: true };
    const result = UndoSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.performed).toBe(true);
      expect(result.data.canUndo).toBe(true);
      expect(result.data.canRedo).toBe(true);
    }
  });

  it('should accept success with performed=false (empty stack, FR-012)', () => {
    const valid = { success: true, performed: false, canUndo: false, canRedo: false };
    const result = UndoSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.performed).toBe(false);
    }
  });

  it('should require all boolean fields', () => {
    expect(UndoSuccessSchema.safeParse({ success: true, performed: true }).success).toBe(false);
    expect(
      UndoSuccessSchema.safeParse({ success: true, performed: true, canUndo: true }).success
    ).toBe(false);
  });
});

describe('UndoErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = UndoErrorSchema.safeParse({ success: false, error: 'undo failed' });
    expect(result.success).toBe(true);
  });
});

describe('UndoResponseSchema', () => {
  it('should discriminate success and error', () => {
    const success = { success: true, performed: false, canUndo: false, canRedo: false };
    const error = { success: false, error: 'err' };
    expect(UndoResponseSchema.safeParse(success).success).toBe(true);
    expect(UndoResponseSchema.safeParse(error).success).toBe(true);
  });
});
