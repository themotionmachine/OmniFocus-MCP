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

import { editFolder } from '../../src/tools/primitives/editFolder.js';
import { executeOmniFocusScript } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('editFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful updates by ID', () => {
    it('should update folder name by ID', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-123',
        name: 'New Name'
      });

      const result = await editFolder({
        id: 'folder-123',
        newName: 'New Name'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('folder-123');
        expect(result.name).toBe('New Name');
      }
      expect(mockExecuteOmniFocusScript).toHaveBeenCalledTimes(1);
    });

    it('should update folder status by ID', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-456',
        name: 'Archive'
      });

      const result = await editFolder({
        id: 'folder-456',
        newStatus: 'dropped'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('folder-456');
      }
    });

    it('should update both name and status by ID', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-789',
        name: 'Active Folder'
      });

      const result = await editFolder({
        id: 'folder-789',
        newName: 'Active Folder',
        newStatus: 'active'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('successful updates by name', () => {
    it('should update folder name when found by name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-found',
        name: 'Updated Name'
      });

      const result = await editFolder({
        name: 'Old Name',
        newName: 'Updated Name'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Updated Name');
      }
    });

    it('should update folder status when found by name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-status',
        name: 'Work'
      });

      const result = await editFolder({
        name: 'Work',
        newStatus: 'dropped'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('disambiguation scenarios', () => {
    it('should return disambiguation error for multiple name matches', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Ambiguous name 'Archive': found 3 matches",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2', 'id3']
      });

      const result = await editFolder({
        name: 'Archive',
        newStatus: 'active'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Ambiguous name 'Archive'");
        if ('code' in result) {
          expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
        }
        if ('matchingIds' in result) {
          expect(result.matchingIds).toHaveLength(3);
        }
      }
    });

    it('should return disambiguation with two matches', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Ambiguous name 'Work': found 2 matches",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['work-1', 'work-2']
      });

      const result = await editFolder({
        name: 'Work',
        newName: 'My Work'
      });

      expect(result.success).toBe(false);
      if (!result.success && 'matchingIds' in result) {
        expect(result.matchingIds).toEqual(['work-1', 'work-2']);
      }
    });
  });

  describe('error handling', () => {
    it('should return error for invalid ID (not found)', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Invalid id 'xyz': folder not found"
      });

      const result = await editFolder({
        id: 'xyz',
        newName: 'Test'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid id 'xyz'");
        expect(result.error).toContain('folder not found');
      }
    });

    it('should return error for invalid name (not found)', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Invalid name 'Nonexistent': folder not found"
      });

      const result = await editFolder({
        name: 'Nonexistent',
        newName: 'Test'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid name 'Nonexistent'");
        expect(result.error).toContain('folder not found');
      }
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await editFolder({
        id: 'folder-123',
        newName: 'Test'
      });

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

      const result = await editFolder({
        id: 'folder-123',
        newName: 'Test'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Script error occurred');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await editFolder({
        id: 'folder-123',
        newName: 'Test'
      });

      expect(result.success).toBe(false);
    });
  });

  describe('ID takes precedence over name', () => {
    it('should use ID when both ID and name provided', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-123',
        name: 'Updated'
      });

      const result = await editFolder({
        id: 'folder-123',
        name: 'Ignored Name',
        newName: 'Updated'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('folder-123');
      }
    });
  });

  describe('special characters in names', () => {
    it('should handle quotes in newName', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-quotes',
        name: "John's Projects"
      });

      const result = await editFolder({
        id: 'folder-quotes',
        newName: "John's Projects"
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe("John's Projects");
      }
    });

    it('should handle double quotes in newName', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-dquotes',
        name: 'Project "Alpha"'
      });

      const result = await editFolder({
        id: 'folder-dquotes',
        newName: 'Project "Alpha"'
      });

      expect(result.success).toBe(true);
    });

    it('should handle Unicode in newName', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-unicode',
        name: '工作任务'
      });

      const result = await editFolder({
        id: 'folder-unicode',
        newName: '工作任务'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('工作任务');
      }
    });

    it('should handle emoji in newName', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-emoji',
        name: '📁 Work'
      });

      const result = await editFolder({
        id: 'folder-emoji',
        newName: '📁 Work'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('response properties', () => {
    it('should return folder with all required fields', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-full',
        name: 'Complete Folder'
      });

      const result = await editFolder({
        id: 'folder-full',
        newName: 'Complete Folder'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
      }
    });
  });
});
