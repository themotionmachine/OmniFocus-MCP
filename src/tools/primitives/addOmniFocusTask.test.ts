import { describe, it, expect } from 'vitest';
import { generateAppleScript } from './addOmniFocusTask.js';

describe('addOmniFocusTask generateAppleScript', () => {
  it('creates inbox task when no project specified', () => {
    const script = generateAppleScript({ name: 'Buy milk' });
    expect(script).toContain('make new inbox task with properties {name:"Buy milk"}');
  });

  it('creates task in project when projectName specified', () => {
    const script = generateAppleScript({
      name: 'Write tests',
      projectName: 'Development',
    });
    expect(script).toContain('first flattened project where name = "Development"');
    expect(script).toContain('make new task with properties {name:"Write tests"}');
    expect(script).toContain('at end of tasks of targetProject');
  });

  it('preserves newlines in note via linefeed concatenation', () => {
    const script = generateAppleScript({
      name: 'A task',
      note: 'Line 1\nLine 2\nLine 3',
    });
    expect(script).toContain(
      'set note of newTask to "Line 1" & linefeed & "Line 2" & linefeed & "Line 3"'
    );
  });

  it('resolves project by id when projectId specified', () => {
    const script = generateAppleScript({
      name: 'Task by id',
      projectId: 'abc123',
    });
    expect(script).toContain('first flattened project where id = "abc123"');
    expect(script).toContain('at end of tasks of targetProject');
    expect(script).toContain('Project not found: id abc123');
  });

  it('prefers projectId over projectName when both are supplied', () => {
    const script = generateAppleScript({
      name: 'Disambiguated task',
      projectId: 'xyz789',
      projectName: 'Ambiguous Name',
    });
    // The runtime guard is what enforces precedence: the projectId check sits in the
    // if-branch and runs first; the projectName check sits in the else-if and is
    // unreachable when projectId is non-empty. Both branches render in the script text
    // (one would be unused), so the test asserts structure + ordering rather than absence.
    expect(script).toContain('if "xyz789" is not "" then');
    expect(script).toContain('else if "Ambiguous Name" is not "" then');
    expect(script.indexOf('if "xyz789" is not "" then'))
      .toBeLessThan(script.indexOf('else if "Ambiguous Name" is not "" then'));
    expect(script.indexOf('first flattened project where id = "xyz789"'))
      .toBeLessThan(script.indexOf('first flattened project where name = "Ambiguous Name"'));
  });

  it('parent-within-project constraint compares by id of containing project', () => {
    const script = generateAppleScript({
      name: 'Child task',
      projectId: 'proj-1',
      parentTaskId: 'task-99',
    });
    // The constraint compares container-project id against the resolved targetProject id,
    // not against the projectName text (which may be unset when only projectId is given).
    expect(script).toContain('(id of pproj as string) is not equal to (id of targetProject as string)');
  });
});
