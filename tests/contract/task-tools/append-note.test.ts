import { describe, expect, it } from 'vitest';
import {
  AppendNoteErrorSchema,
  AppendNoteInputSchema,
  AppendNoteResponseSchema,
  AppendNoteSuccessSchema
} from '../../../src/contracts/task-tools/index.js';

describe('AppendNoteInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept id only', () => {
      const result = AppendNoteInputSchema.safeParse({
        id: 'task123',
        text: 'Note text'
      });
      expect(result.success).toBe(true);
    });

    it('should accept name only', () => {
      const result = AppendNoteInputSchema.safeParse({
        name: 'Task Name',
        text: 'Note text'
      });
      expect(result.success).toBe(true);
    });

    it('should accept both id and name (id takes precedence)', () => {
      const result = AppendNoteInputSchema.safeParse({
        id: 'task123',
        name: 'Task Name',
        text: 'Note text'
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty string for text', () => {
      const result = AppendNoteInputSchema.safeParse({
        id: 'task123',
        text: ''
      });
      expect(result.success).toBe(true);
    });

    it('should accept multiline text', () => {
      const result = AppendNoteInputSchema.safeParse({
        id: 'task123',
        text: 'Line 1\nLine 2\nLine 3'
      });
      expect(result.success).toBe(true);
    });

    it('should accept text with special characters', () => {
      const result = AppendNoteInputSchema.safeParse({
        id: 'task123',
        text: 'Note with "quotes" and \'apostrophes\' and $pecial ch@rs!'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required field validation', () => {
    it('should reject missing both id and name', () => {
      const result = AppendNoteInputSchema.safeParse({
        text: 'Note text'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing text field', () => {
      const result = AppendNoteInputSchema.safeParse({
        id: 'task123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject undefined id and name', () => {
      const result = AppendNoteInputSchema.safeParse({
        id: undefined,
        name: undefined,
        text: 'Note text'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject non-string id', () => {
      const result = AppendNoteInputSchema.safeParse({
        id: 123,
        text: 'Note text'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string name', () => {
      const result = AppendNoteInputSchema.safeParse({
        name: 123,
        text: 'Note text'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string text', () => {
      const result = AppendNoteInputSchema.safeParse({
        id: 'task123',
        text: 123
      });
      expect(result.success).toBe(false);
    });

    it('should reject null text', () => {
      const result = AppendNoteInputSchema.safeParse({
        id: 'task123',
        text: null
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('AppendNoteSuccessSchema', () => {
  describe('valid success responses', () => {
    it('should accept valid success response', () => {
      const result = AppendNoteSuccessSchema.safeParse({
        success: true,
        id: 'task123',
        name: 'Task Name'
      });
      expect(result.success).toBe(true);
    });

    it('should accept success with empty name', () => {
      const result = AppendNoteSuccessSchema.safeParse({
        success: true,
        id: 'task123',
        name: ''
      });
      expect(result.success).toBe(true);
    });

    it('should accept success with special characters in name', () => {
      const result = AppendNoteSuccessSchema.safeParse({
        success: true,
        id: 'task123',
        name: 'Task: Work / Personal (2024)'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing success field', () => {
      const result = AppendNoteSuccessSchema.safeParse({
        id: 'task123',
        name: 'Task Name'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id field', () => {
      const result = AppendNoteSuccessSchema.safeParse({
        success: true,
        name: 'Task Name'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name field', () => {
      const result = AppendNoteSuccessSchema.safeParse({
        success: true,
        id: 'task123'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('literal field validation', () => {
    it('should reject success: false', () => {
      const result = AppendNoteSuccessSchema.safeParse({
        success: false,
        id: 'task123',
        name: 'Task Name'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean success', () => {
      const result = AppendNoteSuccessSchema.safeParse({
        success: 'true',
        id: 'task123',
        name: 'Task Name'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject non-string id', () => {
      const result = AppendNoteSuccessSchema.safeParse({
        success: true,
        id: 123,
        name: 'Task Name'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string name', () => {
      const result = AppendNoteSuccessSchema.safeParse({
        success: true,
        id: 'task123',
        name: 123
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('AppendNoteErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept valid error response', () => {
      const result = AppendNoteErrorSchema.safeParse({
        success: false,
        error: 'Task not found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept error with detailed message', () => {
      const result = AppendNoteErrorSchema.safeParse({
        success: false,
        error: 'Task "abc123" not found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept error with empty string', () => {
      const result = AppendNoteErrorSchema.safeParse({
        success: false,
        error: ''
      });
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing success field', () => {
      const result = AppendNoteErrorSchema.safeParse({
        error: 'Task not found'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing error field', () => {
      const result = AppendNoteErrorSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });
  });

  describe('literal field validation', () => {
    it('should reject success: true', () => {
      const result = AppendNoteErrorSchema.safeParse({
        success: true,
        error: 'Task not found'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean success', () => {
      const result = AppendNoteErrorSchema.safeParse({
        success: 'false',
        error: 'Task not found'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject non-string error', () => {
      const result = AppendNoteErrorSchema.safeParse({
        success: false,
        error: 123
      });
      expect(result.success).toBe(false);
    });

    it('should reject null error', () => {
      const result = AppendNoteErrorSchema.safeParse({
        success: false,
        error: null
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('AppendNoteResponseSchema', () => {
  describe('union type validation', () => {
    it('should accept success response', () => {
      const result = AppendNoteResponseSchema.safeParse({
        success: true,
        id: 'task123',
        name: 'Task Name'
      });
      expect(result.success).toBe(true);
    });

    it('should accept error response', () => {
      const result = AppendNoteResponseSchema.safeParse({
        success: false,
        error: 'Task not found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation error response', () => {
      const result = AppendNoteResponseSchema.safeParse({
        success: false,
        error: 'Multiple tasks found with name "Task"',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2']
      });
      expect(result.success).toBe(true);
    });

    it('should accept disambiguation with 3+ matching IDs', () => {
      const result = AppendNoteResponseSchema.safeParse({
        success: false,
        error: 'Multiple tasks found',
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ['id1', 'id2', 'id3', 'id4']
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid responses', () => {
    it('should reject response with no matching schema', () => {
      const result = AppendNoteResponseSchema.safeParse({
        success: true,
        data: 'some data'
      });
      expect(result.success).toBe(false);
    });

    it('should reject success response missing id', () => {
      const result = AppendNoteResponseSchema.safeParse({
        success: true,
        name: 'Task Name'
      });
      expect(result.success).toBe(false);
    });

    it('should reject success response missing name', () => {
      const result = AppendNoteResponseSchema.safeParse({
        success: true,
        id: 'task123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject error response missing error field', () => {
      const result = AppendNoteResponseSchema.safeParse({
        success: false
      });
      expect(result.success).toBe(false);
    });
  });
});
