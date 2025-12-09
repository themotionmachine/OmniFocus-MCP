import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted() so the mock is available during vi.mock() hoisting
const { mockExecFileAsync } = vi.hoisted(() => ({
  mockExecFileAsync: vi.fn()
}));

vi.mock('node:util', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:util')>();
  return {
    ...original,
    promisify: vi.fn(() => mockExecFileAsync)
  };
});

// Mock secureTempFile
vi.mock('../../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn(() => ({
    path: '/tmp/mock_script.applescript',
    cleanup: vi.fn()
  }))
}));

// Import after mocking
import { addProject } from '../../../src/tools/primitives/addProject.js';

describe('addProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful project creation', () => {
    it('should create a project at root level successfully', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          projectId: 'project-123',
          name: 'Test Project'
        }),
        stderr: ''
      });

      const result = await addProject({ name: 'Test Project' });

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('project-123');
    });

    it('should create a project in a folder', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          projectId: 'project-456',
          name: 'Folder Project'
        }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Folder Project',
        folderName: 'Work'
      });

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('project-456');
    });

    it('should create a project with all options', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          projectId: 'project-789',
          name: 'Full Project'
        }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Full Project',
        note: 'Project notes',
        dueDate: '2024-12-31T23:59:59Z',
        deferDate: '2024-12-01T00:00:00Z',
        flagged: true,
        estimatedMinutes: 120,
        tags: ['Work', 'Q4'],
        folderName: 'Work',
        sequential: true
      });

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('project-789');
    });

    it('should create a sequential project', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          projectId: 'seq-project',
          name: 'Sequential Project'
        }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Sequential Project',
        sequential: true
      });

      expect(result.success).toBe(true);
    });

    it('should create a parallel project', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: true,
          projectId: 'par-project',
          name: 'Parallel Project'
        }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Parallel Project',
        sequential: false
      });

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle folder not found error', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({
          success: false,
          error: 'Folder not found: NonExistent'
        }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Project',
        folderName: 'NonExistent'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Folder not found');
    });

    it('should handle AppleScript execution error', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('osascript failed'));

      const result = await addProject({ name: 'Project' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('osascript failed');
    });

    it('should handle invalid JSON response', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: 'Not valid JSON',
        stderr: ''
      });

      const result = await addProject({ name: 'Project' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse result');
    });

    it('should handle stderr output', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, projectId: '123' }),
        stderr: 'Some warning'
      });

      const result = await addProject({ name: 'Project' });

      expect(result.success).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      mockExecFileAsync.mockRejectedValue('String error');

      const result = await addProject({ name: 'Project' });

      expect(result.success).toBe(false);
    });
  });

  describe('input sanitization', () => {
    it('should escape special characters in name', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, projectId: '123' }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Project with "quotes" and \'apostrophes\''
      });

      expect(result.success).toBe(true);
    });

    it('should handle empty optional fields', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, projectId: '123' }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Project',
        note: '',
        tags: []
      });

      expect(result.success).toBe(true);
    });
  });

  describe('date handling', () => {
    it('should handle due date only', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, projectId: '123' }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Project',
        dueDate: '2024-12-31'
      });

      expect(result.success).toBe(true);
    });

    it('should handle defer date only', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, projectId: '123' }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Project',
        deferDate: '2024-12-01'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('tag handling', () => {
    it('should handle multiple tags', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, projectId: '123' }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Project',
        tags: ['Tag1', 'Tag2', 'Tag3']
      });

      expect(result.success).toBe(true);
    });

    it('should handle special characters in tags', async () => {
      mockExecFileAsync.mockResolvedValue({
        stdout: JSON.stringify({ success: true, projectId: '123' }),
        stderr: ''
      });

      const result = await addProject({
        name: 'Project',
        tags: ['Tag "with" quotes', "Tag 'with' apostrophes"]
      });

      expect(result.success).toBe(true);
    });
  });
});
