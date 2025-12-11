import { beforeEach, describe, expect, it, vi } from 'vitest';
import { removeTags } from '../../../src/tools/primitives/removeTags.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

// Mock executeOmniFocusScript
vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

describe('removeTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T083: Remove specific tags
  it('should remove specific tags from tasks', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        results: [
          {
            taskId: 'task1',
            taskName: 'Test Task 1',
            success: true
          },
          {
            taskId: 'task2',
            taskName: 'Test Task 2',
            success: true
          }
        ]
      })
    );

    const result = await removeTags({
      taskIds: ['task1', 'task2'],
      tagIds: ['tag1', 'tag2']
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results?.[0].success).toBe(true);
    expect(result.results?.[1].success).toBe(true);
  });

  // T084: clearAll mode (task.clearTags())
  it('should clear all tags when clearAll is true', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        results: [
          {
            taskId: 'task1',
            taskName: 'Test Task',
            success: true
          }
        ]
      })
    );

    const result = await removeTags({
      taskIds: ['task1'],
      clearAll: true
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results?.[0].success).toBe(true);

    // Verify executeOmniFocusScript was called
    expect(vi.mocked(executeOmniFocusScript)).toHaveBeenCalledTimes(1);
  });

  // T085: Per-item failures (continue on error)
  it('should continue processing on per-item failures', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        results: [
          {
            taskId: 'task1',
            taskName: 'Test Task 1',
            success: true
          },
          {
            taskId: 'task2',
            taskName: '',
            success: false,
            error: "Task 'task2' not found"
          },
          {
            taskId: 'task3',
            taskName: 'Test Task 3',
            success: true
          }
        ]
      })
    );

    const result = await removeTags({
      taskIds: ['task1', 'task2', 'task3'],
      tagIds: ['tag1']
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(result.results?.[0].success).toBe(true);
    expect(result.results?.[1].success).toBe(false);
    expect(result.results?.[1].error).toBe("Task 'task2' not found");
    expect(result.results?.[2].success).toBe(true);
  });

  // T086: Disambiguation errors
  it('should return disambiguation errors for ambiguous task names', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        results: [
          {
            taskId: 'ambiguous',
            taskName: '',
            success: false,
            code: 'DISAMBIGUATION_REQUIRED',
            matchingIds: ['id1', 'id2'],
            error: "Ambiguous task name 'Task'. Found 2 matches: id1, id2"
          }
        ]
      })
    );

    const result = await removeTags({
      taskIds: ['ambiguous'],
      tagIds: ['tag1']
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results?.[0].success).toBe(false);
    expect(result.results?.[0].code).toBe('DISAMBIGUATION_REQUIRED');
    expect(result.results?.[0].matchingIds).toEqual(['id1', 'id2']);
  });

  it('should return disambiguation errors for ambiguous tag names', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: false,
        error: "Ambiguous tag name 'Urgent'. Found 2 matches: tag1, tag2",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['tag1', 'tag2']
      })
    );

    const result = await removeTags({
      taskIds: ['task1'],
      tagIds: ['Urgent']
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Ambiguous tag name');
  });

  // T087: Idempotency (tag not assigned)
  it('should succeed silently when removing a tag that is not assigned (idempotent)', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        results: [
          {
            taskId: 'task1',
            taskName: 'Test Task',
            success: true
          }
        ]
      })
    );

    const result = await removeTags({
      taskIds: ['task1'],
      tagIds: ['tag1']
    });

    expect(result.success).toBe(true);
    expect(result.results?.[0].success).toBe(true);
    // No error should be present - removeTag is idempotent
    expect(result.results?.[0].error).toBeUndefined();
  });

  // T088: Error - clearAll + tagIds conflict (should be caught by schema, but test primitive behavior)
  it('should handle clearAll + tagIds conflict gracefully', async () => {
    // This should be caught by schema validation, but if it somehow reaches the primitive:
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: false,
        error: 'Cannot specify both clearAll and tagIds'
      })
    );

    const result = await removeTags({
      taskIds: ['task1'],
      tagIds: ['tag1'],
      clearAll: true
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot specify both');
  });

  it('should handle tag not found error', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: false,
        error: "Tag 'nonexistent' not found"
      })
    );

    const result = await removeTags({
      taskIds: ['task1'],
      tagIds: ['nonexistent']
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Tag 'nonexistent' not found");
  });

  it('should handle script execution errors', async () => {
    vi.mocked(executeOmniFocusScript).mockRejectedValue(new Error('Script execution failed'));

    await expect(
      removeTags({
        taskIds: ['task1'],
        tagIds: ['tag1']
      })
    ).rejects.toThrow('Script execution failed');
  });
});
