import { describe, expect, it } from 'vitest';
import {
  RemoveFolderDisambiguationSchema,
  RemoveFolderErrorSchema,
  RemoveFolderInputSchema,
  RemoveFolderResponseSchema,
  RemoveFolderSuccessSchema
} from '../../src/contracts/folder-tools/remove-folder.js';
import { isDisambiguationError } from '../../src/contracts/folder-tools/shared/disambiguation.js';

describe('RemoveFolderInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept id only', () => {
      const result = RemoveFolderInputSchema.safeParse({ id: 'folder-123' });
      expect(result.success).toBe(true);
    });

    it('should accept name only', () => {
      const result = RemoveFolderInputSchema.safeParse({ name: 'Work' });
      expect(result.success).toBe(true);
    });

    it('should accept both id and name (id takes precedence)', () => {
      const result = RemoveFolderInputSchema.safeParse({
        id: 'folder-123',
        name: 'Fallback Name'
      });
      expect(result.success).toBe(true);
    });

    it('should NOT trim whitespace from name (exact match)', () => {
      const result = RemoveFolderInputSchema.safeParse({ name: '  Exact  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('  Exact  ');
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing identifier', () => {
      const result = RemoveFolderInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const result = RemoveFolderInputSchema.safeParse({ id: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject non-string name', () => {
      const result = RemoveFolderInputSchema.safeParse({ name: 456 });
      expect(result.success).toBe(false);
    });
  });
});

describe('RemoveFolderSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = RemoveFolderSuccessSchema.safeParse({
      success: true,
      id: 'folder-123',
      name: 'Deleted Folder'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without id', () => {
    const result = RemoveFolderSuccessSchema.safeParse({
      success: true,
      name: 'Folder'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response without name', () => {
    const result = RemoveFolderSuccessSchema.safeParse({
      success: true,
      id: 'folder-123'
    });
    expect(result.success).toBe(false);
  });
});

describe('RemoveFolderErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = RemoveFolderErrorSchema.safeParse({
      success: false,
      error: "Invalid id 'xyz': folder not found"
    });
    expect(result.success).toBe(true);
  });

  it('should accept library rejection error', () => {
    const result = RemoveFolderErrorSchema.safeParse({
      success: false,
      error: 'Cannot delete library: not a valid folder target'
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = RemoveFolderErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('RemoveFolderDisambiguationSchema', () => {
  it('should accept valid disambiguation response', () => {
    const result = RemoveFolderDisambiguationSchema.safeParse({
      success: false,
      error: "Ambiguous name 'Archive': found 2 matches",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should reject disambiguation without code', () => {
    const result = RemoveFolderDisambiguationSchema.safeParse({
      success: false,
      error: 'Multiple matches',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(false);
  });

  it('should reject disambiguation without matchingIds', () => {
    const result = RemoveFolderDisambiguationSchema.safeParse({
      success: false,
      error: 'Multiple matches',
      code: 'DISAMBIGUATION_REQUIRED'
    });
    expect(result.success).toBe(false);
  });
});

describe('isDisambiguationError type guard', () => {
  it('should return true for disambiguation error', () => {
    const response = {
      success: false,
      error: "Ambiguous name 'Work': found 2 matches",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    };
    expect(isDisambiguationError(response)).toBe(true);
  });

  it('should return false for standard error', () => {
    const response = {
      success: false,
      error: "Invalid id 'xyz': folder not found"
    };
    expect(isDisambiguationError(response)).toBe(false);
  });

  it('should return false for success response', () => {
    const response = {
      success: true,
      id: 'folder-123',
      name: 'Work'
    };
    expect(isDisambiguationError(response)).toBe(false);
  });
});

describe('RemoveFolderResponseSchema (union)', () => {
  it('should accept success response', () => {
    const result = RemoveFolderResponseSchema.safeParse({
      success: true,
      id: 'folder-123',
      name: 'Deleted'
    });
    expect(result.success).toBe(true);
  });

  it('should accept standard error response', () => {
    const result = RemoveFolderResponseSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error response', () => {
    const result = RemoveFolderResponseSchema.safeParse({
      success: false,
      error: "Ambiguous name 'Work': found 2 matches",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should discriminate between response types', () => {
    const successResult = RemoveFolderResponseSchema.parse({
      success: true,
      id: 'folder-123',
      name: 'Work'
    });
    expect(successResult.success).toBe(true);

    const errorResult = RemoveFolderResponseSchema.parse({
      success: false,
      error: "Invalid id 'xyz': folder not found"
    });
    expect(errorResult.success).toBe(false);
    expect(isDisambiguationError(errorResult)).toBe(false);

    const disambigResult = RemoveFolderResponseSchema.parse({
      success: false,
      error: "Ambiguous name 'Archive': found 3 matches",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2', 'id3']
    });
    expect(disambigResult.success).toBe(false);
    expect(isDisambiguationError(disambigResult)).toBe(true);
  });
});
