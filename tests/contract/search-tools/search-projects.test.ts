import { describe, expect, it } from 'vitest';
import {
  SearchProjectsErrorSchema,
  SearchProjectsInputSchema,
  SearchProjectsResponseSchema,
  SearchProjectsSuccessSchema
} from '../../../src/contracts/search-tools/search-projects.js';

// T014: Contract tests for SearchProjects schemas

describe('SearchProjectsInputSchema', () => {
  it('should accept valid input with query only', () => {
    const result = SearchProjectsInputSchema.safeParse({ query: 'website' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('website');
      expect(result.data.limit).toBe(50);
    }
  });

  it('should accept valid input with query and limit', () => {
    const result = SearchProjectsInputSchema.safeParse({ query: 'project', limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('should reject empty query (FR-016)', () => {
    expect(SearchProjectsInputSchema.safeParse({ query: '' }).success).toBe(false);
  });

  it('should accept single character query', () => {
    expect(SearchProjectsInputSchema.safeParse({ query: 'x' }).success).toBe(true);
  });

  it('should reject limit out of range', () => {
    expect(SearchProjectsInputSchema.safeParse({ query: 'test', limit: 0 }).success).toBe(false);
    expect(SearchProjectsInputSchema.safeParse({ query: 'test', limit: 1001 }).success).toBe(false);
  });

  it('should not have a status field', () => {
    const result = SearchProjectsInputSchema.safeParse({ query: 'test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('status' in result.data).toBe(false);
    }
  });
});

describe('SearchProjectsSuccessSchema', () => {
  it('should accept valid success response', () => {
    const valid = {
      success: true,
      results: [{ id: 'proj-1', name: 'Website', status: 'active', folderName: 'Work' }],
      totalMatches: 1
    };
    const result = SearchProjectsSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results).toHaveLength(1);
      expect(result.data.totalMatches).toBe(1);
    }
  });

  it('should accept empty results (FR-007)', () => {
    const valid = { success: true, results: [], totalMatches: 0 };
    const result = SearchProjectsSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should accept totalMatches > results.length (FR-008)', () => {
    const valid = {
      success: true,
      results: [{ id: 'p1', name: 'P', status: 'active', folderName: null }],
      totalMatches: 50
    };
    const result = SearchProjectsSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('SearchProjectsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = SearchProjectsErrorSchema.safeParse({ success: false, error: 'Failed' });
    expect(result.success).toBe(true);
  });
});

describe('SearchProjectsResponseSchema', () => {
  it('should discriminate success and error', () => {
    const success = { success: true, results: [], totalMatches: 0 };
    const error = { success: false, error: 'err' };
    expect(SearchProjectsResponseSchema.safeParse(success).success).toBe(true);
    expect(SearchProjectsResponseSchema.safeParse(error).success).toBe(true);
  });
});
