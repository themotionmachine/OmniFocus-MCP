import { describe, expect, it } from 'vitest';
import {
  AddFolderErrorSchema,
  AddFolderInputSchema,
  AddFolderResponseSchema,
  AddFolderSuccessSchema,
  PositionSchema
} from '../../src/contracts/folder-tools/add-folder.js';

describe('AddFolderInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept name only (default position)', () => {
      const result = AddFolderInputSchema.safeParse({ name: 'Work' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Work');
        expect(result.data.position).toBeUndefined();
      }
    });

    it('should trim whitespace from name', () => {
      const result = AddFolderInputSchema.safeParse({ name: '  Work  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Work');
      }
    });

    it('should accept name with ending position (library root)', () => {
      const result = AddFolderInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'ending' }
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position?.placement).toBe('ending');
        expect(result.data.position?.relativeTo).toBeUndefined();
      }
    });

    it('should accept name with beginning position (library root)', () => {
      const result = AddFolderInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'beginning' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with ending position (specific parent)', () => {
      const result = AddFolderInputSchema.safeParse({
        name: 'Projects',
        position: { placement: 'ending', relativeTo: 'folder-123' }
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position?.relativeTo).toBe('folder-123');
      }
    });

    it('should accept name with before position', () => {
      const result = AddFolderInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'before', relativeTo: 'folder-456' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept name with after position', () => {
      const result = AddFolderInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'after', relativeTo: 'folder-789' }
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty name', () => {
      const result = AddFolderInputSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject whitespace-only name', () => {
      const result = AddFolderInputSchema.safeParse({ name: '   ' });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = AddFolderInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string name', () => {
      const result = AddFolderInputSchema.safeParse({ name: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid placement', () => {
      const result = AddFolderInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'middle' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject before without relativeTo', () => {
      const result = AddFolderInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'before' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject after without relativeTo', () => {
      const result = AddFolderInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'after' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject before with empty relativeTo', () => {
      const result = AddFolderInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'before', relativeTo: '' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject null relativeTo', () => {
      const result = AddFolderInputSchema.safeParse({
        name: 'Work',
        position: { placement: 'ending', relativeTo: null }
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('PositionSchema', () => {
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

    it('should accept beginning with parent relativeTo', () => {
      const result = PositionSchema.safeParse({
        placement: 'beginning',
        relativeTo: 'parent-folder'
      });
      expect(result.success).toBe(true);
    });

    it('should accept ending with parent relativeTo', () => {
      const result = PositionSchema.safeParse({
        placement: 'ending',
        relativeTo: 'parent-folder'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid positions', () => {
    it('should reject missing placement', () => {
      const result = PositionSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject before without relativeTo', () => {
      const result = PositionSchema.safeParse({ placement: 'before' });
      expect(result.success).toBe(false);
    });

    it('should reject after without relativeTo', () => {
      const result = PositionSchema.safeParse({ placement: 'after' });
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

describe('AddFolderSuccessSchema', () => {
  it('should accept valid success response', () => {
    const result = AddFolderSuccessSchema.safeParse({
      success: true,
      id: 'folder-123',
      name: 'Work'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without id', () => {
    const result = AddFolderSuccessSchema.safeParse({
      success: true,
      name: 'Work'
    });
    expect(result.success).toBe(false);
  });

  it('should reject success response without name', () => {
    const result = AddFolderSuccessSchema.safeParse({
      success: true,
      id: 'folder-123'
    });
    expect(result.success).toBe(false);
  });
});

describe('AddFolderErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = AddFolderErrorSchema.safeParse({
      success: false,
      error: 'Folder name is required and must be a non-empty string'
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = AddFolderErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('AddFolderResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = AddFolderResponseSchema.safeParse({
      success: true,
      id: 'folder-123',
      name: 'Work'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = AddFolderResponseSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
  });

  it('should discriminate between success and error', () => {
    const successResult = AddFolderResponseSchema.parse({
      success: true,
      id: 'folder-123',
      name: 'Work'
    });
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.id).toBe('folder-123');
      expect(successResult.name).toBe('Work');
    }

    const errorResult = AddFolderResponseSchema.parse({
      success: false,
      error: "Invalid relativeTo 'xyz': folder not found"
    });
    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toContain("Invalid relativeTo 'xyz'");
    }
  });
});
