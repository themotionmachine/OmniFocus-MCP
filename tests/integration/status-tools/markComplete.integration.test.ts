import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { markComplete } from '../../../src/tools/primitives/markComplete.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('markComplete integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  async function createTask(nameSuffix: string): Promise<string> {
    const name = `Status Test - markComplete ${nameSuffix} ${Date.now()}`;
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

  it('should mark a task complete by ID', async () => {
    const taskId = await createTask('ByID');

    const result = await markComplete({ items: [{ id: taskId }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].itemId).toBe(taskId);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(0);
      expect(result.summary.total).toBe(1);

      // Verify via getTask
      await waitForSync();
      const getResult = await getTask({ id: taskId });
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.task.completed).toBe(true);
      }
    }
  });

  it('should mark a task complete with a backdated completionDate', async () => {
    const taskId = await createTask('Backdate');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const completionDate = yesterday.toISOString();

    const result = await markComplete({
      items: [{ id: taskId }],
      completionDate
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
      expect(result.summary.succeeded).toBe(1);
    }
  });

  it('should handle batch with one invalid ID as partial failure', async () => {
    const taskId = await createTask('BatchPartial');

    const result = await markComplete({
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

  it('should be idempotent: already-completed task returns ALREADY_COMPLETED', async () => {
    const taskId = await createTask('Idempotent');

    // First call: complete the task
    await markComplete({ items: [{ id: taskId }] });
    await waitForSync();

    // Second call: should be a no-op with ALREADY_COMPLETED code
    const result = await markComplete({ items: [{ id: taskId }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].code).toBe('ALREADY_COMPLETED');
      expect(result.summary.succeeded).toBe(1);
    }
  });

  it('should mark multiple tasks complete in a batch', async () => {
    const taskId1 = await createTask('Batch1');
    const taskId2 = await createTask('Batch2');
    const taskId3 = await createTask('Batch3');

    const result = await markComplete({
      items: [{ id: taskId1 }, { id: taskId2 }, { id: taskId3 }]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(3);
      expect(result.summary.succeeded).toBe(3);
      expect(result.summary.failed).toBe(0);
      for (const itemResult of result.results) {
        expect(itemResult.success).toBe(true);
        expect(itemResult.itemType).toBe('task');
      }
    }
  });

  it('should return NOT_FOUND for a non-existent task ID', async () => {
    const result = await markComplete({ items: [{ id: 'nonexistent-task-id-99999' }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].code).toBe('NOT_FOUND');
      expect(result.summary.failed).toBe(1);
    }
  });
});
