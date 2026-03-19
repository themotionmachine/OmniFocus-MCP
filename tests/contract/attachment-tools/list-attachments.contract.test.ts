import { describe, expect, it } from 'vitest';
import {
  ListAttachmentsErrorSchema,
  ListAttachmentsInputSchema,
  ListAttachmentsResponseSchema,
  ListAttachmentsSuccessSchema
} from '../../../src/contracts/attachment-tools/list-attachments.js';

// T006: Contract tests for list-attachments schemas

describe('ListAttachmentsInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid task ID', () => {
      const result = ListAttachmentsInputSchema.safeParse({ id: 'task123' });
      expect(result.success).toBe(true);
    });

    it('should accept a project ID', () => {
      const result = ListAttachmentsInputSchema.safeParse({ id: 'proj456' });
      expect(result.success).toBe(true);
    });

    it('should accept long ID string', () => {
      const result = ListAttachmentsInputSchema.safeParse({ id: 'a'.repeat(64) });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty id', () => {
      const result = ListAttachmentsInputSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = ListAttachmentsInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const result = ListAttachmentsInputSchema.safeParse({ id: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject null id', () => {
      const result = ListAttachmentsInputSchema.safeParse({ id: null });
      expect(result.success).toBe(false);
    });
  });
});

describe('ListAttachmentsSuccessSchema', () => {
  const baseSuccess = {
    success: true as const,
    id: 'task123',
    name: 'My Task',
    attachments: []
  };

  describe('valid success responses', () => {
    it('should accept empty attachments array', () => {
      const result = ListAttachmentsSuccessSchema.safeParse(baseSuccess);
      expect(result.success).toBe(true);
    });

    it('should accept response with one File attachment', () => {
      const result = ListAttachmentsSuccessSchema.safeParse({
        ...baseSuccess,
        attachments: [{ index: 0, filename: 'report.pdf', type: 'File', size: 1024 }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept response with multiple attachments', () => {
      const result = ListAttachmentsSuccessSchema.safeParse({
        ...baseSuccess,
        attachments: [
          { index: 0, filename: 'report.pdf', type: 'File', size: 1024 },
          { index: 1, filename: 'photo.jpg', type: 'File', size: 2048 },
          { index: 2, filename: 'data.csv', type: 'File', size: 512 }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept attachment with size 0', () => {
      const result = ListAttachmentsSuccessSchema.safeParse({
        ...baseSuccess,
        attachments: [{ index: 0, filename: 'empty.txt', type: 'File', size: 0 }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept attachment with unnamed filename', () => {
      const result = ListAttachmentsSuccessSchema.safeParse({
        ...baseSuccess,
        attachments: [{ index: 0, filename: 'unnamed', type: 'File', size: 100 }]
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid success responses', () => {
    it('should reject success: false', () => {
      const result = ListAttachmentsSuccessSchema.safeParse({ ...baseSuccess, success: false });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const { id: _, ...rest } = baseSuccess;
      const result = ListAttachmentsSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const { name: _, ...rest } = baseSuccess;
      const result = ListAttachmentsSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject missing attachments', () => {
      const { attachments: _, ...rest } = baseSuccess;
      const result = ListAttachmentsSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject attachment with negative index', () => {
      const result = ListAttachmentsSuccessSchema.safeParse({
        ...baseSuccess,
        attachments: [{ index: -1, filename: 'report.pdf', type: 'File', size: 1024 }]
      });
      expect(result.success).toBe(false);
    });

    it('should reject attachment with invalid type', () => {
      const result = ListAttachmentsSuccessSchema.safeParse({
        ...baseSuccess,
        attachments: [{ index: 0, filename: 'report.pdf', type: 'Unknown', size: 1024 }]
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('ListAttachmentsErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept valid error response', () => {
      const result = ListAttachmentsErrorSchema.safeParse({
        success: false,
        error: 'Task not found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept error with longer message', () => {
      const result = ListAttachmentsErrorSchema.safeParse({
        success: false,
        error: "ID 'task123' not found as task or project"
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid error responses', () => {
    it('should reject success: true', () => {
      const result = ListAttachmentsErrorSchema.safeParse({
        success: true,
        error: 'Task not found'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing error field', () => {
      const result = ListAttachmentsErrorSchema.safeParse({ success: false });
      expect(result.success).toBe(false);
    });

    it('should reject non-string error', () => {
      const result = ListAttachmentsErrorSchema.safeParse({ success: false, error: 123 });
      expect(result.success).toBe(false);
    });
  });
});

describe('ListAttachmentsResponseSchema', () => {
  it('should accept success response', () => {
    const result = ListAttachmentsResponseSchema.safeParse({
      success: true,
      id: 'task123',
      name: 'My Task',
      attachments: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept success response with attachments', () => {
    const result = ListAttachmentsResponseSchema.safeParse({
      success: true,
      id: 'task123',
      name: 'My Task',
      attachments: [{ index: 0, filename: 'file.pdf', type: 'File', size: 512 }]
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = ListAttachmentsResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should reject unknown shape', () => {
    const result = ListAttachmentsResponseSchema.safeParse({
      success: true,
      data: 'unexpected'
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty object', () => {
    const result = ListAttachmentsResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
