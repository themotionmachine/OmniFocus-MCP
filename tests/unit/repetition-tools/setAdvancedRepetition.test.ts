import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAdvancedRepetition } from '../../../src/tools/primitives/setAdvancedRepetition.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

const mockExecuteOmniJS = vi.mocked(executeOmniJS);

describe('setAdvancedRepetition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Version gate ---

  it('should return error when OmniFocus version is pre-4.7', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: 'set_advanced_repetition requires OmniFocus 4.7 or later (current: 4.1)'
    });

    const result = await setAdvancedRepetition({
      id: 'task-abc',
      scheduleType: 'Regularly'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('4.7');
    }
  });

  // --- Sets all params with 5-param constructor ---

  it('should set all params using the 5-param constructor', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Weekly Report',
      ruleString: 'FREQ=WEEKLY;BYDAY=MO'
    });

    const result = await setAdvancedRepetition({
      id: 'task-abc',
      ruleString: 'FREQ=WEEKLY;BYDAY=MO',
      scheduleType: 'Regularly',
      anchorDateKey: 'DueDate',
      catchUpAutomatically: true
    });

    expect(result.success).toBe(true);
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('new Task.RepetitionRule');
  });

  it('should return success response with id, name, and ruleString', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Weekly Report',
      ruleString: 'FREQ=WEEKLY;BYDAY=MO'
    });

    const result = await setAdvancedRepetition({
      id: 'task-abc',
      ruleString: 'FREQ=WEEKLY;BYDAY=MO',
      scheduleType: 'Regularly',
      anchorDateKey: 'DueDate',
      catchUpAutomatically: false
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('task-abc');
      expect(result.name).toBe('Weekly Report');
      expect(result.ruleString).toBe('FREQ=WEEKLY;BYDAY=MO');
    }
  });

  // --- Read-then-merge: preserve existing rule when only changing scheduleType ---

  it('should read-then-merge: preserve existing ruleString when only changing scheduleType', async () => {
    // The OmniJS script reads the existing rule and merges; mock returns success with merged values
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-existing',
      name: 'Existing Repeating Task',
      ruleString: 'FREQ=DAILY'
    });

    const result = await setAdvancedRepetition({
      id: 'task-existing',
      scheduleType: 'FromCompletion'
      // ruleString omitted — should be read from existing rule in OmniJS
    });

    expect(result.success).toBe(true);
    // The script should perform a read-then-merge pattern (not provide ruleString upfront)
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('task.repetitionRule');
  });

  // --- Error when no existing rule and no ruleString provided ---

  it('should return error when no existing rule and no ruleString provided', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: 'No ruleString provided and task has no existing repetition rule to merge with'
    });

    const result = await setAdvancedRepetition({
      id: 'task-no-rule',
      scheduleType: 'Regularly'
      // ruleString omitted and task has no existing rule
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  // --- Project resolution ---

  it('should resolve project ID to root task and return root task ID', async () => {
    // OmniJS returns the root task ID (task.id.primaryKey), not the project ID
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'root-task-of-proj-111',
      name: 'Monthly Project',
      ruleString: 'FREQ=MONTHLY'
    });

    const result = await setAdvancedRepetition({
      id: 'proj-111',
      ruleString: 'FREQ=MONTHLY',
      scheduleType: 'Regularly'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('root-task-of-proj-111');
    }
  });

  // --- NOT_FOUND error ---

  it('should return NOT_FOUND error when ID does not exist', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: "Item 'nonexistent-id' not found as task or project"
    });

    const result = await setAdvancedRepetition({
      id: 'nonexistent-id',
      ruleString: 'FREQ=DAILY',
      scheduleType: 'Regularly'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('nonexistent-id');
    }
  });

  // --- OmniJS constructor error ---

  it('should return error when OmniJS 5-param constructor throws', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: 'Invalid repetition parameters passed to Task.RepetitionRule constructor'
    });

    const result = await setAdvancedRepetition({
      id: 'task-abc',
      ruleString: 'INVALID_RULE',
      scheduleType: 'Regularly',
      anchorDateKey: 'DueDate',
      catchUpAutomatically: false
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  // --- Null scheduleType/anchorDateKey from legacy rule ---

  it('should pass null scheduleType and anchorDateKey to constructor when legacy rule has no v4.7+ data', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-legacy',
      name: 'Legacy Task',
      ruleString: 'FREQ=DAILY'
    });

    // Only catchUpAutomatically provided; scheduleType and anchorDateKey will be
    // null from the existing legacy rule — OmniFocus applies defaults
    const result = await setAdvancedRepetition({
      id: 'task-legacy',
      catchUpAutomatically: true
    });

    expect(result.success).toBe(true);
    // The script should still construct the repetition rule with null for the omitted fields
    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('task.repetitionRule');
  });

  // --- Project with null root task ---

  it('should return error when project has null root task', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: false,
      error: "Project 'proj-bad' has no root task — data integrity issue"
    });

    const result = await setAdvancedRepetition({
      id: 'proj-bad',
      ruleString: 'FREQ=DAILY',
      scheduleType: 'Regularly'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  // --- executeOmniJS called exactly once ---

  it('should call executeOmniJS exactly once per invocation', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-abc',
      name: 'Task',
      ruleString: 'FREQ=DAILY'
    });

    await setAdvancedRepetition({
      id: 'task-abc',
      ruleString: 'FREQ=DAILY',
      scheduleType: 'Regularly'
    });

    expect(mockExecuteOmniJS).toHaveBeenCalledTimes(1);
  });

  // --- Null result returns error ---

  it('should return error when executeOmniJS returns null', async () => {
    mockExecuteOmniJS.mockResolvedValue(null);

    const result = await setAdvancedRepetition({
      id: 'task-abc',
      ruleString: 'FREQ=DAILY'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('should return error when executeOmniJS returns undefined', async () => {
    mockExecuteOmniJS.mockResolvedValue(undefined);

    const result = await setAdvancedRepetition({
      id: 'task-abc',
      ruleString: 'FREQ=DAILY'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    }
  });

  // --- Script content verification ---

  it('should embed the task id in the generated OmniJS script', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-special-id-99',
      name: 'Task',
      ruleString: 'FREQ=DAILY'
    });

    await setAdvancedRepetition({
      id: 'task-special-id-99',
      ruleString: 'FREQ=DAILY',
      scheduleType: 'Regularly'
    });

    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('task-special-id-99');
  });

  it('should include version check in the generated OmniJS script', async () => {
    mockExecuteOmniJS.mockResolvedValue({
      success: true,
      id: 'task-1',
      name: 'Task',
      ruleString: 'FREQ=DAILY'
    });

    await setAdvancedRepetition({
      id: 'task-1',
      ruleString: 'FREQ=DAILY'
    });

    const script = mockExecuteOmniJS.mock.calls[0][0] as string;
    expect(script).toContain('4.7');
  });
});
