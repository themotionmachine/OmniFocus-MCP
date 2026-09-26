import { describe, it, expect } from 'vitest';
import { taskMoveScript, jsIdLiteral, type TaskMoveSpec } from '../taskMove.js';

/**
 * Execute the JS that taskMoveScript embeds against a small fake of the OmniJS
 * hierarchy: tasks with parent/children, projects whose top level is a root
 * task, an inbox, and moveTasks() with insertion locations. Pins what the
 * script DOES (where the task lands, what it refuses), not how it's spelled.
 */
interface FakeTask {
  id: string;
  name: string;
  parent: FakeTask | null;
  children: FakeTask[];
  project: { name: string; task: FakeTask } | null;
  readonly inInbox: boolean;
  readonly containingProject: { name: string; task: FakeTask } | null;
  beginning: Loc;
  ending: Loc;
  before: Loc;
  after: Loc;
}
type Loc = { container: FakeTask | null; index: (t: FakeTask) => number };

function buildWorld() {
  const byId = new Map<string, FakeTask>();
  const inboxList: FakeTask[] = [];
  const listOf = (c: FakeTask | null) => (c ? c.children : inboxList);

  function mk(id: string, name: string): FakeTask {
    const t: FakeTask = {
      id,
      name,
      parent: null,
      children: [],
      project: null,
      get inInbox() {
        return this.parent === null && inboxList.includes(this) && !this.project;
      },
      get containingProject() {
        let a: FakeTask | null = this;
        while (a) {
          if (a.project) return a.project;
          a = a.parent;
        }
        return null;
      },
      get beginning() { return { container: t, index: () => 0 }; },
      get ending() { return { container: t, index: (m: FakeTask) => t.children.filter(c => c !== m).length }; },
      get before() { return { container: t.parent, index: (m: FakeTask) => listOf(t.parent).filter(c => c !== m).indexOf(t) }; },
      get after() { return { container: t.parent, index: (m: FakeTask) => listOf(t.parent).filter(c => c !== m).indexOf(t) + 1 }; },
    } as FakeTask;
    byId.set(id, t);
    return t;
  }
  function place(t: FakeTask, container: FakeTask | null) {
    listOf(container).push(t);
    t.parent = container;
  }
  function project(id: string, name: string) {
    const root = mk(id, name);
    root.project = { name, task: root };
    return root;
  }

  const P1 = project('P1', 'Project One');
  const P2 = project('P2', 'Project Two');
  const [A, B, C, D] = ['A', 'B', 'C', 'D'].map(n => mk(n, 'Task ' + n));
  [A, B, C, D].forEach(t => place(t, P1));
  const A1 = mk('A1', 'Task A1');
  place(A1, A);
  const X = mk('X', 'Task X');
  place(X, P2);
  const I1 = mk('I1', 'Inbox One');
  const I2 = mk('I2', 'Inbox Two');
  place(I1, null);
  place(I2, null);

  const inbox: any = {
    get length() { return inboxList.length; },
    get beginning() { return { container: null, index: () => 0 }; },
    get ending() { return { container: null, index: (m: FakeTask) => inboxList.filter(c => c !== m).length }; },
  };
  for (let i = 0; i < 50; i++) {
    Object.defineProperty(inbox, i, { get: () => inboxList[i] });
  }

  let tamper: ((t: FakeTask) => void) | undefined;
  function moveTasks(tasks: FakeTask[], loc: Loc) {
    for (const t of tasks) {
      for (let a: FakeTask | null = loc.container; a; a = a.parent) {
        if (a === t) throw new Error('Parent not valid.');
      }
      const i = loc.index(t);
      const from = listOf(t.parent);
      from.splice(from.indexOf(t), 1);
      listOf(loc.container).splice(i, 0, t);
      t.parent = loc.container;
      tamper?.(t);
    }
  }

  const Task = { byIdentifier: (id: string) => byId.get(id) ?? null };
  const names = (c: FakeTask | null) => listOf(c).map(t => t.id);
  return {
    byId, Task, inbox, moveTasks, names, P1, P2, A, B, C, D, A1, X, I1, I2,
    setTamper(f: (t: FakeTask) => void) { tamper = f; },
  };
}

