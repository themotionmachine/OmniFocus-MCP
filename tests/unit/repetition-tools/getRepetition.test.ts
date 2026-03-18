import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRepetition } from '../../../src/tools/primitives/getRepetition.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

const makeRepetitionRule = (overrides: Record<string, unknown> = {}) => ({
  ruleString: 'FREQ=WEEKLY;BYDAY=MO',
  isRepeating: true,
  scheduleType: 'Regularly',
  anchorDateKey: 'DueDate',
  catchUpAutomatically: false,
  method: 'DueDate',
  ...overrides
});

describe('getRepetition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return full RepetitionRuleData when task has a rule', async () => {
    const rule = makeRepetitionRule();
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Weekly Report',
      hasRule: true,
      rule
    });

    const result = await getRepetition({ id: 'task-abc' });

    expect(result.success).toBe(true);
    if (result.success && result.hasRule) {
      expect(result.id).toBe('task-abc');
      expect(result.name).toBe('Weekly Report');
      expect(result.hasRule).toBe(true);
      expect(result.rule.ruleString).toBe('FREQ=WEEKLY;BYDAY=MO');
      expect(result.rule.isRepeating).toBe(true);
      expect(result.rule.scheduleType).toBe('Regularly');
      expect(result.rule.anchorDateKey).toBe('DueDate');
      expect(result.rule.catchUpAutomatically).toBe(false);
      expect(result.rule.method).toBe('DueDate');
    }
  });

  it('should return hasRule: false and rule: null when task has no rule', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-xyz',
      name: 'One-off Task',
      hasRule: false,
      rule: null
    });

    const result = await getRepetition({ id: 'task-xyz' });

    expect(result.success).toBe(true);
    if (result.success && !result.hasRule) {
      expect(result.id).toBe('task-xyz');
      expect(result.name).toBe('One-off Task');
      expect(result.hasRule).toBe(false);
      expect(result.rule).toBeNull();
    }
  });

  it('should resolve project ID to root task and return root task ID in rule data', async () => {
    const rule = makeRepetitionRule({ ruleString: 'FREQ=MONTHLY', scheduleType: null });
    // OmniJS returns the root task ID (task.id.primaryKey), not the project ID
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'root-task-of-proj-111',
      name: 'Monthly Project',
      hasRule: true,
      rule
    });

    const result = await getRepetition({ id: 'proj-111' });

    expect(result.success).toBe(true);
    if (result.success && result.hasRule) {
      expect(result.id).toBe('root-task-of-proj-111');
      expect(result.rule.ruleString).toBe('FREQ=MONTHLY');
    }
  });

  it('should return NOT_FOUND error when ID does not exist', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: "Task 'nonexistent-id' not found"
    });

    const result = await getRepetition({ id: 'nonexistent-id' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('nonexistent-id');
    }
  });

  it('should return structured error when OmniJS throws', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: 'Cannot read property repetitionRule of null'
    });

    const result = await getRepetition({ id: 'task-bad' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('should handle empty script output as an error', async () => {
    mockExecuteOmniJS.mockResolvedValue(null);

    const result = await getRepetition({ id: 'task-empty' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    }
  });

  it('should still return rule data for a completed task', async () => {
    const rule = makeRepetitionRule({ ruleString: 'FREQ=DAILY' });
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-done',
      name: 'Completed Daily Task',
      hasRule: true,
      rule
    });

    const result = await getRepetition({ id: 'task-done' });

    expect(result.success).toBe(true);
    if (result.success && result.hasRule) {
      expect(result.rule.ruleString).toBe('FREQ=DAILY');
      expect(result.rule.isRepeating).toBe(true);
    }
  });

  it('should call executeOmniJS exactly once per invocation', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Task',
      hasRule: false,
      rule: null
    });

    await getRepetition({ id: 'task-abc' });

    expect(mockExecuteOmniJS).toHaveBeenCalledTimes(1);
  });

  it('should embed the task id in the generated OmniJS script', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-special-id-99',
      name: 'Task',
      hasRule: false,
      rule: null
    });

    await getRepetition({ id: 'task-special-id-99' });

    const scriptContent = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(scriptContent).toContain('task-special-id-99');
  });

  it('should return v4.7+ fields as null when scheduleType is null', async () => {
    const rule = makeRepetitionRule({
      scheduleType: null,
      anchorDateKey: null,
      catchUpAutomatically: null,
      method: null
    });
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-legacy',
      name: 'Legacy Task',
      hasRule: true,
      rule
    });

    const result = await getRepetition({ id: 'task-legacy' });

    expect(result.success).toBe(true);
    if (result.success && result.hasRule) {
      expect(result.rule.scheduleType).toBeNull();
      expect(result.rule.anchorDateKey).toBeNull();
      expect(result.rule.catchUpAutomatically).toBeNull();
      expect(result.rule.method).toBeNull();
    }
  });
});
