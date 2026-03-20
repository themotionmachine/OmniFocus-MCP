import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { markComplete } from '../../../src/tools/primitives/markComplete.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { searchTasks } from '../../../src/tools/primitives/searchTasks.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('searchTasks integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];
  const createdProjectIds: string[] = [];

  async function createTask(nameSuffix: string, options?: object): Promise<string> {
    const name = `SearchTasks Test - ${nameSuffix} ${Date.now()}`;
    const result = await addOmniFocusTask({ name, ...options });
    if (!result.success || !result.taskId) {
      throw new Error(`Failed to create test task: ${JSON.stringify(result)}`);
    }
    createdTaskIds.push(result.taskId);
    await waitForSync();
    return result.taskId;
  }

  afterEach(async () => {
    for (const id of [...createdProjectIds].reverse()) {
      try {
        await deleteProject({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdProjectIds.length = 0;

    for (const id of [...createdTaskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTaskIds.length = 0;
  });

  it('should find a task by name and return correct fields', async () => {
    const uniqueSuffix = `UniqueFind ${Date.now()}`;
    const taskId = await createTask(uniqueSuffix);

    const result = await searchTasks({ query: uniqueSuffix });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((t) => t.id === taskId);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.id).toBe(taskId);
        expect(found.name).toContain(uniqueSuffix);
        expect(typeof found.status).toBe('string');
        expect(typeof found.flagged).toBe('boolean');
        // projectName can be null (inbox) or a string
        expect(found.projectName === null || typeof found.projectName === 'string').toBe(true);
      }
    }
  });

  it('should populate projectName with "Inbox" for inbox tasks', async () => {
    const uniqueSuffix = `InboxTask ${Date.now()}`;
    const taskId = await createTask(uniqueSuffix);

    const result = await searchTasks({ query: uniqueSuffix });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((t) => t.id === taskId);
      expect(found).toBeTruthy();
      if (found) {
        // Tasks created without a project go to inbox
        expect(found.projectName).toBe('Inbox');
      }
    }
  });

  it('should populate projectName when task belongs to a project', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const projectName = `SearchTasks Project ${Date.now()}`;
    const projResult = await createProject({ name: projectName, folderId: testFolderId });
    expect(projResult.success).toBe(true);
    if (!projResult.success) return;
    createdProjectIds.push(projResult.id);
    await waitForSync();

    const uniqueSuffix = `ProjectTask ${Date.now()}`;
    const taskName = `SearchTasks Test - ${uniqueSuffix}`;
    const taskResult = await addOmniFocusTask({ name: taskName, projectName });
    expect(taskResult.success).toBe(true);
    if (!taskResult.success || !taskResult.taskId) return;
    createdTaskIds.push(taskResult.taskId);
    await waitForSync();

    const result = await searchTasks({ query: uniqueSuffix });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((t) => t.id === taskResult.taskId);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.projectName).toBe(projectName);
      }
    }
  });

  it('should find completed task when status filter is "completed"', async () => {
    const uniqueSuffix = `CompletedTask ${Date.now()}`;
    const taskId = await createTask(uniqueSuffix);

    // Complete the task
    const completeResult = await markComplete({ items: [{ id: taskId }] });
    expect(completeResult.success).toBe(true);
    await waitForSync();

    const result = await searchTasks({ query: uniqueSuffix, status: 'completed' });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((t) => t.id === taskId);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.status).toBe('completed');
      }
    }
  });

  it('should NOT find completed task when status filter is "active" (default)', async () => {
    const uniqueSuffix = `ActiveFilter ${Date.now()}`;
    const taskId = await createTask(uniqueSuffix);

    // Complete the task
    const completeResult = await markComplete({ items: [{ id: taskId }] });
    expect(completeResult.success).toBe(true);
    await waitForSync();

    // Search with default active filter
    const result = await searchTasks({ query: uniqueSuffix });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((t) => t.id === taskId);
      expect(found).toBeUndefined();
    }
  });

  it('should respect the limit parameter and report totalMatches', async () => {
    const sharedSuffix = `LimitTest ${Date.now()}`;

    // Create 3 tasks with the same search term
    for (let i = 0; i < 3; i++) {
      await createTask(`${sharedSuffix} Item${i}`);
    }

    const result = await searchTasks({ query: sharedSuffix, limit: 2 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results.length).toBeLessThanOrEqual(2);
      expect(result.totalMatches).toBeGreaterThanOrEqual(3);
    }
  });

  it('should work with a single-character query', async () => {
    // Single-char query is valid; empty is rejected at definition layer
    const result = await searchTasks({ query: 'x' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.totalMatches).toBe('number');
    }
  });

  it('should find active tasks with flagged field populated', async () => {
    const uniqueSuffix = `FlaggedField ${Date.now()}`;
    const taskId = await createTask(uniqueSuffix);

    const result = await searchTasks({ query: uniqueSuffix, status: 'active' });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((t) => t.id === taskId);
      expect(found).toBeTruthy();
      if (found) {
        expect(typeof found.flagged).toBe('boolean');
      }
    }
  });

  it('should return empty results for a query that matches nothing', async () => {
    const result = await searchTasks({ query: 'ZZZNOSUCHTASK_XYZABC_12345_UNIQUE' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    }
  });
});
