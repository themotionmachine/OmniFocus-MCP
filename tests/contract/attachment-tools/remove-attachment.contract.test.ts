import { describe, expect, it } from 'vitest';
import {
  RemoveAttachmentErrorSchema,
  RemoveAttachmentInputSchema,
  RemoveAttachmentResponseSchema,
  RemoveAttachmentSuccessSchema
} from '../../../src/contracts/attachment-tools/remove-attachment.js';

// T022: Contract tests for remove-attachment schemas

describe('RemoveAttachmentInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid id and index 0', () => {
      const result = RemoveAttachmentInputSchema.safeParse({ id: 'task123', index: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept index 1', () => {
      const result = RemoveAttachmentInputSchema.safeParse({ id: 'task123', index: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept large index', () => {
      const result = RemoveAttachmentInputSchema.safeParse({ id: 'task123', index: 99 });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty id', () => {
      const result = RemoveAttachmentInputSchema.safeParse({ id: '', index: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = RemoveAttachmentInputSchema.safeParse({ index: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative index', () => {
      const result = RemoveAttachmentInputSchema.safeParse({ id: 'task123', index: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer index (float)', () => {
      const result = RemoveAttachmentInputSchema.safeParse({ id: 'task123', index: 0.5 });
      expect(result.success).toBe(false);
    });

    it('should reject missing index', () => {
      const result = RemoveAttachmentInputSchema.safeParse({ id: 'task123' });
      expect(result.success).toBe(false);
    });

    it('should reject string index', () => {
      const result = RemoveAttachmentInputSchema.safeParse({ id: 'task123', index: '0' });
      expect(result.success).toBe(false);
    });
  });
});

describe('RemoveAttachmentSuccessSchema', () => {
  const baseSuccess = {
    success: true as const,
    id: 'task123',
    name: 'My Task',
    removedFilename: 'report.pdf',
    remainingAttachments: []
  };

  describe('valid success responses', () => {
    it('should accept success with empty remaining attachments', () => {
      const result = RemoveAttachmentSuccessSchema.safeParse(baseSuccess);
      expect(result.success).toBe(true);
    });

    it('should accept success with remaining attachments', () => {
      const result = RemoveAttachmentSuccessSchema.safeParse({
        ...baseSuccess,
        remainingAttachments: [{ index: 0, filename: 'photo.jpg', type: 'File', size: 2048 }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept success with multiple remaining attachments', () => {
      const result = RemoveAttachmentSuccessSchema.safeParse({
        ...baseSuccess,
        remainingAttachments: [
          { index: 0, filename: 'a.pdf', type: 'File', size: 1024 },
          { index: 1, filename: 'b.pdf', type: 'File', size: 2048 }
        ]
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid success responses', () => {
    it('should reject success: false', () => {
      const result = RemoveAttachmentSuccessSchema.safeParse({ ...baseSuccess, success: false });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const { id: _, ...rest } = baseSuccess;
      const result = RemoveAttachmentSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const { name: _, ...rest } = baseSuccess;
      const result = RemoveAttachmentSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject missing removedFilename', () => {
      const { removedFilename: _, ...rest } = baseSuccess;
      const result = RemoveAttachmentSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject missing remainingAttachments', () => {
      const { remainingAttachments: _, ...rest } = baseSuccess;
      const result = RemoveAttachmentSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid remaining attachment type', () => {
      const result = RemoveAttachmentSuccessSchema.safeParse({
        ...baseSuccess,
        remainingAttachments: [{ index: 0, filename: 'photo.jpg', type: 'Invalid', size: 2048 }]
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('RemoveAttachmentErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept valid error with valid range info', () => {
      const result = RemoveAttachmentErrorSchema.safeParse({
        success: false,
        error: 'Attachment index 5 is out of bounds (task has 3 attachments, valid range: 0 to 2)'
      });
      expect(result.success).toBe(true);
    });

    it('should accept error for empty attachments', () => {
      const result = RemoveAttachmentErrorSchema.safeParse({
        success: false,
        error: 'Task has no attachments to remove'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid error responses', () => {
    it('should reject success: true', () => {
      const result = RemoveAttachmentErrorSchema.safeParse({
        success: true,
        error: 'Error'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing error field', () => {
      const result = RemoveAttachmentErrorSchema.safeParse({ success: false });
      expect(result.success).toBe(false);
    });
  });
});

describe('RemoveAttachmentResponseSchema', () => {
  it('should accept success response', () => {
    const result = RemoveAttachmentResponseSchema.safeParse({
      success: true,
      id: 'task123',
      name: 'My Task',
      removedFilename: 'report.pdf',
      remainingAttachments: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept success with remaining attachments', () => {
    const result = RemoveAttachmentResponseSchema.safeParse({
      success: true,
      id: 'task123',
      name: 'My Task',
      removedFilename: 'report.pdf',
      remainingAttachments: [{ index: 0, filename: 'other.jpg', type: 'File', size: 1024 }]
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = RemoveAttachmentResponseSchema.safeParse({
      success: false,
      error: 'Task has no attachments'
    });
    expect(result.success).toBe(true);
  });

  it('should reject unknown shape', () => {
    const result = RemoveAttachmentResponseSchema.safeParse({
      success: true,
      data: 'unexpected'
    });
    expect(result.success).toBe(false);
  });
});
