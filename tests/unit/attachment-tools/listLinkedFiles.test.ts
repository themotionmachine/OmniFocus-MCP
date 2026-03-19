import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listLinkedFiles } from '../../../src/tools/primitives/listLinkedFiles.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

// T031: Unit tests for listLinkedFiles primitive

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('listLinkedFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful responses', () => {
    it('should return multiple linked files with correct url/filename/extension', async () => {
      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        linkedFiles: [
          {
            url: 'file:///Users/fred/Documents/report.pdf',
            filename: 'report.pdf',
            extension: 'pdf'
          },
          {
            url: 'file:///Users/fred/Documents/data.csv',
            filename: 'data.csv',
            extension: 'csv'
          }
        ]
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listLinkedFiles({ id: 'task123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('task123');
        expect(result.linkedFiles).toHaveLength(2);
        expect(result.linkedFiles[0].url).toBe('file:///Users/fred/Documents/report.pdf');
        expect(result.linkedFiles[0].filename).toBe('report.pdf');
        expect(result.linkedFiles[0].extension).toBe('pdf');
      }
    });

    it('should return empty array when task has no linked files', async () => {
      const mockResponse = {
        success: true,
        id: 'task456',
        name: 'Empty Task',
        linkedFiles: []
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listLinkedFiles({ id: 'task456' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.linkedFiles).toHaveLength(0);
      }
    });

    it('should handle trailing slash URL with empty filename', async () => {
      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        linkedFiles: [{ url: 'file:///Users/fred/docs/', filename: '', extension: '' }]
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listLinkedFiles({ id: 'task123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.linkedFiles[0].filename).toBe('');
        expect(result.linkedFiles[0].extension).toBe('');
      }
    });

    it('should handle file with no extension', async () => {
      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        linkedFiles: [{ url: 'file:///Users/fred/Makefile', filename: 'Makefile', extension: '' }]
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listLinkedFiles({ id: 'task123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.linkedFiles[0].filename).toBe('Makefile');
        expect(result.linkedFiles[0].extension).toBe('');
      }
    });

    it('should resolve project ID to root task', async () => {
      const mockResponse = {
        success: true,
        id: 'projectRootTaskId',
        name: 'My Project',
        linkedFiles: [
          { url: 'file:///Users/fred/spec.pdf', filename: 'spec.pdf', extension: 'pdf' }
        ]
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listLinkedFiles({ id: 'projectId123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.linkedFiles).toHaveLength(1);
      }
    });
  });

  describe('error cases', () => {
    it('should return error when ID not found', async () => {
      const mockResponse = {
        success: false,
        error: "ID 'nonexistent' not found as task or project"
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listLinkedFiles({ id: 'nonexistent' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('script generation', () => {
    it('should call executeOmniJS exactly once', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task123',
        name: 'Task',
        linkedFiles: []
      });

      await listLinkedFiles({ id: 'task123' });

      expect(executeOmniJS).toHaveBeenCalledTimes(1);
    });

    it('should pass a non-empty script string to executeOmniJS', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task123',
        name: 'Task',
        linkedFiles: []
      });

      await listLinkedFiles({ id: 'task123' });

      const [scriptArg] = vi.mocked(executeOmniJS).mock.calls[0];
      expect(typeof scriptArg).toBe('string');
      expect((scriptArg as string).length).toBeGreaterThan(0);
    });
  });
});
