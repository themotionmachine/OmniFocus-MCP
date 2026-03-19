import { describe, expect, it } from 'vitest';
import {
  GetPerspectiveErrorSchema,
  GetPerspectiveInputSchema,
  GetPerspectiveResponseSchema,
  GetPerspectiveSuccessSchema
} from '../../../src/contracts/perspective-tools/index.js';

describe('GetPerspectiveInputSchema', () => {
  it('accepts name only', () => {
    const result = GetPerspectiveInputSchema.safeParse({ name: 'Inbox' });
    expect(result.success).toBe(true);
  });

  it('accepts identifier only', () => {
    const result = GetPerspectiveInputSchema.safeParse({ identifier: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('accepts both name and identifier', () => {
    const result = GetPerspectiveInputSchema.safeParse({
      name: 'Work',
      identifier: 'abc123'
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty input', () => {
    const result = GetPerspectiveInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('GetPerspectiveSuccessSchema - CustomPerspectiveDetail', () => {
  it('accepts custom perspective detail', () => {
    const result = GetPerspectiveSuccessSchema.safeParse({
      success: true,
      perspective: {
        name: 'Work',
        identifier: 'abc123',
        type: 'custom',
        filterRules: { available: true },
        filterAggregation: 'all'
      }
    });
    expect(result.success).toBe(true);
  });

  it('accepts custom perspective with null filter data (pre-v4.2)', () => {
    const result = GetPerspectiveSuccessSchema.safeParse({
      success: true,
      perspective: {
        name: 'Work',
        identifier: 'abc123',
        type: 'custom',
        filterRules: null,
        filterAggregation: null
      }
    });
    expect(result.success).toBe(true);
  });
});

describe('GetPerspectiveSuccessSchema - BuiltInPerspectiveDetail', () => {
  it('accepts built-in perspective detail', () => {
    const result = GetPerspectiveSuccessSchema.safeParse({
      success: true,
      perspective: {
        name: 'Inbox',
        type: 'builtin'
      }
    });
    expect(result.success).toBe(true);
  });
});

describe('GetPerspectiveErrorSchema', () => {
  it('accepts NOT_FOUND error', () => {
    const result = GetPerspectiveErrorSchema.safeParse({
      success: false,
      error: "Perspective 'Unknown' not found",
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });

  it('accepts DISAMBIGUATION_REQUIRED with candidates', () => {
    const result = GetPerspectiveErrorSchema.safeParse({
      success: false,
      error: "Multiple perspectives match 'Work'",
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { name: 'Work Personal', identifier: 'id1' },
        { name: 'Work Projects', identifier: 'id2' }
      ]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.candidates).toHaveLength(2);
    }
  });

  it('accepts error without optional code', () => {
    const result = GetPerspectiveErrorSchema.safeParse({
      success: false,
      error: 'Script failed'
    });
    expect(result.success).toBe(true);
  });
});

describe('GetPerspectiveResponseSchema', () => {
  it('parses success response', () => {
    const result = GetPerspectiveResponseSchema.safeParse({
      success: true,
      perspective: { name: 'Inbox', type: 'builtin' }
    });
    expect(result.success).toBe(true);
  });

  it('parses error response', () => {
    const result = GetPerspectiveResponseSchema.safeParse({
      success: false,
      error: 'Not found',
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });
});
