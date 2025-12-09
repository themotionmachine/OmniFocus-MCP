import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the primitive
vi.mock('../../../src/tools/primitives/addProject.js', () => ({
  addProject: vi.fn()
}));

import { handler, schema } from '../../../src/tools/definitions/addProject.js';
import { addProject } from '../../../src/tools/primitives/addProject.js';

const mockAddProject = vi.mocked(addProject);

describe('addProject definition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockExtra = {} as Parameters<typeof handler>[1];

  describe('schema validation', () => {
    it('should validate minimal project input', () => {
      const result = schema.safeParse({ name: 'Test Project' });
      expect(result.success).toBe(true);
    });

    it('should validate full project input', () => {
      const result = schema.safeParse({
        name: 'Test Project',
        note: 'Project notes',
        dueDate: '2024-12-31',
        deferDate: '2024-12-01',
        flagged: true,
        estimatedMinutes: 120,
        tags: ['Work', 'Q4'],
        folderName: 'Work',
        sequential: true
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing name', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('handler success cases', () => {
    it('should return success message for root project', async () => {
      mockAddProject.mockResolvedValue({
        success: true,
        projectId: 'project-123'
      });

      const result = await handler({ name: 'Test Project' }, mockExtra);

      expect(result.content[0]?.text).toContain('✅ Project "Test Project" created successfully');
    });

    it('should return success message for project in folder', async () => {
      mockAddProject.mockResolvedValue({
        success: true,
        projectId: 'project-123'
      });

      const result = await handler({ name: 'Test Project', folderName: 'Work' }, mockExtra);

      expect(result.content[0]?.text).toContain('in folder "Work"');
    });

    it('should include tags in success message', async () => {
      mockAddProject.mockResolvedValue({
        success: true,
        projectId: 'project-123'
      });

      const result = await handler(
        { name: 'Test Project', tags: ['Work', 'Important'] },
        mockExtra
      );

      expect(result.content[0]?.text).toContain('with tags: Work, Important');
    });

    it('should include due date in success message', async () => {
      mockAddProject.mockResolvedValue({
        success: true,
        projectId: 'project-123'
      });

      const result = await handler({ name: 'Test Project', dueDate: '2024-12-31' }, mockExtra);

      expect(result.content[0]?.text).toContain('due on');
    });
  });

  describe('handler error cases', () => {
    it('should return error when project creation fails', async () => {
      mockAddProject.mockResolvedValue({
        success: false,
        error: 'Folder not found'
      });

      const result = await handler({ name: 'Test Project', folderName: 'NonExistent' }, mockExtra);

      expect(result.content[0]?.text).toContain('Failed to create project');
      expect(result.content[0]?.text).toContain('Folder not found');
      expect(result.isError).toBe(true);
    });

    it('should handle thrown exceptions', async () => {
      mockAddProject.mockRejectedValue(new Error('Connection error'));

      const result = await handler({ name: 'Test Project' }, mockExtra);

      expect(result.content[0]?.text).toContain('Error creating project');
      expect(result.isError).toBe(true);
    });
  });
});
