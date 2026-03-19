import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listAttachments } from '../../../src/tools/primitives/listAttachments.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

// T007: Unit tests for listAttachments primitive

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('listAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful responses', () => {
    it('should return attachments when task has multiple attachments', async () => {
      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        attachments: [
          { index: 0, filename: 'report.pdf', type: 'File', size: 1024 },
          { index: 1, filename: 'photo.jpg', type: 'File', size: 2048 }
        ]
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listAttachments({ id: 'task123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('task123');
        expect(result.name).toBe('My Task');
        expect(result.attachments).toHaveLength(2);
        expect(result.attachments[0].filename).toBe('report.pdf');
        expect(result.attachments[0].index).toBe(0);
        expect(result.attachments[1].filename).toBe('photo.jpg');
        expect(result.attachments[1].index).toBe(1);
      }
    });

    it('should return empty array when task has no attachments', async () => {
      const mockResponse = {
        success: true,
        id: 'task456',
        name: 'Empty Task',
        attachments: []
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listAttachments({ id: 'task456' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.attachments).toHaveLength(0);
      }
    });

    it('should return attachments with distinct indices for duplicate filenames', async () => {
      const mockResponse = {
        success: true,
        id: 'task789',
        name: 'Duplicate Filenames Task',
        attachments: [
          { index: 0, filename: 'report.pdf', type: 'File', size: 1024 },
          { index: 1, filename: 'report.pdf', type: 'File', size: 2048 }
        ]
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listAttachments({ id: 'task789' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.attachments).toHaveLength(2);
        expect(result.attachments[0].index).toBe(0);
        expect(result.attachments[1].index).toBe(1);
        expect(result.attachments[0].filename).toBe('report.pdf');
        expect(result.attachments[1].filename).toBe('report.pdf');
      }
    });

    it('should resolve project ID to root task and return attachments', async () => {
      const mockResponse = {
        success: true,
        id: 'projectRootTaskId',
        name: 'My Project',
        attachments: [{ index: 0, filename: 'spec.pdf', type: 'File', size: 512 }]
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listAttachments({ id: 'projectId123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.attachments).toHaveLength(1);
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

      const result = await listAttachments({ id: 'nonexistent' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });

    it('should return error when executeOmniJS throws', async () => {
      vi.mocked(executeOmniJS).mockRejectedValue(new Error('OmniJS execution failed'));

      await expect(listAttachments({ id: 'task123' })).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should return attachments normally for completed task', async () => {
      // Completed/dropped tasks still have attachments accessible
      const mockResponse = {
        success: true,
        id: 'completedTask',
        name: 'Completed Task',
        attachments: [{ index: 0, filename: 'archive.zip', type: 'File', size: 5120 }]
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await listAttachments({ id: 'completedTask' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.attachments).toHaveLength(1);
        expect(result.attachments[0].filename).toBe('archive.zip');
      }
    });
  });

  describe('script generation', () => {
    it('should call executeOmniJS exactly once', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task123',
        name: 'Task',
        attachments: []
      });

      await listAttachments({ id: 'task123' });

      expect(executeOmniJS).toHaveBeenCalledTimes(1);
    });

    it('should pass a non-empty script string to executeOmniJS', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task123',
        name: 'Task',
        attachments: []
      });

      await listAttachments({ id: 'task123' });

      const [scriptArg] = vi.mocked(executeOmniJS).mock.calls[0];
      expect(typeof scriptArg).toBe('string');
      expect((scriptArg as string).length).toBeGreaterThan(0);
    });
  });
});
