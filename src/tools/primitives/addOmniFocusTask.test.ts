import { describe, it, expect } from 'vitest';
import { generateAppleScript, AddOmniFocusTaskParams } from './addOmniFocusTask.js';

describe('addOmniFocusTask generateAppleScript', () => {
  it('generates script for basic inbox task', () => {
    const script = generateAppleScript({ name: 'Buy groceries' });
    expect(script).toContain('make new inbox task with properties {name:"Buy groceries"}');
  });

  it('generates script with project name', () => {
    const script = generateAppleScript({ name: 'Task 1', projectName: 'My Project' });
    expect(script).toContain('first flattened project where name = "My Project"');
    expect(script).toContain('"My Project"');
  });

  it('generates date construction outside tell block for dueDate', () => {
    const script = generateAppleScript({ name: 'Task', dueDate: '2024-06-01T10:00:00' });
    // Date construction should appear before the tell block
    expect(script).toContain('copy current date to');
    expect(script).toContain('set year of');
    expect(script).toContain('set due date of newTask to');
  });

  it('generates date construction for deferDate', () => {
    const script = generateAppleScript({ name: 'Task', deferDate: '2024-07-01T00:00:00' });
    expect(script).toContain('set defer date of newTask to');
  });

  it('generates date construction for plannedDate', () => {
    const script = generateAppleScript({ name: 'Task', plannedDate: '2024-08-01T00:00:00' });
    expect(script).toContain('set planned date of newTask to');
  });

  it('sets flagged to true', () => {
    const script = generateAppleScript({ name: 'Important', flagged: true });
    expect(script).toContain('set flagged of newTask to true');
  });

  it('does not set flagged when false', () => {
    const script = generateAppleScript({ name: 'Normal', flagged: false });
    expect(script).not.toContain('set flagged of newTask to true');
  });

  it('sets estimated minutes', () => {
    const script = generateAppleScript({ name: 'Task', estimatedMinutes: 30 });
    expect(script).toContain('set estimated minutes of newTask to 30');
  });

  it('adds tags', () => {
    const script = generateAppleScript({ name: 'Task', tags: ['Work', 'Urgent'] });
    expect(script).toContain('first flattened tag where name = "Work"');
    expect(script).toContain('first flattened tag where name = "Urgent"');
    expect(script).toContain('add theTag to tags of newTask');
  });

  it('sets note on the task', () => {
    const script = generateAppleScript({ name: 'Task', note: 'Some details' });
    expect(script).toContain('set note of newTask to "Some details"');
  });

  it('escapes quotes in task name', () => {
    const script = generateAppleScript({ name: 'Task with "quotes"' });
    expect(script).toContain('Task with \\"quotes\\"');
  });

  it('escapes backslashes in task name', () => {
    const script = generateAppleScript({ name: 'Path\\to\\file' });
    expect(script).toContain('Path\\\\to\\\\file');
  });

  it('escapes quotes in note', () => {
    const script = generateAppleScript({ name: 'Task', note: 'He said "hello"' });
    expect(script).toContain('He said \\"hello\\"');
  });

  it('escapes quotes in tags', () => {
    const script = generateAppleScript({ name: 'Task', tags: ['Tag "A"'] });
    expect(script).toContain('Tag \\"A\\"');
  });

  it('escapes quotes in project name', () => {
    const script = generateAppleScript({ name: 'Task', projectName: 'Project "X"' });
    expect(script).toContain('Project \\"X\\"');
  });

  it('looks up parent task by ID', () => {
    const script = generateAppleScript({ name: 'Subtask', parentTaskId: 'abc123' });
    expect(script).toContain('first flattened task where id = "abc123"');
  });

  it('looks up parent task by name', () => {
    const script = generateAppleScript({ name: 'Subtask', parentTaskName: 'Parent Task' });
    expect(script).toContain('first flattened task where name = "Parent Task"');
  });

  it('scopes parent task lookup by project name', () => {
    const script = generateAppleScript({
      name: 'Subtask',
      parentTaskName: 'Parent',
      projectName: 'My Project',
    });
    expect(script).toContain('name of pproj is not "My Project"');
  });

  it('creates task under parent when parentTaskId provided', () => {
    const script = generateAppleScript({ name: 'Child', parentTaskId: 'xyz' });
    expect(script).toContain('make new task with properties {name:"Child"} at end of tasks of parentTask');
  });

  it('returns JSON success structure in script', () => {
    const script = generateAppleScript({ name: 'Test' });
    // AppleScript builds JSON via string concatenation with escaped quotes
    expect(script).toContain('success');
    expect(script).toContain('taskId');
    expect(script).toContain('return');
  });
});
