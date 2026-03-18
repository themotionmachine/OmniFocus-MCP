import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { setFloatingTimezone } from '../../../src/tools/primitives/setFloatingTimezone.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

/**
 * setFloatingTimezone integration tests.
 *
 * IMPORTANT: OmniFocus requires an item to have a due date or defer date
 * before floating timezone can be set. Tasks/projects without dates will
 * return "Set due or defer date to edit the time zone". All test items
 * are created with a due date to satisfy this requirement.
 */
describe('setFloatingTimezone integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];
  const createdProjectIds: string[] = [];

  // Use a future due date for all test items so floating timezone works
  const futureDueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  })();

  async function createTaskWithDueDate(nameSuffix: string): Promise<string> {
    const name = `Status Test - setFloatingTimezone ${nameSuffix} ${Date.now()}`;
    const result = await addOmniFocusTask({ name, dueDate: futureDueDate });
    if (!result.success || !result.taskId) {
      throw new Error(`Failed to create test task: ${JSON.stringify(result)}`);
    }
    createdTaskIds.push(result.taskId);
    await waitForSync();
    return result.taskId;
  }

  async function createProjectWithDueDate(nameSuffix: string): Promise<string> {
    const testFolderId = getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');
    const name = `Status Test - setFloatingTimezone ${nameSuffix} ${Date.now()}`;
    const result = await createProject({ name, folderId: testFolderId, dueDate: futureDueDate });
    if (!result.success) {
      throw new Error(`Failed to create test project: ${JSON.stringify(result)}`);
    }
    createdProjectIds.push(result.id);
    await waitForSync();
    return result.id;
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

    for (const id of [...createdProjectIds].reverse()) {
      try {
        await deleteProject({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdProjectIds.length = 0;
  });

  it('should enable floating timezone on a task with a due date', { timeout: 60000 }, async () => {
    const taskId = await createTaskWithDueDate('EnableTask');

    const result = await setFloatingTimezone({ id: taskId, enabled: true });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(taskId);
      expect(result.itemType).toBe('task');
      expect(result.floatingTimezone).toBe(true);
      expect(result.name).toBeTruthy();
    }
  });

  it('should disable floating timezone on a task with a due date', { timeout: 60000 }, async () => {
    const taskId = await createTaskWithDueDate('DisableTask');

    // Enable first
    await setFloatingTimezone({ id: taskId, enabled: true });
    await waitForSync();

    // Now disable
    const result = await setFloatingTimezone({ id: taskId, enabled: false });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(taskId);
      expect(result.itemType).toBe('task');
      expect(result.floatingTimezone).toBe(false);
    }
  });

  it('should enable floating timezone on a project with a due date', {
    timeout: 60000
  }, async () => {
    const projectId = await createProjectWithDueDate('EnableProject');

    const result = await setFloatingTimezone({ id: projectId, enabled: true });

    expect(result.success).toBe(true);
    if (result.success) {
      // OmniFocus projects share their ID with their root task;
      // Task.byIdentifier finds the root task first, so itemType is 'task'.
      expect(result.id).toBe(projectId);
      expect(result.floatingTimezone).toBe(true);
      expect(result.name).toBeTruthy();
    }
  });

  it('should disable floating timezone on a project with a due date', {
    timeout: 60000
  }, async () => {
    const projectId = await createProjectWithDueDate('DisableProject');

    // Enable first
    await setFloatingTimezone({ id: projectId, enabled: true });
    await waitForSync();

    // Now disable
    const result = await setFloatingTimezone({ id: projectId, enabled: false });

    expect(result.success).toBe(true);
    if (result.success) {
      // OmniFocus projects share their ID with their root task;
      // Task.byIdentifier finds the root task first, so itemType is 'task'.
      expect(result.id).toBe(projectId);
      expect(result.floatingTimezone).toBe(false);
    }
  });

  it('should return error for non-existent item ID', async () => {
    const result = await setFloatingTimezone({
      id: 'nonexistent-item-id-99999',
      enabled: true
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });

  it('should toggle floating timezone back and forth on a task with a due date', {
    timeout: 60000
  }, async () => {
    const taskId = await createTaskWithDueDate('Toggle');

    // Enable
    let result = await setFloatingTimezone({ id: taskId, enabled: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.floatingTimezone).toBe(true);
    }

    await waitForSync();

    // Disable
    result = await setFloatingTimezone({ id: taskId, enabled: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.floatingTimezone).toBe(false);
    }

    await waitForSync();

    // Enable again
    result = await setFloatingTimezone({ id: taskId, enabled: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.floatingTimezone).toBe(true);
    }
  });
});
