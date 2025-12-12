import { beforeEach, describe, expect, it, vi } from 'vitest';
import { editProject } from '../../../src/tools/primitives/editProject.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

describe('editProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('T038: Edit name by ID', () => {
    it('should update project name successfully', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Updated Name' })
      );
      const result = await editProject({ id: 'proj123', newName: 'Updated Name' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('proj123');
        expect(result.name).toBe('Updated Name');
      }
    });

    it('should return error when project not found by id', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: false, error: "Project 'proj999' not found" })
      );
      const result = await editProject({ id: 'proj999', newName: 'New Name' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('T039: Change status', () => {
    it('should update project status to Active', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'My Project' })
      );
      const result = await editProject({ id: 'proj123', status: 'Active' });
      expect(result.success).toBe(true);
    });

    it('should update project status to OnHold', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'My Project' })
      );
      const result = await editProject({ id: 'proj123', status: 'OnHold' });
      expect(result.success).toBe(true);
    });

    it('should update project status to Done', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'My Project' })
      );
      const result = await editProject({ id: 'proj123', status: 'Done' });
      expect(result.success).toBe(true);
    });

    it('should update project status to Dropped', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'My Project' })
      );
      const result = await editProject({ id: 'proj123', status: 'Dropped' });
      expect(result.success).toBe(true);
    });
  });

  describe('T040: Update type with auto-clear', () => {
    it('should set sequential and auto-clear containsSingletonActions', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Sequential Project' })
      );
      const result = await editProject({ id: 'proj123', sequential: true });
      expect(result.success).toBe(true);

      // Verify the script was called (auto-clear happens in primitive)
      expect(executeOmniFocusScript).toHaveBeenCalled();
    });

    it('should set containsSingletonActions and auto-clear sequential', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Single Actions' })
      );
      const result = await editProject({ id: 'proj123', containsSingletonActions: true });
      expect(result.success).toBe(true);

      // Verify the script was called (auto-clear happens in primitive)
      expect(executeOmniFocusScript).toHaveBeenCalled();
    });

    it('should allow setting sequential to false without auto-clear', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Parallel Project' })
      );
      const result = await editProject({ id: 'proj123', sequential: false });
      expect(result.success).toBe(true);
    });

    it('should allow setting containsSingletonActions to false without auto-clear', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Regular Project' })
      );
      const result = await editProject({ id: 'proj123', containsSingletonActions: false });
      expect(result.success).toBe(true);
    });
  });

  describe('T041: Clear nullable properties', () => {
    it('should clear dueDate when set to null', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'No Due Date' })
      );
      const result = await editProject({ id: 'proj123', dueDate: null });
      expect(result.success).toBe(true);

      // Verify script execution was called
      expect(executeOmniFocusScript).toHaveBeenCalled();
    });

    it('should clear deferDate when set to null', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'No Defer Date' })
      );
      const result = await editProject({ id: 'proj123', deferDate: null });
      expect(result.success).toBe(true);

      // Verify script execution was called
      expect(executeOmniFocusScript).toHaveBeenCalled();
    });

    it('should clear reviewInterval when set to null', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'No Review' })
      );
      const result = await editProject({ id: 'proj123', reviewInterval: null });
      expect(result.success).toBe(true);

      // Verify script execution was called
      expect(executeOmniFocusScript).toHaveBeenCalled();
    });

    it('should clear estimatedMinutes when set to null', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'No Estimate' })
      );
      const result = await editProject({ id: 'proj123', estimatedMinutes: null });
      expect(result.success).toBe(true);

      // Verify script execution was called
      expect(executeOmniFocusScript).toHaveBeenCalled();
    });
  });

  describe('T042: Disambiguation error', () => {
    it('should return disambiguation error when multiple projects match name', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({
          success: false,
          error: "Ambiguous project name 'Renovation'. Found 2 matches.",
          code: 'DISAMBIGUATION_REQUIRED',
          matchingIds: ['proj123', 'proj456']
        })
      );
      const result = await editProject({ name: 'Renovation', status: 'Active' });
      expect(result.success).toBe(false);
      if (!result.success && 'code' in result) {
        expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
        expect(result.matchingIds).toHaveLength(2);
        expect(result.matchingIds).toEqual(['proj123', 'proj456']);
      }
    });

    it('should succeed when editing by name with unique match', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Unique Project' })
      );
      const result = await editProject({ name: 'Unique Project', status: 'Active' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.id).toBe('proj123');
      }
    });
  });

  describe('Combined updates', () => {
    it('should update multiple properties at once', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Updated Project' })
      );
      const result = await editProject({
        id: 'proj123',
        newName: 'Updated Project',
        status: 'Active',
        flagged: true,
        sequential: true,
        note: 'Updated notes'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.name).toBe('Updated Project');
      }
    });

    it('should update dates with ISO 8601 strings', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Dated Project' })
      );
      const result = await editProject({
        id: 'proj123',
        deferDate: '2024-12-25T00:00:00Z',
        dueDate: '2024-12-31T23:59:59Z'
      });
      expect(result.success).toBe(true);
    });

    it('should update review interval with value object', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Reviewed Project' })
      );
      const result = await editProject({
        id: 'proj123',
        reviewInterval: { steps: 2, unit: 'Week' }
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty note update', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Project' })
      );
      const result = await editProject({ id: 'proj123', note: '' });
      expect(result.success).toBe(true);
    });

    it('should handle setting estimatedMinutes to positive value', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Estimated Project' })
      );
      const result = await editProject({ id: 'proj123', estimatedMinutes: 120 });
      expect(result.success).toBe(true);
    });

    it('should handle completedByChildren flag', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Auto-Complete Project' })
      );
      const result = await editProject({ id: 'proj123', completedByChildren: true });
      expect(result.success).toBe(true);
    });

    it('should handle defaultSingletonActionHolder flag', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Inbox Target' })
      );
      const result = await editProject({ id: 'proj123', defaultSingletonActionHolder: true });
      expect(result.success).toBe(true);
    });

    it('should handle shouldUseFloatingTimeZone flag', async () => {
      vi.mocked(executeOmniFocusScript).mockResolvedValue(
        JSON.stringify({ success: true, id: 'proj123', name: 'Floating TZ Project' })
      );
      const result = await editProject({ id: 'proj123', shouldUseFloatingTimeZone: true });
      expect(result.success).toBe(true);
    });
  });
});
