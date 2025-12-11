import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies for Omni Automation approach
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

vi.mock('../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/mock_script.js',
    cleanup: vi.fn()
  }))
}));

import { addFolder } from '../../src/tools/primitives/addFolder.js';
import { executeOmniFocusScript } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('addFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful folder creation', () => {
    it('should create folder with name only (default position at library ending)', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-123',
        name: 'Work'
      });

      const result = await addFolder({ name: 'Work' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('folder-123');
        expect(result.name).toBe('Work');
      }
      expect(mockExecuteOmniFocusScript).toHaveBeenCalledTimes(1);
    });

    it('should create folder at library beginning', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-456',
        name: 'Personal'
      });

      const result = await addFolder({
        name: 'Personal',
        position: { placement: 'beginning' }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Personal');
      }
    });

    it('should create folder at library ending', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-789',
        name: 'Archive'
      });

      const result = await addFolder({
        name: 'Archive',
        position: { placement: 'ending' }
      });

      expect(result.success).toBe(true);
    });

    it('should create folder inside parent folder (beginning)', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-child',
        name: 'Projects'
      });

      const result = await addFolder({
        name: 'Projects',
        position: { placement: 'beginning', relativeTo: 'folder-parent' }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Projects');
      }
    });

    it('should create folder inside parent folder (ending)', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-child-2',
        name: 'Resources'
      });

      const result = await addFolder({
        name: 'Resources',
        position: { placement: 'ending', relativeTo: 'folder-parent' }
      });

      expect(result.success).toBe(true);
    });

    it('should create folder before sibling', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-new',
        name: 'New Folder'
      });

      const result = await addFolder({
        name: 'New Folder',
        position: { placement: 'before', relativeTo: 'folder-sibling' }
      });

      expect(result.success).toBe(true);
    });

    it('should create folder after sibling', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-new-2',
        name: 'Another Folder'
      });

      const result = await addFolder({
        name: 'Another Folder',
        position: { placement: 'after', relativeTo: 'folder-sibling' }
      });

      expect(result.success).toBe(true);
    });

    it('should trim whitespace from folder name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-trimmed',
        name: 'Trimmed Name'
      });

      const result = await addFolder({ name: '  Trimmed Name  ' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Trimmed Name');
      }
    });
  });

  describe('special characters in names', () => {
    it('should handle quotes in folder name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-quotes',
        name: "John's Projects"
      });

      const result = await addFolder({ name: "John's Projects" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe("John's Projects");
      }
    });

    it('should handle double quotes in folder name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-dquotes',
        name: 'Project "Alpha"'
      });

      const result = await addFolder({ name: 'Project "Alpha"' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Project "Alpha"');
      }
    });

    it('should handle slashes in folder name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-slash',
        name: 'Work/Personal'
      });

      const result = await addFolder({ name: 'Work/Personal' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Work/Personal');
      }
    });

    it('should handle backslashes in folder name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-backslash',
        name: 'C:\\Projects'
      });

      const result = await addFolder({ name: 'C:\\Projects' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('C:\\Projects');
      }
    });

    it('should handle Unicode characters in folder name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-unicode',
        name: '工作任务'
      });

      const result = await addFolder({ name: '工作任务' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('工作任务');
      }
    });

    it('should handle emoji in folder name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-emoji',
        name: '📁 Work'
      });

      const result = await addFolder({ name: '📁 Work' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('📁 Work');
      }
    });

    it('should handle ampersand in folder name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-ampersand',
        name: 'Work & Personal'
      });

      const result = await addFolder({ name: 'Work & Personal' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Work & Personal');
      }
    });
  });

  describe('error handling', () => {
    it('should return error for invalid relativeTo folder (not found)', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Invalid relativeTo 'xyz': folder not found"
      });

      const result = await addFolder({
        name: 'Test',
        position: { placement: 'ending', relativeTo: 'xyz' }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid relativeTo 'xyz'");
        expect(result.error).toContain('folder not found');
      }
    });

    it('should return error for invalid sibling position (wrong parent)', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Invalid relativeTo 'folder-wrong': folder is not a sibling in target parent"
      });

      const result = await addFolder({
        name: 'Test',
        position: { placement: 'before', relativeTo: 'folder-wrong' }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('folder is not a sibling');
      }
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await addFolder({ name: 'Test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('OmniFocus script execution failed');
      }
    });

    it('should handle script error response', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: 'Script error occurred'
      });

      const result = await addFolder({ name: 'Test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Script error occurred');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await addFolder({ name: 'Test' });

      expect(result.success).toBe(false);
    });
  });

  describe('response properties', () => {
    it('should return folder with all required fields', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-full',
        name: 'Complete Folder'
      });

      const result = await addFolder({ name: 'Complete Folder' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
      }
    });
  });
});
