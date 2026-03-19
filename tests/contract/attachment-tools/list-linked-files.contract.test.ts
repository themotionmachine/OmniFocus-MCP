import { describe, expect, it } from 'vitest';
import {
  ListLinkedFilesErrorSchema,
  ListLinkedFilesInputSchema,
  ListLinkedFilesResponseSchema,
  ListLinkedFilesSuccessSchema
} from '../../../src/contracts/attachment-tools/list-linked-files.js';

// T030: Contract tests for list-linked-files schemas

describe('ListLinkedFilesInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid task ID', () => {
      const result = ListLinkedFilesInputSchema.safeParse({ id: 'task123' });
      expect(result.success).toBe(true);
    });

    it('should accept a project ID', () => {
      const result = ListLinkedFilesInputSchema.safeParse({ id: 'proj456' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty id', () => {
      const result = ListLinkedFilesInputSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = ListLinkedFilesInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const result = ListLinkedFilesInputSchema.safeParse({ id: 123 });
      expect(result.success).toBe(false);
    });
  });
});

describe('ListLinkedFilesSuccessSchema', () => {
  const baseSuccess = {
    success: true as const,
    id: 'task123',
    name: 'My Task',
    linkedFiles: []
  };

  describe('valid success responses', () => {
    it('should accept empty linked files array', () => {
      const result = ListLinkedFilesSuccessSchema.safeParse(baseSuccess);
      expect(result.success).toBe(true);
    });

    it('should accept response with one linked file', () => {
      const result = ListLinkedFilesSuccessSchema.safeParse({
        ...baseSuccess,
        linkedFiles: [
          {
            url: 'file:///Users/fred/Documents/report.pdf',
            filename: 'report.pdf',
            extension: 'pdf'
          }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept response with multiple linked files', () => {
      const result = ListLinkedFilesSuccessSchema.safeParse({
        ...baseSuccess,
        linkedFiles: [
          { url: 'file:///Users/fred/a.pdf', filename: 'a.pdf', extension: 'pdf' },
          { url: 'file:///Users/fred/b.txt', filename: 'b.txt', extension: 'txt' }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept linked file with empty extension', () => {
      const result = ListLinkedFilesSuccessSchema.safeParse({
        ...baseSuccess,
        linkedFiles: [{ url: 'file:///Users/fred/Makefile', filename: 'Makefile', extension: '' }]
      });
      expect(result.success).toBe(true);
    });

    it('should accept linked file with empty filename (trailing slash)', () => {
      const result = ListLinkedFilesSuccessSchema.safeParse({
        ...baseSuccess,
        linkedFiles: [{ url: 'file:///Users/fred/docs/', filename: '', extension: '' }]
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid success responses', () => {
    it('should reject success: false', () => {
      const result = ListLinkedFilesSuccessSchema.safeParse({ ...baseSuccess, success: false });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const { id: _, ...rest } = baseSuccess;
      const result = ListLinkedFilesSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject missing linkedFiles', () => {
      const { linkedFiles: _, ...rest } = baseSuccess;
      const result = ListLinkedFilesSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject linked file missing url', () => {
      const result = ListLinkedFilesSuccessSchema.safeParse({
        ...baseSuccess,
        linkedFiles: [{ filename: 'report.pdf', extension: 'pdf' }]
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('ListLinkedFilesErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept valid error response', () => {
      const result = ListLinkedFilesErrorSchema.safeParse({
        success: false,
        error: 'Task not found'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid error responses', () => {
    it('should reject success: true', () => {
      const result = ListLinkedFilesErrorSchema.safeParse({
        success: true,
        error: 'Task not found'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing error field', () => {
      const result = ListLinkedFilesErrorSchema.safeParse({ success: false });
      expect(result.success).toBe(false);
    });
  });
});

describe('ListLinkedFilesResponseSchema', () => {
  it('should accept success response', () => {
    const result = ListLinkedFilesResponseSchema.safeParse({
      success: true,
      id: 'task123',
      name: 'My Task',
      linkedFiles: []
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = ListLinkedFilesResponseSchema.safeParse({
      success: false,
      error: 'Task not found'
    });
    expect(result.success).toBe(true);
  });

  it('should reject unknown shape', () => {
    const result = ListLinkedFilesResponseSchema.safeParse({
      success: true,
      data: 'unexpected'
    });
    expect(result.success).toBe(false);
  });
});
