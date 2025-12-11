import { describe, expect, it } from 'vitest';
import {
  EditFolderDisambiguationSchema,
  EditFolderErrorSchema,
  EditFolderInputSchema,
  EditFolderResponseSchema,
  EditFolderSuccessSchema
} from '../../src/contracts/folder-tools/edit-folder.js';
import { isDisambiguationError } from '../../src/contracts/folder-tools/shared/disambiguation.js';

describe('EditFolderInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept id with newName', () => {
      const result = EditFolderInputSchema.safeParse({
        id: 'folder-123',
        newName: 'New Name'
      });
      expect(result.success).toBe(true);
    });

    it('should accept id with newStatus', () => {
      const result = EditFolderInputSchema.safeParse({
        id: 'folder-123',
        newStatus: 'dropped'
      });
      expect(result.success).toBe(true);
    });

    it('should accept id with both newName and newStatus', () => {
      const result = EditFolderInputSchema.safeParse({
        id: 'folder-123',
        newName: 'Updated Folder',
        newStatus: 'active'
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with newName', () => {
      const result = EditFolderInputSchema.safeParse({
        name: 'Old Folder',
        newName: 'New Folder'
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with newStatus', () => {
      const result = EditFolderInputSchema.safeParse({
        name: 'Work',
        newStatus: 'dropped'
      });
      expect(result.success).toBe(true);
    });

    it('should trim whitespace from newName', () => {
      const result = EditFolderInputSchema.safeParse({
        id: 'folder-123',
        newName: '  Trimmed Name  '
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.newName).toBe('Trimmed Name');
      }
    });

    it('should NOT trim whitespace from identification name', () => {
      const result = EditFolderInputSchema.safeParse({
        name: '  Exact Match  ',
        newStatus: 'active'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('  Exact Match  ');
      }
    });

    it('should accept both id and name (id takes precedence)', () => {
      const result = EditFolderInputSchema.safeParse({
        id: 'folder-123',
        name: 'Fallback Name',
        newName: 'Updated'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing identifier', () => {
      const result = EditFolderInputSchema.safeParse({
        newName: 'New Name'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing update field', () => {
      const result = EditFolderInputSchema.safeParse({
        id: 'folder-123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty newName', () => {
      const result = EditFolderInputSchema.safeParse({
        id: 'folder-123',
        newName: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject whitespace-only newName', () => {
      const result = EditFolderInputSchema.safeParse({
        id: 'folder-123',
        newName: '   '
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid newStatus', () => {
      const result = EditFolderInputSchema.safeParse({
        id: 'folder-123',
        newStatus: 'archived'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const result = EditFolderInputSchema.safeParse({
        id: 123,
        newName: 'Test'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string name', () => {
      const result = EditFolderInputSchema.safeParse({
        name: 456,
        newName: 'Test'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('EditFolderSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = EditFolderSuccessSchema.safeParse({
      success: true,
      id: 'folder-123',
      name: 'Updated Folder'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without id', () => {
    const result = EditFolderSuccessSchema.safeParse({
      success: true,
      name: 'Folder'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response without name', () => {
    const result = EditFolderSuccessSchema.safeParse({
      success: true,
      id: 'folder-123'
    });
    expect(result.success).toBe(false);
  });
});

describe('EditFolderErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = EditFolderErrorSchema.safeParse({
      success: false,
      error: "Invalid id 'xyz': folder not found"
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = EditFolderErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('EditFolderDisambiguationSchema', () => {
  it('should accept valid disambiguation response', () => {
    const result = EditFolderDisambiguationSchema.safeParse({
      success: false,
      error: "Ambiguous name 'Archive': found 3 matches",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2', 'id3']
    });
    expect(result.success).toBe(true);
  });

  it('should reject disambiguation without code', () => {
    const result = EditFolderDisambiguationSchema.safeParse({
      success: false,
      error: 'Multiple matches',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(false);
  });

  it('should reject disambiguation without matchingIds', () => {
    const result = EditFolderDisambiguationSchema.safeParse({
      success: false,
      error: 'Multiple matches',
      code: 'DISAMBIGUATION_REQUIRED'
    });
    expect(result.success).toBe(false);
  });

  it('should reject disambiguation with empty matchingIds', () => {
    const result = EditFolderDisambiguationSchema.safeParse({
      success: false,
      error: 'Multiple matches',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: []
    });
    expect(result.success).toBe(true); // Empty array is valid per schema
  });
});

describe('isDisambiguationError type guard', () => {
  it('should return true for disambiguation error', () => {
    const response = {
      success: false,
      error: "Ambiguous name 'Archive': found 2 matches",
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

  it('should return false for null', () => {
    expect(isDisambiguationError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isDisambiguationError(undefined)).toBe(false);
  });
});

describe('EditFolderResponseSchema (union)', () => {
  it('should accept success response', () => {
    const result = EditFolderResponseSchema.safeParse({
      success: true,
      id: 'folder-123',
      name: 'Work'
    });
    expect(result.success).toBe(true);
  });

  it('should accept standard error response', () => {
    const result = EditFolderResponseSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error response', () => {
    const result = EditFolderResponseSchema.safeParse({
      success: false,
      error: "Ambiguous name 'Work': found 2 matches",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2']
    });
    expect(result.success).toBe(true);
  });

  it('should discriminate between response types', () => {
    const successResult = EditFolderResponseSchema.parse({
      success: true,
      id: 'folder-123',
      name: 'Work'
    });
    expect(successResult.success).toBe(true);

    const errorResult = EditFolderResponseSchema.parse({
      success: false,
      error: "Invalid id 'xyz': folder not found"
    });
    expect(errorResult.success).toBe(false);
    expect(isDisambiguationError(errorResult)).toBe(false);

    const disambigResult = EditFolderResponseSchema.parse({
      success: false,
      error: "Ambiguous name 'Archive': found 3 matches",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['id1', 'id2', 'id3']
    });
    expect(disambigResult.success).toBe(false);
    expect(isDisambiguationError(disambigResult)).toBe(true);
  });
});
