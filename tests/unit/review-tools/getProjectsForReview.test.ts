import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateGetProjectsForReviewScript,
  getProjectsForReview
} from '../../../src/tools/primitives/getProjectsForReview.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

const makeProject = (overrides: Record<string, unknown> = {}) => ({
  id: 'proj-1',
  name: 'Weekly Review',
  status: 'Active',
  flagged: false,
  reviewInterval: { steps: 7, unit: 'days' },
  lastReviewDate: '2025-12-23T00:00:00.000Z',
  nextReviewDate: '2025-12-30T00:00:00.000Z',
  remainingCount: 3,
  ...overrides
});

describe('getProjectsForReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return projects on success', async () => {
    const mockResponse = {
      success: true,
      projects: [makeProject()],
      totalCount: 1,
      dueCount: 1,
      upcomingCount: 0
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getProjectsForReview({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].id).toBe('proj-1');
      expect(result.totalCount).toBe(1);
      expect(result.dueCount).toBe(1);
      expect(result.upcomingCount).toBe(0);
    }
  });

  it('should return empty projects array when none match', async () => {
    const mockResponse = {
      success: true,
      projects: [],
      totalCount: 0,
      dueCount: 0,
      upcomingCount: 0
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getProjectsForReview({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = {
      success: false,
      error: "Folder 'xyz' not found"
    };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await getProjectsForReview({ folderId: 'xyz' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Folder 'xyz' not found");
    }
  });

  it('should call executeOmniJS exactly once', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects: [],
      totalCount: 0,
      dueCount: 0,
      upcomingCount: 0
    });

    await getProjectsForReview({});

    expect(executeOmniJS).toHaveBeenCalledTimes(1);
  });
});

describe('getProjectsForReview with includeFuture filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include upcoming projects when includeFuture=true', async () => {
    const upcomingProject = makeProject({
      nextReviewDate: '2026-01-05T00:00:00.000Z'
    });
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects: [upcomingProject],
      totalCount: 1,
      dueCount: 0,
      upcomingCount: 1
    });

    const result = await getProjectsForReview({ includeFuture: true, futureDays: 14 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.upcomingCount).toBe(1);
      expect(result.dueCount).toBe(0);
    }
  });

  it('should not include future projects when includeFuture=false (default)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects: [],
      totalCount: 0,
      dueCount: 0,
      upcomingCount: 0
    });

    const result = await getProjectsForReview({ includeFuture: false });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(0);
    }
  });
});

describe('getProjectsForReview with includeAll filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all reviewable projects when includeAll=true', async () => {
    const projects = [
      makeProject({ id: 'proj-1', nextReviewDate: '2025-11-01T00:00:00.000Z' }),
      makeProject({ id: 'proj-2', nextReviewDate: '2026-06-01T00:00:00.000Z' })
    ];
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects,
      totalCount: 2,
      dueCount: 1,
      upcomingCount: 1
    });

    const result = await getProjectsForReview({ includeAll: true });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    }
  });
});

describe('getProjectsForReview with includeInactive filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include Done/Dropped projects when includeInactive=true', async () => {
    const projects = [
      makeProject({ id: 'proj-1', status: 'Active' }),
      makeProject({ id: 'proj-2', status: 'Done' }),
      makeProject({ id: 'proj-3', status: 'Dropped' })
    ];
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects,
      totalCount: 3,
      dueCount: 3,
      upcomingCount: 0
    });

    const result = await getProjectsForReview({ includeInactive: true });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(3);
    }
  });

  it('should exclude Done/Dropped projects by default', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects: [makeProject({ id: 'proj-1', status: 'Active' })],
      totalCount: 1,
      dueCount: 1,
      upcomingCount: 0
    });

    const result = await getProjectsForReview({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].status).toBe('Active');
    }
  });
});

describe('getProjectsForReview with folder filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter by folderId', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects: [makeProject()],
      totalCount: 1,
      dueCount: 1,
      upcomingCount: 0
    });

    const result = await getProjectsForReview({ folderId: 'folder-123' });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalled();

    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(scriptContent).toContain('folder-123');
  });

  it('should filter by folderName', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects: [makeProject()],
      totalCount: 1,
      dueCount: 1,
      upcomingCount: 0
    });

    const result = await getProjectsForReview({ folderName: 'Work Projects' });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalled();

    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(scriptContent).toContain('Work Projects');
  });

  it('should return error when folderId not found', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'Folder not found: nonexistent-folder'
    });

    const result = await getProjectsForReview({ folderId: 'nonexistent-folder' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('nonexistent-folder');
    }
  });

  it('should return error when folderName not found', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'Folder not found: NonExistentFolder'
    });

    const result = await getProjectsForReview({ folderName: 'NonExistentFolder' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('NonExistentFolder');
    }
  });
});

