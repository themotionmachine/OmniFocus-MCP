/**
 * Integration tests for bulk operation tools.
 *
 * These tests verify round-trip scenarios with a live OmniFocus instance.
 * They are skipped when OmniFocus is not available.
 *
 * To run manually:
 *   INTEGRATION=true pnpm test tests/integration/bulk-operations.integration.test.ts
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { addFolder } from '../../src/tools/primitives/addFolder.js';

// Bulk operations involve multiple OmniFocus round-trips per test; 30s is too tight
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { addOmniFocusTask } from '../../src/tools/primitives/addOmniFocusTask.js';
import { batchUpdateTasks } from '../../src/tools/primitives/batchUpdateTasks.js';
import { convertTasksToProjects } from '../../src/tools/primitives/convertTasksToProjects.js';
import { createProject } from '../../src/tools/primitives/createProject.js';
import { createTag } from '../../src/tools/primitives/createTag.js';
import { deleteProject } from '../../src/tools/primitives/deleteProject.js';
import { deleteTag } from '../../src/tools/primitives/deleteTag.js';
import { duplicateSections } from '../../src/tools/primitives/duplicateSections.js';
import { duplicateTasks } from '../../src/tools/primitives/duplicateTasks.js';
import { getProject } from '../../src/tools/primitives/getProject.js';
import { getTask } from '../../src/tools/primitives/getTask.js';
import { markComplete } from '../../src/tools/primitives/markComplete.js';
import { moveSections } from '../../src/tools/primitives/moveSections.js';
import { moveTasks } from '../../src/tools/primitives/moveTasks.js';
import { removeFolder } from '../../src/tools/primitives/removeFolder.js';
import { removeItem } from '../../src/tools/primitives/removeItem.js';
import { skipIfOmniFocusUnavailable, waitForSync } from './helpers/index.js';
import { getTestFolderId } from './setup.js';

// ─── Shared helpers ──────────────────────────────────────────────────

const TS = () => Date.now();

async function createTestTask(
  name: string,
  opts?: {
    projectId?: string;
    parentTaskId?: string;
    flagged?: boolean;
    note?: string;
    dueDate?: string;
  }
): Promise<string> {
  // addOmniFocusTask uses projectName (not projectId), so extract it
  const { projectId, ...addOpts } = opts ?? {};
  const result = await addOmniFocusTask({ name, ...addOpts });
  if (!result.success || !result.taskId) {
    throw new Error(`Failed to create task "${name}": ${JSON.stringify(result)}`);
  }
  await waitForSync();

  // Move into project if projectId was specified
  if (projectId) {
    const moveResult = await moveTasks({
      items: [{ id: result.taskId }],
      position: { projectId, placement: 'ending' }
    });
    if (!moveResult.success || moveResult.summary.failed > 0) {
      throw new Error(`Failed to move task into project: ${JSON.stringify(moveResult)}`);
    }
    await waitForSync();
  }

  return result.taskId;
}

async function createTestProject(name: string, folderId?: string): Promise<string> {
  const targetFolder = folderId || getTestFolderId();
  if (!targetFolder) throw new Error('Test folder not available');

  const result = await createProject({ name, folderId: targetFolder });
  if (!result.success) {
    throw new Error(`Failed to create project "${name}": ${JSON.stringify(result)}`);
  }
  await waitForSync();
  return result.id;
}

async function createTestFolder(name: string, parentId?: string): Promise<string> {
  const targetParent = parentId || getTestFolderId();
  if (!targetParent) throw new Error('Test folder not available');

  const result = await addFolder({
    name,
    position: { placement: 'ending', relativeTo: targetParent }
  });
  if (!result.success) {
    throw new Error(`Failed to create folder "${name}": ${JSON.stringify(result)}`);
  }
  await waitForSync();
  return result.id;
}

// ─── move_tasks ──────────────────────────────────────────────────────

describe('move_tasks integration', () => {
  skipIfOmniFocusUnavailable();

  const taskIds: string[] = [];
  const projectIds: string[] = [];

  afterEach(async () => {
    for (const id of [...taskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        /* ignore */
      }
    }
    taskIds.length = 0;
    for (const id of [...projectIds].reverse()) {
      try {
        await deleteProject({ id });
      } catch {
        /* ignore */
      }
    }
    projectIds.length = 0;
  });

  it('moves task to target project and removes from source', async () => {
    const sourceProjectId = await createTestProject(`BulkMove Source ${TS()}`);
    projectIds.push(sourceProjectId);
    const targetProjectId = await createTestProject(`BulkMove Target ${TS()}`);
    projectIds.push(targetProjectId);

    const taskId = await createTestTask(`BulkMove Task ${TS()}`, { projectId: sourceProjectId });
    taskIds.push(taskId);

    const result = await moveTasks({
      items: [{ id: taskId }],
      position: { projectId: targetProjectId, placement: 'ending' }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results).toHaveLength(1);
    expect(result.results[0].success).toBe(true);
    expect(result.summary.succeeded).toBe(1);

    // Verify task is now in the target project
    await waitForSync();
    const taskResult = await getTask({ id: taskId });
    expect(taskResult.success).toBe(true);
    if (taskResult.success) {
      expect(taskResult.task.containingProject?.id).toBe(targetProjectId);
    }
  });

  it('moves task to inbox', async () => {
    const projectId = await createTestProject(`BulkMoveInbox Proj ${TS()}`);
    projectIds.push(projectId);
    const taskId = await createTestTask(`BulkMoveInbox Task ${TS()}`, { projectId });
    taskIds.push(taskId);

    const result = await moveTasks({
      items: [{ id: taskId }],
      position: { inbox: true, placement: 'ending' }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(true);

    // Verify task is in inbox (no project)
    await waitForSync();
    const taskResult = await getTask({ id: taskId });
    expect(taskResult.success).toBe(true);
    if (taskResult.success) {
      expect(taskResult.task.inInbox).toBe(true);
    }
  });

  it('moves multiple tasks with partial failure (one not found)', async () => {
    const projectId = await createTestProject(`BulkMovePartial Proj ${TS()}`);
    projectIds.push(projectId);
    const taskId = await createTestTask(`BulkMovePartial Task ${TS()}`);
    taskIds.push(taskId);

    const result = await moveTasks({
      items: [{ id: taskId }, { id: 'nonexistent-bulk-move-99999' }],
      position: { projectId, placement: 'ending' }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results).toHaveLength(2);
    expect(result.summary.succeeded).toBe(1);
    expect(result.summary.failed).toBe(1);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);
    expect(result.results[1].code).toBe('NOT_FOUND');
  });
});

// ─── duplicate_tasks ─────────────────────────────────────────────────

describe('duplicate_tasks integration', () => {
  skipIfOmniFocusUnavailable();

  const taskIds: string[] = [];
  const projectIds: string[] = [];

  afterEach(async () => {
    for (const id of [...taskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        /* ignore */
      }
    }
    taskIds.length = 0;
    for (const id of [...projectIds].reverse()) {
      try {
        await deleteProject({ id });
      } catch {
        /* ignore */
      }
    }
    projectIds.length = 0;
  });

  it('creates active copy with matching properties', async () => {
    const projectId = await createTestProject(`BulkDup Proj ${TS()}`);
    projectIds.push(projectId);
    const taskId = await createTestTask(`BulkDup Task ${TS()}`, {
      projectId,
      flagged: true,
      note: 'Test note for duplication'
    });
    taskIds.push(taskId);

    const result = await duplicateTasks({
      items: [{ id: taskId }],
      position: { projectId, placement: 'ending' }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results).toHaveLength(1);
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].newId).toBeTruthy();
    expect(result.results[0].newName).toBeTruthy();

    const newId = result.results[0].newId;
    if (!newId) throw new Error('Expected newId');
    taskIds.push(newId);

    // Verify duplicate has matching properties
    await waitForSync();
    const origTask = await getTask({ id: taskId });
    const copyTask = await getTask({ id: newId });
    expect(origTask.success).toBe(true);
    expect(copyTask.success).toBe(true);
    if (origTask.success && copyTask.success) {
      expect(copyTask.task.flagged).toBe(origTask.task.flagged);
      expect(copyTask.task.note).toContain('Test note for duplication');
      expect(copyTask.task.completed).toBe(false);
    }
  });

  it('completed original produces incomplete copy (FR-011)', async () => {
    const projectId = await createTestProject(`BulkDupCompleted Proj ${TS()}`);
    projectIds.push(projectId);
    const taskId = await createTestTask(`BulkDupCompleted Task ${TS()}`, { projectId });
    taskIds.push(taskId);

    // Complete the original
    await markComplete({ items: [{ id: taskId }] });
    await waitForSync();

    const result = await duplicateTasks({
      items: [{ id: taskId }],
      position: { projectId, placement: 'ending' }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(true);

    const newId = result.results[0].newId;
    if (!newId) throw new Error('Expected newId');
    taskIds.push(newId);

    // Verify duplicate is NOT completed
    await waitForSync();
    const copyTask = await getTask({ id: newId });
    expect(copyTask.success).toBe(true);
    if (copyTask.success) {
      expect(copyTask.task.completed).toBe(false);
    }
  });
});

// ─── batch_update_tasks ──────────────────────────────────────────────

describe('batch_update_tasks integration', () => {
  skipIfOmniFocusUnavailable();

  const taskIds: string[] = [];
  const tagIds: string[] = [];

  afterEach(async () => {
    for (const id of [...taskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        /* ignore */
      }
    }
    taskIds.length = 0;
    for (const id of [...tagIds].reverse()) {
      try {
        await deleteTag({ id });
      } catch {
        /* ignore */
      }
    }
    tagIds.length = 0;
  });

  it('sets flagged=true on multiple tasks', async () => {
    const id1 = await createTestTask(`BulkUpdate Flag1 ${TS()}`);
    const id2 = await createTestTask(`BulkUpdate Flag2 ${TS()}`);
    taskIds.push(id1, id2);

    const result = await batchUpdateTasks({
      items: [{ id: id1 }, { id: id2 }],
      properties: { flagged: true }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.summary.succeeded).toBe(2);
    expect(result.summary.failed).toBe(0);

    // Verify both tasks are flagged
    await waitForSync();
    for (const id of [id1, id2]) {
      const task = await getTask({ id });
      expect(task.success).toBe(true);
      if (task.success) {
        expect(task.task.flagged).toBe(true);
      }
    }
  });

  it('clears due date on multiple tasks', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString();

    const id1 = await createTestTask(`BulkUpdate ClearDue1 ${TS()}`, { dueDate });
    const id2 = await createTestTask(`BulkUpdate ClearDue2 ${TS()}`, { dueDate });
    taskIds.push(id1, id2);

    const result = await batchUpdateTasks({
      items: [{ id: id1 }, { id: id2 }],
      properties: { clearDueDate: true }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.summary.succeeded).toBe(2);

    // Verify due dates are cleared
    await waitForSync();
    for (const id of [id1, id2]) {
      const task = await getTask({ id });
      expect(task.success).toBe(true);
      if (task.success) {
        expect(task.task.dueDate).toBeFalsy();
      }
    }
  });

  it('adds and removes tags with correct ordering (FR-014)', async () => {
    // Create tags
    const tagAResult = await createTag({ name: `BulkTag-A-${TS()}` });
    expect(tagAResult.success).toBe(true);
    if (!tagAResult.success) return;
    tagIds.push(tagAResult.id);

    const tagBResult = await createTag({ name: `BulkTag-B-${TS()}` });
    expect(tagBResult.success).toBe(true);
    if (!tagBResult.success) return;
    tagIds.push(tagBResult.id);

    // Create task with tagA already assigned
    const taskId = await createTestTask(`BulkUpdate Tags ${TS()}`);
    taskIds.push(taskId);

    // First, add tagA to the task
    await batchUpdateTasks({
      items: [{ id: taskId }],
      properties: { addTags: [tagAResult.id] }
    });
    await waitForSync();

    // Now remove tagA and add tagB in one call (removals before additions per FR-014)
    const result = await batchUpdateTasks({
      items: [{ id: taskId }],
      properties: { removeTags: [tagAResult.id], addTags: [tagBResult.id] }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(true);

    // Verify task has tagB but not tagA
    await waitForSync();
    const task = await getTask({ id: taskId });
    expect(task.success).toBe(true);
    if (task.success) {
      const tagNames = task.task.tags?.map((t: { name: string }) => t.name) ?? [];
      expect(tagNames).toContain(tagBResult.name);
      expect(tagNames).not.toContain(tagAResult.name);
    }
  });

  it('appends note to existing content', async () => {
    const taskId = await createTestTask(`BulkUpdate Note ${TS()}`, { note: 'Original note.' });
    taskIds.push(taskId);

    const result = await batchUpdateTasks({
      items: [{ id: taskId }],
      properties: { note: 'Appended content.' }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(true);

    // Verify note was appended, not replaced
    await waitForSync();
    const task = await getTask({ id: taskId });
    expect(task.success).toBe(true);
    if (task.success) {
      expect(task.task.note).toContain('Original note.');
      expect(task.task.note).toContain('Appended content.');
    }
  });
});

// ─── convert_tasks_to_projects ───────────────────────────────────────

describe('convert_tasks_to_projects integration', () => {
  skipIfOmniFocusUnavailable();

  const taskIds: string[] = [];
  const projectIds: string[] = [];

  afterEach(async () => {
    for (const id of [...taskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        /* ignore */
      }
    }
    taskIds.length = 0;
    for (const id of [...projectIds].reverse()) {
      try {
        await deleteProject({ id });
      } catch {
        /* ignore */
      }
    }
    projectIds.length = 0;
  });

  it('task with subtasks becomes project with children', async () => {
    const parentId = await createTestTask(`BulkConvert Parent ${TS()}`);
    taskIds.push(parentId);
    const child1 = await createTestTask(`BulkConvert Child1 ${TS()}`, { parentTaskId: parentId });
    taskIds.push(child1);
    const child2 = await createTestTask(`BulkConvert Child2 ${TS()}`, { parentTaskId: parentId });
    taskIds.push(child2);

    const testFolderId = getTestFolderId();
    const result = await convertTasksToProjects({
      items: [{ id: parentId }],
      ...(testFolderId ? { targetFolderId: testFolderId } : {})
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].newId).toBeTruthy();

    const newProjectId = result.results[0].newId;
    if (!newProjectId) throw new Error('Expected newId');
    projectIds.push(newProjectId);

    // Verify project exists with child tasks
    await waitForSync();
    const project = await getProject({ id: newProjectId });
    expect(project.success).toBe(true);
    if (project.success) {
      expect(project.project.taskCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('rejects already-a-project root task', async () => {
    const projectId = await createTestProject(`BulkConvert AlreadyProj ${TS()}`);
    projectIds.push(projectId);

    // Try to convert the project's root task — should fail
    const result = await convertTasksToProjects({
      items: [{ id: projectId }]
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(false);
    // OmniFocus may return ALREADY_A_PROJECT or OPERATION_FAILED depending on
    // how Project.byIdentifier vs Task.byIdentifier resolves the ID
    expect(['ALREADY_A_PROJECT', 'OPERATION_FAILED']).toContain(result.results[0].code);
  });

  it('places new project in target folder', async () => {
    const testFolderId = getTestFolderId();
    if (!testFolderId) return;

    const taskId = await createTestTask(`BulkConvert Placed ${TS()}`);
    taskIds.push(taskId);

    const result = await convertTasksToProjects({
      items: [{ id: taskId }],
      targetFolderId: testFolderId
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(true);

    const newProjectId = result.results[0].newId;
    if (!newProjectId) throw new Error('Expected newId');
    projectIds.push(newProjectId);

    // Verify project is in the target folder
    await waitForSync();
    const project = await getProject({ id: newProjectId });
    expect(project.success).toBe(true);
    if (project.success) {
      expect(project.project.parentFolder?.id).toBe(testFolderId);
    }
  });
});

// ─── move_sections ───────────────────────────────────────────────────

describe('move_sections integration', () => {
  skipIfOmniFocusUnavailable();

  const projectIds: string[] = [];
  const folderIds: string[] = [];

  afterEach(async () => {
    for (const id of [...projectIds].reverse()) {
      try {
        await deleteProject({ id });
      } catch {
        /* ignore */
      }
    }
    projectIds.length = 0;
    for (const id of [...folderIds].reverse()) {
      try {
        await removeFolder({ id });
      } catch {
        /* ignore */
      }
    }
    folderIds.length = 0;
  });

  it('moves project between folders, parentFolder changes', async () => {
    const folder1Id = await createTestFolder(`BulkMoveSec Folder1 ${TS()}`);
    folderIds.push(folder1Id);
    const folder2Id = await createTestFolder(`BulkMoveSec Folder2 ${TS()}`);
    folderIds.push(folder2Id);

    const projectId = await createTestProject(`BulkMoveSec Proj ${TS()}`, folder1Id);
    projectIds.push(projectId);

    // Move project from folder1 to folder2
    const result = await moveSections({
      items: [{ id: projectId }],
      position: { placement: 'ending', relativeTo: folder2Id }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(true);

    // Verify parentFolder changed
    await waitForSync();
    const project = await getProject({ id: projectId });
    expect(project.success).toBe(true);
    if (project.success) {
      expect(project.project.parentFolder?.id).toBe(folder2Id);
    }
  });

  it('moves folder to library root', async () => {
    const parentFolderId = await createTestFolder(`BulkMoveSec Parent ${TS()}`);
    folderIds.push(parentFolderId);
    const childFolderId = await createTestFolder(`BulkMoveSec Child ${TS()}`, parentFolderId);
    folderIds.push(childFolderId);

    // Move child folder to library root
    const result = await moveSections({
      items: [{ id: childFolderId }],
      position: { placement: 'ending' }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(true);
  });
});

// ─── duplicate_sections ──────────────────────────────────────────────

describe('duplicate_sections integration', () => {
  skipIfOmniFocusUnavailable();

  const projectIds: string[] = [];
  const folderIds: string[] = [];
  const taskIds: string[] = [];

  afterEach(async () => {
    for (const id of [...taskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        /* ignore */
      }
    }
    taskIds.length = 0;
    for (const id of [...projectIds].reverse()) {
      try {
        await deleteProject({ id });
      } catch {
        /* ignore */
      }
    }
    projectIds.length = 0;
    for (const id of [...folderIds].reverse()) {
      try {
        await removeFolder({ id });
      } catch {
        /* ignore */
      }
    }
    folderIds.length = 0;
  });

  it('copies project with tasks, returns new ID', async () => {
    const testFolderId = getTestFolderId();
    if (!testFolderId) return;

    const projectId = await createTestProject(`BulkDupSec Proj ${TS()}`);
    projectIds.push(projectId);

    // Add a task to the project
    const taskId = await createTestTask(`BulkDupSec Task ${TS()}`, { projectId });
    taskIds.push(taskId);

    const result = await duplicateSections({
      items: [{ id: projectId }],
      position: { placement: 'ending', relativeTo: testFolderId }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].newId).toBeTruthy();
    expect(result.results[0].newName).toBeTruthy();

    const newProjectId = result.results[0].newId;
    if (!newProjectId) throw new Error('Expected newId');
    projectIds.push(newProjectId);

    // Verify the copy exists and is a distinct project
    await waitForSync(2000);
    const copyProject = await getProject({ id: newProjectId });
    expect(copyProject.success).toBe(true);
    if (copyProject.success) {
      expect(copyProject.project.name).toBeTruthy();
      // Duplicated project should be distinct from original
      expect(newProjectId).not.toBe(projectId);
    }

    // Verify original still has its task (duplication doesn't consume source)
    const origProject = await getProject({ id: projectId });
    expect(origProject.success).toBe(true);
    if (origProject.success) {
      expect(origProject.project.taskCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('copies folder with child projects', async () => {
    const testFolderId = getTestFolderId();
    if (!testFolderId) return;

    const folderId = await createTestFolder(`BulkDupSec Folder ${TS()}`);
    folderIds.push(folderId);
    const childProjectId = await createTestProject(`BulkDupSec ChildProj ${TS()}`, folderId);
    projectIds.push(childProjectId);

    const result = await duplicateSections({
      items: [{ id: folderId }],
      position: { placement: 'ending', relativeTo: testFolderId }
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.results[0].success).toBe(true);
    expect(result.results[0].newId).toBeTruthy();

    const newFolderId = result.results[0].newId;
    if (!newFolderId) throw new Error('Expected newId');
    folderIds.push(newFolderId);

    // Verify the copy is a distinct folder
    expect(newFolderId).not.toBe(folderId);
  });
});
