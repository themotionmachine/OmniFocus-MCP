import { describe, it, expect } from 'vitest';
import { generateAppleScript as generateAddTaskScript } from './addOmniFocusTask.js';
import { generateAppleScript as generateAddProjectScript } from './addProject.js';
import { generateAppleScript as generateCreateTagScript } from './createTag.js';
import { generateAppleScript as generateRemoveItemScript } from './removeItem.js';
import { generateAppleScript as generateEditItemScript } from './editItem.js';

/**
 * Issue #103: every write primitive returns a hand-built JSON payload from
 * AppleScript. A quote in a user-supplied name used to corrupt that payload —
 * the write succeeded, the result failed to parse, and the tool reported an
 * error (a duplicate-retry hazard). This suite pins the two defenses:
 *
 * 1. TS-known values are either dropped from the payload (the caller already
 *    has them) or double-escaped via escapeForJsonInAppleScript.
 * 2. Runtime-only values (current item name, AppleScript error text) route
 *    through the script's own `jsonEscape` handler.
 */

// A name built from the live repro: straight quotes (inch marks) are the ones
// that corrupt JSON; backslashes ride along to catch the escape-order bug.
const HOSTILE = 'retitle to "policy \\ infrastructure" engineer';

/**
 * Evaluate what a pure (splice-free) AppleScript string-literal line returns at
 * runtime, then JSON.parse it — the same pipeline the daemon runs.
 */
function parseReturnedJson(scriptLine: string): any {
  const literal = scriptLine.slice(scriptLine.indexOf('"') + 1, scriptLine.lastIndexOf('"'));
  return JSON.parse(literal.replace(/\\(.)/g, '$1'));
}

function lineContaining(script: string, marker: string): string {
  const line = script.split('\n').find(l => l.includes(marker));
  expect(line, `expected a line containing ${marker}`).toBeDefined();
  return line!;
}

describe('write-result JSON payload safety (#103)', () => {
  describe('add_omnifocus_task', () => {
    it('does not echo the task name into the success payload', () => {
      const script = generateAddTaskScript({ name: HOSTILE });
      const success = lineContaining(script, '\\"taskId\\"');
      expect(success).not.toContain('policy');
      expect(success).toContain('placement');
    });

    it('routes AppleScript error text through jsonEscape', () => {
      const script = generateAddTaskScript({ name: 'x' });
      expect(script).toContain('on jsonEscape(theText)');
      expect(script).toContain('my jsonEscape(errorMessage)');
    });

    it('project-not-found error JSON survives a quoted project name', () => {
      const script = generateAddTaskScript({ name: 'x', projectName: HOSTILE });
      // The script always also contains the projectId branch's "Project not
      // found: id" line, so anchor on the name itself.
      const result = parseReturnedJson(lineContaining(script, 'Project not found: retitle'));
      expect(result.success).toBe(false);
      expect(result.error).toBe(`Project not found: ${HOSTILE}`);
    });

    it('project-not-found-by-id error JSON survives a quoted id', () => {
      const script = generateAddTaskScript({ name: 'x', projectId: 'id "with" quotes' });
      const result = parseReturnedJson(lineContaining(script, 'Project not found: id'));
      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not found: id id "with" quotes');
    });
  });

  describe('add_project', () => {
    it('does not echo the project name into the success payload', () => {
      const script = generateAddProjectScript({ name: HOSTILE });
      const success = lineContaining(script, '\\"projectId\\"');
      expect(success).not.toContain('policy');
    });

    it('folder-not-found error JSON survives a quoted folder name', () => {
      const script = generateAddProjectScript({ name: 'x', folderName: 'Q3 "Deep Work"' });
      const result = parseReturnedJson(lineContaining(script, 'Folder not found'));
      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder not found: Q3 "Deep Work"');
    });

    it('routes AppleScript error text through jsonEscape', () => {
      const script = generateAddProjectScript({ name: 'x' });
      expect(script).toContain('on jsonEscape(theText)');
      expect(script).toContain('my jsonEscape(errorMessage)');
    });
  });

  describe('create_tag', () => {
    it('does not echo the tag name into the success payload', () => {
      const script = generateCreateTagScript({ name: HOSTILE });
      const success = lineContaining(script, '\\"tagId\\"');
      expect(success).not.toContain('policy');
    });

    it('parent-not-found error JSON survives a quoted parent name', () => {
      const script = generateCreateTagScript({ name: 'x', parentTagName: 'the "urgent" bucket' });
      const result = parseReturnedJson(lineContaining(script, 'Parent tag not found'));
      expect(result.success).toBe(false);
      expect(result.error).toBe('Parent tag not found: the "urgent" bucket');
    });
  });

  describe('remove_item', () => {
    it('routes the runtime item name and error text through jsonEscape', () => {
      const script = generateRemoveItemScript({ id: 'abc', itemType: 'task' });
      expect(script).toContain('on jsonEscape(theText)');
      expect(script).toContain('my jsonEscape(itemName)');
      expect(script).toContain('my jsonEscape(errorMessage)');
    });
  });

  describe('edit_item', () => {
    it('routes runtime name and changed-properties text through jsonEscape', () => {
      const script = generateEditItemScript({ id: 'abc', itemType: 'task', newName: 'renamed' });
      expect(script).toContain('on jsonEscape(theText)');
      expect(script).toContain('my jsonEscape(itemName)');
      expect(script).toContain('my jsonEscape(changedPropsText)');
      expect(script).toContain('my jsonEscape(errorMessage)');
    });

    it('project-not-found error JSON survives a quoted destination', () => {
      const script = generateEditItemScript({
        id: 'abc',
        itemType: 'task',
        newProjectName: 'Say "when"',
      });
      const result = parseReturnedJson(lineContaining(script, 'Project not found'));
      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not found: Say "when"');
    });

    it('folder-not-found error JSON survives a quoted destination', () => {
      const script = generateEditItemScript({
        id: 'abc',
        itemType: 'project',
        newFolderName: 'Say "when"',
      });
      const result = parseReturnedJson(lineContaining(script, 'Folder not found'));
      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder not found: Say "when"');
    });
  });

  it('every write script defines the jsonEscape handler exactly once', () => {
    const scripts = [
      generateAddTaskScript({ name: 'x' }),
      generateAddProjectScript({ name: 'x' }),
      generateCreateTagScript({ name: 'x' }),
      generateRemoveItemScript({ id: 'abc', itemType: 'task' }),
      generateEditItemScript({ id: 'abc', itemType: 'task', newName: 'y' }),
    ];
    for (const script of scripts) {
      expect(script.match(/on jsonEscape\(theText\)/g)).toHaveLength(1);
    }
  });
});
