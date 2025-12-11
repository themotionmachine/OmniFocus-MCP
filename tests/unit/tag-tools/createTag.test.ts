import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTag } from '../../../src/tools/primitives/createTag.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

describe('createTag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('T029: Success case creating tag', () => {
    it('should create a tag with minimal parameters', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: true,
          id: 'tag-new-123',
          name: 'Work'
        })
      );

      const result = await createTag({ name: 'Work' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('tag-new-123');
        expect(result.name).toBe('Work');
      }
      expect(executeOmniFocusScript).toHaveBeenCalledOnce();
    });

    it('should create a tag with allowsNextAction set to false', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: true,
          id: 'tag-new-456',
          name: 'Waiting'
        })
      );

      const result = await createTag({
        name: 'Waiting',
        allowsNextAction: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('tag-new-456');
        expect(result.name).toBe('Waiting');
      }
    });
  });

  describe('T030: With position placement', () => {
    it('should create a tag with before position', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: true,
          id: 'tag-new-before',
          name: 'High Priority'
        })
      );

      const result = await createTag({
        name: 'High Priority',
        position: { placement: 'before', relativeTo: 'tag-ref-123' }
      });

      expect(result.success).toBe(true);
      expect(executeOmniFocusScript).toHaveBeenCalledOnce();
    });

    it('should create a tag with after position', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: true,
          id: 'tag-new-after',
          name: 'Low Priority'
        })
      );

      const result = await createTag({
        name: 'Low Priority',
        position: { placement: 'after', relativeTo: 'tag-ref-456' }
      });

      expect(result.success).toBe(true);
      expect(executeOmniFocusScript).toHaveBeenCalledOnce();
    });

    it('should create a tag with beginning position', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: true,
          id: 'tag-new-beginning',
          name: 'First'
        })
      );

      const result = await createTag({
        name: 'First',
        position: { placement: 'beginning' }
      });

      expect(result.success).toBe(true);
      expect(executeOmniFocusScript).toHaveBeenCalledOnce();
    });

    it('should create a tag with ending position', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: true,
          id: 'tag-new-ending',
          name: 'Last'
        })
      );

      const result = await createTag({
        name: 'Last',
        position: { placement: 'ending' }
      });

      expect(result.success).toBe(true);
      expect(executeOmniFocusScript).toHaveBeenCalledOnce();
    });
  });

  describe('T031: With parentId (nested tag)', () => {
    it('should create a nested tag with parentId', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: true,
          id: 'tag-child-123',
          name: 'Office'
        })
      );

      const result = await createTag({
        name: 'Office',
        parentId: 'tag-parent-123'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('tag-child-123');
        expect(result.name).toBe('Office');
      }
      expect(executeOmniFocusScript).toHaveBeenCalledOnce();
    });
  });

  describe('T032: Error - invalid parentId', () => {
    it('should return error for invalid parentId', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: false,
          error: "Parent tag 'tag-invalid' not found"
        })
      );

      const result = await createTag({
        name: 'Child Tag',
        parentId: 'tag-invalid'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Parent tag');
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('T032b: Error - invalid relativeTo', () => {
    it('should return error for invalid relativeTo in position', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: false,
          error: "Reference tag 'tag-invalid' not found"
        })
      );

      const result = await createTag({
        name: 'New Tag',
        position: { placement: 'before', relativeTo: 'tag-invalid' }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Reference tag');
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('T032c: With parentId AND position combination', () => {
    it('should create tag with both parentId and position (beginning of parent)', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: true,
          id: 'tag-combo-123',
          name: 'First Child'
        })
      );

      const result = await createTag({
        name: 'First Child',
        parentId: 'tag-parent-789',
        position: { placement: 'beginning', relativeTo: 'tag-parent-789' }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('tag-combo-123');
        expect(result.name).toBe('First Child');
      }
      expect(executeOmniFocusScript).toHaveBeenCalledOnce();
    });

    it('should create tag with parentId and position (after sibling)', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: true,
          id: 'tag-combo-456',
          name: 'Second Child'
        })
      );

      const result = await createTag({
        name: 'Second Child',
        parentId: 'tag-parent-789',
        position: { placement: 'after', relativeTo: 'tag-sibling-123' }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('tag-combo-456');
        expect(result.name).toBe('Second Child');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle OmniFocus script execution errors', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: false,
          error: 'OmniFocus error: Unable to create tag'
        })
      );

      const result = await createTag({ name: 'Test' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should handle special characters in tag name', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: true,
          id: 'tag-special',
          name: 'Tag with "quotes" and \\backslash'
        })
      );

      const result = await createTag({
        name: 'Tag with "quotes" and \\backslash'
      });

      expect(result.success).toBe(true);
      expect(executeOmniFocusScript).toHaveBeenCalledOnce();
    });
  });
});
