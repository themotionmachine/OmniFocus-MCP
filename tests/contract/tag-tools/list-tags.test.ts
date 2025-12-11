import { describe, expect, it } from 'vitest';
import {
  ListTagsInputSchema,
  ListTagsResponseSchema
} from '../../../src/contracts/tag-tools/list-tags.js';

// T014: Contract test for ListTagsInputSchema
describe('ListTagsInputSchema', () => {
  it('should accept empty input (all optional parameters)', () => {
    const result = ListTagsInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept valid status filter', () => {
    const result = ListTagsInputSchema.safeParse({ status: 'active' });
    expect(result.success).toBe(true);
  });

  it('should accept all valid status values', () => {
    const active = ListTagsInputSchema.safeParse({ status: 'active' });
    const onHold = ListTagsInputSchema.safeParse({ status: 'onHold' });
    const dropped = ListTagsInputSchema.safeParse({ status: 'dropped' });

    expect(active.success).toBe(true);
    expect(onHold.success).toBe(true);
    expect(dropped.success).toBe(true);
  });

  it('should reject invalid status value', () => {
    const result = ListTagsInputSchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should accept optional parentId', () => {
    const result = ListTagsInputSchema.safeParse({ parentId: 'tag123' });
    expect(result.success).toBe(true);
  });

  it('should accept optional includeChildren boolean', () => {
    const resultTrue = ListTagsInputSchema.safeParse({ includeChildren: true });
    const resultFalse = ListTagsInputSchema.safeParse({ includeChildren: false });

    expect(resultTrue.success).toBe(true);
    expect(resultFalse.success).toBe(true);
  });

  it('should default includeChildren to true', () => {
    const result = ListTagsInputSchema.safeParse({});
    if (result.success) {
      expect(result.data.includeChildren).toBe(true);
    }
  });

  it('should accept all parameters together', () => {
    const result = ListTagsInputSchema.safeParse({
      status: 'active',
      parentId: 'tag123',
      includeChildren: false
    });
    expect(result.success).toBe(true);
  });
});

// T015: Contract test for ListTagsResponseSchema
describe('ListTagsResponseSchema', () => {
  it('should accept success response with tags array', () => {
    const result = ListTagsResponseSchema.safeParse({
      success: true,
      tags: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with valid tag objects', () => {
    const result = ListTagsResponseSchema.safeParse({
      success: true,
      tags: [
        {
          id: 'tag1',
          name: 'Work',
          status: 'active',
          parentId: null,
          allowsNextAction: true,
          taskCount: 5
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = ListTagsResponseSchema.safeParse({
      success: false,
      error: 'An error occurred'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without tags field', () => {
    const result = ListTagsResponseSchema.safeParse({
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response without error field', () => {
    const result = ListTagsResponseSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid tag objects in success response', () => {
    const result = ListTagsResponseSchema.safeParse({
      success: true,
      tags: [
        {
          id: 'tag1',
          name: 'Work'
          // Missing required fields
        }
      ]
    });
    expect(result.success).toBe(false);
  });
});
