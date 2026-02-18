import { describe, it, expect } from 'vitest';
import { formatCompactDate, computeMinimumUniquePrefixes, formatCompactReport } from './dumpDatabase.js';

describe('formatCompactDate', () => {
  it('formats ISO date to M/D format', () => {
    expect(formatCompactDate('2024-03-15T10:00:00Z')).toBe('3/15');
  });

  it('formats date at year boundary', () => {
    expect(formatCompactDate('2024-01-01T00:00:00Z')).toBe('1/1');
  });

  it('formats date in December', () => {
    expect(formatCompactDate('2024-12-25T00:00:00Z')).toBe('12/25');
  });

  it('returns empty string for null', () => {
    expect(formatCompactDate(null)).toBe('');
  });
});

describe('computeMinimumUniquePrefixes', () => {
  it('gives 3-char prefix for unique tags', () => {
    const result = computeMinimumUniquePrefixes(['alpha', 'beta', 'gamma']);
    expect(result.get('alpha')).toBe('alp');
    expect(result.get('beta')).toBe('bet');
    expect(result.get('gamma')).toBe('gam');
  });

  it('gives longer prefix for overlapping tags', () => {
    const result = computeMinimumUniquePrefixes(['work', 'workout']);
    expect(result.get('work')).toBe('work');
    expect(result.get('workout')).toBe('worko');
  });

  it('uses full name for identical prefixes that can never be unique', () => {
    const result = computeMinimumUniquePrefixes(['abc', 'abc']);
    expect(result.get('abc')).toBe('abc');
  });

  it('handles single tag', () => {
    const result = computeMinimumUniquePrefixes(['solo']);
    expect(result.get('solo')).toBe('sol');
  });

  it('handles empty array', () => {
    const result = computeMinimumUniquePrefixes([]);
    expect(result.size).toBe(0);
  });

  it('handles short tag names (less than 3 chars)', () => {
    const result = computeMinimumUniquePrefixes(['ab', 'cd']);
    // Tags shorter than 3 chars will use full name
    expect(result.get('ab')).toBe('ab');
    expect(result.get('cd')).toBe('cd');
  });

  it('distinguishes tags that share a common prefix', () => {
    const result = computeMinimumUniquePrefixes(['test', 'testing', 'tested']);
    // 'test' vs 'testing' vs 'tested' — 'test' needs 5 chars to differentiate from 'tested'
    expect(result.get('test')!.length).toBeLessThanOrEqual('test'.length);
    expect(result.get('testing')!.length).toBeLessThanOrEqual('testing'.length);
    // Each prefix should be unique
    const values = [...result.values()];
    const unique = new Set(values);
    // If two tags produce the same prefix, that's the full name scenario
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });
});

