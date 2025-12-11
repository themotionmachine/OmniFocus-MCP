import { describe, expect, it } from 'vitest';
import {
  FolderSchema,
  ListFoldersErrorSchema,
  ListFoldersInputSchema,
  ListFoldersResponseSchema,
  ListFoldersSuccessSchema
} from '../../src/contracts/folder-tools/list-folders.js';

describe('ListFoldersInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept empty object (all defaults)', () => {
      const result = ListFoldersInputSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeChildren).toBe(true); // default
      }
    });

    it('should accept status filter only', () => {
      const result = ListFoldersInputSchema.safeParse({ status: 'active' });
      expect(result.success).toBe(true);
    });

    it('should accept dropped status', () => {
      const result = ListFoldersInputSchema.safeParse({ status: 'dropped' });
      expect(result.success).toBe(true);
    });

    it('should accept parentId filter', () => {
      const result = ListFoldersInputSchema.safeParse({ parentId: 'folder-123' });
      expect(result.success).toBe(true);
    });

    it('should accept includeChildren: true', () => {
      const result = ListFoldersInputSchema.safeParse({ includeChildren: true });
      expect(result.success).toBe(true);
    });

    it('should accept includeChildren: false', () => {
      const result = ListFoldersInputSchema.safeParse({ includeChildren: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeChildren).toBe(false);
      }
    });

    it('should accept all parameters together', () => {
      const result = ListFoldersInputSchema.safeParse({
        status: 'active',
        parentId: 'folder-123',
        includeChildren: false
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject invalid status enum', () => {
      const result = ListFoldersInputSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean includeChildren', () => {
      const result = ListFoldersInputSchema.safeParse({ includeChildren: 'yes' });
      expect(result.success).toBe(false);
    });

    it('should reject non-string parentId', () => {
      const result = ListFoldersInputSchema.safeParse({ parentId: 123 });
      expect(result.success).toBe(false);
    });
  });
});

describe('FolderSchema', () => {
  it('should accept valid folder with all fields', () => {
    const result = FolderSchema.safeParse({
      id: 'folder-123',
      name: 'Work',
      status: 'active',
      parentId: null
    });
    expect(result.success).toBe(true);
  });

  it('should accept folder with parent', () => {
    const result = FolderSchema.safeParse({
      id: 'folder-456',
      name: 'Projects',
      status: 'active',
      parentId: 'folder-123'
    });
    expect(result.success).toBe(true);
  });

  it('should accept dropped folder', () => {
    const result = FolderSchema.safeParse({
      id: 'folder-789',
      name: 'Archive',
      status: 'dropped',
      parentId: null
    });
    expect(result.success).toBe(true);
  });

  it('should reject folder without id', () => {
    const result = FolderSchema.safeParse({
      name: 'Work',
      status: 'active',
      parentId: null
    });
    expect(result.success).toBe(false);
  });

  it('should reject folder without name', () => {
    const result = FolderSchema.safeParse({
      id: 'folder-123',
      status: 'active',
      parentId: null
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid status', () => {
    const result = FolderSchema.safeParse({
      id: 'folder-123',
      name: 'Work',
      status: 'archived',
      parentId: null
    });
    expect(result.success).toBe(false);
  });
});

describe('ListFoldersSuccessSchema', () => {
  it('should accept success response with empty folders array', () => {
    const result = ListFoldersSuccessSchema.safeParse({
      success: true,
      folders: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with folders', () => {
    const result = ListFoldersSuccessSchema.safeParse({
      success: true,
      folders: [
        { id: 'folder-1', name: 'Work', status: 'active', parentId: null },
        { id: 'folder-2', name: 'Personal', status: 'active', parentId: null }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should reject success response without folders array', () => {
    const result = ListFoldersSuccessSchema.safeParse({
      success: true
    });
    expect(result.success).toBe(false);
  });
});

describe('ListFoldersErrorSchema', () => {
  it('should accept error response with message', () => {
    const result = ListFoldersErrorSchema.safeParse({
      success: false,
      error: "Invalid parentId 'xyz': folder not found"
    });
    expect(result.success).toBe(true);
  });

  it('should reject error response without error message', () => {
    const result = ListFoldersErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('ListFoldersResponseSchema (discriminated union)', () => {
  it('should accept success response', () => {
    const result = ListFoldersResponseSchema.safeParse({
      success: true,
      folders: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = ListFoldersResponseSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(result.success).toBe(true);
  });

  it('should discriminate between success and error', () => {
    const successResult = ListFoldersResponseSchema.parse({
      success: true,
      folders: [{ id: '1', name: 'Test', status: 'active', parentId: null }]
    });
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.folders).toHaveLength(1);
    }

    const errorResult = ListFoldersResponseSchema.parse({
      success: false,
      error: 'Error message'
    });
    expect(errorResult.success).toBe(false);
    if (!errorResult.success) {
      expect(errorResult.error).toBe('Error message');
    }
  });
});
