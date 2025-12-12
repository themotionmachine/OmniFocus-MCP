import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProject } from '../../../src/tools/primitives/getProject.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

// Mock the script execution
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

// T017-T020: Unit tests for getProject primitive (RED phase - should FAIL)
describe('getProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T017: getProject returns project by ID
  it('should return full project by ID', async () => {
    const mockResponse = {
      success: true,
      project: {
        id: 'proj123',
        name: 'Renovation',
        note: 'Complete house renovation project',
        status: 'Active',
        completed: false,
        flagged: true,
        effectiveFlagged: true,
        sequential: false,
        containsSingletonActions: false,
        projectType: 'parallel',
        completedByChildren: false,
        defaultSingletonActionHolder: false,
        deferDate: null,
        dueDate: '2025-12-31T00:00:00Z',
        effectiveDeferDate: null,
        effectiveDueDate: '2025-12-31T00:00:00Z',
        completionDate: null,
        dropDate: null,
        estimatedMinutes: 480,
        reviewInterval: { steps: 7, unit: 'days' },
        lastReviewDate: '2025-12-01T00:00:00Z',
        nextReviewDate: '2025-12-08T00:00:00Z',
        repetitionRule: null,
        shouldUseFloatingTimeZone: false,
        hasChildren: true,
        nextTask: { id: 'task1', name: 'First Task' },
        parentFolder: { id: 'folder1', name: 'Home' },
        tags: [{ id: 'tag1', name: 'Important' }],
        taskCount: 5,
        remainingCount: 3
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getProject({ id: 'proj123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.project.id).toBe('proj123');
      expect(result.project.name).toBe('Renovation');
      expect(result.project.note).toBe('Complete house renovation project');
      expect(result.project.status).toBe('Active');
      expect(result.project.completed).toBe(false);
      expect(result.project.flagged).toBe(true);
      expect(result.project.effectiveFlagged).toBe(true);
      expect(result.project.sequential).toBe(false);
      expect(result.project.containsSingletonActions).toBe(false);
      expect(result.project.projectType).toBe('parallel');
      expect(result.project.completedByChildren).toBe(false);
      expect(result.project.defaultSingletonActionHolder).toBe(false);
      expect(result.project.deferDate).toBeNull();
      expect(result.project.dueDate).toBe('2025-12-31T00:00:00Z');
      expect(result.project.effectiveDeferDate).toBeNull();
      expect(result.project.effectiveDueDate).toBe('2025-12-31T00:00:00Z');
      expect(result.project.completionDate).toBeNull();
      expect(result.project.dropDate).toBeNull();
      expect(result.project.estimatedMinutes).toBe(480);
      expect(result.project.reviewInterval).toEqual({ steps: 7, unit: 'days' });
      expect(result.project.lastReviewDate).toBe('2025-12-01T00:00:00Z');
      expect(result.project.nextReviewDate).toBe('2025-12-08T00:00:00Z');
      expect(result.project.repetitionRule).toBeNull();
      expect(result.project.shouldUseFloatingTimeZone).toBe(false);
      expect(result.project.hasChildren).toBe(true);
      expect(result.project.nextTask).toEqual({ id: 'task1', name: 'First Task' });
      expect(result.project.parentFolder).toEqual({ id: 'folder1', name: 'Home' });
      expect(result.project.tags).toEqual([{ id: 'tag1', name: 'Important' }]);
      expect(result.project.taskCount).toBe(5);
      expect(result.project.remainingCount).toBe(3);
    }
  });

  // T018: getProject returns project by name
  it('should return full project by name', async () => {
    const mockResponse = {
      success: true,
      project: {
        id: 'proj456',
        name: 'Renovation',
        note: 'Kitchen remodel only',
        status: 'OnHold',
        completed: false,
        flagged: false,
        effectiveFlagged: false,
        sequential: true,
        containsSingletonActions: false,
        projectType: 'sequential',
        completedByChildren: true,
        defaultSingletonActionHolder: false,
        deferDate: '2026-01-01T00:00:00Z',
        dueDate: null,
        effectiveDeferDate: '2026-01-01T00:00:00Z',
        effectiveDueDate: null,
        completionDate: null,
        dropDate: null,
        estimatedMinutes: null,
        reviewInterval: null,
        lastReviewDate: null,
        nextReviewDate: null,
        repetitionRule: null,
        shouldUseFloatingTimeZone: true,
        hasChildren: false,
        nextTask: null,
        parentFolder: null,
        tags: [],
        taskCount: 0,
        remainingCount: 0
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getProject({ name: 'Renovation' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify temp file path contains get_project identifier
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('get_project');
    expect(scriptPath).toContain('.js');

    if (result.success) {
      expect(result.project.id).toBe('proj456');
      expect(result.project.name).toBe('Renovation');
      expect(result.project.note).toBe('Kitchen remodel only');
      expect(result.project.status).toBe('OnHold');
      expect(result.project.sequential).toBe(true);
      expect(result.project.projectType).toBe('sequential');
      expect(result.project.completedByChildren).toBe(true);
      expect(result.project.deferDate).toBe('2026-01-01T00:00:00Z');
      expect(result.project.dueDate).toBeNull();
      expect(result.project.shouldUseFloatingTimeZone).toBe(true);
      expect(result.project.hasChildren).toBe(false);
      expect(result.project.nextTask).toBeNull();
      expect(result.project.parentFolder).toBeNull();
      expect(result.project.tags).toEqual([]);
    }
  });

  // T019: getProject returns not found error
  it('should return error when project not found', async () => {
    const mockResponse = {
      success: false,
      error: "Project 'proj123' not found"
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getProject({ id: 'proj123' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Project 'proj123' not found");
      // Verify error message quotes the input value (FR-055)
      expect(result.error).toContain("'proj123'");
    }
  });

  // T020: getProject returns disambiguation error
  it('should return disambiguation error for multiple name matches', async () => {
    const mockResponse = {
      success: false,
      error: "Multiple projects match name 'Renovation'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['proj1', 'proj2', 'proj3']
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await getProject({ name: 'Renovation' });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toEqual(['proj1', 'proj2', 'proj3']);
      expect(result.matchingIds.length).toBeGreaterThanOrEqual(2);
      expect(result.error).toBe("Multiple projects match name 'Renovation'");
    }
  });
});
