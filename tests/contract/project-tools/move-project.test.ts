import { describe, expect, it } from 'vitest';
import {
  MoveProjectInputSchema,
  MoveProjectResponseSchema
} from '../../../src/contracts/project-tools/move-project.js';

describe('MoveProjectInputSchema', () => {
  describe('identification (id or name required)', () => {
    it('should accept valid id', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456'
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid name', () => {
      const result = MoveProjectInputSchema.safeParse({
        name: 'My Project',
        targetFolderId: 'folder-456'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both id and name (id takes precedence)', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        name: 'My Project',
        targetFolderId: 'folder-456'
      });
      expect(result.success).toBe(true);
    });

    it('should reject when neither id nor name is provided', () => {
      const result = MoveProjectInputSchema.safeParse({
        targetFolderId: 'folder-456'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('At least one of id or name is required');
      }
    });
  });

  describe('target folder specification', () => {
    it('should accept targetFolderId', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456'
      });
      expect(result.success).toBe(true);
    });

    it('should accept targetFolderName', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderName: 'Work Folder'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both targetFolderId and targetFolderName (id takes precedence)', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456',
        targetFolderName: 'Work Folder'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('root specification', () => {
    it('should accept root: true', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        root: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept root: false (treated as not specified)', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        root: false,
        targetFolderId: 'folder-456'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('mutual exclusivity (targetFolder vs root)', () => {
    it('should reject both targetFolderId and root: true', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456',
        root: true
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Cannot specify both targetFolder and root: true'
        );
      }
    });

    it('should reject both targetFolderName and root: true', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderName: 'Work Folder',
        root: true
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Cannot specify both targetFolder and root: true'
        );
      }
    });

    it('should reject when neither targetFolder nor root is specified', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123'
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Must specify targetFolderId, targetFolderName, or root: true'
        );
      }
    });
  });

  describe('position field', () => {
    it('should accept position: beginning', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456',
        position: 'beginning'
      });
      expect(result.success).toBe(true);
    });

    it('should accept position: ending', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456',
        position: 'ending'
      });
      expect(result.success).toBe(true);
    });

    it('should default position to ending', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toBe('ending');
      }
    });

    it('should reject invalid position', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456',
        position: 'middle'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sibling positioning', () => {
    it('should accept beforeProject', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456',
        beforeProject: 'project-789'
      });
      expect(result.success).toBe(true);
    });

    it('should accept afterProject', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456',
        afterProject: 'project-789'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both beforeProject and afterProject', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456',
        beforeProject: 'project-789',
        afterProject: 'project-999'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('combined fields', () => {
    it('should accept all valid fields together', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        name: 'My Project',
        targetFolderId: 'folder-456',
        targetFolderName: 'Work Folder',
        position: 'beginning',
        beforeProject: 'project-789'
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimal valid input with id and targetFolderId', () => {
      const result = MoveProjectInputSchema.safeParse({
        id: 'project-123',
        targetFolderId: 'folder-456'
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimal valid input with name and root', () => {
      const result = MoveProjectInputSchema.safeParse({
        name: 'My Project',
        root: true
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('MoveProjectResponseSchema', () => {
  describe('success response', () => {
    it('should accept success response with all fields', () => {
      const result = MoveProjectResponseSchema.safeParse({
        success: true,
        id: 'project-123',
        name: 'My Project',
        parentFolderId: 'folder-456',
        parentFolderName: 'Work Folder'
      });
      expect(result.success).toBe(true);
    });

    it('should accept success response with null parent (root level)', () => {
      const result = MoveProjectResponseSchema.safeParse({
        success: true,
        id: 'project-123',
        name: 'My Project',
        parentFolderId: null,
        parentFolderName: null
      });
      expect(result.success).toBe(true);
    });

    it('should reject success response without id', () => {
      const result = MoveProjectResponseSchema.safeParse({
        success: true,
        name: 'My Project',
        parentFolderId: 'folder-456',
        parentFolderName: 'Work Folder'
      });
      expect(result.success).toBe(false);
    });

    it('should reject success response without name', () => {
      const result = MoveProjectResponseSchema.safeParse({
        success: true,
        id: 'project-123',
        parentFolderId: 'folder-456',
        parentFolderName: 'Work Folder'
      });
      expect(result.success).toBe(false);
    });

    it('should reject success response without parentFolderId', () => {
      const result = MoveProjectResponseSchema.safeParse({
        success: true,
        id: 'project-123',
        name: 'My Project',
        parentFolderName: 'Work Folder'
      });
      expect(result.success).toBe(false);
    });

    it('should reject success response without parentFolderName', () => {
      const result = MoveProjectResponseSchema.safeParse({
        success: true,
        id: 'project-123',
        name: 'My Project',
        parentFolderId: 'folder-456'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('error response', () => {
    it('should accept error response', () => {
      const result = MoveProjectResponseSchema.safeParse({
        success: false,
        error: 'Project not found'
      });
      expect(result.success).toBe(true);
    });

    it('should reject error response without error field', () => {
      const result = MoveProjectResponseSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });
  });

  describe('disambiguation error response', () => {
    it('should accept disambiguation error with matchingIds', () => {
      const result = MoveProjectResponseSchema.safeParse({
        success: false,
        code: 'DISAMBIGUATION_REQUIRED',
        error: 'Multiple projects found',
        matchingIds: ['project-1', 'project-2']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error with 3 matches', () => {
      const result = MoveProjectResponseSchema.safeParse({
        success: false,
        code: 'DISAMBIGUATION_REQUIRED',
        error: 'Multiple projects found',
        matchingIds: ['project-1', 'project-2', 'project-3']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error without code (fallback to ErrorSchema)', () => {
      // Union allows this because MoveProjectErrorSchema matches first
      // In practice, primitives should never return this invalid state
      const result = MoveProjectResponseSchema.safeParse({
        success: false,
        error: 'Multiple projects found',
        matchingIds: ['project-1', 'project-2']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error without matchingIds (fallback to ErrorSchema)', () => {
      // Union allows this because MoveProjectErrorSchema matches first
      // In practice, primitives should never return this invalid state
      const result = MoveProjectResponseSchema.safeParse({
        success: false,
        code: 'DISAMBIGUATION_REQUIRED',
        error: 'Multiple projects found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error with only 1 matchingId (fallback to ErrorSchema)', () => {
      // Union allows this because MoveProjectErrorSchema matches first
      // In practice, primitives should never return this invalid state
      const result = MoveProjectResponseSchema.safeParse({
        success: false,
        code: 'DISAMBIGUATION_REQUIRED',
        error: 'Multiple projects found',
        matchingIds: ['project-1']
      });
      expect(result.success).toBe(true);
    });
  });

  describe('discriminated union', () => {
    it('should reject response without success field', () => {
      const result = MoveProjectResponseSchema.safeParse({
        id: 'project-123',
        name: 'My Project'
      });
      expect(result.success).toBe(false);
    });
  });
});
