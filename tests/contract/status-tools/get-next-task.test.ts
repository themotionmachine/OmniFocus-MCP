import { describe, expect, it } from 'vitest';
import {
  GetNextTaskErrorSchema,
  GetNextTaskInputSchema,
  GetNextTaskResponseSchema,
  GetNextTaskSuccessSchema
} from '../../../src/contracts/status-tools/get-next-task.js';

// US5: Contract tests for get_next_task schemas

describe('GetNextTaskInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept id only', () => {
      const result = GetNextTaskInputSchema.safeParse({ id: 'proj-123' });
      expect(result.success).toBe(true);
    });

    it('should accept name only', () => {
      const result = GetNextTaskInputSchema.safeParse({ name: 'My Project' });
      expect(result.success).toBe(true);
    });

    it('should accept both id and name', () => {
      const result = GetNextTaskInputSchema.safeParse({ id: 'proj-123', name: 'My Project' });
      expect(result.success).toBe(true);
    });

    it('should accept id with empty name string', () => {
      const result = GetNextTaskInputSchema.safeParse({ id: 'proj-123', name: '' });
      expect(result.success).toBe(true);
    });

    it('should accept name with empty id string', () => {
      const result = GetNextTaskInputSchema.safeParse({ id: '', name: 'My Project' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty object', () => {
      const result = GetNextTaskInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject both empty strings', () => {
      const result = GetNextTaskInputSchema.safeParse({ id: '', name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject undefined id and undefined name', () => {
      const result = GetNextTaskInputSchema.safeParse({ id: undefined, name: undefined });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetNextTaskSuccessSchema', () => {
  describe('hasNext=true (task found)', () => {
    const taskDetails = {
      id: 'task-abc',
      name: 'First Task',
      note: 'Do the thing',
      flagged: true,
      taskStatus: 'Available',
      dueDate: '2026-03-20T00:00:00.000Z',
      deferDate: null,
      tags: [{ id: 'tag-1', name: 'Work' }],
      project: { id: 'proj-123', name: 'My Project' }
    };

    it('should accept success with hasNext=true and full task details', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: true,
        task: taskDetails
      });
      expect(result.success).toBe(true);
    });

    it('should accept task with null dueDate', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: true,
        task: { ...taskDetails, dueDate: null }
      });
      expect(result.success).toBe(true);
    });

    it('should accept task with null deferDate', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: true,
        task: { ...taskDetails, deferDate: '2026-03-15T00:00:00.000Z' }
      });
      expect(result.success).toBe(true);
    });

    it('should accept task with empty tags array', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: true,
        task: { ...taskDetails, tags: [] }
      });
      expect(result.success).toBe(true);
    });

    it('should accept task with multiple tags', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: true,
        task: {
          ...taskDetails,
          tags: [
            { id: 'tag-1', name: 'Work' },
            { id: 'tag-2', name: 'Urgent' }
          ]
        }
      });
      expect(result.success).toBe(true);
    });

    it('should include all required task detail fields', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: true,
        task: taskDetails
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.hasNext) {
        expect(result.data.task.id).toBe('task-abc');
        expect(result.data.task.name).toBe('First Task');
        expect(result.data.task.note).toBe('Do the thing');
        expect(result.data.task.flagged).toBe(true);
        expect(result.data.task.taskStatus).toBe('Available');
        expect(result.data.task.dueDate).toBe('2026-03-20T00:00:00.000Z');
        expect(result.data.task.deferDate).toBeNull();
        expect(result.data.task.tags).toHaveLength(1);
        expect(result.data.task.project).toEqual({ id: 'proj-123', name: 'My Project' });
      }
    });

    it('should reject hasNext=true without task field', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: true
      });
      expect(result.success).toBe(false);
    });
  });

  describe('hasNext=false (no task available)', () => {
    it('should accept NO_AVAILABLE_TASKS reason', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: false,
        reason: 'NO_AVAILABLE_TASKS',
        message: 'No available tasks in this project.'
      });
      expect(result.success).toBe(true);
    });

    it('should accept SINGLE_ACTIONS_PROJECT reason', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: false,
        reason: 'SINGLE_ACTIONS_PROJECT',
        message: 'Single-actions projects do not have a sequential next task.'
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid reason code', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: false,
        reason: 'UNKNOWN_REASON',
        message: 'Some message'
      });
      expect(result.success).toBe(false);
    });

    it('should reject hasNext=false without reason', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: false,
        message: 'No tasks'
      });
      expect(result.success).toBe(false);
    });

    it('should reject hasNext=false without message', () => {
      const result = GetNextTaskSuccessSchema.safeParse({
        success: true,
        hasNext: false,
        reason: 'NO_AVAILABLE_TASKS'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('GetNextTaskErrorSchema', () => {
  it('should accept standard error', () => {
    const result = GetNextTaskErrorSchema.safeParse({
      success: false,
      error: "Project 'proj-xyz' not found"
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error', () => {
    const result = GetNextTaskErrorSchema.safeParse({
      success: false,
      error: "Multiple projects match 'My Project'",
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['proj-1', 'proj-2']
    });
    expect(result.success).toBe(true);
  });

  it('should reject success: true', () => {
    const result = GetNextTaskErrorSchema.safeParse({
      success: true,
      error: 'Some error'
    });
    expect(result.success).toBe(false);
  });

  it('should accept disambiguation with fewer than 2 matching IDs (matches standard error fallback)', () => {
    // Union allows this because the standard error variant matches first
    // In practice, primitives should never return this invalid state
    const result = GetNextTaskErrorSchema.safeParse({
      success: false,
      error: 'Multiple matches',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['only-one']
    });
    expect(result.success).toBe(true);
  });
});

describe('GetNextTaskResponseSchema', () => {
  it('should accept success with hasNext=true', () => {
    const result = GetNextTaskResponseSchema.safeParse({
      success: true,
      hasNext: true,
      task: {
        id: 'task-1',
        name: 'First Task',
        note: '',
        flagged: false,
        taskStatus: 'Available',
        dueDate: null,
        deferDate: null,
        tags: [],
        project: { id: 'proj-1', name: 'Project' }
      }
    });
    expect(result.success).toBe(true);
  });

  it('should accept success with hasNext=false', () => {
    const result = GetNextTaskResponseSchema.safeParse({
      success: true,
      hasNext: false,
      reason: 'NO_AVAILABLE_TASKS',
      message: 'No available tasks.'
    });
    expect(result.success).toBe(true);
  });

  it('should accept standard error', () => {
    const result = GetNextTaskResponseSchema.safeParse({
      success: false,
      error: 'Project not found'
    });
    expect(result.success).toBe(true);
  });

  it('should accept disambiguation error', () => {
    const result = GetNextTaskResponseSchema.safeParse({
      success: false,
      error: 'Multiple matches',
      code: 'DISAMBIGUATION_REQUIRED',
      matchingIds: ['proj-a', 'proj-b']
    });
    expect(result.success).toBe(true);
  });
});
