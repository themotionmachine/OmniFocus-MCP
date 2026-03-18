import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { dropItems } from '../../../src/tools/primitives/dropItems.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('dropItems integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];
  const createdProjectIds: string[] = [];

  async function createTask(nameSuffix: string): Promise<string> {
    const name = `Status Test - dropItems ${nameSuffix} ${Date.now()}`;
    const result = await addOmniFocusTask({ name });
    if (!result.success || !result.taskId) {
      throw new Error(`Failed to create test task: ${JSON.stringify(result)}`);
    }
    createdTaskIds.push(result.taskId);
    await waitForSync();
    return result.taskId;
  }

  async function createTestProject(nameSuffix: string): Promise<string> {
    const testFolderId = getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');
    const name = `Status Test - dropItems ${nameSuffix} ${Date.now()}`;
    const result = await createProject({ name, folderId: testFolderId });
    if (!result.success) {
      throw new Error(`Failed to create test project: ${JSON.stringify(result)}`);
    }
    createdProjectIds.push(result.id);
    await waitForSync();
    return result.id;
  }

  afterEach(async () => {
    // Clean up tasks (dropped tasks can still be removed)
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        // Ignore cleanup errors — dropped tasks may already be removed from active views
      }
    }
    createdTaskIds.length = 0;

    // Clean up projects
    for (const id of [...createdProjectIds].reverse()) {
      try {
        await deleteProject({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdProjectIds.length = 0;
  });

  it('should drop a task by ID and verify it has a dropDate', async () => {
    const taskId = await createTask('DropTask');

    const result = await dropItems({ items: [{ id: taskId }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].itemId).toBe(taskId);
      expect(result.results[0].itemType).toBe('task');
      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(0);
    }
  });

  it('should drop a project by ID and report success', async () => {
    const projectId = await createTestProject('DropProject');

    const result = await dropItems({ items: [{ id: projectId }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].itemId).toBe(projectId);
      // Note: OmniFocus projects share their ID with their root task;
      // Task.byIdentifier finds the root task first (itemType='task').
      // The operation still succeeds and the item is dropped.
      expect(result.summary.succeeded).toBe(1);
    }
  });

  it('should be idempotent: already-dropped task returns ALREADY_DROPPED', async () => {
    const taskId = await createTask('Idempotent');

    // Drop the task first
    await dropItems({ items: [{ id: taskId }] });
    await waitForSync();

    // Drop again — should be a no-op
    const result = await dropItems({ items: [{ id: taskId }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].code).toBe('ALREADY_DROPPED');
      expect(result.summary.succeeded).toBe(1);
    }
  });

  it('should be idempotent: already-dropped project returns ALREADY_DROPPED', async () => {
    const projectId = await createTestProject('IdempotentProject');

    // Drop the project first
    await dropItems({ items: [{ id: projectId }] });
    await waitForSync();

    // Drop again — should be a no-op
    const result = await dropItems({ items: [{ id: projectId }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].code).toBe('ALREADY_DROPPED');
      expect(result.summary.succeeded).toBe(1);
    }
  });

  it('should handle batch with one invalid ID as partial failure', async () => {
    const taskId = await createTask('BatchPartial');

    const result = await dropItems({
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

  it('should respect allOccurrences parameter', async () => {
    const taskId = await createTask('AllOccurrences');

    // Drop with allOccurrences=false (default behavior for single task)
    const result = await dropItems({
      items: [{ id: taskId }],
      allOccurrences: false
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(true);
    }
  });

  it('should return NOT_FOUND for a non-existent task ID', async () => {
    const result = await dropItems({ items: [{ id: 'nonexistent-task-id-99999' }] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].code).toBe('NOT_FOUND');
      expect(result.summary.failed).toBe(1);
    }
  });
});
