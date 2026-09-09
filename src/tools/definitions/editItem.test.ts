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
