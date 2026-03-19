import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateSearchProjectsScript,
  searchProjects
} from '../../../src/tools/primitives/searchProjects.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T015: Unit tests for searchProjects primitive

describe('searchProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return matching projects on success', async () => {
    const mockResponse = {
      success: true,
      results: [{ id: 'proj-1', name: 'Website Redesign', status: 'active', folderName: 'Work' }],
      totalMatches: 1
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchProjects({ query: 'website', limit: 50 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Website Redesign');
      expect(result.totalMatches).toBe(1);
    }
  });

  it('should return empty results when no matches', async () => {
    const mockResponse = { success: true, results: [], totalMatches: 0 };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchProjects({ query: 'nonexistent', limit: 50 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(0);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = { success: false, error: 'Script failed' };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await searchProjects({ query: 'test', limit: 50 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Script failed');
    }
  });
});

describe('generateSearchProjectsScript', () => {
  it('should generate script with query and limit', () => {
    const script = generateSearchProjectsScript({ query: 'website', limit: 25 });

    expect(script).toContain('var query = "website"');
    expect(script).toContain('var limit = 25');
  });

  it('should use projectsMatching() for Smart Match', () => {
    const script = generateSearchProjectsScript({ query: 'test', limit: 50 });

    expect(script).toContain('projectsMatching(query)');
  });

  it('should apply result limit via slice', () => {
    const script = generateSearchProjectsScript({ query: 'test', limit: 10 });

    expect(script).toContain('matches.slice(0, limit)');
  });

  it('should compute totalMatches before limit', () => {
    const script = generateSearchProjectsScript({ query: 'test', limit: 50 });

    expect(script).toContain('var totalMatches = matches.length');
  });

  it('should map project status values', () => {
    const script = generateSearchProjectsScript({ query: 'test', limit: 50 });

    expect(script).toContain('Project.Status.Active');
    expect(script).toContain('Project.Status.Done');
    expect(script).toContain('Project.Status.Dropped');
    expect(script).toContain('Project.Status.OnHold');
    expect(script).toContain('return "active"');
    expect(script).toContain('return "done"');
    expect(script).toContain('return "onHold"');
  });

  it('should resolve folderName from parentFolder (nullable)', () => {
    const script = generateSearchProjectsScript({ query: 'test', limit: 50 });

    expect(script).toContain('project.parentFolder ? project.parentFolder.name : null');
  });

  it('should wrap script in IIFE with try-catch', () => {
    const script = generateSearchProjectsScript({ query: 'test', limit: 50 });

    expect(script).toMatch(/^\(function\(\) \{/);
    expect(script).toContain('} catch (e) {');
    expect(script).toMatch(/\}\)\(\);$/);
  });

  it('should escape special characters in query', () => {
    const script = generateSearchProjectsScript({ query: 'test "project"', limit: 50 });

    expect(script).toContain('test \\"project\\"');
  });
});
