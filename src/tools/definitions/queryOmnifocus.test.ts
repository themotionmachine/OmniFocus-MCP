import { describe, it, expect } from 'vitest';
import { formatQueryResults, formatFilters, formatDate } from './queryOmnifocus.js';

describe('formatDate', () => {
  it('formats ISO date string to M/D', () => {
    expect(formatDate('2024-03-15T10:00:00Z')).toBe('3/15');
  });

  it('formats date at year boundary', () => {
    expect(formatDate('2024-01-01T00:00:00Z')).toBe('1/1');
  });

  it('formats December date', () => {
    expect(formatDate('2024-12-25T00:00:00Z')).toBe('12/25');
  });
});

describe('formatFilters', () => {
  it('formats projectName filter', () => {
    expect(formatFilters({ projectName: 'Work' })).toContain('project: "Work"');
  });

  it('formats projectId filter', () => {
    expect(formatFilters({ projectId: 'abc' })).toContain('projectId: "abc"');
  });

  it('formats folderId filter', () => {
    expect(formatFilters({ folderId: 'f1' })).toContain('folderId: "f1"');
  });

  it('formats tags filter', () => {
    expect(formatFilters({ tags: ['Work', 'Home'] })).toContain('tags: [Work, Home]');
  });

  it('formats status filter', () => {
    expect(formatFilters({ status: ['Available', 'Next'] })).toContain('status: [Available, Next]');
  });

  it('formats flagged filter', () => {
    expect(formatFilters({ flagged: true })).toContain('flagged: true');
  });

  it('formats dueWithin filter', () => {
    expect(formatFilters({ dueWithin: 7 })).toContain('due within 7 days');
  });

  it('formats deferredUntil filter', () => {
    expect(formatFilters({ deferredUntil: 3 })).toContain('deferred becoming available within 3 days');
  });

  it('formats hasNote filter', () => {
    expect(formatFilters({ hasNote: true })).toContain('has note: true');
  });

  it('formats inbox filter', () => {
    expect(formatFilters({ inbox: true })).toContain('inbox: true');
  });

  it('formats dueOn filter', () => {
    expect(formatFilters({ dueOn: 0 })).toContain('due on day +0');
  });

  it('formats deferOn filter', () => {
    expect(formatFilters({ deferOn: 1 })).toContain('defer on day +1');
  });

  it('formats plannedOn filter', () => {
    expect(formatFilters({ plannedOn: 2 })).toContain('planned on day +2');
  });

  it('combines multiple filters with commas', () => {
    const result = formatFilters({ flagged: true, dueWithin: 7 });
    expect(result).toContain('flagged: true');
    expect(result).toContain('due within 7 days');
    expect(result).toContain(', ');
  });

  it('returns empty string for empty filters', () => {
    expect(formatFilters({})).toBe('');
  });
});

describe('formatQueryResults', () => {
  it('returns "No X found" for empty results', () => {
    expect(formatQueryResults([], 'tasks')).toContain('No tasks found');
    expect(formatQueryResults([], 'projects')).toContain('No projects found');
    expect(formatQueryResults([], 'folders')).toContain('No folders found');
  });

  it('shows result count for tasks', () => {
    const tasks = [{ name: 'Task 1' }, { name: 'Task 2' }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('2 tasks');
  });

  it('formats tasks with bullet points', () => {
    const tasks = [{ name: 'My Task', flagged: false }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('• My Task');
  });

  it('shows flagged indicator for tasks', () => {
    const tasks = [{ name: 'Important', flagged: true }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('🚩');
  });

  it('shows task ID in brackets', () => {
    const tasks = [{ name: 'Task', id: 'abc123' }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('[abc123]');
  });

  it('shows project context for tasks', () => {
    const tasks = [{ name: 'Task', projectName: 'My Project' }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('(My Project)');
  });

  it('shows due date for tasks', () => {
    const tasks = [{ name: 'Task', dueDate: '2024-06-15T00:00:00Z' }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('[due:');
  });

  it('shows estimated time in hours', () => {
    const tasks = [{ name: 'Task', estimatedMinutes: 120 }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('(2h)');
  });

  it('shows estimated time in minutes', () => {
    const tasks = [{ name: 'Task', estimatedMinutes: 30 }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('(30m)');
  });

  it('shows tags', () => {
    const tasks = [{ name: 'Task', tagNames: ['Work', 'Urgent'] }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('<Work,Urgent>');
  });

  it('shows task status', () => {
    const tasks = [{ name: 'Task', taskStatus: 'Available' }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('#available');
  });

  it('shows note on new line', () => {
    const tasks = [{ name: 'Task', note: 'My note here' }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).toContain('Note: My note here');
  });

  it('formats projects', () => {
    const projects = [{ name: 'Proj', status: 'Active', folderName: 'Work', taskCount: 5 }];
    const result = formatQueryResults(projects, 'projects');
    expect(result).toContain('P: Proj');
    expect(result).toContain('Work');
    expect(result).toContain('5 tasks');
  });

  it('shows project status when not Active', () => {
    const projects = [{ name: 'Proj', status: 'OnHold' }];
    const result = formatQueryResults(projects, 'projects');
    expect(result).toContain('[OnHold]');
  });

  it('does not show Active status', () => {
    const projects = [{ name: 'Proj', status: 'Active' }];
    const result = formatQueryResults(projects, 'projects');
    expect(result).not.toContain('[Active]');
  });

  it('formats folders', () => {
    const folders = [{ name: 'Work', projectCount: 3, path: 'Work' }];
    const result = formatQueryResults(folders, 'folders');
    expect(result).toContain('F: Work');
    expect(result).toContain('3 projects');
  });

  it('includes filter summary when filters provided', () => {
    const tasks = [{ name: 'Task' }];
    const result = formatQueryResults(tasks, 'tasks', { flagged: true });
    expect(result).toContain('Filters applied:');
    expect(result).toContain('flagged: true');
  });

  it('does not show filter summary when no filters', () => {
    const tasks = [{ name: 'Task' }];
    const result = formatQueryResults(tasks, 'tasks');
    expect(result).not.toContain('Filters applied:');
  });
});
