import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCommonRepetition } from '../../../src/tools/primitives/setCommonRepetition.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('setCommonRepetition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Preset ICS mapping tests ---

  it('daily preset generates FREQ=DAILY', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Daily Task',
      ruleString: 'FREQ=DAILY'
    });

    const result = await setCommonRepetition({ id: 'task-abc', preset: 'daily' });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=DAILY');
  });

  it('weekdays preset generates FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Weekday Task',
      ruleString: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
    });

    const result = await setCommonRepetition({ id: 'task-abc', preset: 'weekdays' });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
  });

  it('weekly preset without days generates FREQ=WEEKLY', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Weekly Task',
      ruleString: 'FREQ=WEEKLY'
    });

    const result = await setCommonRepetition({ id: 'task-abc', preset: 'weekly' });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=WEEKLY');
    expect(script).not.toContain('BYDAY');
  });

  it('weekly preset with days=[MO,WE,FR] generates FREQ=WEEKLY;BYDAY=MO,WE,FR', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'MWF Task',
      ruleString: 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
    });

    const result = await setCommonRepetition({
      id: 'task-abc',
      preset: 'weekly',
      days: ['MO', 'WE', 'FR']
    });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });

  it('biweekly preset generates FREQ=WEEKLY;INTERVAL=2', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Biweekly Task',
      ruleString: 'FREQ=WEEKLY;INTERVAL=2'
    });

    const result = await setCommonRepetition({ id: 'task-abc', preset: 'biweekly' });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=WEEKLY;INTERVAL=2');
  });

  it('monthly preset without dayOfMonth generates FREQ=MONTHLY', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Monthly Task',
      ruleString: 'FREQ=MONTHLY'
    });

    const result = await setCommonRepetition({ id: 'task-abc', preset: 'monthly' });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=MONTHLY');
    expect(script).not.toContain('BYMONTHDAY');
  });

  it('monthly preset with dayOfMonth=15 generates FREQ=MONTHLY;BYMONTHDAY=15', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Monthly on 15th',
      ruleString: 'FREQ=MONTHLY;BYMONTHDAY=15'
    });

    const result = await setCommonRepetition({
      id: 'task-abc',
      preset: 'monthly',
      dayOfMonth: 15
    });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=MONTHLY;BYMONTHDAY=15');
  });

  it('monthly_last_day preset generates FREQ=MONTHLY;BYMONTHDAY=-1', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Month End Task',
      ruleString: 'FREQ=MONTHLY;BYMONTHDAY=-1'
    });

    const result = await setCommonRepetition({ id: 'task-abc', preset: 'monthly_last_day' });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=MONTHLY;BYMONTHDAY=-1');
  });

  it('quarterly preset generates FREQ=MONTHLY;INTERVAL=3', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Quarterly Review',
      ruleString: 'FREQ=MONTHLY;INTERVAL=3'
    });

    const result = await setCommonRepetition({ id: 'task-abc', preset: 'quarterly' });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=MONTHLY;INTERVAL=3');
  });

  it('yearly preset generates FREQ=YEARLY', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Annual Review',
      ruleString: 'FREQ=YEARLY'
    });

    const result = await setCommonRepetition({ id: 'task-abc', preset: 'yearly' });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=YEARLY');
  });

  // --- Modifier ignore tests ---

  it('days silently ignored for daily preset (no BYDAY in script)', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Daily Task',
      ruleString: 'FREQ=DAILY'
    });

    const result = await setCommonRepetition({
      id: 'task-abc',
      preset: 'daily',
      days: ['MO', 'WE']
    });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=DAILY');
    expect(script).not.toContain('BYDAY=MO,WE');
  });

  it('days silently ignored for monthly preset (no extra BYDAY in script)', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Monthly Task',
      ruleString: 'FREQ=MONTHLY'
    });

    const result = await setCommonRepetition({
      id: 'task-abc',
      preset: 'monthly',
      days: ['MO', 'FR']
    });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=MONTHLY');
    expect(script).not.toContain('BYDAY=MO,FR');
  });

  it('dayOfMonth silently ignored for daily preset (no BYMONTHDAY in script)', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Daily Task',
      ruleString: 'FREQ=DAILY'
    });

    const result = await setCommonRepetition({
      id: 'task-abc',
      preset: 'daily',
      dayOfMonth: 15
    });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=DAILY');
    expect(script).not.toContain('BYMONTHDAY');
  });

  it('dayOfMonth silently ignored for weekly preset (no BYMONTHDAY in script)', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Weekly Task',
      ruleString: 'FREQ=WEEKLY'
    });

    const result = await setCommonRepetition({
      id: 'task-abc',
      preset: 'weekly',
      dayOfMonth: 10
    });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('FREQ=WEEKLY');
    expect(script).not.toContain('BYMONTHDAY');
  });

  // --- Item resolution tests ---

  it('should resolve project ID to root task and return root task ID', async () => {
    // OmniJS returns the root task ID (task.id.primaryKey), not the project ID
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'root-task-of-proj-111',
      name: 'Monthly Project',
      ruleString: 'FREQ=MONTHLY'
    });

    const result = await setCommonRepetition({ id: 'proj-111', preset: 'monthly' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('root-task-of-proj-111');
      expect(result.name).toBe('Monthly Project');
      expect(result.ruleString).toBe('FREQ=MONTHLY');
    }
  });

  it('should embed the task id in the generated OmniJS script', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-special-99',
      name: 'Task',
      ruleString: 'FREQ=DAILY'
    });

    await setCommonRepetition({ id: 'task-special-99', preset: 'daily' });

    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('task-special-99');
  });

  it('should call executeOmniJS exactly once per invocation', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Task',
      ruleString: 'FREQ=DAILY'
    });

    await setCommonRepetition({ id: 'task-abc', preset: 'daily' });

    expect(mockExecuteOmniJS).toHaveBeenCalledTimes(1);
  });

  // --- Error tests ---

  it('should return NOT_FOUND error when ID does not exist', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: "Task 'nonexistent-id' not found"
    });

    const result = await setCommonRepetition({ id: 'nonexistent-id', preset: 'daily' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('nonexistent-id');
    }
  });

  it('should return structured error when OmniJS throws', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: 'Cannot set repetitionRule on null task'
    });

    const result = await setCommonRepetition({ id: 'task-bad', preset: 'weekly' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('should handle null result from executeOmniJS as an error', async () => {
    mockExecuteOmniJS.mockResolvedValue(null);

    const result = await setCommonRepetition({ id: 'task-empty', preset: 'daily' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    }
  });

  // --- Return shape tests ---

  it('should return success response with id, name, and ruleString', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Review Task',
      ruleString: 'FREQ=WEEKLY'
    });

    const result = await setCommonRepetition({ id: 'task-abc', preset: 'weekly' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('task-abc');
      expect(result.name).toBe('Review Task');
      expect(result.ruleString).toBe('FREQ=WEEKLY');
    }
  });
});
