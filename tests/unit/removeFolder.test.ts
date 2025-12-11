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

import { removeFolder } from '../../src/tools/primitives/removeFolder.js';
import { executeOmniFocusScript } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('removeFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful removal by ID', () => {
    it('should remove folder by ID', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-123',
        name: 'Deleted Folder'
      });

      const result = await removeFolder({ id: 'folder-123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('folder-123');
        expect(result.name).toBe('Deleted Folder');
      }
      expect(mockExecuteOmniFocusScript).toHaveBeenCalledTimes(1);
    });

    it('should capture folder info before deletion', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-456',
        name: 'Work Projects'
      });

      const result = await removeFolder({ id: 'folder-456' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('folder-456');
        expect(result.name).toBe('Work Projects');
      }
    });
  });

  describe('successful removal by name', () => {
    it('should remove folder when found by name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-found',
        name: 'Archive'
      });

      const result = await removeFolder({ name: 'Archive' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Archive');
      }
    });
  });

  describe('disambiguation scenarios', () => {
    it('should return disambiguation error for multiple name matches', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Ambiguous name 'Work': found 3 matches",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2', 'id3']
      });

      const result = await removeFolder({ name: 'Work' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Ambiguous name 'Work'");
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
        error: "Ambiguous name 'Archive': found 2 matches",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['archive-1', 'archive-2']
      });

      const result = await removeFolder({ name: 'Archive' });

      expect(result.success).toBe(false);
      if (!result.success && 'matchingIds' in result) {
        expect(result.matchingIds).toEqual(['archive-1', 'archive-2']);
      }
    });
  });

  describe('error handling', () => {
    it('should return error for invalid ID (not found)', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Invalid id 'xyz': folder not found"
      });

      const result = await removeFolder({ id: 'xyz' });

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

      const result = await removeFolder({ name: 'Nonexistent' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid name 'Nonexistent'");
        expect(result.error).toContain('folder not found');
      }
    });

    it('should return error for library deletion attempt', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: 'Cannot delete library: not a valid folder target'
      });

      const result = await removeFolder({ name: 'library' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot delete library');
      }
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await removeFolder({ id: 'folder-123' });

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

      const result = await removeFolder({ id: 'folder-123' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Script error occurred');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await removeFolder({ id: 'folder-123' });

      expect(result.success).toBe(false);
    });
  });

  describe('ID takes precedence over name', () => {
    it('should use ID when both ID and name provided', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-123',
        name: 'Deleted'
      });

      const result = await removeFolder({
        id: 'folder-123',
        name: 'Ignored Name'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('folder-123');
      }
    });
  });

  describe('response properties', () => {
    it('should return folder with all required fields', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-full',
        name: 'Complete Folder'
      });

      const result = await removeFolder({ id: 'folder-full' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
      }
    });
  });
});
