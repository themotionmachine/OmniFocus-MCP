import { describe, expect, it } from 'vitest';
import {
  SearchFoldersErrorSchema,
  SearchFoldersInputSchema,
  SearchFoldersResponseSchema,
  SearchFoldersSuccessSchema
} from '../../../src/contracts/search-tools/search-folders.js';

// T021: Contract tests for SearchFolders schemas

describe('SearchFoldersInputSchema', () => {
  it('should accept valid input with query only', () => {
    const result = SearchFoldersInputSchema.safeParse({ query: 'work' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('work');
      expect(result.data.limit).toBe(50);
    }
  });

  it('should accept valid input with query and limit', () => {
    const result = SearchFoldersInputSchema.safeParse({ query: 'folder', limit: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
    }
  });

  it('should reject empty query', () => {
    expect(SearchFoldersInputSchema.safeParse({ query: '' }).success).toBe(false);
  });

  it('should reject whitespace-only query after trimming', () => {
    expect(SearchFoldersInputSchema.safeParse({ query: '   ' }).success).toBe(false);
    expect(SearchFoldersInputSchema.safeParse({ query: '\t\n' }).success).toBe(false);
  });

  it('should reject query exceeding 1000 characters', () => {
    const longQuery = 'a'.repeat(1001);
    expect(SearchFoldersInputSchema.safeParse({ query: longQuery }).success).toBe(false);
  });

  it('should accept query exactly at 1000 characters', () => {
    const maxQuery = 'a'.repeat(1000);
    expect(SearchFoldersInputSchema.safeParse({ query: maxQuery }).success).toBe(true);
  });

  it('should reject limit out of range', () => {
    expect(SearchFoldersInputSchema.safeParse({ query: 'test', limit: 0 }).success).toBe(false);
    expect(SearchFoldersInputSchema.safeParse({ query: 'test', limit: 1001 }).success).toBe(false);
  });
});

describe('SearchFoldersSuccessSchema', () => {
  it('should accept valid success response', () => {
    const valid = {
      success: true,
      results: [{ id: 'f1', name: 'Work', parentFolderName: null }],
      totalMatches: 1
    };
    const result = SearchFoldersSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results).toHaveLength(1);
    }
  });

  it('should accept empty results (FR-007)', () => {
    const valid = { success: true, results: [], totalMatches: 0 };
    expect(SearchFoldersSuccessSchema.safeParse(valid).success).toBe(true);
  });

  it('should accept results with parentFolderName set', () => {
    const valid = {
      success: true,
      results: [{ id: 'f1', name: 'Sub', parentFolderName: 'Parent' }],
      totalMatches: 1
    };
    const result = SearchFoldersSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results[0].parentFolderName).toBe('Parent');
    }
  });
});

describe('SearchFoldersErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = SearchFoldersErrorSchema.safeParse({ success: false, error: 'err' });
    expect(result.success).toBe(true);
  });
});

describe('SearchFoldersResponseSchema', () => {
  it('should discriminate success and error', () => {
    const success = { success: true, results: [], totalMatches: 0 };
    const error = { success: false, error: 'err' };
    expect(SearchFoldersResponseSchema.safeParse(success).success).toBe(true);
    expect(SearchFoldersResponseSchema.safeParse(error).success).toBe(true);
  });
});
