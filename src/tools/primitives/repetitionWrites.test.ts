import { describe, it, expect } from 'vitest';
import { generateAppleScript as addTask } from './addOmniFocusTask.js';
import { generateAppleScript as addProject } from './addProject.js';
import { generateAppleScript as editItem } from './editItem.js';
import { generateAppleScript as removeItem } from './removeItem.js';
import { schema as addTaskSchema } from '../definitions/addOmniFocusTask.js';
import { schema as addProjectSchema } from '../definitions/addProject.js';
import { schema as editItemSchema } from '../definitions/editItem.js';
import { schema as batchSchema } from '../definitions/batchAddItems.js';

/**
 * Repetition writes (#116). The AppleScript layer accepts a repetition rule only
 * as a WHOLE record — sub-property assignment fails with "Can't make … into type
 * specifier" — so these tests pin the record form at each write site.
 */
describe('repetition rule on create (#116)', () => {
  it('add_omnifocus_task emits the record with method and recurrence', () => {
    const script = addTask({
      name: 'Weekly review',
      repeat: { method: 'start-after-completion', unit: 'week' },
    });
    expect(script).toContain(
      'set repetition rule of newTask to {repetition method:start after completion, recurrence:"FREQ=WEEKLY"}'
    );
  });

  it('add_project emits the record too (projects can repeat)', () => {
    const script = addProject({
      name: 'Monthly close',
      repeat: { method: 'fixed', unit: 'month', steps: 3 },
    });
    expect(script).toContain(
      'set repetition rule of newProject to {repetition method:fixed repetition, recurrence:"FREQ=MONTHLY;INTERVAL=3"}'
    );
  });

  it('emits no repetition statement when no repeat is requested', () => {
    expect(addTask({ name: 'One-shot' })).not.toContain('repetition rule');
    expect(addProject({ name: 'One-shot' })).not.toContain('repetition rule');
  });

  it('compiles weekday sets through to the record', () => {
    const script = addTask({
      name: 'Strength',
      repeat: { method: 'fixed', unit: 'week', weekdays: ['TU', 'TH'] },
    });
    expect(script).toContain('recurrence:"FREQ=WEEKLY;BYDAY=TU,TH"');
  });

  it('throws rather than creating a task with a silently-dropped repeat', () => {
    // The whole point of the feature is that repeats stop arriving inert; an
    // invalid spec must not degrade into "created, reported success, no repeat".
    expect(() =>
      addTask({ name: 'Bad', repeat: { method: 'fixed', unit: 'week', steps: 0 } as any })
    ).toThrow();
  });
});

describe('repetition rule on edit (#116)', () => {
  it('sets a new rule as a whole record', () => {
    const script = editItem({
      id: 'abc',
      itemType: 'task',
      newRepeat: { method: 'due-after-completion', unit: 'day', steps: 5 },
    });
    expect(script).toContain(
      'set repetition rule of foundItem to {repetition method:due after completion, recurrence:"FREQ=DAILY;INTERVAL=5"}'
    );
    expect(script).toContain('set end of changedProperties to "repetition"');
  });

  it('clears the rule when newRepeat is null', () => {
    const script = editItem({ id: 'abc', itemType: 'task', newRepeat: null });
    expect(script).toContain('set repetition rule of foundItem to missing value');
    expect(script).toContain('repetition (cleared)');
  });

  it('distinguishes clearing from not-specified', () => {
    // `undefined` must be a no-op — otherwise every unrelated edit would wipe
    // the item's repeat.
    const untouched = editItem({ id: 'abc', itemType: 'task', newName: 'Renamed' });
    // The #124 guard *reads* the repetition rule on every edit, so assert on the
    // assignment specifically rather than any mention of it.
    expect(untouched).not.toContain('set repetition rule of foundItem to');
  });

  it('works on projects as well as tasks', () => {
    const script = editItem({
      id: 'p1',
      itemType: 'project',
      newRepeat: { method: 'fixed', unit: 'year' },
    });
    expect(script).toContain('set repetition rule of foundItem to');
    expect(script).toContain('FREQ=YEARLY');
  });
});

