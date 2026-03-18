import { describe, it, expect } from 'vitest';
import {
  setupIntegration,
  registry,
  createTrackedProject,
  createTrackedTask,
  editItem,
  safeRemoveTracked,
} from './setup.js';

describe('Project Lifecycle (integration)', () => {
  setupIntegration();

  let projectId: string;

  it('creates a project in the run folder', async () => {
    const result = await createTrackedProject({
      name: 'TEST:New Project',
      folderName: registry.runFolder,
    });
    expect(result.success).toBe(true);
    expect(result.projectId).toBeTruthy();
    projectId = result.projectId!;
  });

  it('edits project properties', async () => {
    const result = await editItem({
      itemType: 'project',
      id: projectId,
      newName: 'TEST:Edited Project',
      newSequential: true,
    });
    expect(result.success).toBe(true);
    expect(result.changedProperties).toContain('name');
    expect(result.changedProperties).toContain('sequential');
  });

  it('changes project status', async () => {
    const onHold = await editItem({
      itemType: 'project',
      id: projectId,
      newProjectStatus: 'onHold',
    });
    expect(onHold.success).toBe(true);

    const active = await editItem({
      itemType: 'project',
      id: projectId,
      newProjectStatus: 'active',
    });
    expect(active.success).toBe(true);
  });

  it('adds a task to the project', async () => {
    const result = await createTrackedTask({
      name: 'TEST:Child Task',
      projectName: 'TEST:Edited Project',
    });
    expect(result.success).toBe(true);
  });

  it('removes the project', async () => {
    const result = await safeRemoveTracked(projectId, 'project');
    expect(result.success).toBe(true);
  });
});
