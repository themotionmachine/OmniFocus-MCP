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

import { listFolders } from '../../src/tools/primitives/listFolders.js';
import { executeOmniFocusScript } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('listFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful queries', () => {
    it('should return all folders when no parameters provided', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        folders: [
          { id: 'folder-1', name: 'Work', status: 'active', parentId: null },
          { id: 'folder-2', name: 'Personal', status: 'active', parentId: null }
        ]
      });

      const result = await listFolders({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.folders).toHaveLength(2);
        expect(result.folders[0].name).toBe('Work');
      }
      expect(mockExecuteOmniFocusScript).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no folders exist', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        folders: []
      });

      const result = await listFolders({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.folders).toHaveLength(0);
      }
    });

    it('should filter by active status', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        folders: [{ id: 'folder-1', name: 'Work', status: 'active', parentId: null }]
      });

      const result = await listFolders({ status: 'active' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.folders[0].status).toBe('active');
      }
    });

    it('should filter by dropped status', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        folders: [{ id: 'folder-2', name: 'Archive', status: 'dropped', parentId: null }]
      });

      const result = await listFolders({ status: 'dropped' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.folders[0].status).toBe('dropped');
      }
    });

    it('should filter by parentId', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        folders: [
          { id: 'folder-child-1', name: 'Projects', status: 'active', parentId: 'folder-parent' }
        ]
      });

      const result = await listFolders({ parentId: 'folder-parent' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.folders[0].parentId).toBe('folder-parent');
      }
    });

    it('should return only top-level folders when includeChildren is false', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        folders: [
          { id: 'folder-1', name: 'Work', status: 'active', parentId: null },
          { id: 'folder-2', name: 'Personal', status: 'active', parentId: null }
        ]
      });

      const result = await listFolders({ includeChildren: false });

      expect(result.success).toBe(true);
      if (result.success) {
        // All folders should have parentId: null (top-level)
        expect(result.folders.every((f) => f.parentId === null)).toBe(true);
      }
    });

    it('should include nested folders when includeChildren is true (default)', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        folders: [
          { id: 'folder-1', name: 'Work', status: 'active', parentId: null },
          { id: 'folder-2', name: 'Projects', status: 'active', parentId: 'folder-1' },
          { id: 'folder-3', name: 'Personal', status: 'active', parentId: null }
        ]
      });

      const result = await listFolders({ includeChildren: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.folders).toHaveLength(3);
        // Should include nested folder
        expect(result.folders.some((f) => f.parentId === 'folder-1')).toBe(true);
      }
    });

    it('should combine status and parentId filters', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        folders: [
          {
            id: 'folder-child',
            name: 'Active Project',
            status: 'active',
            parentId: 'folder-parent'
          }
        ]
      });

      const result = await listFolders({ status: 'active', parentId: 'folder-parent' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.folders[0].status).toBe('active');
        expect(result.folders[0].parentId).toBe('folder-parent');
      }
    });
  });

  describe('error handling', () => {
    it('should return error for invalid parentId', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Invalid parentId 'xyz': folder not found"
      });

      const result = await listFolders({ parentId: 'xyz' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid parentId 'xyz'");
        expect(result.error).toContain('folder not found');
      }
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await listFolders({});

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

      const result = await listFolders({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Script error occurred');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await listFolders({});

      expect(result.success).toBe(false);
    });
  });

  describe('folder properties', () => {
    it('should return folders with all required fields', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        folders: [{ id: 'folder-123', name: 'Test Folder', status: 'active', parentId: null }]
      });

      const result = await listFolders({});

      expect(result.success).toBe(true);
      if (result.success) {
        const folder = result.folders[0];
        expect(folder).toHaveProperty('id');
        expect(folder).toHaveProperty('name');
        expect(folder).toHaveProperty('status');
        expect(folder).toHaveProperty('parentId');
      }
    });

    it('should handle folders with special characters in names', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        folders: [
          { id: 'folder-1', name: 'Work & Projects', status: 'active', parentId: null },
          { id: 'folder-2', name: "John's Folder", status: 'active', parentId: null },
          { id: 'folder-3', name: 'Test/Folder', status: 'active', parentId: null }
        ]
      });

      const result = await listFolders({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.folders[0].name).toBe('Work & Projects');
        expect(result.folders[1].name).toBe("John's Folder");
        expect(result.folders[2].name).toBe('Test/Folder');
      }
    });
  });
});
