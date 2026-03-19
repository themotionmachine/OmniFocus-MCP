import { describe, expect, it } from 'vitest';
import {
  MoveSectionsErrorSchema,
  MoveSectionsInputSchema,
  MoveSectionsResponseSchema,
  MoveSectionsSuccessSchema
} from '../../../src/contracts/bulk-tools/index.js';

describe('MoveSectionsInputSchema', () => {
  it('accepts valid input with ending placement (library root)', () => {
    const result = MoveSectionsInputSchema.safeParse({
      items: [{ id: 'folder1' }],
      position: { placement: 'ending' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts folder target with relativeTo', () => {
    const result = MoveSectionsInputSchema.safeParse({
      items: [{ id: 'proj1' }],
      position: { placement: 'beginning', relativeTo: 'target-folder-id' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts before placement with relativeTo', () => {
    const result = MoveSectionsInputSchema.safeParse({
      items: [{ id: 'proj1' }],
      position: { placement: 'before', relativeTo: 'sibling-id' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts after placement with relativeTo', () => {
    const result = MoveSectionsInputSchema.safeParse({
      items: [{ id: 'proj1' }],
      position: { placement: 'after', relativeTo: 'sibling-id' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts up to 100 items', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: `section${i}` }));
    const result = MoveSectionsInputSchema.safeParse({
      items,
      position: { placement: 'ending' }
    });
    expect(result.success).toBe(true);
  });

  it('accepts mixed folder and project items', () => {
    const result = MoveSectionsInputSchema.safeParse({
      items: [{ id: 'folder1' }, { id: 'proj1' }, { name: 'Named Project' }],
      position: { placement: 'ending', relativeTo: 'target-folder' }
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = MoveSectionsInputSchema.safeParse({
      items: [],
      position: { placement: 'ending' }
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 100 items', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ id: `section${i}` }));
    const result = MoveSectionsInputSchema.safeParse({
      items,
      position: { placement: 'ending' }
    });
    expect(result.success).toBe(false);
  });

  it('rejects before placement without relativeTo', () => {
    const result = MoveSectionsInputSchema.safeParse({
      items: [{ id: 'proj1' }],
      position: { placement: 'before' }
    });
    expect(result.success).toBe(false);
  });
});

describe('MoveSectionsSuccessSchema', () => {
  it('accepts folder result', () => {
    const result = MoveSectionsSuccessSchema.safeParse({
      success: true,
      results: [{ itemId: 'folder1', itemName: 'My Folder', itemType: 'folder', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('accepts mixed folder and project results', () => {
    const result = MoveSectionsSuccessSchema.safeParse({
      success: true,
      results: [
        { itemId: 'folder1', itemName: 'My Folder', itemType: 'folder', success: true },
        { itemId: 'proj1', itemName: 'My Project', itemType: 'project', success: true }
      ],
      summary: { total: 2, succeeded: 2, failed: 0 }
    });
    expect(result.success).toBe(true);
  });
});

describe('MoveSectionsErrorSchema', () => {
  it('accepts error with TARGET_NOT_FOUND code', () => {
    const result = MoveSectionsErrorSchema.safeParse({
      success: false,
      error: "Folder 'unknown' not found",
      code: 'TARGET_NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });
});

describe('MoveSectionsResponseSchema', () => {
  it('discriminates on success: true', () => {
    const result = MoveSectionsResponseSchema.safeParse({
      success: true,
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 }
    });
    expect(result.success).toBe(true);
  });

  it('discriminates on success: false', () => {
    const result = MoveSectionsResponseSchema.safeParse({
      success: false,
      error: 'Target not found'
    });
    expect(result.success).toBe(true);
  });
});
