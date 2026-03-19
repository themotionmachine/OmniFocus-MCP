import { describe, expect, it } from 'vitest';
import {
  DuplicateSectionsErrorSchema,
  DuplicateSectionsInputSchema,
  DuplicateSectionsResponseSchema,
  DuplicateSectionsSuccessSchema
} from '../../../src/contracts/bulk-tools/index.js';

describe('DuplicateSectionsInputSchema', () => {
  it('accepts valid input with ending placement (library root)', () => {
    const result = DuplicateSectionsInputSchema.safeParse({
      items: [{ id: 'folder1' }],
      position: { placement: 'ending' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts folder target with relativeTo', () => {
    const result = DuplicateSectionsInputSchema.safeParse({
      items: [{ id: 'proj1' }],
      position: { placement: 'beginning', relativeTo: 'target-folder-id' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts before placement with relativeTo', () => {
    const result = DuplicateSectionsInputSchema.safeParse({
      items: [{ id: 'proj1' }],
      position: { placement: 'before', relativeTo: 'sibling-id' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts up to 100 items', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `section${i}` }));
    const result = DuplicateSectionsInputSchema.safeParse({
      items,
      position: { placement: 'ending' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts mixed folder and project items', () => {
    const result = DuplicateSectionsInputSchema.safeParse({
      items: [{ id: 'folder1' }, { id: 'proj1' }],
      position: { placement: 'ending' }
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = DuplicateSectionsInputSchema.safeParse({
      items: [],
      position: { placement: 'ending' }
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 items', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ id: `section${i}` }));
    const result = DuplicateSectionsInputSchema.safeParse({
      items,
      position: { placement: 'ending' }
    });
    expect(result.success).toBe(false);
  });

  it('rejects after placement without relativeTo', () => {
    const result = DuplicateSectionsInputSchema.safeParse({
      items: [{ id: 'proj1' }],
      position: { placement: 'after' }
    });
    expect(result.success).toBe(false);
  });
});

describe('DuplicateSectionsSuccessSchema', () => {
  it('accepts success with newId and newName', () => {
    const result = DuplicateSectionsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'proj1',
          itemName: 'My Project',
          itemType: 'project',
          success: true,
          newId: 'copy-proj-id',
          newName: 'My Project'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('accepts folder duplicate result', () => {
    const result = DuplicateSectionsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          itemId: 'folder1',
          itemName: 'My Folder',
          itemType: 'folder',
          success: true,
          newId: 'copy-folder-id',
          newName: 'My Folder'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });
});

describe('DuplicateSectionsErrorSchema', () => {
  it('accepts error with TARGET_NOT_FOUND code', () => {
    const result = DuplicateSectionsErrorSchema.safeParse({
      success: false,
      error: "Folder 'unknown-id' not found",
      code: 'TARGET_NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });
});

describe('DuplicateSectionsResponseSchema', () => {
  it('discriminates on success: true', () => {
    const result = DuplicateSectionsResponseSchema.safeParse({
      success: true,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('discriminates on success: false', () => {
    const result = DuplicateSectionsResponseSchema.safeParse({
      success: false,
      error: 'Target not found'
    });
    expect(result.success).toBe(true);
  });
});
