import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * edit_item called with a target but no editable field used to answer
 * "✅ Task ... updated successfully" — a success line for a write that never
 * happened. The real-world trigger was a field-name typo (`note` for `newNote`):
 * the SDK strips unknown keys, so the handler saw nothing to change and
 * cheerfully reported nothing as success. Same failure class as #57.
 */

vi.mock('../primitives/editItem.js', () => ({
  editItem: vi.fn(),
}));

import { editItem } from '../primitives/editItem.js';
import { handler, schema, UPDATE_FIELDS, updateFieldsProvided } from './editItem.js';
import { deepStrict } from '../../buildServer.js';

const extra = {} as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('edit_item refuses a no-op edit', () => {
  it('errors, names the accepted fields, and never reaches OmniFocus', async () => {
    const result = await handler({ id: 'abc', itemType: 'task' } as any, extra);
    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain('no change was made');
    expect(text).toContain('newNote');
    expect(text).toContain('newName');
    expect(text).not.toContain('✅');
    expect(editItem).not.toHaveBeenCalled();
  });

  it('allowPastOccurrence alone is not an edit', async () => {
    const result = await handler(
      { id: 'abc', itemType: 'task', allowPastOccurrence: true } as any,
      extra
    );
    expect(result.isError).toBe(true);
    expect(editItem).not.toHaveBeenCalled();
  });

  it('still edits when a real field is present', async () => {
    vi.mocked(editItem).mockResolvedValue({
      success: true,
      id: 'abc',
      name: 'Task',
      changedProperties: 'note',
    });
    const result = await handler({ id: 'abc', itemType: 'task', newNote: 'hi' } as any, extra);
    expect(result.isError).toBeUndefined();
    expect(editItem).toHaveBeenCalledTimes(1);
  });

  it('treats explicit clears (empty string, null, false) as edits', () => {
    expect(updateFieldsProvided({ newDueDate: '' })).toEqual(['newDueDate']);
    expect(updateFieldsProvided({ newRepeat: null })).toEqual(['newRepeat']);
    expect(updateFieldsProvided({ newFlagged: false })).toEqual(['newFlagged']);
    expect(updateFieldsProvided({ newName: undefined })).toEqual([]);
  });

  it('derives the accepted-field list from the schema so it cannot drift', () => {
    const all = Object.keys(schema.shape);
    expect(UPDATE_FIELDS).toEqual(
      all.filter(k => !['id', 'name', 'itemType', 'allowPastOccurrence'].includes(k))
    );
    expect(UPDATE_FIELDS).toContain('markReviewed');
    expect(UPDATE_FIELDS).not.toContain('itemType');
  });
});

describe('edit_item schema: #138 / #139 shapes', () => {
  // Registered tools are made strict by deepStrict in buildServer; mirror that.
  const strict = deepStrict(schema);
  const ok = (fields: Record<string, unknown>) =>
    strict.safeParse({ id: 'x', itemType: 'task', ...fields }).success;

  it('accepts the typed position forms', () => {
    expect(ok({ position: 'beginning' })).toBe(true);
    expect(ok({ position: 'end' })).toBe(true);
    expect(ok({ position: { before: 'abc' } })).toBe(true);
    expect(ok({ position: { after: 'abc' } })).toBe(true);
    expect(ok({ newParentTaskId: '' })).toBe(true);
  });

  it('rejects malformed positions at the schema', () => {
    expect(ok({ position: 'after:abc' })).toBe(false);
    expect(ok({ position: 'top' })).toBe(false);
    expect(ok({ position: { before: 'a', after: 'b' } })).toBe(false);
    expect(ok({ position: { before: '' } })).toBe(false);
    expect(ok({ position: { beside: 'a' } })).toBe(false);
  });

  it('validates the review interval shape', () => {
    expect(ok({ newReviewInterval: { steps: 2, unit: 'week' } })).toBe(true);
    expect(ok({ newReviewInterval: { steps: 0, unit: 'week' } })).toBe(false);
    expect(ok({ newReviewInterval: { steps: 1.5, unit: 'week' } })).toBe(false);
    expect(ok({ newReviewInterval: { steps: 2, unit: 'weeks' } })).toBe(false);
    expect(ok({ newReviewInterval: { unit: 'week' } })).toBe(false);
    expect(ok({ newReviewInterval: { steps: 1, unit: 'week', extra: 1 } })).toBe(false);
  });

  it('counts the new fields as edits', () => {
    expect(UPDATE_FIELDS).toEqual(expect.arrayContaining(['newParentTaskId', 'position', 'newReviewInterval']));
  });

  it('reports a refused combination as an error, not success', async () => {
    const { editItem: realEditItem } = await vi.importActual<typeof import('../primitives/editItem.js')>(
      '../primitives/editItem.js'
    );
    const result = await realEditItem({ id: 'x', itemType: 'project', position: 'end' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/tasks only/);
  });
});
