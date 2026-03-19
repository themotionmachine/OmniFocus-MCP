import { describe, expect, it } from 'vitest';
import {
  DisambiguationCandidateSchema,
  WindowBatchItemResultSchema,
  WindowBatchSummarySchema,
  WindowItemIdentifierSchema,
  WindowItemTypeSchema
} from '../../../src/contracts/window-tools/shared/index.js';

// T014: Contract tests for shared window-tools schemas

describe('WindowItemIdentifierSchema', () => {
  it('should accept id only', () => {
    const result = WindowItemIdentifierSchema.safeParse({ id: 'task-123' });
    expect(result.success).toBe(true);
  });

  it('should accept name only', () => {
    const result = WindowItemIdentifierSchema.safeParse({ name: 'My Task' });
    expect(result.success).toBe(true);
  });

  it('should accept both id and name', () => {
    const result = WindowItemIdentifierSchema.safeParse({ id: 'task-123', name: 'My Task' });
    expect(result.success).toBe(true);
  });

  it('should reject empty object (neither id nor name)', () => {
    const result = WindowItemIdentifierSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject empty id and empty name', () => {
    const result = WindowItemIdentifierSchema.safeParse({ id: '', name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject empty id with no name', () => {
    const result = WindowItemIdentifierSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('should reject empty name with no id', () => {
    const result = WindowItemIdentifierSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should accept non-empty id with empty name', () => {
    const result = WindowItemIdentifierSchema.safeParse({ id: 'task-123', name: '' });
    expect(result.success).toBe(true);
  });
});

describe('WindowItemTypeSchema', () => {
  it('should accept "task"', () => {
    expect(WindowItemTypeSchema.safeParse('task').success).toBe(true);
  });

  it('should accept "project"', () => {
    expect(WindowItemTypeSchema.safeParse('project').success).toBe(true);
  });

  it('should accept "folder"', () => {
    expect(WindowItemTypeSchema.safeParse('folder').success).toBe(true);
  });

  it('should accept "tag"', () => {
    expect(WindowItemTypeSchema.safeParse('tag').success).toBe(true);
  });

  it('should reject invalid type', () => {
    expect(WindowItemTypeSchema.safeParse('perspective').success).toBe(false);
  });

  it('should reject empty string', () => {
    expect(WindowItemTypeSchema.safeParse('').success).toBe(false);
  });
});

describe('DisambiguationCandidateSchema', () => {
  it('should accept valid candidate', () => {
    const result = DisambiguationCandidateSchema.safeParse({
      id: 'task-123',
      name: 'My Task',
      type: 'task'
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing id', () => {
    const result = DisambiguationCandidateSchema.safeParse({
      name: 'My Task',
      type: 'task'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing name', () => {
    const result = DisambiguationCandidateSchema.safeParse({
      id: 'task-123',
      type: 'task'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing type', () => {
    const result = DisambiguationCandidateSchema.safeParse({
      id: 'task-123',
      name: 'My Task'
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid type', () => {
    const result = DisambiguationCandidateSchema.safeParse({
      id: 'task-123',
      name: 'My Task',
      type: 'invalid'
    });
    expect(result.success).toBe(false);
  });
});

describe('WindowBatchItemResultSchema', () => {
  it('should accept success result without code', () => {
    const result = WindowBatchItemResultSchema.safeParse({
      itemId: 'task-123',
      itemName: 'My Task',
      itemType: 'task',
      success: true
    });
    expect(result.success).toBe(true);
  });

  it('should accept success result with no-op code ALREADY_EXPANDED', () => {
    const result = WindowBatchItemResultSchema.safeParse({
      itemId: 'task-123',
      itemName: 'My Task',
      itemType: 'task',
      success: true,
      code: 'ALREADY_EXPANDED'
    });
    expect(result.success).toBe(true);
  });

  it('should accept success result with no-op code ALREADY_COLLAPSED', () => {
    const result = WindowBatchItemResultSchema.safeParse({
      itemId: 'task-123',
      itemName: 'My Task',
      itemType: 'task',
      success: true,
      code: 'ALREADY_COLLAPSED'
    });
    expect(result.success).toBe(true);
  });

  it('should accept success result with no-op code NO_NOTE', () => {
    const result = WindowBatchItemResultSchema.safeParse({
      itemId: 'task-123',
      itemName: 'My Task',
      itemType: 'task',
      success: true,
      code: 'NO_NOTE'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error result with NOT_FOUND code', () => {
    const result = WindowBatchItemResultSchema.safeParse({
      itemId: 'bad-id',
      itemName: '',
      itemType: 'task',
      success: false,
      error: 'Item not found',
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error result with NODE_NOT_FOUND code', () => {
    const result = WindowBatchItemResultSchema.safeParse({
      itemId: 'task-123',
      itemName: 'My Task',
      itemType: 'task',
      success: false,
      error: 'Item exists but is not visible in the current perspective',
      code: 'NODE_NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });

  it('should accept error result with DISAMBIGUATION_REQUIRED and candidates', () => {
    const result = WindowBatchItemResultSchema.safeParse({
      itemId: '',
      itemName: 'Review',
      itemType: 'task',
      success: false,
      error: 'Multiple items match this name',
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { id: 'task-1', name: 'Review', type: 'task' },
        { id: 'proj-1', name: 'Review', type: 'project' }
      ]
    });
    expect(result.success).toBe(true);
  });

  it('should accept error result with INVALID_TYPE code', () => {
    const result = WindowBatchItemResultSchema.safeParse({
      itemId: 'task-123',
      itemName: 'My Task',
      itemType: 'task',
      success: false,
      error: 'Tasks cannot be focused. Only projects and folders are valid focus targets.',
      code: 'INVALID_TYPE'
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing itemId', () => {
    const result = WindowBatchItemResultSchema.safeParse({
      itemName: 'My Task',
      itemType: 'task',
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing itemType', () => {
    const result = WindowBatchItemResultSchema.safeParse({
      itemId: 'task-123',
      itemName: 'My Task',
      success: true
    });
    expect(result.success).toBe(false);
  });

  it('should accept all 4 item types', () => {
    for (const type of ['task', 'project', 'folder', 'tag']) {
      const result = WindowBatchItemResultSchema.safeParse({
        itemId: 'id-1',
        itemName: 'Item',
        itemType: type,
        success: true
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('WindowBatchSummarySchema', () => {
  it('should accept valid summary', () => {
    const result = WindowBatchSummarySchema.safeParse({
      total: 5,
      succeeded: 3,
      failed: 2
    });
    expect(result.success).toBe(true);
  });

  it('should accept all succeeded', () => {
    const result = WindowBatchSummarySchema.safeParse({
      total: 3,
      succeeded: 3,
      failed: 0
    });
    expect(result.success).toBe(true);
  });

  it('should accept all failed', () => {
    const result = WindowBatchSummarySchema.safeParse({
      total: 3,
      succeeded: 0,
      failed: 3
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative total', () => {
    const result = WindowBatchSummarySchema.safeParse({
      total: -1,
      succeeded: 0,
      failed: 0
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing total', () => {
    const result = WindowBatchSummarySchema.safeParse({
      succeeded: 0,
      failed: 0
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer values', () => {
    const result = WindowBatchSummarySchema.safeParse({
      total: 1.5,
      succeeded: 1,
      failed: 0
    });
    expect(result.success).toBe(false);
  });
});
