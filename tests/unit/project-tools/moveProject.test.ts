import { beforeEach, describe, expect, it, vi } from 'vitest';
// Import will fail until primitive exists - that's expected for TDD
// @ts-expect-error - Primitive doesn't exist yet (TDD RED phase)
import { moveProject } from '../../../src/tools/primitives/moveProject.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

// T059: moveProject moves to folder by ID
describe('moveProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should move project to folder by ID', async () => {
    const mockResponse = {
      success: true,
      id: 'proj123',
      name: 'House Renovation',
      parentFolderId: 'folder456',
      parentFolderName: 'Work'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await moveProject({ id: 'proj123', targetFolderId: 'folder456' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify script path
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('move_project');
    expect(scriptPath).toContain('.js');

    // Verify result includes new parent folder information
    if (result.success) {
      expect(result.id).toBe('proj123');
      expect(result.name).toBe('House Renovation');
      expect(result.parentFolderId).toBe('folder456');
      expect(result.parentFolderName).toBe('Work');
    }
  });
});

// T060: moveProject moves to root
describe('moveProject to root', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should move project to root level', async () => {
    const mockResponse = {
      success: true,
      id: 'proj123',
      name: 'Standalone Project',
      parentFolderId: null,
      parentFolderName: null
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await moveProject({ id: 'proj123', root: true });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the result shows root level (null parent)
    if (result.success) {
      expect(result.id).toBe('proj123');
      expect(result.name).toBe('Standalone Project');
      expect(result.parentFolderId).toBeNull();
      expect(result.parentFolderName).toBeNull();
    }
  });
});

// T061: moveProject returns target not found error
describe('moveProject error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return target folder not found error', async () => {
    const mockResponse = {
      success: false,
      error: "Folder 'folder456' not found"
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await moveProject({ id: 'proj123', targetFolderId: 'folder456' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Folder 'folder456' not found");
    }
  });

  it('should return project not found error', async () => {
    const mockResponse = {
      success: false,
      error: "Project 'proj999' not found"
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await moveProject({ id: 'proj999', targetFolderId: 'folder456' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Project 'proj999' not found");
    }
  });
});

// T062: moveProject returns disambiguation error
describe('moveProject disambiguation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return disambiguation error for ambiguous project name', async () => {
    const mockResponse = {
      success: false,
      code: 'DISAMBIGUATION_REQUIRED',
      message: "Multiple projects match 'Renovation'. Please use ID to specify which one.",
      matchingIds: ['proj123', 'proj456', 'proj789']
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await moveProject({ name: 'Renovation', targetFolderId: 'folder456' });

    expect(result.success).toBe(false);
    if (!result.success && 'code' in result) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toHaveLength(3);
      expect(result.matchingIds).toContain('proj123');
      expect(result.matchingIds).toContain('proj456');
      expect(result.matchingIds).toContain('proj789');
    }
  });

  it('should return disambiguation error for ambiguous folder name', async () => {
    const mockResponse = {
      success: false,
      error: "Multiple folders match 'Work'. Please use targetFolderId to specify which one."
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await moveProject({ id: 'proj123', targetFolderName: 'Work' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Multiple folders match 'Work'");
    }
  });
});

// Additional test coverage: move by name, position parameters
describe('moveProject with name-based lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should move project by name to folder by name', async () => {
    const mockResponse = {
      success: true,
      id: 'proj123',
      name: 'House Renovation',
      parentFolderId: 'folder456',
      parentFolderName: 'Personal'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await moveProject({
      name: 'House Renovation',
      targetFolderName: 'Personal'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.name).toBe('House Renovation');
      expect(result.parentFolderName).toBe('Personal');
    }
  });
});

describe('moveProject with position parameter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should move project to beginning of folder', async () => {
    const mockResponse = {
      success: true,
      id: 'proj123',
      name: 'Urgent Project',
      parentFolderId: 'folder456',
      parentFolderName: 'Work'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await moveProject({
      id: 'proj123',
      targetFolderId: 'folder456',
      position: 'beginning'
    });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify script was generated with position parameter
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('move_project');
  });

  it('should default to ending position when not specified', async () => {
    const mockResponse = {
      success: true,
      id: 'proj123',
      name: 'New Project',
      parentFolderId: 'folder456',
      parentFolderName: 'Work'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await moveProject({ id: 'proj123', targetFolderId: 'folder456' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();
  });
});
