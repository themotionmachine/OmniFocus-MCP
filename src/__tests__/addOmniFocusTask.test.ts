import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process before importing the module under test
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock util.promisify to return our controlled mock
vi.mock('util', async () => {
  const actual = await vi.importActual<typeof import('util')>('util');
  return {
    ...actual,
    promisify: (fn: any) => fn, // Make promisify return the function itself
  };
});

import { exec } from 'child_process';
import { addOmniFocusTask } from '../tools/primitives/addOmniFocusTask.js';

const mockExec = exec as unknown as ReturnType<typeof vi.fn>;

describe('addOmniFocusTask', () => {
  beforeEach(() => {
    mockExec.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should successfully create a task', async () => {
    mockExec.mockResolvedValue({
      stdout: '{"success":true,"taskId":"abc123","name":"Test"}',
      stderr: '',
    });

    const result = await addOmniFocusTask({ name: 'Test' });

    expect(result).toEqual({
      success: true,
      taskId: 'abc123',
      error: undefined,
    });
    expect(mockExec).toHaveBeenCalledOnce();
    expect(mockExec.mock.calls[0][0]).toContain('osascript -e');
    expect(mockExec.mock.calls[0][0]).toContain('Test');
  });

  it('should create a task with all parameters', async () => {
    mockExec.mockResolvedValue({
      stdout: '{"success":true,"taskId":"full123","name":"Full Task"}',
      stderr: '',
    });

    const result = await addOmniFocusTask({
      name: 'Full Task',
      note: 'A detailed note',
      dueDate: '2026-04-01',
      deferDate: '2026-03-15',
      flagged: true,
      estimatedMinutes: 30,
      tags: ['work', 'urgent'],
      projectName: 'My Project',
    });

    expect(result).toEqual({
      success: true,
      taskId: 'full123',
      error: undefined,
    });

    const scriptArg = mockExec.mock.calls[0][0] as string;
    expect(scriptArg).toContain('Full Task');
    expect(scriptArg).toContain('A detailed note');
    expect(scriptArg).toContain('2026-04-01');
    expect(scriptArg).toContain('2026-03-15');
    expect(scriptArg).toContain('set flagged of newTask to true');
    expect(scriptArg).toContain('set estimated minutes of newTask to 30');
    expect(scriptArg).toContain('work');
    expect(scriptArg).toContain('urgent');
    expect(scriptArg).toContain('My Project');
  });

  it('should handle exec errors', async () => {
    mockExec.mockRejectedValue(new Error('Command failed: osascript not found'));

    const result = await addOmniFocusTask({ name: 'Failing Task' });

    expect(result).toEqual({
      success: false,
      error: 'Command failed: osascript not found',
    });
  });

  it('should handle invalid JSON output', async () => {
    mockExec.mockResolvedValue({
      stdout: 'not valid json at all',
      stderr: '',
    });

    const result = await addOmniFocusTask({ name: 'Bad JSON Task' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to parse result');
    expect(result.error).toContain('not valid json at all');
  });

  it('should handle stderr warnings but still succeed', async () => {
    mockExec.mockResolvedValue({
      stdout: '{"success":true,"taskId":"warn123","name":"Warn Task"}',
      stderr: 'some warning message',
    });

    const result = await addOmniFocusTask({ name: 'Warn Task' });

    expect(result).toEqual({
      success: true,
      taskId: 'warn123',
      error: undefined,
    });
  });

  it('should generate correct AppleScript for inbox task', async () => {
    mockExec.mockResolvedValue({
      stdout: '{"success":true,"taskId":"inbox1","name":"Inbox Task"}',
      stderr: '',
    });

    await addOmniFocusTask({ name: 'Inbox Task' });

    const scriptArg = mockExec.mock.calls[0][0] as string;
    // When no project is specified, should use inbox
    expect(scriptArg).toContain('make new inbox task');
    expect(scriptArg).toContain('Inbox Task');
  });

  it('should generate correct AppleScript for project task', async () => {
    mockExec.mockResolvedValue({
      stdout: '{"success":true,"taskId":"proj1","name":"Project Task"}',
      stderr: '',
    });

    await addOmniFocusTask({ name: 'Project Task', projectName: 'Work' });

    const scriptArg = mockExec.mock.calls[0][0] as string;
    // When project is specified, should use project container
    expect(scriptArg).toContain('first flattened project where name = "Work"');
    expect(scriptArg).toContain('Project Task');
  });

  it('should escape special characters in task name', async () => {
    mockExec.mockResolvedValue({
      stdout: '{"success":true,"taskId":"esc1","name":"Test"}',
      stderr: '',
    });

    await addOmniFocusTask({ name: "Task with 'quotes'" });

    const scriptArg = mockExec.mock.calls[0][0] as string;
    // The function escapes quotes with backslash
    expect(scriptArg).toContain("\\'quotes\\'");
  });
});
