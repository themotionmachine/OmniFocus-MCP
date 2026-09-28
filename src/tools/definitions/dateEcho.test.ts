import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

/**
 * A date-only dueDate was echoed one day early in the add tools' success text
 * ("due on 9/28/2026" for "2026-09-29") while being stored correctly:
 * `new Date("2026-09-29")` is UTC midnight, the previous evening anywhere behind
 * UTC. Agents trust the success line, so they reported the wrong date. The bug
 * is invisible in UTC, so these tests pin a zone behind it.
 */

vi.mock('../primitives/addOmniFocusTask.js', () => ({ addOmniFocusTask: vi.fn() }));
vi.mock('../primitives/addProject.js', () => ({ addProject: vi.fn() }));

import { addOmniFocusTask } from '../primitives/addOmniFocusTask.js';
import { addProject } from '../primitives/addProject.js';
import { handler as addTaskHandler } from './addOmniFocusTask.js';
import { handler as addProjectHandler } from './addProject.js';
import { parseInputDate } from '../../utils/dateFormatting.js';

const originalTZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'America/New_York'; });
afterAll(() => { process.env.TZ = originalTZ; });

const expected = new Date(2026, 8, 29).toLocaleDateString();

describe('success text echoes the due date the caller gave', () => {
  it('guards the guard: the zone really is behind UTC', () => {
    expect(new Date('2026-09-29').getDate()).toBe(28);
  });

  it('add_omnifocus_task: "2026-09-29" reads as 9/29, not 9/28', async () => {
    vi.mocked(addOmniFocusTask).mockResolvedValue({ success: true, taskId: 't1', placement: 'project' } as any);
    const r = await addTaskHandler({ name: 'x', dueDate: '2026-09-29' } as any, {} as any);
    expect(r.content[0].text).toContain(`due on ${expected}`);
  });

  it('add_project: same', async () => {
    vi.mocked(addProject).mockResolvedValue({ success: true, projectId: 'p1' } as any);
    const r = await addProjectHandler({ name: 'x', dueDate: '2026-09-29' } as any, {} as any);
    expect(r.content[0].text).toContain(`due on ${expected}`);
  });

  it('parseInputDate keeps a full local timestamp as given', () => {
    const d = parseInputDate('2026-09-29T17:00:00');
    expect([d.getDate(), d.getHours()]).toEqual([29, 17]);
  });
});
