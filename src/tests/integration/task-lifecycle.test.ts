import { describe, it, expect } from 'vitest';
import {
  setupIntegration,
  registry,
  createTrackedTask,
  editItem,
  safeRemoveTracked,
} from './setup.js';

describe('Task Lifecycle (integration)', () => {
  setupIntegration();

  let inboxTaskId: string;
  let projectTaskId: string;

  it('creates an inbox task', async () => {
    const result = await createTrackedTask({ name: 'TEST:Inbox Task' });
    expect(result.success).toBe(true);
    expect(result.taskId).toBeTruthy();
    inboxTaskId = result.taskId!;
  });

  it('creates a task in the test project', async () => {
    const result = await createTrackedTask({
      name: 'TEST:Project Task',
      projectName: registry.testProject,
    });
    expect(result.success).toBe(true);
    expect(result.taskId).toBeTruthy();
    projectTaskId = result.taskId!;
  });

  it('moves inbox task to the test project', async () => {
    expect(inboxTaskId).toBeTruthy();
    const result = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newProjectName: registry.testProject,
    });
    expect(result.success).toBe(true);
    expect(result.changedProperties).toContain('project');
  });

  it('moves task from project to a different project', async () => {
    expect(inboxTaskId).toBeTruthy();
    // Create a second project to move into
    const { addProject } = await import('../../tools/primitives/addProject.js');
    const projResult = await addProject({
      name: 'TEST:Second Project',
      folderName: registry.runFolder,
    });
    expect(projResult.success).toBe(true);
    if (projResult.projectId) {
      registry.track(projResult.projectId, 'TEST:Second Project', 'project');
    }

    // Move inboxTaskId (now in testProject) to second project
    const result = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newProjectName: 'TEST:Second Project',
    });
    expect(result.success).toBe(true);
    expect(result.changedProperties).toContain('project');
  });

  it('moves task from project to inbox', async () => {
    expect(inboxTaskId).toBeTruthy();
    const result = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newProjectName: '',
    });
    expect(result.success).toBe(true);
    expect(result.changedProperties).toContain('inbox');
  });

  it('edits task properties', async () => {
    expect(inboxTaskId).toBeTruthy();
    const result = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newName: 'TEST:Renamed Task',
      newFlagged: true,
    });
    expect(result.success).toBe(true);
    expect(result.changedProperties).toContain('name');
    expect(result.changedProperties).toContain('flagged');
  });

  it('marks task complete then incomplete', async () => {
    expect(inboxTaskId).toBeTruthy();
    const complete = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newStatus: 'completed',
    });
    expect(complete.success).toBe(true);

    const incomplete = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newStatus: 'incomplete',
    });
    expect(incomplete.success).toBe(true);
  });

  it('marks task dropped', async () => {
    expect(inboxTaskId).toBeTruthy();
    const result = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newStatus: 'dropped',
    });
    expect(result.success).toBe(true);
  });

  it('removes a task', async () => {
    expect(projectTaskId).toBeTruthy();
    const result = await safeRemoveTracked(projectTaskId, 'task');
    expect(result.success).toBe(true);
  });
});
