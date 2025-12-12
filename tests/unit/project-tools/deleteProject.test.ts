import { beforeEach, describe, expect, it, vi } from 'vitest';
// Import will fail until primitive exists - that's expected for TDD
// @ts-expect-error - Primitive doesn't exist yet (TDD RED phase)
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

// T049: deleteProject removes project by ID
describe('deleteProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete project by ID and return success with id, name, message', async () => {
    const mockResponse = {
      success: true,
      id: 'proj123',
      name: 'Old Project',
      message: 'Project "Old Project" deleted (3 tasks removed)'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await deleteProject({ id: 'proj123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('proj123');
      expect(result.name).toBe('Old Project');
      expect(result.message).toContain('deleted');
      expect(result.message).toContain('tasks removed');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  // T050: deleteProject removes project by name
  it('should delete project by name with single match', async () => {
    const mockResponse = {
      success: true,
      id: 'proj456',
      name: 'Old Project',
      message: 'Project "Old Project" deleted (5 tasks removed)'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await deleteProject({ name: 'Old Project' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('proj456');
      expect(result.name).toBe('Old Project');
      expect(result.message).toContain('deleted');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  // T051: deleteProject returns not found error
  it('should return not found error when project does not exist by ID', async () => {
    const mockResponse = {
      success: false,
      error: "Project 'proj123' not found"
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await deleteProject({ id: 'proj123' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Project 'proj123' not found");
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should return not found error when project does not exist by name', async () => {
    const mockResponse = {
      success: false,
      error: "Project 'NonExistent' not found"
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await deleteProject({ name: 'NonExistent' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Project 'NonExistent' not found");
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  // T052: deleteProject returns disambiguation error
  it('should return disambiguation error when multiple projects match name', async () => {
    const mockResponse = {
      success: false,
      error: "Ambiguous project name 'Duplicate'. Found 2 matches. Please specify by ID.",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['proj1', 'proj2']
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await deleteProject({ name: 'Duplicate' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toEqual(['proj1', 'proj2']);
      expect(result.matchingIds.length).toBeGreaterThanOrEqual(2);
      expect(result.error).toContain('Ambiguous project name');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should cascade delete all child tasks', async () => {
    // OmniFocus deleteObject(project) automatically cascades to child tasks
    const mockResponse = {
      success: true,
      id: 'proj789',
      name: 'Project with Tasks',
      message: 'Project "Project with Tasks" deleted (15 tasks removed)'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await deleteProject({ id: 'proj789' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('proj789');
      expect(result.name).toBe('Project with Tasks');
      expect(result.message).toContain('15 tasks removed');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should handle empty project deletion (0 tasks)', async () => {
    const mockResponse = {
      success: true,
      id: 'proj999',
      name: 'Empty Project',
      message: 'Project "Empty Project" deleted (0 tasks removed)'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await deleteProject({ id: 'proj999' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('proj999');
      expect(result.name).toBe('Empty Project');
      expect(result.message).toContain('0 tasks removed');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should handle script execution errors gracefully', async () => {
    const mockResponse = {
      success: false,
      error: 'Unexpected error in OmniJS script'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await deleteProject({ id: 'proj123' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });
});
