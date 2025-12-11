import { describe, expect, it } from 'vitest';
import {
  AssignTagsErrorSchema,
  AssignTagsInputSchema,
  AssignTagsResponseSchema,
  AssignTagsSuccessSchema
} from '../../../src/contracts/tag-tools/assign-tags.js';

describe('AssignTagsInputSchema', () => {
  it('should accept valid input with taskIds and tagIds arrays', () => {
    const result = AssignTagsInputSchema.safeParse({
      taskIds: ['task-1', 'task-2'],
      tagIds: ['tag-1', 'tag-2']
    });
    expect(result.success).toBe(true);
  });

  it('should accept single task and single tag', () => {
    const result = AssignTagsInputSchema.safeParse({
      taskIds: ['task-1'],
      tagIds: ['tag-1']
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty taskIds array', () => {
    const result = AssignTagsInputSchema.safeParse({
      taskIds: [],
      tagIds: ['tag-1']
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty tagIds array', () => {
    const result = AssignTagsInputSchema.safeParse({
      taskIds: ['task-1'],
      tagIds: []
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing taskIds field', () => {
    const result = AssignTagsInputSchema.safeParse({
      tagIds: ['tag-1']
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing tagIds field', () => {
    const result = AssignTagsInputSchema.safeParse({
      taskIds: ['task-1']
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-array taskIds', () => {
    const result = AssignTagsInputSchema.safeParse({
      taskIds: 'task-1',
      tagIds: ['tag-1']
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-array tagIds', () => {
    const result = AssignTagsInputSchema.safeParse({
      taskIds: ['task-1'],
      tagIds: 'tag-1'
    });
    expect(result.success).toBe(false);
  });
});

describe('AssignTagsSuccessSchema', () => {
  it('should accept valid success response with batch results', () => {
    const result = AssignTagsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          taskId: 'task-1',
          taskName: 'Task One',
          success: true
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept multiple results with mixed success/failure', () => {
    const result = AssignTagsSuccessSchema.safeParse({
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
          error: 'Task not found'
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept result with disambiguation error', () => {
    const result = AssignTagsSuccessSchema.safeParse({
      success: true,
      results: [
        {
          taskId: 'ambiguous-task',
          taskName: '',
          success: false,
          error: 'Multiple tasks found',
          code: 'DISAMBIGUATION_REQUIRED',
          matchingIds: ['id1', 'id2']
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should reject success: false in success schema', () => {
    const result = AssignTagsSuccessSchema.safeParse({
      success: false,
      results: []
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing results array', () => {
    const result = AssignTagsSuccessSchema.safeParse({
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty results array', () => {
    const result = AssignTagsSuccessSchema.safeParse({
      success: true,
      results: []
    });
    expect(result.success).toBe(false);
  });
});

describe('AssignTagsErrorSchema', () => {
  it('should accept valid error response', () => {
    const result = AssignTagsErrorSchema.safeParse({
      success: false,
      error: 'All tags could not be resolved'
    });
    expect(result.success).toBe(true);
  });

  it('should reject success: true in error schema', () => {
    const result = AssignTagsErrorSchema.safeParse({
      success: true,
      error: 'Some error'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing error field', () => {
    const result = AssignTagsErrorSchema.safeParse({
      success: false
    });
    expect(result.success).toBe(false);
  });
});

describe('AssignTagsResponseSchema', () => {
  it('should accept success response', () => {
    const result = AssignTagsResponseSchema.safeParse({
      success: true,
      results: [
        {
          taskId: 'task-1',
          taskName: 'Task One',
          success: true
        }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = AssignTagsResponseSchema.safeParse({
      success: false,
      error: 'Tag resolution failed'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid response', () => {
    const result = AssignTagsResponseSchema.safeParse({
      invalid: 'data'
    });
    expect(result.success).toBe(false);
  });
});
