import { beforeEach, describe, expect, it, vi } from 'vitest';
import { editTag } from '../../../src/tools/primitives/editTag.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

describe('editTag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('T042: Edit by ID', () => {
    it('should edit tag by id successfully', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'tag-123', name: 'Updated Name' })
      );
      const result = await editTag({ id: 'tag-123', newName: 'Updated Name' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('tag-123');
        expect(result.name).toBe('Updated Name');
      }
    });

    it('should return error when tag not found by id', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: false, error: "Tag 'tag-999' not found" })
      );
      const result = await editTag({ id: 'tag-999', newName: 'New Name' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('T043: Edit by name (with disambiguation)', () => {
    it('should edit tag by name when single match', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'tag-123', name: 'Work' })
      );
      const result = await editTag({ name: 'Work', status: 'active' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('tag-123');
      }
    });

    it('should return disambiguation error when multiple matches by name', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: false,
          error: "Ambiguous tag name 'Work'. Found 2 matches.",
          code: 'DISAMBIGUATION_REQUIRED',
          matchingIds: ['tag-123', 'tag-456']
        })
      );
      const result = await editTag({ name: 'Work', status: 'active' });
      expect(result.success).toBe(false);
      if (!result.success && 'code' in result) {
        expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.matchingIds).toHaveLength(2);
      }
    });

    it('should return error when tag not found by name', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: false, error: "Tag 'NonExistent' not found" })
      );
      const result = await editTag({ name: 'NonExistent', status: 'active' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('T044: Update name (newName)', () => {
    it('should update tag name', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'tag-123', name: 'New Name' })
      );
      const result = await editTag({ id: 'tag-123', newName: 'New Name' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('New Name');
      }
    });

    it('should allow empty newName', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'tag-123', name: '' })
      );
      const result = await editTag({ id: 'tag-123', newName: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('');
      }
    });
  });

  describe('T045: Update status', () => {
    it('should update tag status to active', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'tag-123', name: 'Work' })
      );
      const result = await editTag({ id: 'tag-123', status: 'active' });
      expect(result.success).toBe(true);
    });

    it('should update tag status to onHold', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'tag-123', name: 'Work' })
      );
      const result = await editTag({ id: 'tag-123', status: 'onHold' });
      expect(result.success).toBe(true);
    });

    it('should update tag status to dropped', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'tag-123', name: 'Work' })
      );
      const result = await editTag({ id: 'tag-123', status: 'dropped' });
      expect(result.success).toBe(true);
    });
  });

  describe('T046: Update allowsNextAction', () => {
    it('should update allowsNextAction to true', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'tag-123', name: 'Work' })
      );
      const result = await editTag({ id: 'tag-123', allowsNextAction: true });
      expect(result.success).toBe(true);
    });

    it('should update allowsNextAction to false', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'tag-123', name: 'Work' })
      );
      const result = await editTag({ id: 'tag-123', allowsNextAction: false });
      expect(result.success).toBe(true);
    });
  });

  describe('Combined updates', () => {
    it('should update multiple properties at once', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'tag-123', name: 'New Name' })
      );
      const result = await editTag({
        id: 'tag-123',
        newName: 'New Name',
        status: 'active',
        allowsNextAction: true
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('New Name');
      }
    });
  });

  describe('T113: Root Tags container edge case', () => {
    it('should return error when trying to edit the root Tags container by name', async () => {
      // The root "Tags" container is not a Tag object - it's the container for all tags.
      // If someone tries to lookup "Tags" by name, it should return "not found"
      // (unless they happen to have a user-created tag named "Tags")
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: false,
          error: "Tag 'Tags' not found"
        })
      );
      const result = await editTag({ name: 'Tags', status: 'dropped' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should return error when trying to edit a non-existent tag container ID', async () => {
      // The root Tags container has no ID that can be passed to Tag.byIdentifier
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: false,
          error: 'Tag not found'
        })
      );
      const result = await editTag({ id: 'root-tags-container', newName: 'Renamed' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });
});
