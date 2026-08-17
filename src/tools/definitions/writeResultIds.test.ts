import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Issue #104: every write tool's success text must echo the created/edited/
 * removed item's id. Without it, agents re-query immediately after each write
 * just to harvest the id for the follow-up call — pure waste, and it forced a
 * verify-after-write convention on callers.
 */

vi.mock('../primitives/addOmniFocusTask.js', () => ({
  addOmniFocusTask: vi.fn(),
}));
vi.mock('../primitives/addProject.js', () => ({
  addProject: vi.fn(),
}));
vi.mock('../primitives/editItem.js', () => ({
  editItem: vi.fn(),
}));
vi.mock('../primitives/removeItem.js', () => ({
  removeItem: vi.fn(),
}));
vi.mock('../primitives/batchAddItems.js', () => ({
  batchAddItems: vi.fn(),
}));
vi.mock('../primitives/batchRemoveItems.js', () => ({
  batchRemoveItems: vi.fn(),
}));

import { addOmniFocusTask } from '../primitives/addOmniFocusTask.js';
import { addProject } from '../primitives/addProject.js';
import { editItem } from '../primitives/editItem.js';
import { removeItem } from '../primitives/removeItem.js';
import { batchAddItems } from '../primitives/batchAddItems.js';
import { batchRemoveItems } from '../primitives/batchRemoveItems.js';

import { handler as addTaskHandler } from './addOmniFocusTask.js';
import { handler as addProjectHandler } from './addProject.js';
import { handler as editItemHandler } from './editItem.js';
import { handler as removeItemHandler } from './removeItem.js';
import { handler as batchAddHandler } from './batchAddItems.js';
import { handler as batchRemoveHandler } from './batchRemoveItems.js';

const extra = {} as any;

function textOf(result: any): string {
  return result.content[0].text;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('write results echo ids (#104)', () => {
  it('add_omnifocus_task includes the task id', async () => {
    vi.mocked(addOmniFocusTask).mockResolvedValue({
      success: true,
      taskId: 'tASK123',
      placement: 'inbox',
    });
    const result = await addTaskHandler({ name: 'Buy milk' } as any, extra);
    expect(textOf(result)).toContain('(id: tASK123)');
  });

  it('add_project includes the project id', async () => {
    vi.mocked(addProject).mockResolvedValue({ success: true, projectId: 'pROJ456' });
    const result = await addProjectHandler({ name: 'New Project' } as any, extra);
    expect(textOf(result)).toContain('(id: pROJ456)');
  });

  it('edit_item includes the item id', async () => {
    vi.mocked(editItem).mockResolvedValue({
      success: true,
      id: 'iTEM789',
      name: 'Renamed',
      changedProperties: 'name',
    });
    const result = await editItemHandler(
      { name: 'Old name', itemType: 'task', newName: 'Renamed' } as any,
      extra
    );
    expect(textOf(result)).toContain('(id: iTEM789)');
  });

  it('remove_item includes the removed id', async () => {
    vi.mocked(removeItem).mockResolvedValue({ success: true, id: 'gONE1', name: 'Old task' });
    const result = await removeItemHandler({ id: 'gONE1', itemType: 'task' } as any, extra);
    expect(textOf(result)).toContain('(id: gONE1)');
  });

  it('batch_add_items includes each created id in the per-item details', async () => {
    vi.mocked(batchAddItems).mockResolvedValue({
      success: true,
      results: [
        { success: true, id: 'nEW1', placement: 'project' },
        { success: true, id: 'nEW2', placement: 'inbox' },
      ],
    } as any);
    const result = await batchAddHandler(
      {
        items: [
          { type: 'task', name: 'First', projectName: 'Reading' },
          { type: 'task', name: 'Second' },
        ],
      } as any,
      extra
    );
    expect(textOf(result)).toContain('(id: nEW1)');
    expect(textOf(result)).toContain('(id: nEW2)');
  });

  it('batch_remove_items includes each removed id in the per-item details', async () => {
    vi.mocked(batchRemoveItems).mockResolvedValue({
      success: true,
      results: [{ success: true, id: 'rM1', name: 'Old task' }],
    } as any);
    const result = await batchRemoveHandler(
      { items: [{ id: 'rM1', itemType: 'task' }] } as any,
      extra
    );
    expect(textOf(result)).toContain('(id: rM1)');
  });

  it('omits the id clause rather than rendering "(id: undefined)"', async () => {
    vi.mocked(addOmniFocusTask).mockResolvedValue({ success: true } as any);
    const result = await addTaskHandler({ name: 'Buy milk' } as any, extra);
    expect(textOf(result)).not.toContain('undefined');
    expect(textOf(result)).not.toContain('(id:');
  });
});
