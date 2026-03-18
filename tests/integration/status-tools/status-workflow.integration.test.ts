/**
 * Integration tests for the Task Status & Completion end-to-end workflow.
 *
 * These tests require OmniFocus to be running on the test machine.
 * They verify the complete tool chain: mark_complete → mark_incomplete → drop_items
 * lifecycle on a test task created fresh for each run.
 *
 * Individual tool tests are in their own files:
 *   - markComplete.integration.test.ts
 *   - markIncomplete.integration.test.ts
 *   - dropItems.integration.test.ts
 *   - setProjectType.integration.test.ts
 *   - getNextTask.integration.test.ts
 *   - setFloatingTimezone.integration.test.ts
 */
import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { dropItems } from '../../../src/tools/primitives/dropItems.js';
import { getTask } from '../../../src/tools/primitives/getTask.js';
import { markComplete } from '../../../src/tools/primitives/markComplete.js';
import { markIncomplete } from '../../../src/tools/primitives/markIncomplete.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

describe('Status Workflow integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  async function createTask(nameSuffix: string): Promise<string> {
    const name = `Status Test - Workflow ${nameSuffix} ${Date.now()}`;
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

  it('should complete a full status lifecycle: complete → reopen → drop', async () => {
    const taskId = await createTask('FullLifecycle');

    // Step 1: Mark task as complete
    const completeResult = await markComplete({ items: [{ id: taskId }] });
    expect(completeResult.success).toBe(true);
    if (completeResult.success) {
      expect(completeResult.results[0].success).toBe(true);
      expect(completeResult.summary.succeeded).toBe(1);
    }

    await waitForSync();

    // Verify it's completed
    let getResult = await getTask({ id: taskId });
    expect(getResult.success).toBe(true);
    if (getResult.success) {
      expect(getResult.task.completed).toBe(true);
    }

    // Step 2: Reopen the completed task
    const incompleteResult = await markIncomplete({ items: [{ id: taskId }] });
    expect(incompleteResult.success).toBe(true);
    if (incompleteResult.success) {
      expect(incompleteResult.results[0].success).toBe(true);
      expect(incompleteResult.summary.succeeded).toBe(1);
    }

    await waitForSync();

    // Verify it's active again
    getResult = await getTask({ id: taskId });
    expect(getResult.success).toBe(true);
    if (getResult.success) {
      expect(getResult.task.completed).toBe(false);
    }

    // Step 3: Drop the task
    const dropResult = await dropItems({ items: [{ id: taskId }] });
    expect(dropResult.success).toBe(true);
    if (dropResult.success) {
      expect(dropResult.results[0].success).toBe(true);
      expect(dropResult.summary.succeeded).toBe(1);
    }
  });

  it('should handle the same item appearing multiple times in a batch (idempotent)', async () => {
    const taskId = await createTask('DuplicateInBatch');

    // Submit the same item twice in one batch
    const result = await markComplete({
      items: [{ id: taskId }, { id: taskId }]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      // First occurrence completes it, second sees ALREADY_COMPLETED
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(result.results[1].code).toBe('ALREADY_COMPLETED');
    }
  });

  it('should process a batch with mixed valid and invalid items continuing past failures', async () => {
    const taskId = await createTask('BatchMixed');

    const result = await markComplete({
      items: [
        { id: 'nonexistent-task-id-99991' },
        { id: taskId },
        { id: 'nonexistent-task-id-99992' }
      ]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(3);
      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(2);
      expect(result.results[0].success).toBe(false);
      expect(result.results[1].success).toBe(true);
      expect(result.results[2].success).toBe(false);
    }
  });
});
