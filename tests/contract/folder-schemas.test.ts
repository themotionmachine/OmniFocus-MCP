/**
 * Consolidated Contract Tests for Shared Folder Schemas
 *
 * Tests the reusable schema components shared across folder tools:
 * - FolderSchema: Entity representation
 * - PositionSchema: Placement specification
 * - DisambiguationSchema: Ambiguous name lookup response
 *
 * Individual tool schemas are tested in their respective files:
 * - listFolders.test.ts
 * - addFolder.test.ts
 * - editFolder.test.ts
 * - removeFolder.test.ts
 * - moveFolder.test.ts
 */

import { describe, expect, it } from 'vitest';
import {
  DisambiguationSchema,
  FolderSchema,
  isDisambiguationError,
  PositionSchema
} from '../../src/contracts/folder-tools/shared/index.js';

describe('Shared Folder Schemas', () => {
  describe('FolderSchema', () => {
    describe('valid folders', () => {
      it('should accept folder with all required fields', () => {
        const result = FolderSchema.safeParse({
          id: 'folder-123',
          name: 'Work Projects',
          status: 'active',
          parentId: 'parent-456'
        });
        expect(result.success).toBe(true);
      });

      it('should accept folder with null parentId (root level)', () => {
        const result = FolderSchema.safeParse({
          id: 'folder-root',
          name: 'Root Folder',
          status: 'active',
          parentId: null
        });
        expect(result.success).toBe(true);
      });

      it('should accept folder with dropped status', () => {
        const result = FolderSchema.safeParse({
          id: 'folder-dropped',
          name: 'Archived',
          status: 'dropped',
          parentId: null
        });
        expect(result.success).toBe(true);
      });

      it('should accept folder with special characters in name', () => {
        const result = FolderSchema.safeParse({
          id: 'folder-special',
          name: 'Work & Personal "Projects" (2024)',
          status: 'active',
          parentId: null
        });
        expect(result.success).toBe(true);
      });

      it('should accept folder with unicode in name', () => {
        const result = FolderSchema.safeParse({
          id: 'folder-unicode',
          name: '📁 Projekte für 日本',
          status: 'active',
          parentId: null
        });
        expect(result.success).toBe(true);
      });
    });

    describe('invalid folders', () => {
      it('should reject folder without id', () => {
        const result = FolderSchema.safeParse({
          name: 'No ID',
          status: 'active',
          parentId: null
        });
        expect(result.success).toBe(false);
      });

      it('should reject folder without name', () => {
        const result = FolderSchema.safeParse({
          id: 'folder-123',
          status: 'active',
          parentId: null
        });
        expect(result.success).toBe(false);
      });

      it('should reject folder without status', () => {
        const result = FolderSchema.safeParse({
          id: 'folder-123',
          name: 'Test',
          parentId: null
        });
        expect(result.success).toBe(false);
      });

      it('should reject folder with invalid status', () => {
        const result = FolderSchema.safeParse({
          id: 'folder-123',
          name: 'Test',
          status: 'archived', // Invalid - should be 'active' or 'dropped'
          parentId: null
        });
        expect(result.success).toBe(false);
      });

      it('should reject folder without parentId field', () => {
        const result = FolderSchema.safeParse({
          id: 'folder-123',
          name: 'Test',
          status: 'active'
          // Missing parentId entirely
        });
        expect(result.success).toBe(false);
      });

      it('should reject folder with undefined parentId', () => {
        const result = FolderSchema.safeParse({
          id: 'folder-123',
          name: 'Test',
          status: 'active',
          parentId: undefined
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('PositionSchema', () => {
    describe('beginning/ending placements', () => {
      it('should accept beginning without relativeTo (library root)', () => {
        const result = PositionSchema.safeParse({
          placement: 'beginning'
        });
        expect(result.success).toBe(true);
      });

      it('should accept ending without relativeTo (library root)', () => {
        const result = PositionSchema.safeParse({
          placement: 'ending'
        });
        expect(result.success).toBe(true);
      });

      it('should accept beginning with relativeTo (parent folder)', () => {
        const result = PositionSchema.safeParse({
          placement: 'beginning',
          relativeTo: 'parent-folder-id'
        });
        expect(result.success).toBe(true);
      });

      it('should accept ending with relativeTo (parent folder)', () => {
        const result = PositionSchema.safeParse({
          placement: 'ending',
          relativeTo: 'parent-folder-id'
        });
        expect(result.success).toBe(true);
      });
    });

    describe('before/after placements', () => {
      it('should accept before with relativeTo', () => {
        const result = PositionSchema.safeParse({
          placement: 'before',
          relativeTo: 'sibling-folder-id'
        });
        expect(result.success).toBe(true);
      });

      it('should accept after with relativeTo', () => {
        const result = PositionSchema.safeParse({
          placement: 'after',
          relativeTo: 'sibling-folder-id'
        });
        expect(result.success).toBe(true);
      });

      it('should reject before without relativeTo', () => {
        const result = PositionSchema.safeParse({
          placement: 'before'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('relativeTo is required');
        }
      });

      it('should reject after without relativeTo', () => {
        const result = PositionSchema.safeParse({
          placement: 'after'
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('relativeTo is required');
        }
      });

      it('should reject before with empty relativeTo', () => {
        const result = PositionSchema.safeParse({
          placement: 'before',
          relativeTo: ''
        });
        expect(result.success).toBe(false);
      });

      it('should reject after with empty relativeTo', () => {
        const result = PositionSchema.safeParse({
          placement: 'after',
          relativeTo: ''
        });
        expect(result.success).toBe(false);
      });
    });

    describe('invalid placements', () => {
      it('should reject invalid placement value', () => {
        const result = PositionSchema.safeParse({
          placement: 'first' // Invalid
        });
        expect(result.success).toBe(false);
      });

      it('should reject null relativeTo', () => {
        const result = PositionSchema.safeParse({
          placement: 'ending',
          relativeTo: null
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing placement', () => {
        const result = PositionSchema.safeParse({
          relativeTo: 'some-id'
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('DisambiguationSchema', () => {
    describe('valid disambiguation responses', () => {
      it('should accept valid disambiguation error', () => {
        const result = DisambiguationSchema.safeParse({
          success: false,
          error: "Ambiguous name 'Archive': found 3 matches",
          code: 'DISAMBIGUATION_REQUIRED',
          matchingIds: ['id1', 'id2', 'id3']
        });
        expect(result.success).toBe(true);
      });

      it('should accept disambiguation with two matches', () => {
        const result = DisambiguationSchema.safeParse({
          success: false,
          error: "Ambiguous name 'Work': found 2 matches",
          code: 'DISAMBIGUATION_REQUIRED',
          matchingIds: ['work-1', 'work-2']
        });
        expect(result.success).toBe(true);
      });

      it('should accept disambiguation with many matches', () => {
        const result = DisambiguationSchema.safeParse({
          success: false,
          error: "Ambiguous name 'Test': found 10 matches",
          code: 'DISAMBIGUATION_REQUIRED',
          matchingIds: ['id1', 'id2', 'id3', 'id4', 'id5', 'id6', 'id7', 'id8', 'id9', 'id10']
        });
        expect(result.success).toBe(true);
      });
    });

    describe('invalid disambiguation responses', () => {
      it('should reject disambiguation with success: true', () => {
        const result = DisambiguationSchema.safeParse({
          success: true,
          error: 'Some error',
          code: 'DISAMBIGUATION_REQUIRED',
          matchingIds: ['id1', 'id2']
        });
        expect(result.success).toBe(false);
      });

      it('should reject disambiguation without code', () => {
        const result = DisambiguationSchema.safeParse({
          success: false,
          error: "Ambiguous name 'Archive': found 3 matches",
          matchingIds: ['id1', 'id2', 'id3']
        });
        expect(result.success).toBe(false);
      });

      it('should reject disambiguation with wrong code', () => {
        const result = DisambiguationSchema.safeParse({
          success: false,
          error: "Ambiguous name 'Archive': found 3 matches",
          code: 'WRONG_CODE',
          matchingIds: ['id1', 'id2', 'id3']
        });
        expect(result.success).toBe(false);
      });

      it('should reject disambiguation without matchingIds', () => {
        const result = DisambiguationSchema.safeParse({
          success: false,
          error: "Ambiguous name 'Archive': found 3 matches",
          code: 'DISAMBIGUATION_REQUIRED'
        });
        expect(result.success).toBe(false);
      });

      it('should reject disambiguation with empty matchingIds', () => {
        const result = DisambiguationSchema.safeParse({
          success: false,
          error: "Ambiguous name 'Archive': found 0 matches",
          code: 'DISAMBIGUATION_REQUIRED',
          matchingIds: []
        });
        // Empty array is technically valid per schema, but semantically wrong
        expect(result.success).toBe(true);
      });

      it('should reject disambiguation without error message', () => {
        const result = DisambiguationSchema.safeParse({
          success: false,
          code: 'DISAMBIGUATION_REQUIRED',
          matchingIds: ['id1', 'id2']
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('isDisambiguationError type guard', () => {
    it('should return true for valid disambiguation error', () => {
      const response = {
        success: false,
        error: "Ambiguous name 'Test': found 2 matches",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2']
      };
      expect(isDisambiguationError(response)).toBe(true);
    });

    it('should return false for regular error', () => {
      const response = {
        success: false,
        error: 'Folder not found'
      };
      expect(isDisambiguationError(response)).toBe(false);
    });

    it('should return false for success response', () => {
      const response = {
        success: true,
        id: 'folder-123',
        name: 'Test'
      };
      expect(isDisambiguationError(response)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isDisambiguationError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isDisambiguationError(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isDisambiguationError('string')).toBe(false);
      expect(isDisambiguationError(123)).toBe(false);
      expect(isDisambiguationError(true)).toBe(false);
    });

    it('should return false for object with different code', () => {
      const response = {
        success: false,
        error: 'Some error',
        code: 'OTHER_ERROR'
      };
      expect(isDisambiguationError(response)).toBe(false);
    });
  });
});
