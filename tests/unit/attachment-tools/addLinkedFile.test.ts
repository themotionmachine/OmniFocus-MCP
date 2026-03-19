import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addLinkedFile } from '../../../src/tools/primitives/addLinkedFile.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

// T039: Unit tests for addLinkedFile primitive

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('addLinkedFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful additions', () => {
    it('should add linked file and return count', async () => {
      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        linkedFileCount: 1
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addLinkedFile({
        id: 'task123',
        url: 'file:///Users/fred/Documents/report.pdf'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('task123');
        expect(result.linkedFileCount).toBe(1);
      }
    });

    it('should resolve project ID to root task', async () => {
      const mockResponse = {
        success: true,
        id: 'projectRootTaskId',
        name: 'My Project',
        linkedFileCount: 1
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addLinkedFile({
        id: 'projectId123',
        url: 'file:///Users/fred/spec.pdf'
      });

      expect(result.success).toBe(true);
    });

    it('should return incremented count when task already has linked files', async () => {
      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        linkedFileCount: 3
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addLinkedFile({
        id: 'task123',
        url: 'file:///Users/fred/new-doc.pdf'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.linkedFileCount).toBe(3);
      }
    });
  });

  describe('schema-level URL validation', () => {
    it('should not reach primitive for URL without file:// scheme (schema rejects it)', async () => {
      // The Zod schema rejects non-file:// URLs before primitive is called.
      // This test verifies schema behavior via import.
      const { AddLinkedFileInputSchema } = await import(
        '../../../src/contracts/attachment-tools/add-linked-file.js'
      );
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: 'https://example.com/file.pdf'
      });
      expect(result.success).toBe(false);
    });

    it('should accept file:// URL at schema level', async () => {
      const { AddLinkedFileInputSchema } = await import(
        '../../../src/contracts/attachment-tools/add-linked-file.js'
      );
      const result = AddLinkedFileInputSchema.safeParse({
        id: 'task123',
        url: 'file:///Users/fred/file.pdf'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('error cases', () => {
    it('should return error when ID not found', async () => {
      const mockResponse = {
        success: false,
        error: "ID 'nonexistent' not found as task or project"
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addLinkedFile({
        id: 'nonexistent',
        url: 'file:///Users/fred/file.pdf'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should return error when OmniJS silent failure (read-back verification fails)', async () => {
      const mockResponse = {
        success: false,
        error: 'Linked file was not added (count did not increase after add)'
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addLinkedFile({
        id: 'task123',
        url: 'file:///Users/fred/file.pdf'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not added');
      }
    });

    it('should return error when OmniJS URL.fromString() returns null', async () => {
      const mockResponse = {
        success: false,
        error: 'Could not create URL from string: file:///malformed%path'
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await addLinkedFile({
        id: 'task123',
        url: 'file:///malformed%path'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('URL');
      }
    });
  });

  describe('executeOmniJS rejection', () => {
    it('should propagate error when executeOmniJS rejects', async () => {
      vi.mocked(executeOmniJS).mockRejectedValue(new Error('OmniJS execution failed'));

      await expect(
        addLinkedFile({
          id: 'task123',
          url: 'file:///Users/fred/file.pdf'
        })
      ).rejects.toThrow('OmniJS execution failed');
    });
  });

  describe('script generation', () => {
    it('should call executeOmniJS exactly once', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task123',
        name: 'Task',
        linkedFileCount: 1
      });

      await addLinkedFile({
        id: 'task123',
        url: 'file:///Users/fred/file.pdf'
      });

      expect(executeOmniJS).toHaveBeenCalledTimes(1);
    });

    it('should pass a non-empty script string to executeOmniJS', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task123',
        name: 'Task',
        linkedFileCount: 1
      });

      await addLinkedFile({
        id: 'task123',
        url: 'file:///Users/fred/file.pdf'
      });

      const [scriptArg] = vi.mocked(executeOmniJS).mock.calls[0];
      expect(typeof scriptArg).toBe('string');
      expect((scriptArg as string).length).toBeGreaterThan(0);
    });
  });
});
