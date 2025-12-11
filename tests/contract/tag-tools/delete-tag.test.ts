import { describe, expect, it } from 'vitest';
import {
  DeleteTagErrorSchema,
  DeleteTagInputSchema,
  DeleteTagResponseSchema,
  DeleteTagSuccessSchema
} from '../../../src/contracts/tag-tools/delete-tag.js';

describe('DeleteTagInputSchema', () => {
  it('should accept valid input with id', () => {
    const result = DeleteTagInputSchema.safeParse({ id: 'tag123' });
    expect(result.success).toBe(true);
  });

  it('should accept valid input with name', () => {
    const result = DeleteTagInputSchema.safeParse({ name: 'Work' });
    expect(result.success).toBe(true);
  });

  it('should accept input with both id and name', () => {
    const result = DeleteTagInputSchema.safeParse({
      id: 'tag123',
      name: 'Work'
    });
    expect(result.success).toBe(true);
  });

  it('should reject input with neither id nor name', () => {
    const result = DeleteTagInputSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Either id or name must be provided');
    }
  });

  it('should reject empty id', () => {
    const result = DeleteTagInputSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = DeleteTagInputSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('DeleteTagSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = DeleteTagSuccessSchema.safeParse({
      success: true,
      id: 'tag123',
      name: 'Work'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without id', () => {
    const result = DeleteTagSuccessSchema.safeParse({
      success: true,
      name: 'Work'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response without name', () => {
    const result = DeleteTagSuccessSchema.safeParse({
      success: true,
      id: 'tag123'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response with success: false', () => {
    const result = DeleteTagSuccessSchema.safeParse({
      success: false,
      id: 'tag123',
      name: 'Work'
    });
    expect(result.success).toBe(false);
  });
});

describe('DeleteTagErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = DeleteTagErrorSchema.safeParse({
      success: false,
      error: "Tag 'tag123' not found"
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error', () => {
    const result = DeleteTagErrorSchema.safeParse({
      success: false,
      error: "Ambiguous tag name 'Work'. Found 2 matches: id1, id2. Please specify by ID.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = DeleteTagErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response with success: true', () => {
    const result = DeleteTagErrorSchema.safeParse({
      success: true,
      error: 'Tag not found'
    });
    expect(result.success).toBe(false);
  });
});

describe('DeleteTagResponseSchema', () => {
  it('should accept success response', () => {
    const result = DeleteTagResponseSchema.safeParse({
      success: true,
      id: 'tag123',
      name: 'Work'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = DeleteTagResponseSchema.safeParse({
      success: false,
      error: "Tag 'tag123' not found"
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error response', () => {
    const result = DeleteTagResponseSchema.safeParse({
      success: false,
      error: "Ambiguous tag name 'Work'. Found 2 matches: id1, id2. Please specify by ID.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid response', () => {
    const result = DeleteTagResponseSchema.safeParse({
      invalid: 'data'
    });
    expect(result.success).toBe(false);
  });
});