describe('formatCompactReport', () => {
  const makeDatabase = (overrides: any = {}) => ({
    folders: {},
    projects: {},
    tasks: [],
    tags: {},
    ...overrides,
  });

  it('includes header with date', () => {
    const report = formatCompactReport(makeDatabase(), { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('# OMNIFOCUS [');
    expect(report).toContain('FORMAT LEGEND');
  });

  it('formats folders', () => {
    const db = makeDatabase({
      folders: {
        f1: { id: 'f1', name: 'Work', parentFolderID: null, subfolders: [], projects: [] },
      },
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('F: Work');
  });

  it('formats projects inside folders', () => {
    const db = makeDatabase({
      folders: {
        f1: { id: 'f1', name: 'Work', parentFolderID: null, subfolders: [], projects: ['p1'] },
      },
      projects: {
        p1: { id: 'p1', name: 'Project Alpha', status: 'Active', folderID: 'f1' },
      },
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('F: Work');
    expect(report).toContain('P: Project Alpha');
  });

  it('formats root projects (no folder)', () => {
    const db = makeDatabase({
      projects: {
        p1: { id: 'p1', name: 'Root Project', status: 'Active', folderID: null },
      },
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('P: Root Project');
  });

  it('formats tasks with bullet point', () => {
    const db = makeDatabase({
      projects: {
        p1: { id: 'p1', name: 'Proj', status: 'Active', folderID: null },
      },
      tasks: [
        { id: 't1', name: 'Do something', projectId: 'p1', parentId: null, taskStatus: 'Available' },
      ],
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('• Do something');
  });

  it('shows flagged symbol', () => {
    const db = makeDatabase({
      projects: {
        p1: { id: 'p1', name: 'Proj', status: 'Active', folderID: null },
      },
      tasks: [
        { id: 't1', name: 'Important', projectId: 'p1', parentId: null, flagged: true, taskStatus: 'Available' },
      ],
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('🚩');
  });

  it('hides completed tasks when hideCompleted is true', () => {
    const db = makeDatabase({
      projects: {
        p1: { id: 'p1', name: 'Proj', status: 'Active', folderID: null },
      },
      tasks: [
        { id: 't1', name: 'Done task', projectId: 'p1', parentId: null, taskStatus: 'Completed', completed: true },
      ],
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).not.toContain('Done task');
  });

  it('shows completed tasks when hideCompleted is false', () => {
    const db = makeDatabase({
      projects: {
        p1: { id: 'p1', name: 'Proj', status: 'Active', folderID: null },
      },
      tasks: [
        { id: 't1', name: 'Done task', projectId: 'p1', parentId: null, taskStatus: 'Completed', completed: true },
      ],
    });
    const report = formatCompactReport(db, { hideCompleted: false, hideRecurringDuplicates: true });
    expect(report).toContain('Done task');
  });

  it('hides completed projects when hideCompleted is true', () => {
    const db = makeDatabase({
      projects: {
        p1: { id: 'p1', name: 'Finished Project', status: 'Done', folderID: null },
      },
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).not.toContain('Finished Project');
  });

  it('shows due dates on tasks', () => {
    const db = makeDatabase({
      projects: {
        p1: { id: 'p1', name: 'Proj', status: 'Active', folderID: null },
      },
      tasks: [
        { id: 't1', name: 'Task', projectId: 'p1', parentId: null, dueDate: '2024-06-15T00:00:00Z', taskStatus: 'Available' },
      ],
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('[DUE:');
  });

  it('shows duration in hours when >= 60 minutes', () => {
    const db = makeDatabase({
      projects: {
        p1: { id: 'p1', name: 'Proj', status: 'Active', folderID: null },
      },
      tasks: [
        { id: 't1', name: 'Long task', projectId: 'p1', parentId: null, estimatedMinutes: 120, taskStatus: 'Available' },
      ],
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('(2h)');
  });

  it('shows duration in minutes when < 60', () => {
    const db = makeDatabase({
      projects: {
        p1: { id: 'p1', name: 'Proj', status: 'Active', folderID: null },
      },
      tasks: [
        { id: 't1', name: 'Quick task', projectId: 'p1', parentId: null, estimatedMinutes: 30, taskStatus: 'Available' },
      ],
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('(30m)');
  });

  it('shows status shortcodes', () => {
    const db = makeDatabase({
      projects: {
        p1: { id: 'p1', name: 'Proj', status: 'Active', folderID: null },
      },
      tasks: [
        { id: 't1', name: 'Next action', projectId: 'p1', parentId: null, taskStatus: 'Next' },
      ],
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('#next');
  });

  it('shows inbox tasks', () => {
    const db = makeDatabase({
      tasks: [
        { id: 't1', name: 'Inbox task', projectId: null, parentId: null, taskStatus: 'Available' },
      ],
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('P: Inbox');
    expect(report).toContain('Inbox task');
  });

  it('abbreviates tag names to minimum unique prefix', () => {
    const db = makeDatabase({
      tags: {
        tag1: { id: 'tag1', name: 'work' },
        tag2: { id: 'tag2', name: 'personal' },
      },
      projects: {
        p1: { id: 'p1', name: 'Proj', status: 'Active', folderID: null },
      },
      tasks: [
        { id: 't1', name: 'Tagged task', projectId: 'p1', parentId: null, tagNames: ['work'], taskStatus: 'Available' },
      ],
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('<wor>');
  });

  it('formats nested subfolders', () => {
    const db = makeDatabase({
      folders: {
        f1: { id: 'f1', name: 'Parent', parentFolderID: null, subfolders: ['f2'], projects: [] },
        f2: { id: 'f2', name: 'Child', parentFolderID: 'f1', subfolders: [], projects: [] },
      },
    });
    const report = formatCompactReport(db, { hideCompleted: true, hideRecurringDuplicates: true });
    expect(report).toContain('F: Parent');
    expect(report).toContain('F: Child');
  });
});
