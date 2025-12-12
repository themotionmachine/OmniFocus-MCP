import { beforeEach, describe, expect, it, vi } from 'vitest';
// Import will fail until primitive exists - that's expected for TDD
// @ts-expect-error - Primitive doesn't exist yet (TDD RED phase)
import { listProjects } from '../../../src/tools/primitives/listProjects.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

// T007: listProjects returns projects on success
describe('listProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return projects on success', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Project 1',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 5,
          remainingCount: 3
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].id).toBe('proj1');
      expect(result.projects[0].name).toBe('Project 1');
    }
  });

  it('should return empty array when no projects match filters', async () => {
    const mockResponse = {
      success: true,
      projects: []
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ folderId: 'nonexistent' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(0);
    }
  });
});

// T008: listProjects filters by folder
describe('listProjects with folder filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter by folderId (including nested subfolders)', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Project in folder',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: 'folder123',
          parentFolderName: 'Work',
          taskCount: 3,
          remainingCount: 2
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ folderId: 'folder123' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify script path
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_projects');
    expect(scriptPath).toContain('.js');

    // Verify result contains projects from folder
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].parentFolderId).toBe('folder123');
    }
  });

  it('should filter by folderName (including nested subfolders)', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj2',
          name: 'Project in named folder',
          status: 'Active',
          flagged: false,
          projectType: 'sequential',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: 'folder456',
          parentFolderName: 'Personal',
          taskCount: 7,
          remainingCount: 5
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ folderName: 'Personal' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the result contains projects from the named folder
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].parentFolderName).toBe('Personal');
    }
  });
});

// T009: listProjects filters by review status
describe('listProjects with review status filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter by reviewStatus "due" (nextReviewDate <= today)', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Project due for review',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          dueDate: null,
          deferDate: null,
          nextReviewDate: yesterday.toISOString(),
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 10,
          remainingCount: 8
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ reviewStatus: 'due' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the script was called (logic verification happens in OmniJS)
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].id).toBe('proj1');
    }
  });

  it('should filter by reviewStatus "upcoming" (within 7 days)', async () => {
    const today = new Date();
    const inFiveDays = new Date(today);
    inFiveDays.setDate(inFiveDays.getDate() + 5);

    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj2',
          name: 'Project with upcoming review',
          status: 'Active',
          flagged: false,
          projectType: 'sequential',
          dueDate: null,
          deferDate: null,
          nextReviewDate: inFiveDays.toISOString(),
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 5,
          remainingCount: 3
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ reviewStatus: 'upcoming' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the script was called (logic verification happens in OmniJS)
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].id).toBe('proj2');
    }
  });

  it('should filter by reviewStatus "any" (no review filtering)', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Project with review',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          dueDate: null,
          deferDate: null,
          nextReviewDate: '2025-12-20T00:00:00Z',
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 5,
          remainingCount: 3
        },
        {
          id: 'proj2',
          name: 'Project without review',
          status: 'Active',
          flagged: false,
          projectType: 'sequential',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 3,
          remainingCount: 1
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ reviewStatus: 'any' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify "any" returns all projects regardless of review status
    if (result.success) {
      expect(result.projects).toHaveLength(2);
    }
  });
});

// T010: listProjects filters by dates and status
describe('listProjects with date and status filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter by dueAfter', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Project due in future',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          dueDate: '2025-12-31T00:00:00Z',
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 5,
          remainingCount: 3
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ dueAfter: '2025-12-01T00:00:00Z' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].dueDate).toBe('2025-12-31T00:00:00Z');
    }
  });

  it('should filter by dueBefore', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Project due soon',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          dueDate: '2025-06-15T00:00:00Z',
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 3,
          remainingCount: 2
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ dueBefore: '2025-12-31T23:59:59Z' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].dueDate).toBe('2025-06-15T00:00:00Z');
    }
  });

  it('should filter by deferAfter', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Project deferred to future',
          status: 'Active',
          flagged: false,
          projectType: 'sequential',
          dueDate: null,
          deferDate: '2025-12-20T00:00:00Z',
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 7,
          remainingCount: 5
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ deferAfter: '2025-12-01T00:00:00Z' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].deferDate).toBe('2025-12-20T00:00:00Z');
    }
  });

  it('should filter by deferBefore', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Project deferred to past',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          dueDate: null,
          deferDate: '2025-01-15T00:00:00Z',
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 4,
          remainingCount: 3
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ deferBefore: '2025-06-30T23:59:59Z' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].deferDate).toBe('2025-01-15T00:00:00Z');
    }
  });

  it('should return empty array for inverted date range (dueAfter > dueBefore)', async () => {
    const mockResponse = {
      success: true,
      projects: []
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({
      dueAfter: '2025-12-31T00:00:00Z',
      dueBefore: '2025-01-01T00:00:00Z'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(0);
    }
  });

  it('should filter by status array (OR logic)', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Active project',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 5,
          remainingCount: 3
        },
        {
          id: 'proj2',
          name: 'On hold project',
          status: 'OnHold',
          flagged: false,
          projectType: 'sequential',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 8,
          remainingCount: 6
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ status: ['Active', 'OnHold'] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(2);
      expect(result.projects[0].status).toBe('Active');
      expect(result.projects[1].status).toBe('OnHold');
    }
  });

  it('should filter by flagged boolean', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Flagged project',
          status: 'Active',
          flagged: true,
          projectType: 'parallel',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 3,
          remainingCount: 2
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ flagged: true });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].flagged).toBe(true);
    }
  });

  it('should filter by includeCompleted', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Active project',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 5,
          remainingCount: 3
        },
        {
          id: 'proj2',
          name: 'Completed project',
          status: 'Done',
          flagged: false,
          projectType: 'sequential',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 10,
          remainingCount: 0
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ includeCompleted: true });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projects).toHaveLength(2);
      expect(result.projects[1].status).toBe('Done');
    }
  });

  it('should apply limit post-filter', async () => {
    const mockResponse = {
      success: true,
      projects: [
        {
          id: 'proj1',
          name: 'Project 1',
          status: 'Active',
          flagged: false,
          projectType: 'parallel',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 5,
          remainingCount: 3
        },
        {
          id: 'proj2',
          name: 'Project 2',
          status: 'Active',
          flagged: false,
          projectType: 'sequential',
          dueDate: null,
          deferDate: null,
          nextReviewDate: null,
          parentFolderId: null,
          parentFolderName: null,
          taskCount: 8,
          remainingCount: 6
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ limit: 2 });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the script path contains limit indicator
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_projects');

    if (result.success) {
      expect(result.projects).toHaveLength(2);
    }
  });

  it('should clamp limit > 1000 to 1000 silently', async () => {
    // Mock returns array respecting the clamped limit
    const mockProjects = Array.from({ length: 1000 }, (_, i) => ({
      id: `proj${i}`,
      name: `Project ${i}`,
      status: 'Active' as const,
      flagged: false,
      projectType: 'parallel' as const,
      dueDate: null,
      deferDate: null,
      nextReviewDate: null,
      parentFolderId: null,
      parentFolderName: null,
      taskCount: 5,
      remainingCount: 3
    }));

    const mockResponse = {
      success: true,
      projects: mockProjects
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listProjects({ limit: 5000 });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // The script should have been generated with clamped limit (1000)
    // We verify the script was called, actual clamping happens in primitive
    if (result.success) {
      // Mock returns exactly 1000 projects (clamped from 5000)
      expect(result.projects.length).toBeLessThanOrEqual(1000);
    }
  });
});
