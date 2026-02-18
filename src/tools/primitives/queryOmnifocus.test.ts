import { describe, it, expect } from 'vitest';
import {
  generateQueryScript,
  generateFilterConditions,
  generateSortLogic,
  generateFieldMapping,
} from './queryOmnifocus.js';

describe('generateQueryScript', () => {
  it('generates script that queries tasks', () => {
    const script = generateQueryScript({ entity: 'tasks' });
    expect(script).toContain('flattenedTasks');
    expect(script).toContain('entityType === "tasks"');
  });

  it('generates script that queries projects', () => {
    const script = generateQueryScript({ entity: 'projects' });
    expect(script).toContain('flattenedProjects');
  });

  it('generates script that queries folders', () => {
    const script = generateQueryScript({ entity: 'folders' });
    expect(script).toContain('flattenedFolders');
  });

  it('includes filter conditions when filters provided', () => {
    const script = generateQueryScript({
      entity: 'tasks',
      filters: { flagged: true },
    });
    expect(script).toContain('item.flagged');
  });

  it('applies includeCompleted flag', () => {
    const script = generateQueryScript({ entity: 'tasks', includeCompleted: true });
    expect(script).toContain('!true');
  });

  it('applies limit', () => {
    const script = generateQueryScript({ entity: 'tasks', limit: 10 });
    expect(script).toContain('filtered.slice(0, 10)');
  });

  it('applies sort logic', () => {
    const script = generateQueryScript({ entity: 'tasks', sortBy: 'name', sortOrder: 'asc' });
    expect(script).toContain('filtered.sort');
    expect(script).toContain('localeCompare');
  });

  it('returns count only in summary mode', () => {
    const script = generateQueryScript({ entity: 'tasks', summary: true });
    expect(script).toContain('count: filtered.length');
  });

  it('wraps script in IIFE', () => {
    const script = generateQueryScript({ entity: 'tasks' });
    expect(script).toMatch(/^\(\(\) => \{/);
    expect(script).toMatch(/\}\)\(\);$/);
  });
});

describe('generateFilterConditions', () => {
  it('generates projectName filter with case-insensitive matching', () => {
    const result = generateFilterConditions('tasks', { projectName: 'Weekly Review' });
    expect(result).toContain('projectName');
    expect(result).toContain('weekly review');
    expect(result).toContain('toLowerCase');
  });

  it('generates projectId filter', () => {
    const result = generateFilterConditions('tasks', { projectId: 'proj123' });
    expect(result).toContain('proj123');
    expect(result).toContain('primaryKey');
  });

  it('generates tags filter with OR logic', () => {
    const result = generateFilterConditions('tasks', { tags: ['Work', 'Home'] });
    expect(result).toContain('t.name === "Work"');
    expect(result).toContain('t.name === "Home"');
    expect(result).toContain('||');
  });

  it('generates status filter for tasks', () => {
    const result = generateFilterConditions('tasks', { status: ['Available', 'Next'] });
    expect(result).toContain('taskStatusMap');
    expect(result).toContain('"Available"');
    expect(result).toContain('"Next"');
  });

  it('generates status filter for projects', () => {
    const result = generateFilterConditions('projects', { status: ['Active'] });
    expect(result).toContain('projectStatusMap');
    expect(result).toContain('"Active"');
  });

  it('generates flagged filter', () => {
    const result = generateFilterConditions('tasks', { flagged: true });
    expect(result).toContain('item.flagged !== true');
  });

  it('generates dueWithin filter', () => {
    const result = generateFilterConditions('tasks', { dueWithin: 7 });
    expect(result).toContain('checkDateFilter(item.dueDate, 7)');
  });

  it('generates plannedWithin filter', () => {
    const result = generateFilterConditions('tasks', { plannedWithin: 3 });
    expect(result).toContain('checkDateFilter(item.plannedDate, 3)');
  });

  it('generates dueOn filter', () => {
    const result = generateFilterConditions('tasks', { dueOn: 0 });
    expect(result).toContain('checkSameDay(item.dueDate, 0)');
  });

  it('generates deferOn filter', () => {
    const result = generateFilterConditions('tasks', { deferOn: 1 });
    expect(result).toContain('checkSameDay(item.deferDate, 1)');
  });

  it('generates plannedOn filter', () => {
    const result = generateFilterConditions('tasks', { plannedOn: 2 });
    expect(result).toContain('checkSameDay(item.plannedDate, 2)');
  });

  it('generates hasNote filter', () => {
    const result = generateFilterConditions('tasks', { hasNote: true });
    expect(result).toContain('item.note');
    expect(result).toContain('hasNote !== true');
  });

  it('generates inbox filter (true)', () => {
    const result = generateFilterConditions('tasks', { inbox: true });
    expect(result).toContain('item.inInbox');
  });

  it('generates inbox filter (false)', () => {
    const result = generateFilterConditions('tasks', { inbox: false });
    expect(result).toContain('item.inInbox');
  });

  it('generates folderId filter for projects', () => {
    const result = generateFilterConditions('projects', { folderId: 'folder123' });
    expect(result).toContain('folder123');
    expect(result).toContain('parentFolder');
  });

  it('returns empty string for empty filters', () => {
    const result = generateFilterConditions('tasks', {});
    expect(result).toBe('');
  });

  it('combines multiple filters', () => {
    const result = generateFilterConditions('tasks', { flagged: true, dueWithin: 7 });
    expect(result).toContain('item.flagged');
    expect(result).toContain('checkDateFilter');
  });
});

