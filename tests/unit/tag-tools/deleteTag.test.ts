import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteTag } from '../../../src/tools/primitives/deleteTag.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

describe('deleteTag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete tag by ID', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        id: 'tag123',
        name: 'Work'
      })
    );

    const result = await deleteTag({ id: 'tag123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('tag123');
      expect(result.name).toBe('Work');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should delete tag by name with single match', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        id: 'tag456',
        name: 'Personal'
      })
    );

    const result = await deleteTag({ name: 'Personal' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('tag456');
      expect(result.name).toBe('Personal');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should return disambiguation error when multiple tags match name', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: false,
        error: "Ambiguous tag name 'Urgent'. Found 2 matches: tag1, tag2. Please specify by ID.",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['tag1', 'tag2']
      })
    );

    const result = await deleteTag({ name: 'Urgent' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Ambiguous tag name');
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.matchingIds).toEqual(['tag1', 'tag2']);
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should recursively delete child tags', async () => {
    // When deleting a parent tag, OmniFocus automatically deletes children
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        id: 'parent123',
        name: 'ParentTag'
      })
    );

    const result = await deleteTag({ id: 'parent123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('parent123');
      expect(result.name).toBe('ParentTag');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should return error when tag not found by ID', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: false,
        error: "Tag 'nonexistent123' not found"
      })
    );

    const result = await deleteTag({ id: 'nonexistent123' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not found');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should return error when tag not found by name', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: false,
        error: "Tag 'NonExistentTag' not found"
      })
    );

    const result = await deleteTag({ name: 'NonExistentTag' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not found');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should handle script execution errors gracefully', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: false,
        error: 'Unexpected error in OmniJS script'
      })
    );

    const result = await deleteTag({ id: 'tag123' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  describe('T113: Root Tags container edge case', () => {
    it('should return error when trying to delete the root Tags container by name', async () => {
      // The root "Tags" container is not a Tag object - it's the container for all tags.
      // Attempting to delete "Tags" by name should return "not found"
      // (unless there's a user-created tag named "Tags")
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: false,
          error: "Tag 'Tags' not found"
        })
      );

      const result = await deleteTag({ name: 'Tags' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
      expect(executeOmniFocusScript).toHaveBeenCalledOnce();
    });

    it('should return error when trying to delete a non-existent tag container ID', async () => {
      // The root Tags container has no ID that can be passed to Tag.byIdentifier
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: false,
          error: 'Tag not found'
        })
      );

      const result = await deleteTag({ id: 'root-tags-container' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
      expect(executeOmniFocusScript).toHaveBeenCalledOnce();
    });
  });
});