function run(world: ReturnType<typeof buildWorld>, taskId: string, spec: TaskMoveSpec) {
  const script = taskMoveScript('foundItem', spec);
  const m = script.match(/evaluate javascript "(.*)"\)$/m);
  if (!m) throw new Error('no evaluate javascript call in:\n' + script);
  // Undo the AppleScript layer: the id splice, then escaped backslashes.
  const js = m[1].replace('" & _moveId & "', taskId).replace(/\\\\/g, '\\');
  return new Function('Task', 'inbox', 'moveTasks', `return ${js}`)(world.Task, world.inbox, world.moveTasks) as string;
}

describe('taskMoveScript: nesting (#138)', () => {
  it('nests a task under a sibling, at the end by default', () => {
    const w = buildWorld();
    const label = run(w, 'C', { parentId: 'A' });
    expect(w.names(w.A)).toEqual(['A1', 'C']);
    expect(w.names(w.P1)).toEqual(['A', 'B', 'D']);
    expect(label).toBe('parent (moved under Task A)');
  });

  it('"" returns a nested task to its project top level', () => {
    const w = buildWorld();
    const label = run(w, 'A1', { parentId: '' });
    expect(w.A1.parent).toBe(w.P1);
    expect(w.names(w.P1)).toEqual(['A', 'B', 'C', 'D', 'A1']);
    expect(label).toBe('parent (project root)');
  });

  it('"" returns a subtask of an inbox task to the inbox', () => {
    const w = buildWorld();
    run(w, 'I2', { parentId: 'I1' });
    expect(w.names(w.I1)).toEqual(['I2']);
    const label = run(w, 'I2', { parentId: '' });
    expect(w.I2.parent).toBeNull();
    expect(w.names(null)).toEqual(['I1', 'I2']);
    expect(label).toBe('parent (inbox)');
  });

  it('follows a parent in another project', () => {
    const w = buildWorld();
    run(w, 'B', { parentId: 'X' });
    expect(w.B.parent).toBe(w.X);
    expect(w.B.containingProject!.name).toBe('Project Two');
    expect(w.names(w.P1)).toEqual(['A', 'C', 'D']);
  });

  it('follows a parent in the inbox', () => {
    const w = buildWorld();
    run(w, 'B', { parentId: 'I1' });
    expect(w.B.containingProject).toBeNull();
    expect(w.names(w.I1)).toEqual(['B']);
  });

  it('refuses the task itself as parent', () => {
    const w = buildWorld();
    expect(() => run(w, 'A', { parentId: 'A' })).toThrow(/under itself or one of its own subtasks/);
  });

  it('refuses a descendant as parent (cycle), leaving the tree untouched', () => {
    const w = buildWorld();
    expect(() => run(w, 'A', { parentId: 'A1' })).toThrow(/under itself or one of its own subtasks/);
    expect(w.names(w.P1)).toEqual(['A', 'B', 'C', 'D']);
    expect(w.names(w.A)).toEqual(['A1']);
  });

  it('refuses an unknown parent id', () => {
    const w = buildWorld();
    expect(() => run(w, 'A', { parentId: 'nope' })).toThrow(/parent task not found/);
  });

  it('refuses a project id as parent, pointing at newProjectName', () => {
    const w = buildWorld();
    expect(() => run(w, 'A', { parentId: 'P2' })).toThrow(/use newProjectName/);
  });

  it('refuses to move a project', () => {
    const w = buildWorld();
    expect(() => run(w, 'P1', { position: 'beginning' })).toThrow(/projects cannot be nested/);
  });
});

