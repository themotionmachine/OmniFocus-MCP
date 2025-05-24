import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock child_process before importing the module that uses it
const mockExecAsync = jest.fn<any>();

jest.unstable_mockModule('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Import after mocking
const { addOmniFocusTask } = await import('../../../tools/primitives/addOmniFocusTask.js');

describe('addOmniFocusTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic task creation', () => {
    it('should create a simple task successfully', async () => {
      const mockResponse = '{"success":true,"taskId":"task123","name":"Test Task"}';
      mockExecAsync.mockResolvedValue({ stdout: mockResponse, stderr: '' });

      const result = await addOmniFocusTask({
        name: 'Test Task'
      });

      expect(result).toEqual({
        success: true,
        taskId: 'task123'
      });
    });

    it('should create a task with all properties', async () => {
      const mockResponse = '{"success":true,"taskId":"task456","name":"Complete Task"}';
      mockExecAsync.mockResolvedValue({ stdout: mockResponse, stderr: '' });

      const result = await addOmniFocusTask({
        name: 'Complete Task',
        note: 'This is a note',
        dueDate: '2024-12-31',
        deferDate: '2024-12-30',
        flagged: true,
        estimatedMinutes: 30,
        tags: ['urgent', 'work'],
        projectName: 'My Project'
      });

      expect(result).toEqual({
        success: true,
        taskId: 'task456'
      });
    });
  });

  describe('Nested task creation', () => {
    it('should create a task with parent task ID', async () => {
      const mockResponse = '{"success":true,"taskId":"child123","name":"Child Task"}';
      mockExecAsync.mockResolvedValue({ stdout: mockResponse, stderr: '' });

      const result = await addOmniFocusTask({
        name: 'Child Task',
        parentTaskId: 'parent123'
      });

      expect(result).toEqual({
        success: true,
        taskId: 'child123'
      });

      // Verify the AppleScript includes parent task logic
      const execCall = mockExecAsync.mock.calls[0];
      expect(execCall).toBeDefined();
      expect(execCall[0]).toContain('parent123');
      expect(execCall[0]).toContain('set parentTask to first flattened task where id = "parent123"');
    });

    it('should create a task with parent task name', async () => {
      const mockResponse = '{"success":true,"taskId":"child456","name":"Child Task"}';
      mockExecAsync.mockResolvedValue({ stdout: mockResponse, stderr: '' });

      const result = await addOmniFocusTask({
        name: 'Child Task',
        parentTaskName: 'Parent Task'
      });

      expect(result).toEqual({
        success: true,
        taskId: 'child456'
      });

      // Verify the AppleScript includes parent task logic
      const execCall = mockExecAsync.mock.calls[0];
      expect(execCall).toBeDefined();
      expect(execCall[0]).toContain('Parent Task');
      expect(execCall[0]).toContain('set parentTask to first flattened task where name = "Parent Task"');
    });

    it('should handle parent task not found by ID', async () => {
      const mockResponse = '{"success":false,"error":"Parent task not found with ID: nonexistent123"}';
      mockExecAsync.mockResolvedValue({ stdout: mockResponse, stderr: '' });

      const result = await addOmniFocusTask({
        name: 'Child Task',
        parentTaskId: 'nonexistent123'
      });

      expect(result).toEqual({
        success: false,
        error: 'Parent task not found with ID: nonexistent123'
      });
    });

    it('should handle parent task not found by name', async () => {
      const mockResponse = '{"success":false,"error":"Parent task not found with name: Nonexistent Task"}';
      mockExecAsync.mockResolvedValue({ stdout: mockResponse, stderr: '' });

      const result = await addOmniFocusTask({
        name: 'Child Task',
        parentTaskName: 'Nonexistent Task'
      });

      expect(result).toEqual({
        success: false,
        error: 'Parent task not found with name: Nonexistent Task'
      });
    });

    it('should prioritize parentTaskId over parentTaskName when both provided', async () => {
      const mockResponse = '{"success":true,"taskId":"child789","name":"Child Task"}';
      mockExecAsync.mockResolvedValue({ stdout: mockResponse, stderr: '' });

      const result = await addOmniFocusTask({
        name: 'Child Task',
        parentTaskId: 'id123',
        parentTaskName: 'Should be ignored'
      });

      expect(result).toEqual({
        success: true,
        taskId: 'child789'
      });

      // Verify ID-based search is prioritized - ID comes first in the if-else chain
      const execCall = mockExecAsync.mock.calls[0];
      expect(execCall).toBeDefined();
      expect(execCall[0]).toContain('if "id123" is not "" then');
      expect(execCall[0]).toContain('set parentTask to first flattened task where id = "id123"');
      // Name is in else-if, so it won't be executed when ID is present
    });
  });

  describe('Error handling', () => {
    it('should handle AppleScript execution errors', async () => {
      mockExecAsync.mockRejectedValue(new Error('AppleScript failed'));

      const result = await addOmniFocusTask({
        name: 'Test Task'
      });

      expect(result).toEqual({
        success: false,
        error: 'AppleScript failed'
      });
    });

    it('should handle malformed JSON response', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'not json', stderr: '' });

      const result = await addOmniFocusTask({
        name: 'Test Task'
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to parse result: not json'
      });
    });

    it('should escape special characters in input', async () => {
      const mockResponse = '{"success":true,"taskId":"task123","name":"Test \\"quoted\\" task"}';
      mockExecAsync.mockResolvedValue({ stdout: mockResponse, stderr: '' });

      await addOmniFocusTask({
        name: 'Test "quoted" task',
        note: "Line 1\nLine 2 with 'quotes'",
        parentTaskName: 'Parent "task" with quotes'
      });

      const execCall = mockExecAsync.mock.calls[0];
      expect(execCall).toBeDefined();
      expect(execCall[0]).toContain('Test \\"quoted\\" task');
      expect(execCall[0]).toContain("Line 1\nLine 2 with \\'quotes\\'");
      expect(execCall[0]).toContain('Parent \\"task\\" with quotes');
    });
  });
});