import { describe, expect, it } from 'vitest';
import {
  AttachmentInfoSchema,
  FileWrapperTypeSchema,
  LinkedFileInfoSchema
} from '../../../src/contracts/attachment-tools/shared/index.js';

// T003: Contract tests for attachment-tools shared schemas

describe('FileWrapperTypeSchema', () => {
  describe('valid enum values', () => {
    it('should accept "File"', () => {
      const result = FileWrapperTypeSchema.safeParse('File');
      expect(result.success).toBe(true);
    });

    it('should accept "Directory"', () => {
      const result = FileWrapperTypeSchema.safeParse('Directory');
      expect(result.success).toBe(true);
    });

    it('should accept "Link"', () => {
      const result = FileWrapperTypeSchema.safeParse('Link');
      expect(result.success).toBe(true);
    });
  });

  describe('invalid enum values', () => {
    it('should reject lowercase "file"', () => {
      const result = FileWrapperTypeSchema.safeParse('file');
      expect(result.success).toBe(false);
    });

    it('should reject "Unknown"', () => {
      const result = FileWrapperTypeSchema.safeParse('Unknown');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = FileWrapperTypeSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject number', () => {
      const result = FileWrapperTypeSchema.safeParse(0);
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = FileWrapperTypeSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});

describe('AttachmentInfoSchema', () => {
  const validAttachment = {
    index: 0,
    filename: 'report.pdf',
    type: 'File' as const,
    size: 1024
  };

  describe('valid inputs', () => {
    it('should accept minimal valid attachment', () => {
      const result = AttachmentInfoSchema.safeParse(validAttachment);
      expect(result.success).toBe(true);
    });

    it('should accept index 0', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, index: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept large index', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, index: 99 });
      expect(result.success).toBe(true);
    });

    it('should accept Directory type', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, type: 'Directory' });
      expect(result.success).toBe(true);
    });

    it('should accept Link type', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, type: 'Link' });
      expect(result.success).toBe(true);
    });

    it('should accept size 0', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, size: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept large size', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, size: 52428800 });
      expect(result.success).toBe(true);
    });

    it('should accept unnamed filename', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, filename: 'unnamed' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject negative index', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, index: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer index (float)', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, index: 0.5 });
      expect(result.success).toBe(false);
    });

    it('should reject missing index', () => {
      const { index: _, ...rest } = validAttachment;
      const result = AttachmentInfoSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject missing filename', () => {
      const { filename: _, ...rest } = validAttachment;
      const result = AttachmentInfoSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid type', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, type: 'Unknown' });
      expect(result.success).toBe(false);
    });

    it('should reject missing type', () => {
      const { type: _, ...rest } = validAttachment;
      const result = AttachmentInfoSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject negative size', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, size: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer size', () => {
      const result = AttachmentInfoSchema.safeParse({ ...validAttachment, size: 1024.5 });
      expect(result.success).toBe(false);
    });

    it('should reject missing size', () => {
      const { size: _, ...rest } = validAttachment;
      const result = AttachmentInfoSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });
});

describe('LinkedFileInfoSchema', () => {
  const validLinkedFile = {
    url: 'file:///Users/fred/Documents/report.pdf',
    filename: 'report.pdf',
    extension: 'pdf'
  };

  describe('valid inputs', () => {
    it('should accept minimal valid linked file', () => {
      const result = LinkedFileInfoSchema.safeParse(validLinkedFile);
      expect(result.success).toBe(true);
    });

    it('should accept URL with path', () => {
      const result = LinkedFileInfoSchema.safeParse({
        ...validLinkedFile,
        url: 'file:///Users/fred/Documents/project/report.pdf'
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty extension (no extension)', () => {
      const result = LinkedFileInfoSchema.safeParse({ ...validLinkedFile, extension: '' });
      expect(result.success).toBe(true);
    });

    it('should accept empty filename (trailing slash URL)', () => {
      const result = LinkedFileInfoSchema.safeParse({ ...validLinkedFile, filename: '' });
      expect(result.success).toBe(true);
    });

    it('should accept complex extension', () => {
      const result = LinkedFileInfoSchema.safeParse({ ...validLinkedFile, extension: 'tar.gz' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing url', () => {
      const { url: _, ...rest } = validLinkedFile;
      const result = LinkedFileInfoSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject missing filename', () => {
      const { filename: _, ...rest } = validLinkedFile;
      const result = LinkedFileInfoSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject missing extension', () => {
      const { extension: _, ...rest } = validLinkedFile;
      const result = LinkedFileInfoSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject non-string url', () => {
      const result = LinkedFileInfoSchema.safeParse({ ...validLinkedFile, url: 123 });
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = LinkedFileInfoSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});