describe('taskMoveScript: position (#138)', () => {
  it.each([
    ['beginning', 'beginning', ['C', 'A', 'B', 'D']],
    ['end', 'end', ['A', 'B', 'D', 'C']],
    ['before A', { before: 'A' }, ['C', 'A', 'B', 'D']],
    ['after A', { after: 'A' }, ['A', 'C', 'B', 'D']],
    ['after D', { after: 'D' }, ['A', 'B', 'D', 'C']],
    ['before D', { before: 'D' }, ['A', 'B', 'C', 'D']],
  ] as const)('position %s without a parent reorders within the current container', (_l, position, order) => {
    const w = buildWorld();
    const label = run(w, 'C', { position: position as any });
    expect(w.names(w.P1)).toEqual(order);
    expect(w.C.parent).toBe(w.P1);
    expect(label).toBe('');
  });

  it('combines a new parent with a position', () => {
    const w = buildWorld();
    run(w, 'C', { parentId: 'A', position: 'beginning' });
    expect(w.names(w.A)).toEqual(['C', 'A1']);
    run(w, 'D', { parentId: 'A', position: { after: 'C' } });
    expect(w.names(w.A)).toEqual(['C', 'D', 'A1']);
    run(w, 'B', { parentId: 'A', position: { before: 'A1' } });
    expect(w.names(w.A)).toEqual(['C', 'D', 'B', 'A1']);
  });

  it('reorders at the inbox top level', () => {
    const w = buildWorld();
    run(w, 'I2', { position: 'beginning' });
    expect(w.names(null)).toEqual(['I2', 'I1']);
  });

  it('refuses a before/after task that does not share the target parent', () => {
    const w = buildWorld();
    // A1 lives under A, not at the project top level where C is.
    expect(() => run(w, 'C', { position: { after: 'A1' } })).toThrow(/not in the target container/);
    // With a new parent, the sibling must be under THAT parent.
    expect(() => run(w, 'C', { parentId: 'A', position: { before: 'B' } })).toThrow(/not in the target container/);
    expect(w.names(w.P1)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('refuses the task itself as its own anchor', () => {
    const w = buildWorld();
    expect(() => run(w, 'C', { position: { before: 'C' } })).toThrow(/cannot be placed before itself/);
  });

  it('refuses an unknown anchor id', () => {
    const w = buildWorld();
    expect(() => run(w, 'C', { position: { after: 'zzz' } })).toThrow(/after task not found/);
  });
});

describe('taskMoveScript: read-back', () => {
  it('throws if the task lands under a different parent than asked', () => {
    const w = buildWorld();
    w.setTamper(t => { t.parent = w.P2; });
    expect(() => run(w, 'C', { parentId: 'A' })).toThrow(/did not land under the requested parent/);
  });

  it('throws if the task lands at a different position than asked', () => {
    const w = buildWorld();
    w.setTamper(t => {
      const k = w.P1.children;
      k.splice(k.indexOf(t), 1);
      k.push(t);
    });
    expect(() => run(w, 'C', { position: 'beginning' })).toThrow(/did not land at the requested position/);
  });
});

describe('taskMoveScript: script shape', () => {
  it('keeps the embedded JS free of double quotes, whatever the ids contain', () => {
    const script = taskMoveScript('foundItem', {
      parentId: `a"b'c\\d`,
      position: { after: `x"y'z` },
    });
    const js = script.match(/evaluate javascript "(.*)"\)$/m)![1].replace('" & _moveId & "', '');
    // Only escaped backslashes (\\) may appear; no raw quote can end the string.
    expect(js.replace(/\\\\/g, '')).not.toMatch(/["\\]/);
  });

  it('encodes hostile ids so they decode to themselves in JS', () => {
    const id = `a'b"c\\d`;
    const body = jsIdLiteral(id).replace(/\\\\/g, '\\');
    expect(new Function(`return '${body}'`)()).toBe(id);
  });

  it('builds the changedProperties label from parent and position', () => {
    expect(taskMoveScript('f', { parentId: 'A' })).toMatch(/set _moveLabel to _moveParent$/);
    expect(taskMoveScript('f', { parentId: 'A', position: { after: 'B' } })).toContain(
      'set _moveLabel to _moveParent & ", position (after B)"'
    );
    expect(taskMoveScript('f', { position: 'beginning' })).toContain('set _moveLabel to "position (beginning)"');
  });
});
