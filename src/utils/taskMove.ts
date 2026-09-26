/**
 * Nesting and ordering an existing task (issue #138).
 *
 * `newProjectName` can move a task between projects, but nothing could put an
 * existing task under a parent task (an action group) or place it among its
 * siblings. Re-creating the tasks under a new parent loses their ids, and with
 * them every `omnifocus:///task/<id>` link that points at them. AppleScript has
 * no insertion-location verb that reaches sibling positions, so this goes
 * through Omni Automation's `moveTasks()`, spliced into edit_item's one
 * AppleScript the same way `repetitionRuleScript` is.
 *
 * Semantics, each chosen deliberately:
 * - `parentId` names the new parent task. `""` means the top level of the
 *   task's containing project, or the inbox when it has no project.
 * - A parent in another project (or the inbox) takes the task with it: the
 *   task follows its parent.
 * - `position` without `parentId` reorders inside the task's current container.
 * - `before`/`after` must name a task that is (or will be) a sibling, i.e.
 *   shares the target parent. Anything else is an error rather than a silent
 *   move somewhere the caller didn't name.
 * - A parent that is the task itself or one of its descendants is a cycle and
 *   is refused with a clear message before OmniFocus is asked.
 * - A project id as parent is refused: `newProjectName` is the project move.
 *
 * The move is read back — parent and index — and anything that didn't land as
 * asked throws, which edit_item's `on error` turns into a failure result.
 */

import { escapeAppleScriptString } from './appleScriptHelpers.js';

export type TaskPosition = 'beginning' | 'end' | { before: string } | { after: string };

export interface TaskMoveSpec {
  /** New parent task id; "" = project root (or inbox). Omitted = stay put. */
  parentId?: string;
  position?: TaskPosition;
}

/**
 * Encode a caller-supplied id as the body of a single-quoted JS string that is
 * itself inside a double-quoted AppleScript string. Anything outside the
 * characters OmniFocus ids use becomes a `\uXXXX` escape, with the backslash
 * doubled for the AppleScript layer, so no id can break out of either string.
 */
export function jsIdLiteral(id: string): string {
  return id.replace(/[^A-Za-z0-9._-]/g, c => '\\\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

/** The changedProperties text for the position part, known before the script runs. */
function positionLabel(position: TaskPosition): string {
  if (position === 'beginning' || position === 'end') return `position (${position})`;
  return 'before' in position ? `position (before ${position.before})` : `position (after ${position.after})`;
}

/**
 * AppleScript that moves `targetVar` (a task) and leaves the changedProperties
 * text in the AppleScript variable `_moveLabel`. Emit inside `tell front
 * document`.
 */
export function taskMoveScript(targetVar: string, spec: TaskMoveSpec): string {
  const hasParent = spec.parentId !== undefined;
  const pos = spec.position ?? 'end';
  const sibling = typeof pos === 'object' ? ('before' in pos ? pos.before : pos.after) : null;
  const where = typeof pos === 'object' ? ('before' in pos ? 'before' : 'after') : pos;

  // P is the target parent task, or null for the top level of the inbox.
  // A project's top level is its root task (t.parent of a top-level project
  // task IS project.task), so one representation covers both containers.
  const resolveParent = !hasParent
    ? `var P=t.parent;`
    : spec.parentId === ''
      ? `var P=t.containingProject?t.containingProject.task:null;`
      : `var P=Task.byIdentifier('${jsIdLiteral(spec.parentId!)}');` +
        `if(!P)throw new Error('move: parent task not found: ${jsIdLiteral(spec.parentId!)}');` +
        `if(P.project)throw new Error('move: parent is a project; use newProjectName to move into a project');` +
        `for(var a=P;a;a=a.parent){if(a===t)throw new Error('move: cannot nest a task under itself or one of its own subtasks');}`;

  // Children of the target container, as a plain array.
  const kids = `function kids(){if(P)return P.children;var r=[];for(var i=0;i<inbox.length;i++)r.push(inbox[i]);return r;}`;
  const idx = `function idx(x){var k=kids();for(var i=0;i<k.length;i++)if(k[i]===x)return i;return -1;}`;

  let locate: string;
  if (sibling !== null) {
    locate =
      `var S=Task.byIdentifier('${jsIdLiteral(sibling)}');` +
      `if(!S||S.project)throw new Error('move: ${where} task not found: ${jsIdLiteral(sibling)}');` +
      `if(S===t)throw new Error('move: a task cannot be placed ${where} itself');` +
      `if(idx(S)<0)throw new Error('move: ${where} task ${jsIdLiteral(sibling)} is not in the target container; it must share the parent the task is moving to');` +
      `var L=S.${where};`;
  } else {
    const end = where === 'beginning' ? 'beginning' : 'ending';
    locate = `var L=P?P.${end}:inbox.${end};`;
  }

  // Read-back: the parent, then the index the position asked for.
  const expectIndex =
    sibling !== null
      ? where === 'before'
        ? `idx(t)===idx(S)-1`
        : `idx(t)===idx(S)+1`
      : where === 'beginning'
        ? `idx(t)===0`
        : `idx(t)===kids().length-1`;

  const parentLabel = !hasParent
    ? `''`
    : `(P===null?'parent (inbox)':P.project?'parent (project root)':'parent (moved under '+P.name+')')`;

  // Single-quoted JS only: it is spliced into a double-quoted AppleScript string.
  const js =
    `(function(){var t=Task.byIdentifier('" & _moveId & "');` +
    `if(!t)throw new Error('move: task not found');` +
    `if(t.project)throw new Error('move: projects cannot be nested or reordered here');` +
    resolveParent + kids + idx + locate +
    `moveTasks([t],L);` +
    `var np=t.parent;if(np!==P||(P===null&&!t.inInbox))throw new Error('move: task did not land under the requested parent');` +
    `if(!(${expectIndex}))throw new Error('move: task did not land at the requested position');` +
    `return ${parentLabel};})()`;

  const posText = spec.position !== undefined ? positionLabel(spec.position) : '';
  // Join the runtime parent label and the static position label.
  const label = hasParent && posText
    ? `_moveParent & ", ${escapeAppleScriptString(posText)}"`
    : hasParent
      ? `_moveParent`
      : `"${escapeAppleScriptString(posText)}"`;

  return `set _moveId to id of ${targetVar} as string
        tell application "OmniFocus" to set _moveParent to (evaluate javascript "${js}")
        set _moveLabel to ${label}`;
}
