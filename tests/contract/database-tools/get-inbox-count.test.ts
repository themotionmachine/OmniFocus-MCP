import { describe, expect, it } from 'vitest';
import {
  GetInboxCountErrorSchema,
  GetInboxCountInputSchema,
  GetInboxCountResponseSchema,
  GetInboxCountSuccessSchema
} from '../../../src/contracts/database-tools/get-inbox-count.js';

// T043: Contract tests for GetInboxCount schemas

describe('GetInboxCountInputSchema', () => {
  it('should accept empty object', () => {
    expect(GetInboxCountInputSchema.safeParse({}).success).toBe(true);
  });
});

describe('GetInboxCountSuccessSchema', () => {
  it('should accept valid success response with count', () => {
    const valid = { success: true, count: 5 };
    const result = GetInboxCountSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(5);
    }
  });

  it('should accept zero count (empty inbox)', () => {
    const valid = { success: true, count: 0 };
    const result = GetInboxCountSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(0);
    }
  });

  it('should reject negative count', () => {
    expect(GetInboxCountSuccessSchema.safeParse({ success: true, count: -1 }).success).toBe(false);
  });

  it('should reject non-integer count', () => {
    expect(GetInboxCountSuccessSchema.safeParse({ success: true, count: 3.5 }).success).toBe(false);
  });
});

describe('GetInboxCountErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = GetInboxCountErrorSchema.safeParse({ success: false, error: 'err' });
    expect(result.success).toBe(true);
  });
});

describe('GetInboxCountResponseSchema', () => {
  it('should discriminate success and error', () => {
    const success = { success: true, count: 0 };
    const error = { success: false, error: 'err' };
    expect(GetInboxCountResponseSchema.safeParse(success).success).toBe(true);
    expect(GetInboxCountResponseSchema.safeParse(error).success).toBe(true);
  });
});
