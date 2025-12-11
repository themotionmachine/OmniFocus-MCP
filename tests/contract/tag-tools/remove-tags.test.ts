import { describe, expect, it } from 'vitest';
import {
  RemoveTagsErrorSchema,
  RemoveTagsInputSchema,
  RemoveTagsResponseSchema,
  RemoveTagsSuccessSchema
} from '../../../src/contracts/tag-tools/remove-tags.js';

// T081: Input schema with refine (taskIds required, clearAll OR tagIds required, mutual exclusivity)
describe('RemoveTagsInputSchema', () => {
  it('should accept valid input with tagIds', () => {
    const result = RemoveTagsInputSchema.safeParse({
      taskIds: ['task1', 'task2'],
      tagIds: ['tag1', 'tag2']
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid input with clearAll', () => {
    const result = RemoveTagsInputSchema.safeParse({
      taskIds: ['task1', 'task2'],
      clearAll: true
    });
    expect(result.success).toBe(true);
  });

  it('should accept tagIds with clearAll false explicitly', () => {
    const result = RemoveTagsInputSchema.safeParse({
      taskIds: ['task1'],
      tagIds: ['tag1'],
      clearAll: false
    });
    expect(result.success).toBe(true);
  });

  it('should reject when both clearAll and tagIds are provided', () => {
    const result = RemoveTagsInputSchema.safeParse({
      taskIds: ['task1'],
      tagIds: ['tag1'],
      clearAll: true
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].message).toContain('Cannot specify both');
    }
  });

  it('should reject when neither clearAll nor tagIds are provided', () => {
    const result = RemoveTagsInputSchema.safeParse({
      taskIds: ['task1']
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].message).toContain('either');
    }
  });

  it('should reject when clearAll is false but no tagIds', () => {
    const result = RemoveTagsInputSchema.safeParse({
      taskIds: ['task1'],
      clearAll: false
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].message).toContain('either');
    }
  });

  it('should require taskIds', () => {
    const result = RemoveTagsInputSchema.safeParse({
      tagIds: ['tag1']
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty taskIds array', () => {
    const result = RemoveTagsInputSchema.safeParse({
      taskIds: [],
      tagIds: ['tag1']
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty tagIds array when provided', () => {
    const result = RemoveTagsInputSchema.safeParse({
      taskIds: ['task1'],
      tagIds: []
    });
    expect(result.success).toBe(false);
  });

  it('should default clearAll to false when not provided', () => {
    const result = RemoveTagsInputSchema.safeParse({
      taskIds: ['task1'],
      tagIds: ['tag1']
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clearAll).toBe(false);
    }
  });
});

// T082: Response schema with batch results
describe('RemoveTagsResponseSchema', () => {
  it('should accept success response with results', () => {
    const result = RemoveTagsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          taskId: 'task1',
          taskName: 'Test Task',
          success: true
        },
        {
          taskId: 'task2',
          taskName: 'Another Task',
          success: true
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with per-item failures', () => {
    const result = RemoveTagsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          taskId: 'task1',
          taskName: 'Test Task',
          success: true
        },
        {
          taskId: 'task2',
          taskName: '',
          success: false,
          error: "Task 'task2' not found"
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with disambiguation error', () => {
    const result = RemoveTagsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          taskId: 'task1',
          taskName: '',
          success: false,
          code: 'DISAMBIGUATION_REQUIRED',
          matchingIds: ['id1', 'id2'],
          error: "Ambiguous task name 'Task'. Found 2 matches: id1, id2"
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = RemoveTagsErrorSchema.safeParse({
      success: false,
      error: "Tag 'tag1' not found"
    });
    expect(result.success).toBe(true);
  });

  it('should accept discriminated union', () => {
    const successResult = RemoveTagsResponseSchema.safeParse({
      success: true,
      results: []
    });
    expect(successResult.success).toBe(true);

    const errorResult = RemoveTagsResponseSchema.safeParse({
      success: false,
      error: 'Something went wrong'
    });
    expect(errorResult.success).toBe(true);
  });

  it('should reject success response without results', () => {
    const result = RemoveTagsSuccessSchema.safeParse({
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject error response without error message', () => {
    const result = RemoveTagsErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});