describe('generateSortLogic', () => {
  it('generates ascending sort by default', () => {
    const result = generateSortLogic('name');
    expect(result).toContain('filtered.sort');
    expect(result).toContain('* 1');
  });

  it('generates descending sort', () => {
    const result = generateSortLogic('name', 'desc');
    expect(result).toContain('* -1');
  });

  it('handles null values (pushes to end)', () => {
    const result = generateSortLogic('dueDate');
    expect(result).toContain('aVal == null');
    expect(result).toContain('return 1');
    expect(result).toContain('return -1');
  });

  it('handles string comparison', () => {
    const result = generateSortLogic('name');
    expect(result).toContain('localeCompare');
  });

  it('handles date comparison', () => {
    const result = generateSortLogic('dueDate');
    expect(result).toContain('getTime');
  });
});

describe('generateFieldMapping', () => {
  it('returns default task fields when no fields specified', () => {
    const result = generateFieldMapping('tasks');
    expect(result).toContain('item.id.primaryKey');
    expect(result).toContain('item.name');
    expect(result).toContain('item.flagged');
    expect(result).toContain('taskStatusMap');
    expect(result).toContain('formatDate(item.dueDate)');
    expect(result).toContain('item.tags');
    expect(result).toContain('item.containingProject');
    expect(result).toContain('estimatedMinutes');
  });

  it('returns default project fields when no fields specified', () => {
    const result = generateFieldMapping('projects');
    expect(result).toContain('item.id.primaryKey');
    expect(result).toContain('item.name');
    expect(result).toContain('projectStatusMap');
    expect(result).toContain('item.parentFolder');
    expect(result).toContain('taskCount');
  });

  it('returns default folder fields when no fields specified', () => {
    const result = generateFieldMapping('folders');
    expect(result).toContain('item.id.primaryKey');
    expect(result).toContain('item.name');
    expect(result).toContain('projectCount');
    expect(result).toContain('path');
  });

  it('maps specific requested fields', () => {
    const result = generateFieldMapping('tasks', ['id', 'name', 'dueDate']);
    expect(result).toContain('id: item.id.primaryKey');
    expect(result).toContain('dueDate: formatDate(item.dueDate)');
  });

  it('maps taskStatus field correctly', () => {
    const result = generateFieldMapping('tasks', ['taskStatus']);
    expect(result).toContain('taskStatus: taskStatusMap[item.taskStatus]');
  });

  it('maps tagNames field correctly', () => {
    const result = generateFieldMapping('tasks', ['tagNames']);
    expect(result).toContain('item.tags.map(t => t.name)');
  });

  it('maps parentId field', () => {
    const result = generateFieldMapping('tasks', ['parentId']);
    expect(result).toContain('item.parent');
  });

  it('maps childIds field', () => {
    const result = generateFieldMapping('tasks', ['childIds']);
    expect(result).toContain('item.children');
  });

  it('maps modificationDate field', () => {
    const result = generateFieldMapping('tasks', ['modificationDate']);
    expect(result).toContain('formatDate(item.modified)');
  });

  it('maps completionDate field', () => {
    const result = generateFieldMapping('tasks', ['completionDate']);
    expect(result).toContain('item.completionDate');
  });

  it('falls back to direct access for unknown fields', () => {
    const result = generateFieldMapping('tasks', ['customField']);
    expect(result).toContain('customField: item.customField');
  });
});
