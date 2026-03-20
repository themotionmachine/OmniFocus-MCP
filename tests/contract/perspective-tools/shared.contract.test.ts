import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_PERSPECTIVE_NAMES,
  BuiltInPerspectiveDetailSchema,
  CustomPerspectiveDetailSchema,
  PerspectiveIdentifierSchema,
  PerspectiveListItemSchema,
  PerspectiveTypeSchema
} from '../../../src/contracts/perspective-tools/index.js';

describe('PerspectiveIdentifierSchema', () => {
  it('accepts name only', () => {
    const result = PerspectiveIdentifierSchema.safeParse({ name: 'Inbox' });
    expect(result.success).toBe(true);
  });

  it('accepts identifier only', () => {
    const result = PerspectiveIdentifierSchema.safeParse({ identifier: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('accepts both name and identifier', () => {
    const result = PerspectiveIdentifierSchema.safeParse({
      name: 'MyPerspective',
      identifier: 'abc123'
    });
    expect(result.success).toBe(true);
  });

  it('rejects when neither name nor identifier is provided', () => {
    const result = PerspectiveIdentifierSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = PerspectiveIdentifierSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty identifier', () => {
    const result = PerspectiveIdentifierSchema.safeParse({ identifier: '' });
    expect(result.success).toBe(false);
  });
});

describe('PerspectiveTypeSchema', () => {
  it('accepts builtin', () => {
    expect(PerspectiveTypeSchema.safeParse('builtin').success).toBe(true);
  });

  it('accepts custom', () => {
    expect(PerspectiveTypeSchema.safeParse('custom').success).toBe(true);
  });

  it('rejects invalid type', () => {
    expect(PerspectiveTypeSchema.safeParse('all').success).toBe(false);
  });
});

describe('BUILT_IN_PERSPECTIVE_NAMES', () => {
  it('contains all 6 built-in perspectives', () => {
    expect(BUILT_IN_PERSPECTIVE_NAMES).toHaveLength(6);
  });

  it('includes Inbox', () => {
    expect(BUILT_IN_PERSPECTIVE_NAMES).toContain('Inbox');
  });

  it('includes Projects', () => {
    expect(BUILT_IN_PERSPECTIVE_NAMES).toContain('Projects');
  });

  it('includes Tags', () => {
    expect(BUILT_IN_PERSPECTIVE_NAMES).toContain('Tags');
  });

  it('includes Forecast', () => {
    expect(BUILT_IN_PERSPECTIVE_NAMES).toContain('Forecast');
  });

  it('includes Flagged', () => {
    expect(BUILT_IN_PERSPECTIVE_NAMES).toContain('Flagged');
  });

  it('includes Review', () => {
    expect(BUILT_IN_PERSPECTIVE_NAMES).toContain('Review');
  });
});

describe('PerspectiveListItemSchema', () => {
  it('accepts valid builtin perspective list item', () => {
    const result = PerspectiveListItemSchema.safeParse({
      name: 'Inbox',
      type: 'builtin',
      identifier: null,
      filterAggregation: null
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid custom perspective list item with filterAggregation', () => {
    const result = PerspectiveListItemSchema.safeParse({
      name: 'Work',
      type: 'custom',
      identifier: 'abc123',
      filterAggregation: 'all'
    });
    expect(result.success).toBe(true);
  });

  it('accepts custom perspective with null filterAggregation (pre-v4.2)', () => {
    const result = PerspectiveListItemSchema.safeParse({
      name: 'Work',
      type: 'custom',
      identifier: 'abc123',
      filterAggregation: null
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = PerspectiveListItemSchema.safeParse({ name: 'Inbox' });
    expect(result.success).toBe(false);
  });
});

describe('CustomPerspectiveDetailSchema', () => {
  it('accepts valid custom detail with filter data', () => {
    const result = CustomPerspectiveDetailSchema.safeParse({
      name: 'Work',
      identifier: 'abc123',
      type: 'custom',
      filterRules: { some: 'data' },
      filterAggregation: 'all'
    });
    expect(result.success).toBe(true);
  });

  it('accepts null filterRules and filterAggregation (pre-v4.2)', () => {
    const result = CustomPerspectiveDetailSchema.safeParse({
      name: 'Work',
      identifier: 'abc123',
      type: 'custom',
      filterRules: null,
      filterAggregation: null
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong type discriminant', () => {
    const result = CustomPerspectiveDetailSchema.safeParse({
      name: 'Work',
      identifier: 'abc123',
      type: 'builtin',
      filterRules: null,
      filterAggregation: null
    });
    expect(result.success).toBe(false);
  });
});

describe('BuiltInPerspectiveDetailSchema', () => {
  it('accepts valid built-in detail', () => {
    const result = BuiltInPerspectiveDetailSchema.safeParse({
      name: 'Inbox',
      type: 'builtin'
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong type discriminant', () => {
    const result = BuiltInPerspectiveDetailSchema.safeParse({
      name: 'Inbox',
      type: 'custom'
    });
    expect(result.success).toBe(false);
  });
});
