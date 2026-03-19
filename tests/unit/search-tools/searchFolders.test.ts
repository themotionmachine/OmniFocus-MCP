import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateSearchFoldersScript,
  searchFolders
} from '../../../src/tools/primitives/searchFolders.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T022: Unit tests for searchFolders primitive

describe('searchFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return matching folders on success', async () => {
    const mockResponse = {
      success: true,
      results: [{ id: 'f1', name: 'Work', parentFolderName: null }],
      totalMatches: 1
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchFolders({ query: 'work', limit: 50 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Work');
    }
  });

  it('should return empty results when no matches', async () => {
    const mockResponse = { success: true, results: [], totalMatches: 0 };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchFolders({ query: 'nonexistent', limit: 50 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(0);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = { success: false, error: 'Script failed' };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchFolders({ query: 'test', limit: 50 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Script failed');
    }
  });
});

describe('generateSearchFoldersScript', () => {
  it('should generate script with query and limit', () => {
    const script = generateSearchFoldersScript({ query: 'work', limit: 25 });

    expect(script).toContain('var query = "work"');
    expect(script).toContain('var limit = 25');
  });

  it('should use foldersMatching() for Smart Match', () => {
    const script = generateSearchFoldersScript({ query: 'test', limit: 50 });

    expect(script).toContain('foldersMatching(query)');
  });

  it('should apply result limit via slice', () => {
    const script = generateSearchFoldersScript({ query: 'test', limit: 10 });

    expect(script).toContain('matches.slice(0, limit)');
  });

  it('should resolve parentFolderName from parent (nullable)', () => {
    const script = generateSearchFoldersScript({ query: 'test', limit: 50 });

    expect(script).toContain('folder.parent ? folder.parent.name : null');
  });

  it('should not include a status mapping (folders have no status)', () => {
    const script = generateSearchFoldersScript({ query: 'test', limit: 50 });

    expect(script).not.toContain('mapFolderStatus');
    expect(script).not.toContain('Folder.Status');
  });

  it('should wrap script in IIFE with try-catch', () => {
    const script = generateSearchFoldersScript({ query: 'test', limit: 50 });

    expect(script).toMatch(/^\(function\(\) \{/);
    expect(script).toContain('} catch (e) {');
    expect(script).toMatch(/\}\)\(\);$/);
  });
});
