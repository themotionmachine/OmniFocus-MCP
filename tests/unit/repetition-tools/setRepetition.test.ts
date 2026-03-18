import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setRepetition } from '../../../src/tools/primitives/setRepetition.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('setRepetition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set a rule on a task using the legacy 2-param constructor', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-1',
      name: 'Daily Task',
      ruleString: 'FREQ=DAILY'
    });

    const result = await setRepetition({ id: 'task-1', ruleString: 'FREQ=DAILY' });

    expect(result.success).toBe(true);

    const scriptContent = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(scriptContent).toContain('new Task.RepetitionRule');
  });

  it('should return success response with id, name, and ruleString', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Weekly Report',
      ruleString: 'FREQ=WEEKLY;BYDAY=MO'
    });

    const result = await setRepetition({
      id: 'task-abc',
      ruleString: 'FREQ=WEEKLY;BYDAY=MO'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('task-abc');
      expect(result.name).toBe('Weekly Report');
      expect(result.ruleString).toBe('FREQ=WEEKLY;BYDAY=MO');
    }
  });

  it('should replace an existing rule when task already has one', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-existing',
      name: 'Previously Daily Task',
      ruleString: 'FREQ=WEEKLY'
    });

    const result = await setRepetition({
      id: 'task-existing',
      ruleString: 'FREQ=WEEKLY'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ruleString).toBe('FREQ=WEEKLY');
    }
  });

  it('should resolve project ID to root task and return root task ID', async () => {
    // OmniJS returns the root task ID (task.id.primaryKey), not the project ID
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'root-task-of-proj-111',
      name: 'Monthly Project',
      ruleString: 'FREQ=MONTHLY'
    });

    const result = await setRepetition({
      id: 'proj-111',
      ruleString: 'FREQ=MONTHLY'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('root-task-of-proj-111');
    }
  });

  it('should return NOT_FOUND error when ID does not exist', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: "Item 'nonexistent-id' not found as task or project"
    });

    const result = await setRepetition({
      id: 'nonexistent-id',
      ruleString: 'FREQ=DAILY'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('nonexistent-id');
    }
  });

  it('should return OmniJS error when ICS string is invalid', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: 'Invalid recurrence rule string: INVALID_RULE'
    });

    const result = await setRepetition({
      id: 'task-abc',
      ruleString: 'INVALID_RULE'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('should escape special characters in ruleString via escapeForJS', async () => {
    const specialRuleString = 'FREQ=WEEKLY;BYDAY=MO\\WE"FR\n';
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-special',
      name: 'Special Task',
      ruleString: specialRuleString
    });

    await setRepetition({ id: 'task-special', ruleString: specialRuleString });

    const scriptContent = mockExecuteOmniJS.mock.calls[0][0] as string;
    // Backslash should be escaped as double backslash
    expect(scriptContent).toContain('\\\\');
    // Double quote should be escaped
    expect(scriptContent).toContain('\\"');
    // Newline should be escaped as \n literal
    expect(scriptContent).toContain('\\n');
  });

  it('should embed the ruleString in the generated OmniJS script', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-1',
      name: 'Task',
      ruleString: 'FREQ=MONTHLY;BYMONTHDAY=15'
    });

    await setRepetition({ id: 'task-1', ruleString: 'FREQ=MONTHLY;BYMONTHDAY=15' });

    const scriptContent = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(scriptContent).toContain('FREQ=MONTHLY;BYMONTHDAY=15');
  });

  it('should embed the task id in the generated OmniJS script', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-special-id-99',
      name: 'Task',
      ruleString: 'FREQ=DAILY'
    });

    await setRepetition({ id: 'task-special-id-99', ruleString: 'FREQ=DAILY' });

    const scriptContent = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(scriptContent).toContain('task-special-id-99');
  });

  it('should succeed setting a rule on a completed task', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-done',
      name: 'Completed Daily Task',
      ruleString: 'FREQ=DAILY'
    });

    const result = await setRepetition({
      id: 'task-done',
      ruleString: 'FREQ=DAILY'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ruleString).toBe('FREQ=DAILY');
    }
  });

  it('should call executeOmniJS exactly once per invocation', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Task',
      ruleString: 'FREQ=DAILY'
    });

    await setRepetition({ id: 'task-abc', ruleString: 'FREQ=DAILY' });

    expect(mockExecuteOmniJS).toHaveBeenCalledTimes(1);
  });

  it('should return an error when executeOmniJS returns null', async () => {
    mockExecuteOmniJS.mockResolvedValue(null);

    const result = await setRepetition({ id: 'task-abc', ruleString: 'FREQ=DAILY' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('should return an error when executeOmniJS returns undefined', async () => {
    mockExecuteOmniJS.mockResolvedValue(undefined);

    const result = await setRepetition({ id: 'task-abc', ruleString: 'FREQ=DAILY' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    }
  });

  it('should use legacy 2-param constructor with null as second argument', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-1',
      name: 'Task',
      ruleString: 'FREQ=DAILY'
    });

    await setRepetition({ id: 'task-1', ruleString: 'FREQ=DAILY' });

    const scriptContent = mockExecuteOmniJS.mock.calls[0][0] as string;
    // The legacy constructor is new Task.RepetitionRule(ruleString, null)
    expect(scriptContent).toMatch(/new Task\.RepetitionRule\([^)]*null[^)]*\)/);
  });
});
