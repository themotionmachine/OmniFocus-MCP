import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addAttachment } from '../../../src/tools/primitives/addAttachment.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

// T015: Unit tests for addAttachment primitive

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('addAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful additions', () => {
    it('should add attachment and return attachment count', async () => {
      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        attachmentCount: 1
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addAttachment({
        id: 'task123',
        filename: 'report.pdf',
        data: 'aGVsbG8=' // "hello" in base64
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('task123');
        expect(result.attachmentCount).toBe(1);
      }
    });

    it('should include warning for data >10 MB decoded', async () => {
      // 11 MB of 'A' bytes in base64
      const elevenMBBase64Length = Math.ceil((11 * 1024 * 1024) / 3) * 4;
      const largeBase64 = 'A'.repeat(elevenMBBase64Length);

      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        attachmentCount: 1,
        warning: 'Attachment size (11.0 MB) exceeds 10 MB; may impact OmniFocus Sync performance'
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addAttachment({
        id: 'task123',
        filename: 'large-file.bin',
        data: largeBase64
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warning).toBeDefined();
        expect(result.warning).toContain('MB');
      }
    }, 30000);

    it('should resolve project ID to root task', async () => {
      const mockResponse = {
        success: true,
        id: 'projectRootTaskId',
        name: 'My Project',
        attachmentCount: 1
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addAttachment({
        id: 'projectId123',
        filename: 'spec.pdf',
        data: 'aGVsbG8='
      });

      expect(result.success).toBe(true);
    });

    it('should accept whitespace-containing base64 data (stripped by Zod)', async () => {
      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        attachmentCount: 1
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      // Zod schema strips whitespace; primitive receives already-stripped data
      const result = await addAttachment({
        id: 'task123',
        filename: 'file.txt',
        data: 'aGVsbG8=' // already stripped by Zod
      });

      expect(result.success).toBe(true);
    });
  });

  describe('base64 validation errors', () => {
    it('should return INVALID_BASE64 error for invalid characters', async () => {
      const result = await addAttachment({
        id: 'task123',
        filename: 'file.pdf',
        data: 'aGVsb@8=' // @ is invalid base64
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_BASE64');
        expect(result.error).toContain('base64');
      }
    });

    it('should return INVALID_BASE64 for padding in wrong position', async () => {
      const result = await addAttachment({
        id: 'task123',
        filename: 'file.pdf',
        data: 'aGVs=bG8='
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_BASE64');
      }
    });

    it('should return INVALID_BASE64 for too many padding chars', async () => {
      const result = await addAttachment({
        id: 'task123',
        filename: 'file.pdf',
        data: 'aGVsbG8==='
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_BASE64');
      }
    });
  });

  describe('size limit errors', () => {
    it('should return SIZE_EXCEEDED for data exceeding rejection threshold', async () => {
      // Use validateBase64 directly with configurable thresholds to avoid
      // allocating ~70M strings. A 100-char base64 string decodes to 75 bytes.
      const { validateBase64 } = await import('../../../src/tools/primitives/addAttachment.js');
      const data = 'A'.repeat(100); // 75 decoded bytes
      const result = validateBase64(data, { rejectionBytes: 50, warningBytes: 30 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SIZE_EXCEEDED');
    });
  });

  describe('filename validation', () => {
    it('should reject filename with forward slash', async () => {
      // This is rejected by Zod schema before reaching primitive
      // But we test the schema validates correctly
      const { AddAttachmentInputSchema } = await import(
        '../../../src/contracts/attachment-tools/add-attachment.js'
      );
      const result = AddAttachmentInputSchema.safeParse({
        id: 'task123',
        filename: 'path/to/file.pdf',
        data: 'aGVsbG8='
      });
      expect(result.success).toBe(false);
    });

    it('should reject filename with directory traversal', async () => {
      const { AddAttachmentInputSchema } = await import(
        '../../../src/contracts/attachment-tools/add-attachment.js'
      );
      const result = AddAttachmentInputSchema.safeParse({
        id: 'task123',
        filename: '../etc/passwd',
        data: 'aGVsbG8='
      });
      expect(result.success).toBe(false);
    });
  });

  describe('not found errors', () => {
    it('should return NOT_FOUND error when ID does not exist', async () => {
      const mockResponse = {
        success: false,
        error: "ID 'nonexistent' not found as task or project",
        code: 'NOT_FOUND'
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addAttachment({
        id: 'nonexistent',
        filename: 'file.pdf',
        data: 'aGVsbG8='
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('NOT_FOUND');
        expect(result.error).toContain('not found');
      }
    });

    it('should return error when OmniJS silent failure (read-back verification fails)', async () => {
      const mockResponse = {
        success: false,
        error: 'Attachment was not added (count did not increase after add)'
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addAttachment({
        id: 'task123',
        filename: 'file.pdf',
        data: 'aGVsbG8='
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not added');
      }
    });
  });

  describe('executeOmniJS rejection', () => {
    it('should propagate error when executeOmniJS rejects', async () => {
      vi.mocked(executeOmniJS).mockRejectedValue(new Error('OmniJS execution failed'));

      await expect(
        addAttachment({
          id: 'task123',
          filename: 'file.pdf',
          data: 'aGVsbG8='
        })
      ).rejects.toThrow('OmniJS execution failed');
    });
  });

  describe('script generation', () => {
    it('should call executeOmniJS exactly once for valid base64', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task123',
        name: 'Task',
        attachmentCount: 1
      });

      await addAttachment({
        id: 'task123',
        filename: 'file.pdf',
        data: 'aGVsbG8='
      });

      expect(executeOmniJS).toHaveBeenCalledTimes(1);
    });

    it('should NOT call executeOmniJS when base64 validation fails', async () => {
      await addAttachment({
        id: 'task123',
        filename: 'file.pdf',
        data: 'invalid@base64!'
      });

      expect(executeOmniJS).not.toHaveBeenCalled();
    });
  });
});
