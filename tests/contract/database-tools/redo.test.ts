import { describe, expect, it } from 'vitest';
import {
  RedoErrorSchema,
  RedoInputSchema,
  RedoResponseSchema,
  RedoSuccessSchema
} from '../../../src/contracts/database-tools/redo.js';

// T065: Contract tests for Redo schemas

describe('RedoInputSchema', () => {
  it('should accept empty object', () => {
    expect(RedoInputSchema.safeParse({}).success).toBe(true);
  });
});

describe('RedoSuccessSchema', () => {
  it('should accept success with performed=true', () => {
    const valid = { success: true, performed: true, canUndo: true, canRedo: false };
    const result = RedoSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.performed).toBe(true);
      expect(result.data.canRedo).toBe(false);
    }
  });

  it('should accept success with performed=false (empty stack, FR-012)', () => {
    const valid = { success: true, performed: false, canUndo: false, canRedo: false };
    const result = RedoSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.performed).toBe(false);
    }
  });

  it('should require all boolean fields', () => {
    expect(RedoSuccessSchema.safeParse({ success: true, performed: true }).success).toBe(false);
  });
});

describe('RedoErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = RedoErrorSchema.safeParse({ success: false, error: 'redo failed' });
    expect(result.success).toBe(true);
  });
});

describe('RedoResponseSchema', () => {
  it('should discriminate success and error', () => {
    const success = { success: true, performed: false, canUndo: false, canRedo: false };
    const error = { success: false, error: 'err' };
    expect(RedoResponseSchema.safeParse(success).success).toBe(true);
    expect(RedoResponseSchema.safeParse(error).success).toBe(true);
  });
});
