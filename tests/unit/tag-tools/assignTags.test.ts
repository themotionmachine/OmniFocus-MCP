import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignTags } from '../../../src/tools/primitives/assignTags.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

describe('assignTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully assign tags to a task', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        results: [
          {
            taskId: 'task-123',
            taskName: 'My Task',
            success: true
          }
        ]
      })
    );

    const result = await assignTags({
      taskIds: ['task-123'],
      tagIds: ['tag-456']
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].taskId).toBe('task-123');
      expect(result.results[0].taskName).toBe('My Task');
      expect(result.results[0].success).toBe(true);
    }
  });

  it('should successfully assign multiple tags to multiple tasks', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        results: [
          {
            taskId: 'task-1',
            taskName: 'Task One',
            success: true
          },
          {
            taskId: 'task-2',
            taskName: 'Task Two',
            success: true
          }
        ]
      })
    );

    const result = await assignTags({
      taskIds: ['task-1', 'task-2'],
      tagIds: ['tag-1', 'tag-2', 'tag-3']
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    }
  });

  it('should continue on per-item failures and return partial results', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        results: [
          {
            taskId: 'task-1',
            taskName: 'Task One',
            success: true
          },
          {
            taskId: 'task-2',
            taskName: '',
            success: false,
            error: "Task 'task-2' not found"
          },
          {
            taskId: 'task-3',
            taskName: 'Task Three',
            success: true
          }
        ]
      })
    );

    const result = await assignTags({
      taskIds: ['task-1', 'task-2', 'task-3'],
      tagIds: ['tag-1']
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(3);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe("Task 'task-2' not found");
      expect(result.results[2].success).toBe(true);
    }
  });

  it('should return disambiguation errors when multiple matches found', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        results: [
          {
            taskId: 'Ambiguous',
            taskName: '',
            success: false,
            error: "Multiple tasks named 'Ambiguous' found",
            code: 'DISAMBIGUATION_REQUIRED',
            matchingIds: ['id1', 'id2', 'id3']
          }
        ]
      })
    );

    const result = await assignTags({
      taskIds: ['Ambiguous'],
      tagIds: ['tag-1']
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.results[0].matchingIds).toEqual(['id1', 'id2', 'id3']);
    }
  });

  it('should be idempotent when tag is already assigned', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: true,
        results: [
          {
            taskId: 'task-123',
            taskName: 'My Task',
            success: true
          }
        ]
      })
    );

    // Assign tag first time
    const result1 = await assignTags({
      taskIds: ['task-123'],
      tagIds: ['tag-456']
    });

    expect(result1.success).toBe(true);

    // Assign same tag again - should succeed (idempotent)
    const result2 = await assignTags({
      taskIds: ['task-123'],
      tagIds: ['tag-456']
    });

    expect(result2.success).toBe(true);
    if (result2.success) {
      expect(result2.results[0].success).toBe(true);
    }
  });

  it('should return error when tag resolution fails for all tags', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({
        success: false,
        error: 'No valid tags could be resolved'
      })
    );

    const result = await assignTags({
      taskIds: ['task-1'],
      tagIds: ['nonexistent-tag']
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('No valid tags could be resolved');
    }
  });

  it('should handle script execution errors', async () => {
    vi.mocked(executeOmniFocusScript).mockRejectedValue(new Error('Script execution failed'));

    await expect(
      assignTags({
        taskIds: ['task-1'],
        tagIds: ['tag-1']
      })
    ).rejects.toThrow('Script execution failed');
  });
});
