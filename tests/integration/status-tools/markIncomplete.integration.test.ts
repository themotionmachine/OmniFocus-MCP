import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { markComplete } from '../../../src/tools/primitives/markComplete.js';
import { markIncomplete } from '../../../src/tools/primitives/markIncomplete.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('markIncomplete integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  async function createTask(nameSuffix: string): Promise<string> {
    const name = `Status Test - markIncomplete ${nameSuffix} ${Date.now()}`;
    const result = await addOmniFocusTask({ name });
    if (!result.success || !result.taskId) {
      throw new Error(`Failed to create test task: ${JSON.stringify(result)}`);
    }
    createdTaskIds.push(result.taskId);
    await waitForSync();
    return result.taskId;
  }

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

  it('should reopen a completed task', async () => {
    const taskId = await createTask('Reopen');

    // Complete it first
    await markComplete({ items: [{ id: taskId }] });
    await waitForSync();

    // Verify it's completed
    let getResult = await getTask({ id: taskId });
    expect(getResult.success).toBe(true);
    if (getResult.success) {
      expect(getResult.task.completed).toBe(true);
    }

    // Now reopen it
    const result = await markIncomplete({ items: [{ id: taskId }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].itemId).toBe(taskId);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(0);

      // Verify the task is now active (incomplete)
      await waitForSync();
      getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.completed).toBe(false);
      }
    }
  });

  it('should be idempotent: already-active task returns ALREADY_ACTIVE', async () => {
    const taskId = await createTask('Idempotent');

    // Task is already active (never completed)
    const result = await markIncomplete({ items: [{ id: taskId }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].code).toBe('ALREADY_ACTIVE');
      expect(result.summary.succeeded).toBe(1);
    }
  });

  it('should handle batch with mixed completed and active tasks', async () => {
    const completedTaskId = await createTask('BatchCompleted');
    const activeTaskId = await createTask('BatchActive');

    // Complete the first task
    await markComplete({ items: [{ id: completedTaskId }] });
    await waitForSync();

    // Reopen both
    const result = await markIncomplete({
      items: [{ id: completedTaskId }, { id: activeTaskId }]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(2);
      expect(result.summary.failed).toBe(0);
      // First was completed, now active
      expect(result.results[0].success).toBe(true);
      // Second was already active — idempotent no-op
      expect(result.results[1].success).toBe(true);
      expect(result.results[1].code).toBe('ALREADY_ACTIVE');
    }
  });

  it('should handle batch with one invalid ID as partial failure', async () => {
    const taskId = await createTask('BatchPartial');

    // Complete the task so markIncomplete has something to do
    await markComplete({ items: [{ id: taskId }] });
    await waitForSync();

    const result = await markIncomplete({
      items: [{ id: taskId }, { id: 'nonexistent-task-id-99999' }]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].code).toBe('NOT_FOUND');
    }
  });

  it('should return NOT_FOUND for a non-existent task ID', async () => {
    const result = await markIncomplete({ items: [{ id: 'nonexistent-task-id-99999' }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].code).toBe('NOT_FOUND');
      expect(result.summary.failed).toBe(1);
    }
  });
});
