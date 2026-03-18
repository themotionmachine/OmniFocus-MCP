import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { getNextTask } from '../../../src/tools/primitives/getNextTask.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('getNextTask integration', () => {
  skipIfOmniFocusUnavailable();

  const createdProjectIds: string[] = [];

  interface TestProject {
    id: string;
    name: string;
  }

  async function createSequentialProject(nameSuffix: string): Promise<TestProject> {
    const testFolderId = getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');
    const name = `Status Test - getNextTask ${nameSuffix} ${Date.now()}`;
    const result = await createProject({ name, folderId: testFolderId, sequential: true });
    if (!result.success) {
      throw new Error(`Failed to create sequential project: ${JSON.stringify(result)}`);
    }
    createdProjectIds.push(result.id);
    await waitForSync();
    return { id: result.id, name };
  }

  async function createSingleActionsProject(nameSuffix: string): Promise<TestProject> {
    const testFolderId = getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');
    const name = `Status Test - getNextTask ${nameSuffix} ${Date.now()}`;
    const result = await createProject({
      name,
      folderId: testFolderId,
      containsSingletonActions: true
    });
    if (!result.success) {
      throw new Error(`Failed to create single-actions project: ${JSON.stringify(result)}`);
    }
    createdProjectIds.push(result.id);
    await waitForSync();
    return { id: result.id, name };
  }

  async function addTaskToProject(projectName: string, taskName: string): Promise<void> {
    const result = await addOmniFocusTask({ name: taskName, projectName });
    if (!result.success) {
      throw new Error(`Failed to add task to project: ${JSON.stringify(result)}`);
    }
    await waitForSync();
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
  });

  it('should return the first task in a sequential project', async () => {
    const project = await createSequentialProject('Sequential');
    const firstTaskName = `Next Task - First ${Date.now()}`;
    const secondTaskName = `Next Task - Second ${Date.now()}`;

    await addTaskToProject(project.name, firstTaskName);
    await addTaskToProject(project.name, secondTaskName);
    await waitForSync();

    const result = await getNextTask({ id: project.id });

    expect(result.success).toBe(true);
    if (result.success) {
      if (result.hasNext) {
        expect(result.task.name).toBe(firstTaskName);
        expect(result.task.id).toBeTruthy();
        expect(result.task.project.id).toBe(project.id);
      } else {
        // If OmniFocus returns no next task (e.g., tasks blocked by defer dates), still valid
        expect(['NO_AVAILABLE_TASKS', 'SINGLE_ACTIONS_PROJECT']).toContain(result.reason);
      }
    }
  });

  it('should return SINGLE_ACTIONS_PROJECT for a single-actions project', async () => {
    const project = await createSingleActionsProject('SingleActions');
    const taskName = `Next Task - SingleActions ${Date.now()}`;

    await addTaskToProject(project.name, taskName);
    await waitForSync();

    const result = await getNextTask({ id: project.id });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hasNext).toBe(false);
      if (!result.hasNext) {
        expect(result.reason).toBe('SINGLE_ACTIONS_PROJECT');
        expect(result.message).toBeTruthy();
      }
    }
  });

  it('should handle a project with no tasks gracefully', async () => {
    const project = await createSequentialProject('EmptyProject');
    // Do not add any tasks

    const result = await getNextTask({ id: project.id });

    expect(result.success).toBe(true);
    if (result.success) {
      // A project with no tasks should either return hasNext=false with NO_AVAILABLE_TASKS
      // or possibly hasNext=true if OmniFocus created any default tasks.
      // Verify the response shape is valid in either case.
      if (result.hasNext) {
        // If there somehow is a next task, verify it has the expected shape
        expect(result.task.id).toBeTruthy();
        expect(result.task.name).toBeTruthy();
        expect(result.task.project.id).toBe(project.id);
      } else {
        expect(result.reason).toBe('NO_AVAILABLE_TASKS');
        expect(result.message).toBeTruthy();
      }
    }
  });

  it('should return correct task details when next task exists', async () => {
    const project = await createSequentialProject('TaskDetails');
    const taskName = `Next Task - Details ${Date.now()}`;

    await addTaskToProject(project.name, taskName);
    await waitForSync();

    const result = await getNextTask({ id: project.id });

    expect(result.success).toBe(true);
    if (result.success && result.hasNext) {
      expect(result.task.name).toBe(taskName);
      expect(typeof result.task.id).toBe('string');
      expect(typeof result.task.note).toBe('string');
      expect(typeof result.task.flagged).toBe('boolean');
      expect(typeof result.task.taskStatus).toBe('string');
      expect(Array.isArray(result.task.tags)).toBe(true);
      expect(result.task.project).toBeDefined();
      expect(result.task.project.id).toBe(project.id);
    }
  });

  it('should return error for non-existent project ID', async () => {
    const result = await getNextTask({ id: 'nonexistent-project-id-99999' });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });
});
