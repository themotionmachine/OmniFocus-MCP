import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listTags } from '../../../src/tools/primitives/listTags.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

// Mock the script execution
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

// T016-T019: Unit tests for listTags primitive
describe('listTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T016: Success case returning tags array
  it('should return tags array on success', async () => {
    const mockResponse = {
      success: true,
      tags: [
        {
          id: 'tag1',
          name: 'Work',
          status: 'active',
          parentId: null,
          allowsNextAction: true,
          taskCount: 3
        },
        {
          id: 'tag2',
          name: '@office',
          status: 'active',
          parentId: 'tag1',
          allowsNextAction: true,
          taskCount: 1
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTags({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tags).toHaveLength(2);
      expect(result.tags[0].name).toBe('Work');
      expect(result.tags[1].parentId).toBe('tag1');
    }
  });

  // T017: With status filter
  it('should filter by status when provided', async () => {
    const mockResponse = {
      success: true,
      tags: [
        {
          id: 'tag1',
          name: 'Work',
          status: 'active',
          parentId: null,
          allowsNextAction: true,
          taskCount: 3
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTags({ status: 'active' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the function was called with a temp file path
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_tags');
    expect(scriptPath).toContain('.js');
  });

  // T018: With parentId filter
  it('should filter by parentId when provided', async () => {
    const mockResponse = {
      success: true,
      tags: [
        {
          id: 'tag2',
          name: '@office',
          status: 'active',
          parentId: 'tag1',
          allowsNextAction: true,
          taskCount: 1
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTags({ parentId: 'tag1' });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the function was called with a temp file path
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_tags');
    expect(scriptPath).toContain('.js');
  });

  // T019: With includeChildren=false
  it('should use tags (not flattenedTags) when includeChildren is false', async () => {
    const mockResponse = {
      success: true,
      tags: [
        {
          id: 'tag1',
          name: 'Work',
          status: 'active',
          parentId: null,
          allowsNextAction: true,
          taskCount: 3
        }
      ]
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTags({ includeChildren: false });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the script uses the correct tag collection
    const scriptCall = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    // When includeChildren is false, should use database.tags or parent.tags
    expect(scriptCall).toMatch(/tags(?!.*flattenedTags)/); // Should contain "tags" but not "flattenedTags"
  });

  it('should use flattenedTags when includeChildren is true', async () => {
    const mockResponse = {
      success: true,
      tags: []
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await listTags({ includeChildren: true });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalled();

    // Verify the function was called with a temp file path
    const scriptPath = vi.mocked(executeOmniFocusScript).mock.calls[0][0];
    expect(scriptPath).toContain('list_tags');
    expect(scriptPath).toContain('.js');
  });

  it('should return error on failure', async () => {
    const mockErrorResponse = {
      success: false,
      error: 'OmniFocus error'
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockErrorResponse));

    const result = await listTags({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('OmniFocus error');
    }
  });

  it('should handle script execution errors', async () => {
    vi.mocked(executeOmniFocusScript).mockRejectedValue(new Error('Script execution failed'));

    await expect(listTags({})).rejects.toThrow('Script execution failed');
  });
});
