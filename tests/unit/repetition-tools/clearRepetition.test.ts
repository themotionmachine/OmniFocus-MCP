import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRepetition } from '../../../src/tools/primitives/clearRepetition.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('clearRepetition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear an existing repetition rule and return success', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-1',
      name: 'Weekly Report'
    });

    const result = await clearRepetition({ id: 'task-1' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('task-1');
      expect(result.name).toBe('Weekly Report');
    }
  });

  it('should generate OmniJS script containing task.repetitionRule = null', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-1',
      name: 'Weekly Report'
    });

    await clearRepetition({ id: 'task-1' });

    const scriptContent = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(scriptContent).toContain('task.repetitionRule = null');
  });

  it('should be idempotent when task has no existing rule (succeeds)', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-no-rule',
      name: 'One-off Task'
    });

    const result = await clearRepetition({ id: 'task-no-rule' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('task-no-rule');
      expect(result.name).toBe('One-off Task');
    }
  });

  it('should resolve project ID to root task and return root task ID', async () => {
    // OmniJS returns the root task ID (task.id.primaryKey), not the project ID
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'root-task-of-proj-111',
      name: 'Monthly Project'
    });

    const result = await clearRepetition({ id: 'proj-111' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('root-task-of-proj-111');
      expect(result.name).toBe('Monthly Project');
    }
  });

  it('should embed the task id in the generated OmniJS script', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-special-id-99',
      name: 'Task'
    });

    await clearRepetition({ id: 'task-special-id-99' });

    const scriptContent = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(scriptContent).toContain('task-special-id-99');
  });

  it('should return NOT_FOUND error when ID does not exist', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: "Task 'nonexistent-id' not found"
    });

    const result = await clearRepetition({ id: 'nonexistent-id' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('nonexistent-id');
    }
  });

  it('should call executeOmniJS exactly once per invocation', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Task'
    });

    await clearRepetition({ id: 'task-abc' });

    expect(mockExecuteOmniJS).toHaveBeenCalledTimes(1);
  });

  it('should return error when executeOmniJS returns null', async () => {
    mockExecuteOmniJS.mockResolvedValue(null);

    const result = await clearRepetition({ id: 'task-empty' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('should succeed when clearing a rule mid-recurrence (current instance remains)', async () => {
    // Clearing a rule mid-recurrence means the OmniFocus task itself still exists
    // (the current instance is not deleted), but no future occurrences will be created.
    // From the MCP perspective this is still a successful clear operation.
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-mid-recurrence',
      name: 'Mid-Recurrence Task'
    });

    const result = await clearRepetition({ id: 'task-mid-recurrence' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('task-mid-recurrence');
      expect(result.name).toBe('Mid-Recurrence Task');
    }
  });

  it('should pass a string script to executeOmniJS (not a file path)', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Task'
    });

    await clearRepetition({ id: 'task-abc' });

    const [arg] = mockExecuteOmniJS.mock.calls[0];
    expect(typeof arg).toBe('string');
    // Script should be an IIFE wrapping OmniJS logic, not a file path
    expect(arg as string).toContain('(function()');
  });
});
