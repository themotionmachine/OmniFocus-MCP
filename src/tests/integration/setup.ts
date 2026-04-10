import { beforeAll, afterAll } from 'vitest';
import { TestRegistry } from './registry.js';
import { assertOmniFocusRunning, createFolder, TEST_PREFIX } from './helpers.js';
import { addOmniFocusTask } from '../../tools/primitives/addOmniFocusTask.js';
import { addProject } from '../../tools/primitives/addProject.js';
import { editItem } from '../../tools/primitives/editItem.js';
import { removeItem } from '../../tools/primitives/removeItem.js';
import { batchAddItems } from '../../tools/primitives/batchAddItems.js';
import { batchRemoveItems } from '../../tools/primitives/batchRemoveItems.js';

export const registry = new TestRegistry();

export async function createTrackedTask(
  params: Parameters<typeof addOmniFocusTask>[0]
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const result = await addOmniFocusTask(params);
  if (result.success && result.taskId) {
    registry.track(result.taskId, params.name, 'task');
  }
  return result;
}

export async function createTrackedProject(
  params: Parameters<typeof addProject>[0]
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  const result = await addProject(params);
  if (result.success && result.projectId) {
    registry.track(result.projectId, params.name, 'project');
  }
  return result;
}

export async function safeRemoveTracked(
  id: string,
  itemType: 'task' | 'project'
): Promise<{ success: boolean; error?: string }> {
  const result = await removeItem({ id, itemType });
  if (result.success) {
    registry.untrack(id);
  }
  return result;
}

export { editItem, removeItem, batchAddItems, batchRemoveItems };

export function setupIntegration() {
  beforeAll(async () => {
    await assertOmniFocusRunning();
    const folderId = await createFolder(registry.runFolder);
    registry.runFolderId = folderId;
    registry.track(folderId, registry.runFolder, 'folder');
    const projResult = await addProject({
      name: registry.testProject,
      folderName: registry.runFolder,
    });
    if (!projResult.success || !projResult.projectId) {
      throw new Error(`Failed to create test project: ${projResult.error}`);
    }
    registry.testProjectId = projResult.projectId;
    registry.track(projResult.projectId, registry.testProject, 'project');
  }, 60000);

  afterAll(async () => {
    await registry.cleanupAll();
  }, 60000);
}
