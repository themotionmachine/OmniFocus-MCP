import { beforeEach, describe, expect, it, vi } from 'vitest';
import { removeAttachment } from '../../../src/tools/primitives/removeAttachment.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

// T023: Unit tests for removeAttachment primitive

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('removeAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful removals', () => {
    it('should remove middle attachment and return remaining with updated indices', async () => {
      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        removedFilename: 'middle.pdf',
        remainingAttachments: [
          { index: 0, filename: 'first.pdf', type: 'File', size: 1024 },
          { index: 1, filename: 'last.pdf', type: 'File', size: 2048 }
        ]
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await removeAttachment({ id: 'task123', index: 1 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.removedFilename).toBe('middle.pdf');
        expect(result.remainingAttachments).toHaveLength(2);
        expect(result.remainingAttachments[0].index).toBe(0);
        expect(result.remainingAttachments[1].index).toBe(1);
      }
    });

    it('should remove last attachment and return empty remaining array', async () => {
      const mockResponse = {
        success: true,
        id: 'task123',
        name: 'My Task',
        removedFilename: 'only.pdf',
        remainingAttachments: []
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await removeAttachment({ id: 'task123', index: 0 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.removedFilename).toBe('only.pdf');
        expect(result.remainingAttachments).toHaveLength(0);
      }
    });

    it('should remove from task with single attachment', async () => {
      const mockResponse = {
        success: true,
        id: 'task456',
        name: 'Single Attachment Task',
        removedFilename: 'sole.pdf',
        remainingAttachments: []
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await removeAttachment({ id: 'task456', index: 0 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.remainingAttachments).toHaveLength(0);
      }
    });

    it('should resolve project ID to root task', async () => {
      const mockResponse = {
        success: true,
        id: 'projectRootTaskId',
        name: 'My Project',
        removedFilename: 'spec.pdf',
        remainingAttachments: []
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await removeAttachment({ id: 'projectId123', index: 0 });

      expect(result.success).toBe(true);
    });
  });

  describe('error cases', () => {
    it('should return error with valid range for out-of-bounds index (FR-010)', async () => {
      const mockResponse = {
        success: false,
        error: 'Attachment index 5 is out of bounds (task has 3 attachments, valid range: 0 to 2)'
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await removeAttachment({ id: 'task123', index: 5 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('out of bounds');
        expect(result.error).toContain('valid range');
      }
    });

    it('should return error when task has no attachments', async () => {
      const mockResponse = {
        success: false,
        error: 'Task has no attachments to remove'
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await removeAttachment({ id: 'task123', index: 0 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('no attachments');
      }
    });

    it('should return error when ID not found', async () => {
      const mockResponse = {
        success: false,
        error: "ID 'nonexistent' not found as task or project"
      };

      vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

      const result = await removeAttachment({ id: 'nonexistent', index: 0 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('executeOmniJS rejection', () => {
    it('should propagate error when executeOmniJS rejects', async () => {
      vi.mocked(executeOmniJS).mockRejectedValue(new Error('OmniJS execution failed'));

      await expect(removeAttachment({ id: 'task123', index: 0 })).rejects.toThrow(
        'OmniJS execution failed'
      );
    });
  });

  describe('script generation', () => {
    it('should call executeOmniJS exactly once', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task123',
        name: 'Task',
        removedFilename: 'file.pdf',
        remainingAttachments: []
      });

      await removeAttachment({ id: 'task123', index: 0 });

      expect(executeOmniJS).toHaveBeenCalledTimes(1);
    });

    it('should pass a non-empty script string to executeOmniJS', async () => {
      vi.mocked(executeOmniJS).mockResolvedValue({
        success: true,
        id: 'task123',
        name: 'Task',
        removedFilename: 'file.pdf',
        remainingAttachments: []
      });

      await removeAttachment({ id: 'task123', index: 0 });

      const [scriptArg] = vi.mocked(executeOmniJS).mock.calls[0];
      expect(typeof scriptArg).toBe('string');
      expect((scriptArg as string).length).toBeGreaterThan(0);
    });
  });
});
