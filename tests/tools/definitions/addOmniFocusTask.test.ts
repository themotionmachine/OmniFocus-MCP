import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the primitive
vi.mock('../../../src/tools/primitives/addOmniFocusTask.js', () => ({
  addOmniFocusTask: vi.fn()
}));

import { handler, schema } from '../../../src/tools/definitions/addOmniFocusTask.js';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';

const mockAddOmniFocusTask = vi.mocked(addOmniFocusTask);

describe('addOmniFocusTask definition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockExtra = {} as Parameters<typeof handler>[1];

  describe('schema validation', () => {
    it('should validate minimal task input', () => {
      const result = schema.safeParse({ name: 'Test Task' });
      expect(result.success).toBe(true);
    });

    it('should validate full task input', () => {
      const result = schema.safeParse({
        name: 'Test Task',
        note: 'Some notes',
        dueDate: '2024-12-25',
        deferDate: '2024-12-20',
        flagged: true,
        estimatedMinutes: 30,
        tags: ['Work', 'Important'],
        projectName: 'My Project',
        parentTaskId: 'task-123',
        parentTaskName: 'Parent Task',
        hierarchyLevel: 1
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing name', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid hierarchyLevel', () => {
      const result = schema.safeParse({
        name: 'Test Task',
        hierarchyLevel: -1
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer hierarchyLevel', () => {
      const result = schema.safeParse({
        name: 'Test Task',
        hierarchyLevel: 1.5
      });
      expect(result.success).toBe(false);
    });
  });

  describe('handler success cases', () => {
    it('should return success message for inbox task', async () => {
      mockAddOmniFocusTask.mockResolvedValue({
        success: true,
        taskId: 'task-123',
        placement: 'inbox'
      });

      const result = await handler({ name: 'Test Task' }, mockExtra);

      expect(result.content[0]?.text).toContain('✅ Task "Test Task" created successfully');
      expect(result.content[0]?.text).toContain('in your inbox');
    });

    it('should return success message for project task', async () => {
      mockAddOmniFocusTask.mockResolvedValue({
        success: true,
        taskId: 'task-123',
        placement: 'project'
      });

      const result = await handler({ name: 'Test Task', projectName: 'My Project' }, mockExtra);

      expect(result.content[0]?.text).toContain('in project "My Project"');
    });

    it('should return success message for parent task', async () => {
      mockAddOmniFocusTask.mockResolvedValue({
        success: true,
        taskId: 'task-123',
        placement: 'parent'
      });

      const result = await handler({ name: 'Subtask', parentTaskId: 'parent-123' }, mockExtra);

      expect(result.content[0]?.text).toContain('under the parent task');
    });

    it('should include due date in success message', async () => {
      mockAddOmniFocusTask.mockResolvedValue({
        success: true,
        taskId: 'task-123',
        placement: 'inbox'
      });

      const result = await handler({ name: 'Test Task', dueDate: '2024-12-25' }, mockExtra);

      expect(result.content[0]?.text).toContain('due on');
    });

    it('should include tags in success message', async () => {
      mockAddOmniFocusTask.mockResolvedValue({
        success: true,
        taskId: 'task-123',
        placement: 'inbox'
      });

      const result = await handler({ name: 'Test Task', tags: ['Work', 'Important'] }, mockExtra);

      expect(result.content[0]?.text).toContain('with tags: Work, Important');
    });

    it('should include warning when parent not found', async () => {
      mockAddOmniFocusTask.mockResolvedValue({
        success: true,
        taskId: 'task-123',
        placement: 'inbox'
      });

      const result = await handler({ name: 'Subtask', parentTaskId: 'non-existent' }, mockExtra);

      expect(result.content[0]?.text).toContain('⚠️ Parent not found');
    });
  });

  describe('handler error cases', () => {
    it('should return error when task creation fails', async () => {
      mockAddOmniFocusTask.mockResolvedValue({
        success: false,
        error: 'Project not found'
      });

      const result = await handler({ name: 'Test Task', projectName: 'NonExistent' }, mockExtra);

      expect(result.content[0]?.text).toContain('Failed to create task');
      expect(result.content[0]?.text).toContain('Project not found');
      expect(result.isError).toBe(true);
    });

    it('should handle thrown exceptions', async () => {
      mockAddOmniFocusTask.mockRejectedValue(new Error('Connection error'));

      const result = await handler({ name: 'Test Task' }, mockExtra);

      expect(result.content[0]?.text).toContain('Error creating task');
      expect(result.content[0]?.text).toContain('Connection error');
      expect(result.isError).toBe(true);
    });
  });
});
