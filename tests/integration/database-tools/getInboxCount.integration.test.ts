import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { getInboxCount } from '../../../src/tools/primitives/getInboxCount.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('getInboxCount integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  afterEach(async () => {
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTaskIds.length = 0;
  });

  it('should return a well-formed response with a count field', async () => {
    const result = await getInboxCount();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.count).toBe('number');
    }
  });

  it('should return a non-negative count', async () => {
    const result = await getInboxCount();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.count).toBeGreaterThanOrEqual(0);
    }
  });

  it('should increase count by 1 when a new inbox task is created', async () => {
    // Get baseline count
    const before = await getInboxCount();
    expect(before.success).toBe(true);
    if (!before.success) return;

    const baselineCount = before.count;

    // Create a task (no projectId → goes to inbox)
    const taskName = `GetInboxCount Test - ${Date.now()}`;
    const taskResult = await addOmniFocusTask({ name: taskName });
    expect(taskResult.success).toBe(true);
    if (!taskResult.success || !taskResult.taskId) return;
    createdTaskIds.push(taskResult.taskId);
    await waitForSync();

    // Get new count
    const after = await getInboxCount();
    expect(after.success).toBe(true);
    if (after.success) {
      expect(after.count).toBe(baselineCount + 1);
    }
  });
});
