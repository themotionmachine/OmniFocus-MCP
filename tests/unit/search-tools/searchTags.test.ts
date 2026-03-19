import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSearchTagsScript, searchTags } from '../../../src/tools/primitives/searchTags.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T029: Unit tests for searchTags primitive

describe('searchTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return matching tags on success', async () => {
    const mockResponse = {
      success: true,
      results: [{ id: 'tag-1', name: 'urgent', status: 'active', parentTagName: null }],
      totalMatches: 1
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchTags({ query: 'urgent', limit: 50 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('urgent');
    }
  });

  it('should return empty results when no matches', async () => {
    const mockResponse = { success: true, results: [], totalMatches: 0 };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchTags({ query: 'nonexistent', limit: 50 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(0);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = { success: false, error: 'Script failed' };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchTags({ query: 'test', limit: 50 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Script failed');
    }
  });
});

describe('generateSearchTagsScript', () => {
  it('should generate script with query and limit', () => {
    const script = generateSearchTagsScript({ query: 'urgent', limit: 25 });

    expect(script).toContain('var query = "urgent"');
    expect(script).toContain('var limit = 25');
  });

  it('should use tagsMatching() for Smart Match', () => {
    const script = generateSearchTagsScript({ query: 'test', limit: 50 });

    expect(script).toContain('tagsMatching(query)');
  });

  it('should apply result limit via slice', () => {
    const script = generateSearchTagsScript({ query: 'test', limit: 10 });

    expect(script).toContain('matches.slice(0, limit)');
  });

  it('should map tag status values', () => {
    const script = generateSearchTagsScript({ query: 'test', limit: 50 });

    expect(script).toContain('Tag.Status.OnHold');
    expect(script).toContain('Tag.Status.Dropped');
    expect(script).toContain('return "onHold"');
    expect(script).toContain('return "dropped"');
    expect(script).toContain('return "active"');
  });

  it('should resolve parentTagName from parent (nullable)', () => {
    const script = generateSearchTagsScript({ query: 'test', limit: 50 });

    expect(script).toContain('tag.parent ? tag.parent.name : null');
  });

  it('should wrap script in IIFE with try-catch', () => {
    const script = generateSearchTagsScript({ query: 'test', limit: 50 });

    expect(script).toMatch(/^\(function\(\) \{/);
    expect(script).toContain('} catch (e) {');
    expect(script).toMatch(/\}\)\(\);$/);
  });
});
