import { describe, it, expect } from 'vitest';
import { _testExports as primitives } from '../primitives/queryOmnifocus.js';
import { schema } from '../definitions/queryOmnifocus.js';

const { generateFilterConditions, generateFieldMapping } = primitives;

/**
 * Task/project parity suite for query_omnifocus (issue #71).
 *
 * The tasks and projects branches of generateFilterConditions evolve
 * independently, so a filter added for tasks silently no-ops for projects — this
 * has happened at least five times (#63, #64, #65, the projectId bug in #70, the
 * projectName bug in #71). These tests encode the intended per-entity
 * applicability of every documented filter as a single explicit contract and
 * assert the generator honors it, so the next drift is caught by CI instead of by
 * a user querying live data.
 */

// Ideal applicability: for each documented filter, which entities SHOULD support
// it, based on the properties the entity actually has. (`plannedDate`, `inInbox`,
// repetition, and `taskName` are task-only; `reviewDue` is project-only.)
const FILTER_SPEC: Record<string, { tasks: boolean; projects: boolean }> = {
  projectId: { tasks: true, projects: true },
  projectName: { tasks: true, projects: true },
  taskName: { tasks: true, projects: false },
  folderId: { tasks: true, projects: true },
  tags: { tasks: true, projects: true },
  status: { tasks: true, projects: true },
  flagged: { tasks: true, projects: true },
  dueWithin: { tasks: true, projects: true },
  deferredUntil: { tasks: true, projects: true },
  plannedWithin: { tasks: true, projects: false },
  hasNote: { tasks: true, projects: true },
  inbox: { tasks: true, projects: false },
  dueOn: { tasks: true, projects: true },
  deferOn: { tasks: true, projects: true },
  plannedOn: { tasks: true, projects: false },
  addedWithin: { tasks: true, projects: true },
  addedOn: { tasks: true, projects: true },
  isRepeating: { tasks: true, projects: false },
  completedWithin: { tasks: true, projects: true },
  completedOn: { tasks: true, projects: true },
  droppedWithin: { tasks: true, projects: true },
  droppedOn: { tasks: true, projects: true },
  reviewDue: { tasks: false, projects: true },
};

// Filters that SHOULD apply to projects (per FILTER_SPEC) but are not implemented
// on the projects branch yet — real "tasks work, projects forgotten" gaps this
// suite surfaces. Tracked in #71. When one is fixed, the "gaps stay honest" test
// below fails on purpose, forcing its removal from this set.
const KNOWN_PROJECT_GAPS = new Set<string>([
  'tags',
  'flagged',
  'dueWithin',
  'deferredUntil',
  'hasNote',
  'dueOn',
  'deferOn',
]);

// A representative value for invoking each filter.
const SAMPLE: Record<string, unknown> = {
  projectId: 'p1',
  projectName: 'Work',
  taskName: 'Email',
  folderId: 'f1',
  tags: ['Work'],
  status: ['Active'],
  flagged: true,
  dueWithin: 7,
  deferredUntil: 7,
  plannedWithin: 7,
  hasNote: true,
  inbox: true,
  dueOn: 0,
  deferOn: 0,
  plannedOn: 0,
  addedWithin: 7,
  addedOn: 0,
  isRepeating: true,
  completedWithin: 7,
  completedOn: 0,
  droppedWithin: 7,
  droppedOn: 0,
  reviewDue: true,
};

// The documented filters are whatever the tool schema exposes — the single source
// of truth a user reads. Introspect it so a newly added filter can't slip in
// without being declared here.
function documentedFilterKeys(): string[] {
  const filters = (schema.shape as Record<string, any>).filters;
  const inner = typeof filters.unwrap === 'function' ? filters.unwrap() : filters._def.innerType;
  return Object.keys(inner.shape);
}

const isImplemented = (entity: 'tasks' | 'projects' | 'folders', filter: string): boolean =>
  generateFilterConditions(entity, { [filter]: SAMPLE[filter] }).trim().length > 0;

describe('query_omnifocus filter parity (#71)', () => {
  it('every documented filter is declared in FILTER_SPEC (and vice versa)', () => {
    const documented = documentedFilterKeys().sort();
    const declared = Object.keys(FILTER_SPEC).sort();
    // If this fails, a filter was added/removed in the schema without updating
    // the parity contract — declare its per-entity applicability above.
    expect(declared).toEqual(documented);
  });

  it('every KNOWN_PROJECT_GAPS entry is a real, documented, project-intended gap', () => {
    for (const filter of KNOWN_PROJECT_GAPS) {
      expect(FILTER_SPEC[filter], `${filter} in gaps but not in spec`).toBeDefined();
      expect(FILTER_SPEC[filter].projects, `${filter} gap must be project-intended`).toBe(true);
    }
  });

  describe('generateFilterConditions honors the applicability contract', () => {
    for (const filter of Object.keys(FILTER_SPEC)) {
      for (const entity of ['tasks', 'projects'] as const) {
        const ideal = FILTER_SPEC[filter][entity];
        const gapped = entity === 'projects' && KNOWN_PROJECT_GAPS.has(filter);
        const expected = ideal && !gapped;
        const note = gapped ? ' (known gap, tracked in #71)' : '';
        it(`${entity}: ${filter} -> ${expected ? 'implemented' : 'no-op'}${note}`, () => {
          expect(isImplemented(entity, filter)).toBe(expected);
        });
      }
    }
  });

  it('gaps stay honest: each known gap is still unimplemented on projects', () => {
    for (const filter of KNOWN_PROJECT_GAPS) {
      // When someone implements one of these on the projects branch, this fails —
      // remove it from KNOWN_PROJECT_GAPS (and the parity test flips to expect it).
      expect(
        isImplemented('projects', filter),
        `${filter} now implemented on projects — remove it from KNOWN_PROJECT_GAPS`
      ).toBe(false);
    }
  });

  it('the folders entity intentionally supports no filters', () => {
    for (const filter of Object.keys(FILTER_SPEC)) {
      expect(isImplemented('folders', filter), `folders should not implement ${filter}`).toBe(false);
    }
  });

  it('status filter uses the entity-appropriate status map (no copy-paste drift)', () => {
    expect(generateFilterConditions('tasks', { status: ['Available'] })).toContain('taskStatusMap');
    expect(generateFilterConditions('projects', { status: ['Active'] })).toContain('projectStatusMap');
    // ...and not the other way around.
    expect(generateFilterConditions('projects', { status: ['Active'] })).not.toContain('taskStatusMap[');
  });
});

describe('query_omnifocus field parity (#71)', () => {
  // `id` and `projectId` are the fields whose accessor diverges by entity: a
  // project's `id` must be its root-task id so edit_item/remove_item can resolve
  // it (OmniJS Project ids are a different namespace — issue #77).
  it("projects' id field emits the root-task id (#77)", () => {
    expect(generateFieldMapping('projects', ['id'])).toContain('item.task.id.primaryKey');
    expect(generateFieldMapping('tasks', ['id'])).toContain('item.id.primaryKey');
    expect(generateFieldMapping('tasks', ['id'])).not.toContain('item.task.id.primaryKey');
  });

  it('projectId field resolves through the containing project on tasks', () => {
    expect(generateFieldMapping('tasks', ['projectId'])).toContain(
      'item.containingProject ? item.containingProject.task.id.primaryKey'
    );
  });

  it('entity-specific status fields map to their own status maps', () => {
    expect(generateFieldMapping('tasks', ['taskStatus'])).toContain('taskStatusMap[item.taskStatus]');
    expect(generateFieldMapping('projects', ['status'])).toContain('projectStatusMap[item.status]');
  });
});
