import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the primitive
const mockAddOmniFocusTask = jest.fn<any>();

jest.unstable_mockModule('../../../tools/primitives/addOmniFocusTask.js', () => ({
  addOmniFocusTask: mockAddOmniFocusTask
}));

// Import after mocking
const { schema, handler } = await import('../../../tools/definitions/addOmniFocusTask.js');

describe('addOmniFocusTask tool definition', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('schema validation', () => {
    it('should validate required fields', () => {
      const valid = schema.safeParse({ name: 'Test Task' });
      expect(valid.success).toBe(true);
    });

    it('should validate all optional fields', () => {
      const input = {
        name: 'Test Task',
        note: 'A note',
        dueDate: '2024-12-31',
        deferDate: '2024-12-30',
        flagged: true,
        estimatedMinutes: 30,
        tags: ['tag1', 'tag2'],
        projectName: 'My Project',
        parentTaskId: 'parent123',
        parentTaskName: 'Parent Task'
      };

      const valid = schema.safeParse(input);
      expect(valid.success).toBe(true);
    });

    it('should reject invalid fields', () => {
      const invalid = schema.safeParse({
        name: 'Test Task',
        flagged: 'not a boolean' // Should be boolean
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject missing name', () => {
      const invalid = schema.safeParse({
        note: 'A note without a name'
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('handler', () => {
    it('should handle successful task creation', async () => {
      mockAddOmniFocusTask.mockResolvedValue({ success: true, taskId: 'task123' });

      const result = await handler(
        { name: 'Test Task' },
        {} as any // RequestHandlerExtra
      );

      expect(result.content[0].text).toContain('✅ Task "Test Task" created successfully in your inbox');
      expect(result.isError).toBeUndefined();
    });

    it('should handle task creation with project', async () => {
      mockAddOmniFocusTask.mockResolvedValue({ success: true, taskId: 'task123' });

      const result = await handler(
        { name: 'Test Task', projectName: 'My Project' },
        {} as any
      );

      expect(result.content[0].text).toContain('in project "My Project"');
    });

    it('should handle task creation with parent by name', async () => {
      mockAddOmniFocusTask.mockResolvedValue({ success: true, taskId: 'child123' });

      const result = await handler(
        { name: 'Child Task', parentTaskName: 'Parent Task' },
        {} as any
      );

      expect(result.content[0].text).toContain('as subtask of "Parent Task"');
    });

    it('should handle task creation with parent by ID', async () => {
      mockAddOmniFocusTask.mockResolvedValue({ success: true, taskId: 'child123' });

      const result = await handler(
        { name: 'Child Task', parentTaskId: 'parent123' },
        {} as any
      );

      expect(result.content[0].text).toContain('as subtask of "parent123"');
    });

    it('should prioritize parent name over ID in display', async () => {
      mockAddOmniFocusTask.mockResolvedValue({ success: true, taskId: 'child123' });

      const result = await handler(
        { 
          name: 'Child Task', 
          parentTaskId: 'parent123',
          parentTaskName: 'Parent Task Name'
        },
        {} as any
      );

      expect(result.content[0].text).toContain('as subtask of "Parent Task Name"');
    });

    it('should display tags and due date', async () => {
      mockAddOmniFocusTask.mockResolvedValue({ success: true, taskId: 'task123' });

      const result = await handler(
        { 
          name: 'Test Task',
          dueDate: '2024-12-31',
          tags: ['urgent', 'work']
        },
        {} as any
      );

      expect(result.content[0].text).toContain('due on');
      expect(result.content[0].text).toContain('with tags: urgent, work');
    });

    it('should handle task creation failure', async () => {
      mockAddOmniFocusTask.mockResolvedValue({ 
        success: false, 
        error: 'Parent task not found' 
      });

      const result = await handler(
        { name: 'Test Task', parentTaskName: 'Nonexistent' },
        {} as any
      );

      expect(result.content[0].text).toContain('Failed to create task: Parent task not found');
      expect(result.isError).toBe(true);
    });

    it('should handle exceptions', async () => {
      mockAddOmniFocusTask.mockRejectedValue(new Error('Unexpected error'));

      const result = await handler(
        { name: 'Test Task' },
        {} as any
      );

      expect(result.content[0].text).toContain('Error creating task: Unexpected error');
      expect(result.isError).toBe(true);
    });
  });
});