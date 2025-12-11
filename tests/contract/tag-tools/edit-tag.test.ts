import { describe, expect, it } from 'vitest';
import {
  EditTagInputSchema,
  EditTagResponseSchema
} from '../../../src/contracts/tag-tools/edit-tag.js';

describe('EditTagInputSchema', () => {
  it('should accept valid input with id', () => {
    const validInput = {
      id: 'tag-123',
      newName: 'Updated Name'
    };
    const result = EditTagInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should accept valid input with name', () => {
    const validInput = {
      name: 'Old Name',
      newName: 'Updated Name'
    };
    const result = EditTagInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should accept updating status', () => {
    const validInput = {
      id: 'tag-123',
      status: 'onHold'
    };
    const result = EditTagInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should accept updating allowsNextAction', () => {
    const validInput = {
      id: 'tag-123',
      allowsNextAction: false
    };
    const result = EditTagInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should accept updating multiple properties', () => {
    const validInput = {
      id: 'tag-123',
      newName: 'New Name',
      status: 'active',
      allowsNextAction: true
    };
    const result = EditTagInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject when neither id nor name provided', () => {
    const invalidInput = {
      newName: 'Updated Name'
    };
    const result = EditTagInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject when no update fields provided', () => {
    const invalidInput = {
      id: 'tag-123'
    };
    const result = EditTagInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject when only name provided without update fields', () => {
    const invalidInput = {
      name: 'Tag Name'
    };
    const result = EditTagInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should accept all valid status values', () => {
    const statuses = ['active', 'onHold', 'dropped'];
    for (const status of statuses) {
      const input = {
        id: 'tag-123',
        status
      };
      const result = EditTagInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid status value', () => {
    const invalidInput = {
      id: 'tag-123',
      status: 'invalid'
    };
    const result = EditTagInputSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('EditTagResponseSchema', () => {
  it('should accept success response', () => {
    const validResponse = {
      success: true,
      id: 'tag-123',
      name: 'Updated Name'
    };
    const result = EditTagResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const validResponse = {
      success: false,
      error: "Tag 'tag-123' not found"
    };
    const result = EditTagResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error response', () => {
    const validResponse = {
      success: false,
      error: "Ambiguous tag name 'Work'. Found 2 matches.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['tag-123', 'tag-456']
    };
    const result = EditTagResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should reject success response without id', () => {
    const invalidResponse = {
      success: true,
      name: 'Updated Name'
    };
    const result = EditTagResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject success response without name', () => {
    const invalidResponse = {
      success: true,
      id: 'tag-123'
    };
    const result = EditTagResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it('should reject error response without error message', () => {
    const invalidResponse = {
      success: false
    };
    const result = EditTagResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});
