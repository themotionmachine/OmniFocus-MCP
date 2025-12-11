import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

vi.mock('../../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/mock_script.js',
    cleanup: vi.fn()
  }))
}));

import { addProject } from '../../../src/tools/primitives/addProject.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('addProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful project creation', () => {
    it('should create a project at root level successfully', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: 'project-123',
        name: 'Test Project'
      });

      const result = await addProject({ name: 'Test Project' });

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('project-123');
      expect(mockExecuteOmniFocusScript).toHaveBeenCalledTimes(1);
    });

    it('should create a project in a folder', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: 'project-456',
        name: 'Folder Project'
      });

      const result = await addProject({
        name: 'Folder Project',
        folderName: 'Work'
      });

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('project-456');
    });

    it('should create a project with all options', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: 'project-789',
        name: 'Full Project'
      });

      const result = await addProject({
        name: 'Full Project',
        note: 'Project notes',
        dueDate: '2024-12-31T23:59:59Z',
        deferDate: '2024-12-01T00:00:00Z',
        flagged: true,
        estimatedMinutes: 120,
        tags: ['Work', 'Q4'],
        folderName: 'Work',
        sequential: true
      });

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('project-789');
    });

    it('should create a sequential project', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: 'seq-project',
        name: 'Sequential Project'
      });

      const result = await addProject({
        name: 'Sequential Project',
        sequential: true
      });

      expect(result.success).toBe(true);
    });

    it('should create a parallel project', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: 'par-project',
        name: 'Parallel Project'
      });

      const result = await addProject({
        name: 'Parallel Project',
        sequential: false
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle folder not found error', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: 'Folder not found: NonExistent'
      });

      const result = await addProject({
        name: 'Project',
        folderName: 'NonExistent'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Folder not found');
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await addProject({ name: 'Project' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('OmniFocus script execution failed');
    });

    it('should handle script error response', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: 'Script error occurred'
      });

      const result = await addProject({ name: 'Project' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Script error occurred');
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await addProject({ name: 'Project' });

      expect(result.success).toBe(false);
    });
  });

  describe('input validation', () => {
    it('should reject empty name', async () => {
      const result = await addProject({ name: '' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project name is required');
      expect(mockExecuteOmniFocusScript).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only name', async () => {
      const result = await addProject({ name: '   ' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project name is required');
      expect(mockExecuteOmniFocusScript).not.toHaveBeenCalled();
    });

    it('should handle special characters in name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: '123',
        name: 'Project with "quotes" and \'apostrophes\''
      });

      const result = await addProject({
        name: 'Project with "quotes" and \'apostrophes\''
      });

      expect(result.success).toBe(true);
    });

    it('should handle empty optional fields', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: '123',
        name: 'Project'
      });

      const result = await addProject({
        name: 'Project',
        note: '',
        tags: []
      });

      expect(result.success).toBe(true);
    });
  });

  describe('date handling', () => {
    it('should handle due date only', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: '123',
        name: 'Project'
      });

      const result = await addProject({
        name: 'Project',
        dueDate: '2024-12-31'
      });

      expect(result.success).toBe(true);
    });

    it('should handle defer date only', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: '123',
        name: 'Project'
      });

      const result = await addProject({
        name: 'Project',
        deferDate: '2024-12-01'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('tag handling', () => {
    it('should handle multiple tags', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: '123',
        name: 'Project'
      });

      const result = await addProject({
        name: 'Project',
        tags: ['Tag1', 'Tag2', 'Tag3']
      });

      expect(result.success).toBe(true);
    });

    it('should handle special characters in tags', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        projectId: '123',
        name: 'Project'
      });

      const result = await addProject({
        name: 'Project',
        tags: ['Tag "with" quotes', "Tag 'with' apostrophes"]
      });

      expect(result.success).toBe(true);
    });
  });
});
