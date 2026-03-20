import { describe, expect, it } from 'vitest';
import {
  ListPerspectivesErrorSchema,
  ListPerspectivesInputSchema,
  ListPerspectivesResponseSchema,
  ListPerspectivesSuccessSchema
} from '../../../src/contracts/perspective-tools/index.js';

describe('ListPerspectivesInputSchema', () => {
  it('defaults type to "all" when not provided', () => {
    const result = ListPerspectivesInputSchema.parse({});
    expect(result.type).toBe('all');
  });

  it('accepts "all"', () => {
    const result = ListPerspectivesInputSchema.parse({ type: 'all' });
    expect(result.type).toBe('all');
  });

  it('accepts "builtin"', () => {
    const result = ListPerspectivesInputSchema.parse({ type: 'builtin' });
    expect(result.type).toBe('builtin');
  });

  it('accepts "custom"', () => {
    const result = ListPerspectivesInputSchema.parse({ type: 'custom' });
    expect(result.type).toBe('custom');
  });

  it('rejects invalid type', () => {
    const result = ListPerspectivesInputSchema.safeParse({ type: 'unknown' });
    expect(result.success).toBe(false);
  });
});

describe('ListPerspectivesSuccessSchema', () => {
  it('accepts valid success response', () => {
    const result = ListPerspectivesSuccessSchema.safeParse({
      success: true,
      perspectives: [{ name: 'Inbox', type: 'builtin', identifier: null, filterAggregation: null }],
      totalCount: 1
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty perspectives array', () => {
    const result = ListPerspectivesSuccessSchema.safeParse({
      success: true,
      perspectives: [],
      totalCount: 0
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative totalCount', () => {
    const result = ListPerspectivesSuccessSchema.safeParse({
      success: true,
      perspectives: [],
      totalCount: -1
    });
    expect(result.success).toBe(false);
  });
});

describe('ListPerspectivesErrorSchema', () => {
  it('accepts valid error response', () => {
    const result = ListPerspectivesErrorSchema.safeParse({
      success: false,
      error: 'Script execution failed'
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing error message', () => {
    const result = ListPerspectivesErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('ListPerspectivesResponseSchema', () => {
  it('parses success response', () => {
    const result = ListPerspectivesResponseSchema.safeParse({
      success: true,
      perspectives: [],
      totalCount: 0
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.success) {
      expect(result.data.perspectives).toEqual([]);
      expect(result.data.totalCount).toBe(0);
    }
  });

  it('parses error response', () => {
    const result = ListPerspectivesResponseSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
    if (result.success && !result.data.success) {
      expect(result.data.error).toBe('Something went wrong');
    }
  });

  it('rejects invalid response', () => {
    const result = ListPerspectivesResponseSchema.safeParse({
      success: true
      // missing perspectives and totalCount
    });
    expect(result.success).toBe(false);
  });
});