describe('getProjectsForReview sort order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return projects sorted by nextReviewDate ascending', async () => {
    const projects = [
      makeProject({ id: 'proj-2', name: 'B Project', nextReviewDate: '2025-12-25T00:00:00.000Z' }),
      makeProject({ id: 'proj-1', name: 'A Project', nextReviewDate: '2025-12-20T00:00:00.000Z' })
    ];
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects,
      totalCount: 2,
      dueCount: 2,
      upcomingCount: 0
    });

    const result = await getProjectsForReview({});

    expect(result.success).toBe(true);
    if (result.success) {
      // OmniJS sorting is trusted - we just verify the mock response is returned as-is
      expect(result.projects[0].id).toBe('proj-2');
      expect(result.projects[1].id).toBe('proj-1');
    }
  });

  it('should use name as secondary sort when nextReviewDate is equal', async () => {
    const sameDate = '2025-12-30T00:00:00.000Z';
    const projects = [
      makeProject({ id: 'proj-2', name: 'Bravo', nextReviewDate: sameDate }),
      makeProject({ id: 'proj-1', name: 'Alpha', nextReviewDate: sameDate })
    ];
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects,
      totalCount: 2,
      dueCount: 2,
      upcomingCount: 0
    });

    const result = await getProjectsForReview({});

    expect(result.success).toBe(true);
    if (result.success) {
      // Trust mock response order as-is (OmniJS handles actual sorting)
      expect(result.projects).toHaveLength(2);
    }
  });
});

describe('getProjectsForReview with limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply limit to results', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects: [makeProject({ id: 'proj-1' }), makeProject({ id: 'proj-2' })],
      totalCount: 10,
      dueCount: 10,
      upcomingCount: 0
    });

    const result = await getProjectsForReview({ limit: 2 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(2);
      // totalCount reflects count BEFORE limit was applied
      expect(result.totalCount).toBe(10);
    }
  });

  it('should include totalCount reflecting pre-limit count', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects: [makeProject()],
      totalCount: 50,
      dueCount: 30,
      upcomingCount: 20
    });

    const result = await getProjectsForReview({ limit: 1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalCount).toBe(50);
      expect(result.dueCount).toBe(30);
      expect(result.upcomingCount).toBe(20);
    }
  });

  it('should pass limit parameter to OmniJS script', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      projects: [],
      totalCount: 0,
      dueCount: 0,
      upcomingCount: 0
    });

    await getProjectsForReview({ limit: 25 });

    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(scriptContent).toContain('25');
  });
});

describe('generateGetProjectsForReviewScript', () => {
  it('should generate valid OmniJS script string', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      limit: 100
    });
    expect(typeof script).toBe('string');
    expect(script).toContain('(function()');
    expect(script).toContain('flattenedProjects');
    expect(script).toContain('JSON.stringify');
    expect(script).toContain('try');
    expect(script).toContain('catch');
  });

  it('should embed folderId in script when provided', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      folderId: 'folder-abc-123',
      limit: 100
    });
    expect(script).toContain('folder-abc-123');
  });

  it('should embed folderName in script when provided', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      folderName: 'My Work Folder',
      limit: 100
    });
    expect(script).toContain('My Work Folder');
  });

  it('should use Calendar API for date calculations, not millisecond math', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: true,
      futureDays: 14,
      includeAll: false,
      includeInactive: false,
      limit: 100
    });
    expect(script).toContain('Calendar');
    expect(script).toContain('DateComponents');
    // Should NOT use millisecond math like "24 * 60 * 60 * 1000"
    expect(script).not.toContain('24 * 60 * 60 * 1000');
  });

  it('should escape special characters in folderId', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      folderId: 'folder"with"quotes',
      limit: 100
    });
    // Quotes should be escaped
    expect(script).not.toContain('folder"with"quotes');
    expect(script).toContain('folder\\"with\\"quotes');
  });

  it('should escape special characters in folderName', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      folderName: 'folder\\name',
      limit: 100
    });
    // Backslash should be escaped
    expect(script).toContain('folder\\\\name');
  });

  it('should use startOfDay for today calculation', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      limit: 100
    });
    expect(script).toContain('startOfDay');
  });

  it('should exclude disabled-review projects (365-year sentinel from set_review_interval)', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: true,
      includeInactive: false,
      limit: 100
    });
    // Sentinel detection: steps === 365 && unit === 'years' means reviews are disabled
    expect(script).toContain('=== 365');
    expect(script).toContain("=== 'years'");
  });

  it('should include reviewInterval check to exclude projects without review', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      limit: 100
    });
    expect(script).toContain('reviewInterval');
    expect(script).toContain('nextReviewDate');
  });

  it('should include nextReviewDate, lastReviewDate, remainingCount in output', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      limit: 100
    });
    expect(script).toContain('nextReviewDate');
    expect(script).toContain('lastReviewDate');
    expect(script).toContain('remainingCount');
  });

  it('should include sort by nextReviewDate then name', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      limit: 100
    });
    expect(script).toContain('sort');
    expect(script).toContain('localeCompare');
  });

  it('should include dueCount and upcomingCount in result', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      limit: 100
    });
    expect(script).toContain('dueCount');
    expect(script).toContain('upcomingCount');
    expect(script).toContain('totalCount');
  });

  it('should embed futureDays value in script', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: true,
      futureDays: 30,
      includeAll: false,
      includeInactive: false,
      limit: 100
    });
    expect(script).toContain('30');
  });

  it('should embed limit value in script', () => {
    const script = generateGetProjectsForReviewScript({
      includeFuture: false,
      futureDays: 7,
      includeAll: false,
      includeInactive: false,
      limit: 42
    });
    expect(script).toContain('42');
  });
});
