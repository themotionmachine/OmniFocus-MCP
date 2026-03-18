import { afterEach, describe, expect, it } from 'vitest';
import { clearRepetition } from '../../../src/tools/primitives/clearRepetition.js';
import { getRepetition } from '../../../src/tools/primitives/getRepetition.js';
import { setAdvancedRepetition } from '../../../src/tools/primitives/setAdvancedRepetition.js';
import { setCommonRepetition } from '../../../src/tools/primitives/setCommonRepetition.js';
import { setRepetition } from '../../../src/tools/primitives/setRepetition.js';
import {
  createTestTask,
  deleteTestTask,
  skipIfOmniFocusUnavailable,
  waitForSync
} from '../helpers/index.js';

describe('Repetition Rules Integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  async function createTaskLocal(name: string): Promise<string> {
    const id = await createTestTask(name);
    createdTaskIds.push(id);
    await waitForSync();
    return id;
  }

  afterEach(async () => {
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await deleteTestTask(id);
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTaskIds.length = 0;
  });

  // 1. set_repetition → get_repetition round-trip
  it('should set a daily repetition rule and read it back', async () => {
    const taskId = await createTaskLocal(`Repetition Test - SetGet ${Date.now()}`);

    const setResult = await setRepetition({ id: taskId, ruleString: 'FREQ=DAILY' });
    expect(setResult.success).toBe(true);
    if (setResult.success) {
      expect(setResult.ruleString).toContain('FREQ=DAILY');
    }

    await waitForSync();

    const getResult = await getRepetition({ id: taskId });
    expect(getResult.success).toBe(true);
    if (getResult.success) {
      expect(getResult.hasRule).toBe(true);
      if (getResult.hasRule) {
        expect(getResult.rule.ruleString).toContain('FREQ=DAILY');
        expect(getResult.rule.isRepeating).toBe(true);
      }
    }
  });

  // 2. set_repetition replaces existing rule
  it('should replace a weekly rule with a monthly rule', async () => {
    const taskId = await createTaskLocal(`Repetition Test - Replace ${Date.now()}`);

    await setRepetition({ id: taskId, ruleString: 'FREQ=WEEKLY' });
    await waitForSync();

    const setResult = await setRepetition({ id: taskId, ruleString: 'FREQ=MONTHLY' });
    expect(setResult.success).toBe(true);
    if (setResult.success) {
      expect(setResult.ruleString).toContain('FREQ=MONTHLY');
    }

    await waitForSync();

    const getResult = await getRepetition({ id: taskId });
    expect(getResult.success).toBe(true);
    if (getResult.success && getResult.hasRule) {
      expect(getResult.rule.ruleString).toContain('FREQ=MONTHLY');
      expect(getResult.rule.ruleString).not.toContain('FREQ=WEEKLY');
    }
  });

  // 3. clear_repetition → get_repetition
  it('should clear a repetition rule and verify hasRule: false', async () => {
    const taskId = await createTaskLocal(`Repetition Test - Clear ${Date.now()}`);

    await setRepetition({ id: taskId, ruleString: 'FREQ=DAILY' });
    await waitForSync();

    const clearResult = await clearRepetition({ id: taskId });
    expect(clearResult.success).toBe(true);

    await waitForSync();

    const getResult = await getRepetition({ id: taskId });
    expect(getResult.success).toBe(true);
    if (getResult.success) {
      expect(getResult.hasRule).toBe(false);
      expect(getResult.rule).toBeNull();
    }
  });

  // 4. clear_repetition is idempotent
  it('should succeed when clearing a task with no existing rule', async () => {
    const taskId = await createTaskLocal(`Repetition Test - Idempotent ${Date.now()}`);

    // Task has no rule — clear should still succeed
    const clearResult = await clearRepetition({ id: taskId });
    expect(clearResult.success).toBe(true);
    if (clearResult.success) {
      expect(clearResult.id).toBe(taskId);
    }
  });

  // 5. set_common_repetition with 'daily' preset
  it("should set a 'daily' common preset and verify FREQ=DAILY", async () => {
    const taskId = await createTaskLocal(`Repetition Test - CommonDaily ${Date.now()}`);

    const result = await setCommonRepetition({ id: taskId, preset: 'daily' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ruleString).toContain('FREQ=DAILY');
    }
  });

  // 6. set_common_repetition with 'weekly' preset and days
  it("should set a 'weekly' preset with MO,WE,FR days and verify BYDAY", async () => {
    const taskId = await createTaskLocal(`Repetition Test - CommonWeekly ${Date.now()}`);

    const result = await setCommonRepetition({
      id: taskId,
      preset: 'weekly',
      days: ['MO', 'WE', 'FR']
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ruleString).toContain('FREQ=WEEKLY');
      expect(result.ruleString).toContain('BYDAY');
    }

    await waitForSync();

    const getResult = await getRepetition({ id: taskId });
    expect(getResult.success).toBe(true);
    if (getResult.success && getResult.hasRule) {
      expect(getResult.rule.ruleString).toContain('BYDAY');
    }
  });

  // 7. set_common_repetition with 'monthly' preset and dayOfMonth
  it("should set a 'monthly' preset with dayOfMonth 15 and verify BYMONTHDAY=15", async () => {
    const taskId = await createTaskLocal(`Repetition Test - CommonMonthly ${Date.now()}`);

    const result = await setCommonRepetition({
      id: taskId,
      preset: 'monthly',
      dayOfMonth: 15
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ruleString).toContain('FREQ=MONTHLY');
      expect(result.ruleString).toContain('BYMONTHDAY=15');
    }
  });

  // 8. set_common_repetition with 'yearly' preset
  it("should set a 'yearly' preset and verify FREQ=YEARLY", async () => {
    const taskId = await createTaskLocal(`Repetition Test - CommonYearly ${Date.now()}`);

    const result = await setCommonRepetition({ id: taskId, preset: 'yearly' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ruleString).toContain('FREQ=YEARLY');
    }
  });

  // 9. get_repetition on task with no rule
  it('should return hasRule: false and rule: null for a task with no repetition rule', async () => {
    const taskId = await createTaskLocal(`Repetition Test - NoRule ${Date.now()}`);

    const getResult = await getRepetition({ id: taskId });
    expect(getResult.success).toBe(true);
    if (getResult.success) {
      expect(getResult.hasRule).toBe(false);
      expect(getResult.rule).toBeNull();
    }
  });

  // 10. get_repetition on non-existent ID
  it('should return success: false for a non-existent task ID', async () => {
    const getResult = await getRepetition({ id: 'nonexistent-task-id-12345' });
    expect(getResult.success).toBe(false);
    if (!getResult.success) {
      expect(getResult.error).toBeTruthy();
    }
  });

  // 11 & 12. set_advanced_repetition with scheduleType — handles both v4.7+ and pre-v4.7
  it('should handle set_advanced_repetition based on OmniFocus version', async () => {
    const taskId = await createTaskLocal(`Repetition Test - Advanced ${Date.now()}`);

    // First set a base rule (needed for merge)
    await setRepetition({ id: taskId, ruleString: 'FREQ=WEEKLY' });
    await waitForSync();

    const result = await setAdvancedRepetition({
      id: taskId,
      scheduleType: 'FromCompletion'
    });

    if (result.success) {
      // v4.7+ — advanced features available
      expect(result.ruleString).toBeTruthy();

      await waitForSync();
      const getResult = await getRepetition({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success && getResult.hasRule) {
        // On v4.7+, scheduleType should be FromCompletion
        if (getResult.rule.scheduleType != null) {
          expect(getResult.rule.scheduleType).toBe('FromCompletion');
        }
      }
    } else {
      // Pre-v4.7 — expect version error
      expect(result.error).toContain('v4.7');
    }
  });

  // 13. Full lifecycle: set_common → get → set_advanced → get → clear → get
  it('should complete full repetition lifecycle: set_common → get → set_advanced → get → clear → get', async () => {
    const taskId = await createTaskLocal(`Repetition Test - Lifecycle ${Date.now()}`);

    // Step 1: Set common preset
    const setCommonResult = await setCommonRepetition({
      id: taskId,
      preset: 'weekly',
      days: ['MO', 'WE', 'FR']
    });
    expect(setCommonResult.success).toBe(true);
    await waitForSync();

    // Step 2: Verify rule exists
    const getResult1 = await getRepetition({ id: taskId });
    expect(getResult1.success).toBe(true);
    if (getResult1.success) {
      expect(getResult1.hasRule).toBe(true);
      if (getResult1.hasRule) {
        expect(getResult1.rule.ruleString).toContain('BYDAY');
      }
    }

    // Step 3: Try advanced (handles both v4.7+ and pre-v4.7)
    await setAdvancedRepetition({ id: taskId, scheduleType: 'FromCompletion' });
    // Don't assert — may fail on pre-v4.7
    await waitForSync();

    // Step 4: Clear rule
    const clearResult = await clearRepetition({ id: taskId });
    expect(clearResult.success).toBe(true);
    await waitForSync();

    // Step 5: Verify cleared
    const getResult2 = await getRepetition({ id: taskId });
    expect(getResult2.success).toBe(true);
    if (getResult2.success) {
      expect(getResult2.hasRule).toBe(false);
      expect(getResult2.rule).toBeNull();
    }
  });
});
