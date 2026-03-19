import { describe, expect, it } from 'vitest';
import {
  SearchTagsErrorSchema,
  SearchTagsInputSchema,
  SearchTagsResponseSchema,
  SearchTagsSuccessSchema
} from '../../../src/contracts/search-tools/search-tags.js';

// T028: Contract tests for SearchTags schemas

describe('SearchTagsInputSchema', () => {
  it('should accept valid input with query only', () => {
    const result = SearchTagsInputSchema.safeParse({ query: 'urgent' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('urgent');
      expect(result.data.limit).toBe(50);
    }
  });

  it('should accept valid input with query and limit', () => {
    const result = SearchTagsInputSchema.safeParse({ query: 'tag', limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('should reject empty query', () => {
    expect(SearchTagsInputSchema.safeParse({ query: '' }).success).toBe(false);
  });

  it('should reject limit out of range', () => {
    expect(SearchTagsInputSchema.safeParse({ query: 'test', limit: 0 }).success).toBe(false);
    expect(SearchTagsInputSchema.safeParse({ query: 'test', limit: 1001 }).success).toBe(false);
  });
});

describe('SearchTagsSuccessSchema', () => {
  it('should accept valid success response', () => {
    const valid = {
      success: true,
      results: [{ id: 'tag-1', name: 'urgent', status: 'active', parentTagName: null }],
      totalMatches: 1
    };
    const result = SearchTagsSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results).toHaveLength(1);
    }
  });

  it('should accept empty results (FR-007)', () => {
    const valid = { success: true, results: [], totalMatches: 0 };
    expect(SearchTagsSuccessSchema.safeParse(valid).success).toBe(true);
  });

  it('should accept results with parentTagName set', () => {
    const valid = {
      success: true,
      results: [{ id: 't1', name: 'high', status: 'active', parentTagName: 'Priority' }],
      totalMatches: 1
    };
    const result = SearchTagsSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results[0].parentTagName).toBe('Priority');
    }
  });

  it('should accept all tag status values in results', () => {
    const valid = {
      success: true,
      results: [
        { id: 't1', name: 'a', status: 'active', parentTagName: null },
        { id: 't2', name: 'b', status: 'onHold', parentTagName: null },
        { id: 't3', name: 'c', status: 'dropped', parentTagName: null }
      ],
      totalMatches: 3
    };
    expect(SearchTagsSuccessSchema.safeParse(valid).success).toBe(true);
  });
});

describe('SearchTagsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = SearchTagsErrorSchema.safeParse({ success: false, error: 'err' });
    expect(result.success).toBe(true);
  });
});

describe('SearchTagsResponseSchema', () => {
  it('should discriminate success and error', () => {
    const success = { success: true, results: [], totalMatches: 0 };
    const error = { success: false, error: 'err' };
    expect(SearchTagsResponseSchema.safeParse(success).success).toBe(true);
    expect(SearchTagsResponseSchema.safeParse(error).success).toBe(true);
  });
});