/**
 * Schema parity. #97 shipped because add_omnifocus_task accepted `projectId`
 * while batch_add_items did not, so Zod stripped it and every batched task
 * landed in the inbox reporting success. A write field missing from one schema
 * is not a smaller bug than a broken one.
 */
describe('repeat is accepted by every write schema (#116)', () => {
  const repeat = { method: 'start-after-completion' as const, unit: 'week' as const, steps: 2 };

  it('add_omnifocus_task keeps repeat through validation', () => {
    const parsed = addTaskSchema.parse({ name: 'x', repeat });
    expect(parsed.repeat).toEqual(repeat);
  });

  it('add_project keeps repeat through validation', () => {
    expect(addProjectSchema.parse({ name: 'x', repeat }).repeat).toEqual(repeat);
  });

  it('batch_add_items keeps repeat on each item', () => {
    const parsed = batchSchema.parse({ items: [{ type: 'task', name: 'x', repeat }] });
    expect(parsed.items[0].repeat).toEqual(repeat);
  });

  it('edit_item keeps newRepeat, including an explicit null', () => {
    expect(editItemSchema.parse({ id: 'a', itemType: 'task', newRepeat: repeat }).newRepeat).toEqual(repeat);
    expect(editItemSchema.parse({ id: 'a', itemType: 'task', newRepeat: null }).newRepeat).toBeNull();
  });

  it('rejects an invalid method at the schema boundary', () => {
    expect(() => addTaskSchema.parse({ name: 'x', repeat: { method: 'whenever', unit: 'week' } })).toThrow();
  });

  it('rejects an invalid weekday code at the schema boundary', () => {
    expect(() =>
      addTaskSchema.parse({ name: 'x', repeat: { method: 'fixed', unit: 'week', weekdays: ['MON'] } })
    ).toThrow();
  });
});

/**
 * Occurrence safety (#124). OmniFocus 4 keeps completed occurrences of a
 * repeating item as separate rows carrying the same name AND rule as the live
 * one, so they read as duplicates. Mutating one cascades through the live chain.
 */
describe('past-occurrence guard (#124)', () => {
  it('guards edit_item by default', () => {
    const script = editItem({ id: 'abc.5', itemType: 'task', newStatus: 'dropped' });
    expect(script).toContain('repetition rule of foundItem');
    expect(script).toContain('completed occurrence of a repeating item');
  });

  it('guards remove_item by default', () => {
    const script = removeItem({ id: 'abc.5', itemType: 'task' });
    expect(script).toContain('completed occurrence of a repeating item');
  });

  it('is opt-out-able for the rare deliberate case', () => {
    const script = editItem({
      id: 'abc.5', itemType: 'task', newStatus: 'dropped', allowPastOccurrence: true,
    });
    expect(script).not.toContain('completed occurrence of a repeating item');
  });

  it('keys on repeating-plus-terminal-status, never on id shape', () => {
    // A repeating PROJECT's live id is itself dotted (bY_WHmMzWfC.116 is Active),
    // so refusing dotted ids would make repeating projects uneditable.
    const script = editItem({ id: 'bY_WHmMzWfC.116', itemType: 'project', newName: 'x' });
    expect(script).not.toMatch(/id contains "\."/);
    expect(script).toContain('repetition rule of foundItem');
    expect(script).toMatch(/completed of foundItem|status of foundItem/);
  });

  it('lets a non-repeating item through untouched', () => {
    // The guard only trips when BOTH conditions hold; it must not add a status
    // check that blocks ordinary completed one-shots.
    const script = editItem({ id: 'plain', itemType: 'task', newName: 'x' });
    expect(script).toContain('if (repetition rule of foundItem) is not missing value then');
  });
});
