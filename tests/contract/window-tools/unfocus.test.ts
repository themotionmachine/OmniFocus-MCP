import { describe, expect, it } from 'vitest';
import {
  UnfocusErrorSchema,
  UnfocusInputSchema,
  UnfocusResponseSchema,
  UnfocusSuccessSchema
} from '../../../src/contracts/window-tools/unfocus.js';

// T021: Contract tests for unfocus schemas

describe('UnfocusInputSchema', () => {
  it('should accept empty object', () => {
    const result = UnfocusInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject undefined input', () => {
    const result = UnfocusInputSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });
});

describe('UnfocusSuccessSchema', () => {
  it('should accept simple success response (no results/summary)', () => {
    const result = UnfocusSuccessSchema.safeParse({ success: true });
    expect(result.success).toBe(true);
  });

  it('should reject success=false', () => {
    const result = UnfocusSuccessSchema.safeParse({ success: false });
    expect(result.success).toBe(false);
  });
});

describe('UnfocusErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = UnfocusErrorSchema.safeParse({
      success: false,
      error: 'No window open'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success=true', () => {
    const result = UnfocusErrorSchema.safeParse({
      success: true,
      error: 'Error'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing error field', () => {
    const result = UnfocusErrorSchema.safeParse({ success: false });
    expect(result.success).toBe(false);
  });
});

describe('UnfocusResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = UnfocusResponseSchema.safeParse({ success: true });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = UnfocusResponseSchema.safeParse({
      success: false,
      error: 'Version too old'
    });
    expect(result.success).toBe(true);
  });
});
