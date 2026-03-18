import { afterEach, describe, expect, it } from 'vitest';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { getProject } from '../../../src/tools/primitives/getProject.js';
import { setProjectType } from '../../../src/tools/primitives/setProjectType.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('setProjectType integration', () => {
  skipIfOmniFocusUnavailable();

  const createdProjectIds: string[] = [];

  async function createTestProject(
    nameSuffix: string,
    options: Record<string, unknown> = {}
  ): Promise<string> {
    const testFolderId = getTestFolderId();
    if (!testFolderId) throw new Error('Test folder not available');
    const name = `Status Test - setProjectType ${nameSuffix} ${Date.now()}`;
    const result = await createProject({ name, folderId: testFolderId, ...options });
    if (!result.success) {
      throw new Error(`Failed to create test project: ${JSON.stringify(result)}`);
    }
    createdProjectIds.push(result.id);
    await waitForSync();
    return result.id;
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

  it('should set a parallel project to sequential', async () => {
    const projectId = await createTestProject('ToSequential');

    // Verify it's parallel (default)
    let readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.projectType).toBe('parallel');
    }

    const result = await setProjectType({ id: projectId, projectType: 'sequential' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe(projectId);
      expect(result.projectType).toBe('sequential');
      expect(result.sequential).toBe(true);
      expect(result.containsSingletonActions).toBe(false);
    }

    // Verify via getProject
    await waitForSync();
    readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.sequential).toBe(true);
      expect(readBack.project.containsSingletonActions).toBe(false);
      expect(readBack.project.projectType).toBe('sequential');
    }
  });

  it('should set a sequential project back to parallel', async () => {
    const projectId = await createTestProject('ToParallel', { sequential: true });

    const result = await setProjectType({ id: projectId, projectType: 'parallel' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projectType).toBe('parallel');
      expect(result.sequential).toBe(false);
      expect(result.containsSingletonActions).toBe(false);
    }

    await waitForSync();
    const readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.sequential).toBe(false);
      expect(readBack.project.containsSingletonActions).toBe(false);
      expect(readBack.project.projectType).toBe('parallel');
    }
  });

  it('should set a project to single-actions and verify mutual exclusion', async () => {
    // Start with a sequential project to test mutual exclusion
    const projectId = await createTestProject('ToSingleActions', { sequential: true });

    const result = await setProjectType({ id: projectId, projectType: 'single-actions' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projectType).toBe('single-actions');
      expect(result.sequential).toBe(false);
      expect(result.containsSingletonActions).toBe(true);
    }

    await waitForSync();
    const readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.containsSingletonActions).toBe(true);
      expect(readBack.project.sequential).toBe(false);
      expect(readBack.project.projectType).toBe('single-actions');
    }
  });

  it('should change from single-actions back to parallel', async () => {
    const projectId = await createTestProject('SingleActionsToParallel', {
      containsSingletonActions: true
    });

    const result = await setProjectType({ id: projectId, projectType: 'parallel' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.projectType).toBe('parallel');
      expect(result.sequential).toBe(false);
      expect(result.containsSingletonActions).toBe(false);
    }

    await waitForSync();
    const readBack = await getProject({ id: projectId });
    expect(readBack.success).toBe(true);
    if (readBack.success) {
      expect(readBack.project.projectType).toBe('parallel');
    }
  });

  it('should return error for non-existent project ID', async () => {
    const result = await setProjectType({
      id: 'nonexistent-project-id-99999',
      projectType: 'sequential'
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error).toContain('not found');
    }
  });
});
