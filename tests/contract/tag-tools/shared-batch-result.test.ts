import { describe, expect, it } from 'vitest';
import { BatchItemResultSchema } from '../../../src/contracts/tag-tools/shared/batch-result.js';

describe('BatchItemResultSchema', () => {
  describe('success cases', () => {
    it('should accept successful result with minimal fields', () => {
      const validResult = {
        taskId: 'task-123',
        taskName: 'My Task',
        success: true
      };
      const result = BatchItemResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should accept successful result without optional fields', () => {
      const validResult = {
        taskId: 'task-456',
        taskName: 'Another Task',
        success: true
      };
      const result = BatchItemResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.error).toBeUndefined();
        expect(result.data.code).toBeUndefined();
        expect(result.data.matchingIds).toBeUndefined();
      }
    });
  });

  describe('failure cases', () => {
    it('should accept failed result with error message', () => {
      const validResult = {
        taskId: 'task-123',
        taskName: '',
        success: false,
        error: "Task 'task-123' not found"
      };
      const result = BatchItemResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should accept failed result with empty taskName', () => {
      const validResult = {
        taskId: 'unknown-id',
        taskName: '',
        success: false,
        error: "Task 'unknown-id' not found"
      };
      const result = BatchItemResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });
  });

  describe('disambiguation cases', () => {
    it('should accept disambiguation error with code and matchingIds', () => {
      const validResult = {
        taskId: 'MyTask',
        taskName: '',
        success: false,
        error: "Ambiguous task name 'MyTask'. Found 3 matches.",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['task-1', 'task-2', 'task-3']
      };
      const result = BatchItemResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation with only matchingIds (tag disambiguation)', () => {
      const validResult = {
        taskId: 'task-123',
        taskName: 'My Task',
        success: false,
        error: "Ambiguous tag name 'Work'. Found 2 matches.",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['tag-1', 'tag-2']
      };
      const result = BatchItemResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });
  });

  describe('validation', () => {
    it('should reject missing required fields', () => {
      const result = BatchItemResultSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject missing taskId', () => {
      const result = BatchItemResultSchema.safeParse({
        taskName: 'My Task',
        success: true
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing taskName', () => {
      const result = BatchItemResultSchema.safeParse({
        taskId: 'task-123',
        success: true
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing success', () => {
      const result = BatchItemResultSchema.safeParse({
        taskId: 'task-123',
        taskName: 'My Task'
      });
      expect(result.success).toBe(false);
    });
  });
});
