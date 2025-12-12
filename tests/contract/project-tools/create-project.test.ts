import { describe, expect, it } from 'vitest';
import {
  CreateProjectInputSchema,
  CreateProjectResponseSchema
} from '../../../src/contracts/project-tools/create-project.js';

describe('CreateProjectInputSchema', () => {
  describe('name field (required)', () => {
    it('should accept valid name', () => {
      const result = CreateProjectInputSchema.safeParse({ name: 'Project Alpha' });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = CreateProjectInputSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = CreateProjectInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('folderId and folderName fields (optional)', () => {
    it('should accept valid folderId', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        folderId: 'folder-123'
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid folderName', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        folderName: 'Work'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both folderId and folderName (folderId takes precedence)', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        folderId: 'folder-123',
        folderName: 'Work'
      });
      expect(result.success).toBe(true);
    });

    it('should accept without folderId or folderName', () => {
      const result = CreateProjectInputSchema.safeParse({ name: 'Project Alpha' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.folderId).toBeUndefined();
        expect(result.data.folderName).toBeUndefined();
      }
    });
  });

  describe('position field (optional)', () => {
    it('should accept position as beginning', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        position: 'beginning'
      });
      expect(result.success).toBe(true);
    });

    it('should accept position as ending', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        position: 'ending'
      });
      expect(result.success).toBe(true);
    });

    it('should default position to ending when not provided', () => {
      const result = CreateProjectInputSchema.safeParse({ name: 'Project Alpha' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.position).toBe('ending');
      }
    });

    it('should reject invalid position value', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        position: 'middle'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('beforeProject and afterProject fields (optional)', () => {
    it('should accept beforeProject', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        beforeProject: 'project-123'
      });
      expect(result.success).toBe(true);
    });

    it('should accept afterProject', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        afterProject: 'project-456'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both beforeProject and afterProject', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        beforeProject: 'project-123',
        afterProject: 'project-456'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sequential and containsSingletonActions fields (optional, both allowed)', () => {
    it('should accept sequential as true', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        sequential: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept sequential as false', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        sequential: false
      });
      expect(result.success).toBe(true);
    });

    it('should accept containsSingletonActions as true', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        containsSingletonActions: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept containsSingletonActions as false', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        containsSingletonActions: false
      });
      expect(result.success).toBe(true);
    });

    it('should accept both sequential and containsSingletonActions as true (auto-clear is runtime)', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        sequential: true,
        containsSingletonActions: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept without sequential or containsSingletonActions', () => {
      const result = CreateProjectInputSchema.safeParse({ name: 'Project Alpha' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sequential).toBeUndefined();
        expect(result.data.containsSingletonActions).toBeUndefined();
      }
    });
  });

  describe('reviewInterval field (optional)', () => {
    it('should accept valid reviewInterval object', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        reviewInterval: { steps: 14, unit: 'days' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept reviewInterval with weeks unit', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        reviewInterval: { steps: 2, unit: 'weeks' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept reviewInterval with months unit', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        reviewInterval: { steps: 1, unit: 'months' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept reviewInterval with years unit', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        reviewInterval: { steps: 1, unit: 'years' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept reviewInterval as null to clear', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        reviewInterval: null
      });
      expect(result.success).toBe(true);
    });

    it('should reject reviewInterval with invalid unit', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        reviewInterval: { steps: 14, unit: 'hours' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject reviewInterval with steps less than 1', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        reviewInterval: { steps: 0, unit: 'days' }
      });
      expect(result.success).toBe(false);
    });

    it('should reject reviewInterval with non-integer steps', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        reviewInterval: { steps: 1.5, unit: 'days' }
      });
      expect(result.success).toBe(false);
    });

    it('should accept without reviewInterval', () => {
      const result = CreateProjectInputSchema.safeParse({ name: 'Project Alpha' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reviewInterval).toBeUndefined();
      }
    });
  });

  describe('optional properties', () => {
    it('should accept note', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        note: 'This is a project note'
      });
      expect(result.success).toBe(true);
    });

    it('should accept status', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        status: 'Active'
      });
      expect(result.success).toBe(true);
    });

    it('should default status to Active', () => {
      const result = CreateProjectInputSchema.safeParse({ name: 'Project Alpha' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('Active');
      }
    });

    it('should accept all valid status values', () => {
      const statuses = ['Active', 'OnHold', 'Done', 'Dropped'];
      for (const status of statuses) {
        const result = CreateProjectInputSchema.safeParse({
          name: 'Project Alpha',
          status
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept flagged', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        flagged: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept completedByChildren', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        completedByChildren: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept defaultSingletonActionHolder', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        defaultSingletonActionHolder: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept deferDate as ISO 8601 string', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        deferDate: '2025-01-15T09:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept deferDate as null to clear', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        deferDate: null
      });
      expect(result.success).toBe(true);
    });

    it('should accept dueDate as ISO 8601 string', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        dueDate: '2025-01-20T17:00:00.000Z'
      });
      expect(result.success).toBe(true);
    });

    it('should accept dueDate as null to clear', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        dueDate: null
      });
      expect(result.success).toBe(true);
    });

    it('should accept shouldUseFloatingTimeZone', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        shouldUseFloatingTimeZone: true
      });
      expect(result.success).toBe(true);
    });

    it('should accept estimatedMinutes', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        estimatedMinutes: 120
      });
      expect(result.success).toBe(true);
    });

    it('should accept estimatedMinutes as null to clear', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        estimatedMinutes: null
      });
      expect(result.success).toBe(true);
    });
  });

  describe('combined fields', () => {
    it('should accept all fields together', () => {
      const result = CreateProjectInputSchema.safeParse({
        name: 'Project Alpha',
        folderId: 'folder-123',
        folderName: 'Work',
        position: 'beginning',
        beforeProject: 'project-before',
        afterProject: 'project-after',
        sequential: true,
        containsSingletonActions: false,
        note: 'Comprehensive project',
        status: 'Active',
        flagged: true,
        completedByChildren: true,
        defaultSingletonActionHolder: false,
        deferDate: '2025-01-15T09:00:00.000Z',
        dueDate: '2025-01-20T17:00:00.000Z',
        reviewInterval: { steps: 14, unit: 'days' },
        shouldUseFloatingTimeZone: false,
        estimatedMinutes: 120
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('CreateProjectResponseSchema', () => {
  describe('success response', () => {
    it('should accept success response with id and name', () => {
      const result = CreateProjectResponseSchema.safeParse({
        success: true,
        id: 'project-new-123',
        name: 'Project Alpha'
      });
      expect(result.success).toBe(true);
    });

    it('should reject response without success field', () => {
      const result = CreateProjectResponseSchema.safeParse({
        id: 'project-123',
        name: 'Project Alpha'
      });
      expect(result.success).toBe(false);
    });

    it('should reject response without id', () => {
      const result = CreateProjectResponseSchema.safeParse({
        success: true,
        name: 'Project Alpha'
      });
      expect(result.success).toBe(false);
    });

    it('should reject response without name', () => {
      const result = CreateProjectResponseSchema.safeParse({
        success: true,
        id: 'project-123'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('error response', () => {
    it('should accept standard error response (success: false)', () => {
      const result = CreateProjectResponseSchema.safeParse({
        success: false,
        error: 'Folder not found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error response', () => {
      const result = CreateProjectResponseSchema.safeParse({
        success: false,
        error: 'Multiple folders found',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['folder-1', 'folder-2']
      });
      expect(result.success).toBe(true);
    });

    it('should reject error response without error field', () => {
      const result = CreateProjectResponseSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });
  });
});
