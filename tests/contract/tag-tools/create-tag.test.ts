import { describe, expect, it } from 'vitest';
import {
  CreateTagInputSchema,
  CreateTagResponseSchema
} from '../../../src/contracts/tag-tools/create-tag.js';

describe('CreateTagInputSchema', () => {
  describe('name field', () => {
    it('should accept valid name', () => {
      const result = CreateTagInputSchema.safeParse({ name: 'Work' });
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from name', () => {
      const result = CreateTagInputSchema.safeParse({ name: '  Work  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Work');
      }
    });

    it('should reject empty name', () => {
      const result = CreateTagInputSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject whitespace-only name', () => {
      const result = CreateTagInputSchema.safeParse({ name: '   ' });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = CreateTagInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('parentId field', () => {
    it('should accept valid parentId', () => {
      const result = CreateTagInputSchema.safeParse({
        name: 'Office',
        parentId: 'tag-123'
      });
      expect(result.success).toBe(true);
    });

    it('should accept without parentId', () => {
      const result = CreateTagInputSchema.safeParse({ name: 'Work' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentId).toBeUndefined();
      }
    });
  });

  describe('position field', () => {
    it('should accept valid position with before placement', () => {
      const result = CreateTagInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'before', relativeTo: 'tag-123' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid position with after placement', () => {
      const result = CreateTagInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'after', relativeTo: 'tag-456' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid position with beginning placement', () => {
      const result = CreateTagInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'beginning' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid position with ending placement', () => {
      const result = CreateTagInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'ending' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept without position', () => {
      const result = CreateTagInputSchema.safeParse({ name: 'Work' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toBeUndefined();
      }
    });

    it('should reject position without required relativeTo for before', () => {
      const result = CreateTagInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'before' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject position without required relativeTo for after', () => {
      const result = CreateTagInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'after' }
      });
      expect(result.success).toBe(false);
    });
  });

  describe('allowsNextAction field', () => {
    it('should default allowsNextAction to true', () => {
      const result = CreateTagInputSchema.safeParse({ name: 'Work' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowsNextAction).toBe(true);
      }
    });

    it('should accept allowsNextAction as false', () => {
      const result = CreateTagInputSchema.safeParse({
        name: 'Work',
        allowsNextAction: false
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowsNextAction).toBe(false);
      }
    });

    it('should accept allowsNextAction as true', () => {
      const result = CreateTagInputSchema.safeParse({
        name: 'Work',
        allowsNextAction: true
      });
      expect(result.success).toBe(true);
    });
  });

  describe('combined fields', () => {
    it('should accept all fields together', () => {
      const result = CreateTagInputSchema.safeParse({
        name: 'Office',
        parentId: 'tag-parent',
        position: { placement: 'beginning', relativeTo: 'tag-parent' },
        allowsNextAction: false
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('CreateTagResponseSchema', () => {
  it('should accept success response with id and name', () => {
    const result = CreateTagResponseSchema.safeParse({
      success: true,
      id: 'tag-new-123',
      name: 'Work'
    });
    expect(result.success).toBe(true);
  });

  it('should reject response without success field', () => {
    const result = CreateTagResponseSchema.safeParse({
      id: 'tag-123',
      name: 'Work'
    });
    expect(result.success).toBe(false);
  });

  it('should reject response without id', () => {
    const result = CreateTagResponseSchema.safeParse({
      success: true,
      name: 'Work'
    });
    expect(result.success).toBe(false);
  });

  it('should reject response without name', () => {
    const result = CreateTagResponseSchema.safeParse({
      success: true,
      id: 'tag-123'
    });
    expect(result.success).toBe(false);
  });

  it('should accept error response (success: false)', () => {
    const result = CreateTagResponseSchema.safeParse({
      success: false,
      error: 'Tag not found'
    });
    expect(result.success).toBe(true);
  });
});
