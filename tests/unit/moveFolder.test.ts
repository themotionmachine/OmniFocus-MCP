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

import { moveFolder } from '../../src/tools/primitives/moveFolder.js';
import { executeOmniFocusScript } from '../../src/utils/scriptExecution.js';

const mockExecuteOmniFocusScript = vi.mocked(executeOmniFocusScript);

describe('moveFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful moves by ID', () => {
    it('should move folder to library ending by ID', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-123',
        name: 'Moved Folder'
      });

      const result = await moveFolder({
        id: 'folder-123',
        position: { placement: 'ending' }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('folder-123');
        expect(result.name).toBe('Moved Folder');
      }
      expect(mockExecuteOmniFocusScript).toHaveBeenCalledTimes(1);
    });

    it('should move folder to library beginning by ID', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-456',
        name: 'Work'
      });

      const result = await moveFolder({
        id: 'folder-456',
        position: { placement: 'beginning' }
      });

      expect(result.success).toBe(true);
    });

    it('should move folder inside parent folder', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-child',
        name: 'Projects'
      });

      const result = await moveFolder({
        id: 'folder-child',
        position: { placement: 'ending', relativeTo: 'folder-parent' }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Projects');
      }
    });

    it('should move folder before sibling', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-moved',
        name: 'My Folder'
      });

      const result = await moveFolder({
        id: 'folder-moved',
        position: { placement: 'before', relativeTo: 'folder-sibling' }
      });

      expect(result.success).toBe(true);
    });

    it('should move folder after sibling', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-moved-2',
        name: 'Another Folder'
      });

      const result = await moveFolder({
        id: 'folder-moved-2',
        position: { placement: 'after', relativeTo: 'folder-sibling' }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('successful moves by name', () => {
    it('should move folder when found by name', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-found',
        name: 'Archive'
      });

      const result = await moveFolder({
        name: 'Archive',
        position: { placement: 'ending' }
      });

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

      const result = await moveFolder({
        name: 'Work',
        position: { placement: 'ending' }
      });

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

      const result = await moveFolder({
        name: 'Archive',
        position: { placement: 'beginning' }
      });

      expect(result.success).toBe(false);
      if (!result.success && 'matchingIds' in result) {
        expect(result.matchingIds).toEqual(['archive-1', 'archive-2']);
      }
    });
  });

  describe('circular move detection', () => {
    it('should return error when moving folder into its own descendant', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Cannot move folder 'folder-123': target is a descendant of source"
      });

      const result = await moveFolder({
        id: 'folder-123',
        position: { placement: 'ending', relativeTo: 'child-folder' }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('target is a descendant of source');
      }
    });
  });

  describe('error handling', () => {
    it('should return error for invalid ID (not found)', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Invalid id 'xyz': folder not found"
      });

      const result = await moveFolder({
        id: 'xyz',
        position: { placement: 'ending' }
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

      const result = await moveFolder({
        name: 'Nonexistent',
        position: { placement: 'ending' }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid name 'Nonexistent'");
        expect(result.error).toContain('folder not found');
      }
    });

    it('should return error for invalid relativeTo folder', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: "Invalid relativeTo 'nonexistent': folder not found"
      });

      const result = await moveFolder({
        id: 'folder-123',
        position: { placement: 'ending', relativeTo: 'nonexistent' }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid relativeTo 'nonexistent'");
      }
    });

    it('should return error for library move attempt', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: false,
        error: 'Cannot move library: not a valid folder target'
      });

      const result = await moveFolder({
        name: 'library',
        position: { placement: 'ending' }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot move library');
      }
    });

    it('should handle Omni Automation execution error', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue(new Error('OmniFocus script execution failed'));

      const result = await moveFolder({
        id: 'folder-123',
        position: { placement: 'ending' }
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

      const result = await moveFolder({
        id: 'folder-123',
        position: { placement: 'ending' }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Script error occurred');
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockExecuteOmniFocusScript.mockRejectedValue('String error');

      const result = await moveFolder({
        id: 'folder-123',
        position: { placement: 'ending' }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('ID takes precedence over name', () => {
    it('should use ID when both ID and name provided', async () => {
      mockExecuteOmniFocusScript.mockResolvedValue({
        success: true,
        id: 'folder-123',
        name: 'Moved'
      });

      const result = await moveFolder({
        id: 'folder-123',
        name: 'Ignored Name',
        position: { placement: 'ending' }
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

      const result = await moveFolder({
        id: 'folder-full',
        position: { placement: 'ending' }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
      }
    });
  });
});
