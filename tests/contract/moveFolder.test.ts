import { describe, expect, it } from 'vitest';
import {
  MoveFolderDisambiguationSchema,
  MoveFolderErrorSchema,
  MoveFolderInputSchema,
  MoveFolderResponseSchema,
  MoveFolderSuccessSchema,
  PositionSchema
} from '../../src/contracts/folder-tools/move-folder.js';
import { isDisambiguationError } from '../../src/contracts/folder-tools/shared/disambiguation.js';

describe('MoveFolderInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept id with position ending', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 'folder-123',
        position: { placement: 'ending' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept id with position beginning', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 'folder-123',
        position: { placement: 'beginning' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept id with position before sibling', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 'folder-123',
        position: { placement: 'before', relativeTo: 'sibling-id' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept id with position after sibling', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 'folder-123',
        position: { placement: 'after', relativeTo: 'sibling-id' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with position', () => {
      const result = MoveFolderInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'ending' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept both id and name (id takes precedence)', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 'folder-123',
        name: 'Fallback Name',
        position: { placement: 'ending' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept position with parent folder', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 'folder-123',
        position: { placement: 'ending', relativeTo: 'parent-folder' }
      });
      expect(result.success).toBe(true);
    });

    it('should NOT trim whitespace from name (exact match)', () => {
      const result = MoveFolderInputSchema.safeParse({
        name: '  Exact  ',
        position: { placement: 'ending' }
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('  Exact  ');
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing identifier', () => {
      const result = MoveFolderInputSchema.safeParse({
        position: { placement: 'ending' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing position', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 'folder-123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject before without relativeTo', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 'folder-123',
        position: { placement: 'before' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject after without relativeTo', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 'folder-123',
        position: { placement: 'after' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid placement', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 'folder-123',
        position: { placement: 'middle' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const result = MoveFolderInputSchema.safeParse({
        id: 123,
        position: { placement: 'ending' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string name', () => {
      const result = MoveFolderInputSchema.safeParse({
        name: 456,
        position: { placement: 'ending' }
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('PositionSchema (for move_folder)', () => {
  describe('valid positions', () => {
    it('should accept beginning placement', () => {
      const result = PositionSchema.safeParse({ placement: 'beginning' });
      expect(result.success).toBe(true);
    });

    it('should accept ending placement', () => {
      const result = PositionSchema.safeParse({ placement: 'ending' });
      expect(result.success).toBe(true);
    });

    it('should accept before with relativeTo', () => {
      const result = PositionSchema.safeParse({
        placement: 'before',
        relativeTo: 'folder-123'
      });
      expect(result.success).toBe(true);
    });

    it('should accept after with relativeTo', () => {
      const result = PositionSchema.safeParse({
        placement: 'after',
        relativeTo: 'folder-456'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid positions', () => {
    it('should reject before without relativeTo', () => {
      const result = PositionSchema.safeParse({ placement: 'before' });
      expect(result.success).toBe(false);
    });

    it('should reject before with empty relativeTo', () => {
      const result = PositionSchema.safeParse({
        placement: 'before',
        relativeTo: ''
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('MoveFolderSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = MoveFolderSuccessSchema.safeParse({
      success: true,
      id: 'folder-123',
      name: 'Moved Folder'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without id', () => {
    const result = MoveFolderSuccessSchema.safeParse({
      success: true,
      name: 'Folder'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response without name', () => {
    const result = MoveFolderSuccessSchema.safeParse({
      success: true,
      id: 'folder-123'
    });
    expect(result.success).toBe(false);
  });
});

describe('MoveFolderErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = MoveFolderErrorSchema.safeParse({
      success: false,
      error: "Invalid id 'xyz': folder not found"
    });
    expect(result.success).toBe(true);
  });

  it('should accept circular move error', () => {
    const result = MoveFolderErrorSchema.safeParse({
      success: false,
      error: "Cannot move folder 'xyz': target is a descendant of source"
    });
    expect(result.success).toBe(true);
  });

  it('should accept library rejection error', () => {
    const result = MoveFolderErrorSchema.safeParse({
      success: false,
      error: 'Cannot move library: not a valid folder target'
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = MoveFolderErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('MoveFolderDisambiguationSchema', () => {
  it('should accept valid disambiguation response', () => {
    const result = MoveFolderDisambiguationSchema.safeParse({
      success: false,
      error: "Ambiguous name 'Work': found 2 matches",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should reject disambiguation without code', () => {
    const result = MoveFolderDisambiguationSchema.safeParse({
      success: false,
      error: 'Multiple matches',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(false);
  });

  it('should reject disambiguation without matchingIds', () => {
    const result = MoveFolderDisambiguationSchema.safeParse({
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

describe('MoveFolderResponseSchema (union)', () => {
  it('should accept success response', () => {
    const result = MoveFolderResponseSchema.safeParse({
      success: true,
      id: 'folder-123',
      name: 'Moved'
    });
    expect(result.success).toBe(true);
  });

  it('should accept standard error response', () => {
    const result = MoveFolderResponseSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error response', () => {
    const result = MoveFolderResponseSchema.safeParse({
      success: false,
      error: "Ambiguous name 'Work': found 2 matches",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should discriminate between response types', () => {
    const successResult = MoveFolderResponseSchema.parse({
      success: true,
      id: 'folder-123',
      name: 'Work'
    });
    expect(successResult.success).toBe(true);

    const errorResult = MoveFolderResponseSchema.parse({
      success: false,
      error: "Cannot move folder 'xyz': target is a descendant of source"
    });
    expect(errorResult.success).toBe(false);
    expect(isDisambiguationError(errorResult)).toBe(false);

    const disambigResult = MoveFolderResponseSchema.parse({
      success: false,
      error: "Ambiguous name 'Archive': found 3 matches",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2', 'id3']
    });
    expect(disambigResult.success).toBe(false);
    expect(isDisambiguationError(disambigResult)).toBe(true);
  });
});
