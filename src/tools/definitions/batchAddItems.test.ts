import { describe, it, expect } from 'vitest';
import { describePlacement } from './batchAddItems.js';

describe('describePlacement', () => {
  it('flags a task that asked for a project and landed in the inbox (#97)', () => {
    const text = describePlacement(
      { type: 'task', projectId: 'bARxLhruZIp' },
      'inbox'
    );
    expect(text).toContain('⚠️');
    expect(text).toContain('inbox');
    expect(text).toContain('bARxLhruZIp');
  });

  it('flags an unhonored parent request the same way', () => {
    expect(describePlacement({ type: 'task', parentTaskName: 'Parent' }, 'inbox')).toContain('⚠️');
  });

  it('does not warn when the inbox is where the task was meant to go', () => {
    expect(describePlacement({ type: 'task' }, 'inbox')).toBe(' → inbox');
  });

  it('names the project a task landed in', () => {
    expect(describePlacement({ type: 'task', projectName: 'Reading' }, 'project')).toBe(
      ' → in project "Reading"'
    );
  });

  it('falls back to the project id when only an id was supplied', () => {
    expect(describePlacement({ type: 'task', projectId: 'abc' }, 'project')).toBe(
      ' → in project id abc'
    );
  });

  it('resolves a within-batch project target back to its name', () => {
    // "tempId p1" tells the caller nothing about where the task went.
    const batch = [
      { type: 'project' as const, name: 'Reading', tempId: 'p1' },
      { type: 'task' as const, name: 'Child', parentTempId: 'p1' },
    ];
    expect(describePlacement(batch[1], 'project', batch)).toBe(' → in project "Reading"');
  });

  it('falls back to the raw tempId when the sibling is not in the batch', () => {
    expect(describePlacement({ type: 'task', parentTempId: 'p1' }, 'project')).toBe(
      ' → in project tempId p1'
    );
  });

  it('warns when a named parent was not honored but the project was', () => {
    const text = describePlacement(
      { type: 'task', projectName: 'Reading', parentTaskName: 'Missing' },
      'project'
    );
    expect(text).toContain('in project "Reading"');
    expect(text).toContain('⚠️ parent not found');
  });

  it('reports a parent placement', () => {
    expect(describePlacement({ type: 'task', parentTaskId: 'abc' }, 'parent')).toBe(
      ' → under parent id abc'
    );
  });

  it('says nothing for projects, which have no placement', () => {
    expect(describePlacement({ type: 'project' }, 'project')).toBe('');
  });

  it('says nothing when the primitive reported no placement', () => {
    // Older result shapes, and any future caller that drops the field, should
    // degrade to the previous output rather than inventing a location.
    expect(describePlacement({ type: 'task', projectName: 'Reading' }, undefined)).toBe('');
  });
});
