import { describe, expect, it } from 'vitest';
import {
  AddLinkedFileErrorSchema,
  AddLinkedFileInputSchema,
  AddLinkedFileResponseSchema,
  AddLinkedFileSuccessSchema
} from '../../../src/contracts/attachment-tools/add-linked-file.js';

// T038: Contract tests for add-linked-file schemas

describe('AddLinkedFileInputSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid id and file:// URL', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: 'file:///Users/fred/Documents/report.pdf'
      });
      expect(result.success).toBe(true);
    });

    it('should accept file:// URL with spaces in path (encoded)', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: 'file:///Users/fred/My%20Documents/report.pdf'
      });
      expect(result.success).toBe(true);
    });

    it('should accept file:// URL with deep path', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: 'file:///Users/fred/a/b/c/d/file.txt'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty id', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: '',
        url: 'file:///path/to/file.pdf'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        url: 'file:///path/to/file.pdf'
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty URL', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: ''
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing URL', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123'
      });
      expect(result.success).toBe(false);
    });

    it('should reject URL without file:// scheme', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: '/Users/fred/Documents/report.pdf'
      });
      expect(result.success).toBe(false);
    });

    it('should reject https:// URL', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: 'https://example.com/file.pdf'
      });
      expect(result.success).toBe(false);
    });

    it('should reject http:// URL', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: 'http://example.com/file.pdf'
      });
      expect(result.success).toBe(false);
    });

    it('should reject ftp:// URL', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: 'ftp://example.com/file.pdf'
      });
      expect(result.success).toBe(false);
    });

    it('should reject relative path with file without scheme', () => {
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: 'Documents/report.pdf'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('AddLinkedFileSuccessSchema', () => {
  const baseSuccess = {
    success: true as const,
    id: 'task123',
    name: 'My Task',
    linkedFileCount: 1
  };

  describe('valid success responses', () => {
    it('should accept success with count 1', () => {
      const result = AddLinkedFileSuccessSchema.safeParse(baseSuccess);
      expect(result.success).toBe(true);
    });

    it('should accept success with higher count', () => {
      const result = AddLinkedFileSuccessSchema.safeParse({
        ...baseSuccess,
        linkedFileCount: 5
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid success responses', () => {
    it('should reject success: false', () => {
      const result = AddLinkedFileSuccessSchema.safeParse({ ...baseSuccess, success: false });
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const { id: _, ...rest } = baseSuccess;
      const result = AddLinkedFileSuccessSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject linkedFileCount of 0', () => {
      const result = AddLinkedFileSuccessSchema.safeParse({
        ...baseSuccess,
        linkedFileCount: 0
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer linkedFileCount', () => {
      const result = AddLinkedFileSuccessSchema.safeParse({
        ...baseSuccess,
        linkedFileCount: 1.5
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('AddLinkedFileErrorSchema', () => {
  describe('valid error responses', () => {
    it('should accept valid error response', () => {
      const result = AddLinkedFileErrorSchema.safeParse({
        success: false,
        error: 'Task not found'
      });
      expect(result.success).toBe(true);
    });

    it('should accept error for invalid URL', () => {
      const result = AddLinkedFileErrorSchema.safeParse({
        success: false,
        error: 'Could not create URL from string'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid error responses', () => {
    it('should reject success: true', () => {
      const result = AddLinkedFileErrorSchema.safeParse({
        success: true,
        error: 'Error'
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing error field', () => {
      const result = AddLinkedFileErrorSchema.safeParse({ success: false });
      expect(result.success).toBe(false);
    });
  });
});

describe('AddLinkedFileResponseSchema', () => {
  it('should accept success response', () => {
    const result = AddLinkedFileResponseSchema.safeParse({
      success: true,
      id: 'task123',
      name: 'My Task',
      linkedFileCount: 1
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const result = AddLinkedFileResponseSchema.safeParse({
      success: false,
      error: 'Not found'
    });
    expect(result.success).toBe(true);
  });

  it('should reject unknown shape', () => {
    const result = AddLinkedFileResponseSchema.safeParse({
      success: true,
      data: 'unexpected'
    });
    expect(result.success).toBe(false);
  });
});
