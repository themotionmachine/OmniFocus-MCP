import { describe, expect, it } from 'vitest';
import {
  SearchTasksErrorSchema,
  SearchTasksInputSchema,
  SearchTasksResponseSchema,
  SearchTasksSuccessSchema,
  TaskStatusFilterSchema
} from '../../../src/contracts/search-tools/search-tasks.js';

// T005: Contract tests for SearchTasks schemas

describe('TaskStatusFilterSchema', () => {
  it('should accept valid filter values', () => {
    for (const v of ['active', 'completed', 'dropped', 'all']) {
      expect(TaskStatusFilterSchema.safeParse(v).success).toBe(true);
    }
  });

  it('should reject invalid filter values', () => {
    expect(TaskStatusFilterSchema.safeParse('blocked').success).toBe(false);
    expect(TaskStatusFilterSchema.safeParse('available').success).toBe(false);
  });
});

describe('SearchTasksInputSchema', () => {
  it('should accept valid input with all fields', () => {
    const valid = { query: 'groceries', limit: 100, status: 'completed' };
    const result = SearchTasksInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('groceries');
      expect(result.data.limit).toBe(100);
      expect(result.data.status).toBe('completed');
    }
  });

  it('should apply defaults for limit and status', () => {
    const valid = { query: 'test' };
    const result = SearchTasksInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.status).toBe('active');
    }
  });

  it('should reject empty query (FR-016)', () => {
    expect(SearchTasksInputSchema.safeParse({ query: '' }).success).toBe(false);
  });

  it('should reject whitespace-only query after trimming (FR-016)', () => {
    expect(SearchTasksInputSchema.safeParse({ query: '   ' }).success).toBe(false);
    expect(SearchTasksInputSchema.safeParse({ query: '\t\n' }).success).toBe(false);
  });

  it('should reject query exceeding 1000 characters', () => {
    const longQuery = 'a'.repeat(1001);
    expect(SearchTasksInputSchema.safeParse({ query: longQuery }).success).toBe(false);
  });

  it('should accept query exactly at 1000 characters', () => {
    const maxQuery = 'a'.repeat(1000);
    expect(SearchTasksInputSchema.safeParse({ query: maxQuery }).success).toBe(true);
  });

  it('should accept single character query (FR-016)', () => {
    const result = SearchTasksInputSchema.safeParse({ query: 'a' });
    expect(result.success).toBe(true);
  });

  it('should reject limit below 1', () => {
    expect(SearchTasksInputSchema.safeParse({ query: 'test', limit: 0 }).success).toBe(false);
  });

  it('should reject limit above 1000', () => {
    expect(SearchTasksInputSchema.safeParse({ query: 'test', limit: 1001 }).success).toBe(false);
  });

  it('should reject non-integer limit', () => {
    expect(SearchTasksInputSchema.safeParse({ query: 'test', limit: 50.5 }).success).toBe(false);
  });

  it('should accept limit at boundaries (1 and 1000)', () => {
    expect(SearchTasksInputSchema.safeParse({ query: 'test', limit: 1 }).success).toBe(true);
    expect(SearchTasksInputSchema.safeParse({ query: 'test', limit: 1000 }).success).toBe(true);
  });
});

describe('SearchTasksSuccessSchema', () => {
  it('should accept valid success response with results', () => {
    const valid = {
      success: true,
      results: [
        {
          id: 'task-1',
          name: 'Buy groceries',
          status: 'available',
          projectName: 'Personal',
          flagged: false
        }
      ],
      totalMatches: 1
    };
    const result = SearchTasksSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results).toHaveLength(1);
      expect(result.data.totalMatches).toBe(1);
    }
  });

  it('should accept empty results as success (FR-007)', () => {
    const valid = {
      success: true,
      results: [],
      totalMatches: 0
    };
    const result = SearchTasksSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results).toHaveLength(0);
      expect(result.data.totalMatches).toBe(0);
    }
  });

  it('should accept totalMatches greater than results length (FR-008)', () => {
    const valid = {
      success: true,
      results: [
        { id: 'task-1', name: 'Test', status: 'available', projectName: null, flagged: false }
      ],
      totalMatches: 100
    };
    const result = SearchTasksSuccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalMatches).toBe(100);
      expect(result.data.results).toHaveLength(1);
    }
  });

  it('should reject negative totalMatches', () => {
    const invalid = {
      success: true,
      results: [],
      totalMatches: -1
    };
    expect(SearchTasksSuccessSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('SearchTasksErrorSchema', () => {
  it('should accept valid error response', () => {
    const valid = { success: false, error: 'Something went wrong' };
    const result = SearchTasksErrorSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error).toBe('Something went wrong');
    }
  });

  it('should reject error with success: true', () => {
    expect(SearchTasksErrorSchema.safeParse({ success: true, error: 'err' }).success).toBe(false);
  });
});

describe('SearchTasksResponseSchema', () => {
  it('should discriminate success response', () => {
    const success = {
      success: true,
      results: [],
      totalMatches: 0
    };
    const result = SearchTasksResponseSchema.safeParse(success);
    expect(result.success).toBe(true);
    if (result.success && result.data.success) {
      expect(result.data.results).toHaveLength(0);
    }
  });

  it('should discriminate error response', () => {
    const error = {
      success: false,
      error: 'Failed'
    };
    const result = SearchTasksResponseSchema.safeParse(error);
    expect(result.success).toBe(true);
    if (result.success && !result.data.success) {
      expect(result.data.error).toBe('Failed');
    }
  });
});
