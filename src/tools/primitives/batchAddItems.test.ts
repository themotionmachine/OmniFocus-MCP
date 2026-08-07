import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  addOmniFocusTask: vi.fn(),
  addProject: vi.fn(),
}));

vi.mock('./addOmniFocusTask.js', () => ({ addOmniFocusTask: mocks.addOmniFocusTask }));
vi.mock('./addProject.js', () => ({ addProject: mocks.addProject }));

import { batchAddItems } from './batchAddItems.js';

beforeEach(() => {
  mocks.addOmniFocusTask.mockReset();
  mocks.addProject.mockReset();
  mocks.addOmniFocusTask.mockResolvedValue({ success: true, taskId: 'task-1', placement: 'project' });
  mocks.addProject.mockResolvedValue({ success: true, projectId: 'proj-1' });
});

describe('batchAddItems parameter forwarding', () => {
  it('forwards projectId to addOmniFocusTask (#97)', async () => {
    // The bug: projectId was absent from the item schema, so Zod stripped it and
    // every task in the batch silently landed in the inbox reporting success.
    await batchAddItems([{ type: 'task', name: 'Read a book', projectId: 'bARxLhruZIp' }]);

    expect(mocks.addOmniFocusTask).toHaveBeenCalledTimes(1);
    expect(mocks.addOmniFocusTask.mock.calls[0][0]).toMatchObject({
      name: 'Read a book',
      projectId: 'bARxLhruZIp',
    });
  });

  it('forwards both ids and lets the primitive apply precedence', async () => {
    await batchAddItems([
      { type: 'task', name: 'Ambiguous', projectId: 'id-1', projectName: 'Single Actions' },
    ]);

    expect(mocks.addOmniFocusTask.mock.calls[0][0]).toMatchObject({
      projectId: 'id-1',
      projectName: 'Single Actions',
    });
  });

  it('forwards the other task fields it used to forward', async () => {
    await batchAddItems([
      {
        type: 'task',
        name: 'Everything',
        note: 'n',
        dueDate: '2026-01-01',
        deferDate: '2026-01-02',
        plannedDate: '2026-01-03',
        flagged: true,
        estimatedMinutes: 15,
        tags: ['a'],
        parentTaskName: 'Parent',
        hierarchyLevel: 1,
      },
    ]);

    expect(mocks.addOmniFocusTask.mock.calls[0][0]).toMatchObject({
      note: 'n',
      dueDate: '2026-01-01',
      deferDate: '2026-01-02',
      plannedDate: '2026-01-03',
      flagged: true,
      estimatedMinutes: 15,
      tags: ['a'],
      parentTaskName: 'Parent',
      hierarchyLevel: 1,
    });
  });
});

describe('batchAddItems placement reporting', () => {
  it('carries placement through to the result', async () => {
    mocks.addOmniFocusTask.mockResolvedValue({ success: true, taskId: 't', placement: 'inbox' });

    const result = await batchAddItems([{ type: 'task', name: 'Stray', projectName: 'Nowhere' }]);

    expect(result.results[0]).toMatchObject({ success: true, placement: 'inbox' });
  });

  it('leaves placement undefined for projects, which have none', async () => {
    const result = await batchAddItems([{ type: 'project', name: 'A project' }]);

    expect(result.results[0].success).toBe(true);
    expect(result.results[0].placement).toBeUndefined();
  });
});

describe('batchAddItems tempId resolution', () => {
  it('targets a batch-created project by id rather than by name', async () => {
    // Both ids here are the AppleScript namespace, and a same-named project
    // elsewhere in the database would otherwise swallow the children.
    mocks.addProject.mockResolvedValue({ success: true, projectId: 'new-proj' });

    await batchAddItems([
      { type: 'project', name: 'Single Actions', tempId: 'p1' },
      { type: 'task', name: 'Child', parentTempId: 'p1' },
    ]);

    const taskParams = mocks.addOmniFocusTask.mock.calls[0][0];
    expect(taskParams.projectId).toBe('new-proj');
    expect(taskParams.projectName).toBeUndefined();
  });

  it('still resolves a task parent by id', async () => {
    mocks.addOmniFocusTask
      .mockResolvedValueOnce({ success: true, taskId: 'parent-task', placement: 'inbox' })
      .mockResolvedValueOnce({ success: true, taskId: 'child-task', placement: 'parent' });

    await batchAddItems([
      { type: 'task', name: 'Parent', tempId: 't1' },
      { type: 'task', name: 'Child', parentTempId: 't1' },
    ]);

    expect(mocks.addOmniFocusTask.mock.calls[1][0]).toMatchObject({ parentTaskId: 'parent-task' });
  });

  it('does not let a resolved parent override an explicit projectId', async () => {
    await batchAddItems([
      { type: 'task', name: 'Parent', tempId: 't1' },
      { type: 'task', name: 'Child', parentTempId: 't1', projectId: 'explicit' },
    ]);

    // parentTempId resolved to a task, so the project request stands untouched.
    expect(mocks.addOmniFocusTask.mock.calls[1][0]).toMatchObject({ projectId: 'explicit' });
  });
});
