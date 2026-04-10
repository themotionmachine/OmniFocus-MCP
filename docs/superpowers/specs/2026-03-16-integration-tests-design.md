# Integration Test Infrastructure Design

## Summary

Add integration tests that execute real AppleScript against OmniFocus to verify end-to-end behavior. Tests are isolated via a **run-scoped container** — a unique folder created per test run that owns all test data. Only items created in that specific run are cleaned up. Tests run via a separate vitest config so they never execute during `npm test`.

## Motivation

Unit tests verify generated AppleScript strings but can't catch runtime issues like indirect references, silent failures, or OmniFocus API quirks. We've hit several bugs (loop references, move vs assigned container, whose clause) that only manifest at execution time. Integration tests catch these.

## Safety Model: Run-Scoped Containment

The previous design relied on a `TEST:` name prefix and global cleanup ("delete everything named TEST:"). That's fragile — it can't distinguish between runs, risks collisions, and could delete legitimate items if a name happens to match.

The new model is: **only items created in this specific run, tracked by ID, inside a unique container, are safe to destroy.**

### Three Layers of Safety

**Layer 1: Unique run container**
Each test run creates a folder with a unique name: `TEST:<timestamp>` (e.g. `TEST:1710612345678`). All test projects and tasks are created inside this folder. The folder acts as a blast radius boundary — nothing outside it is touched.

**Layer 2: Item registry (tracked by ID)**
A `TestRegistry` tracks the OmniFocus ID of every item created during the run. Cleanup iterates this registry and deletes by ID — never by name pattern or glob. If an item wasn't created by this run, its ID isn't in the registry, and it won't be deleted.

**Layer 3: TEST: prefix as defense-in-depth**
Items still use the `TEST:` prefix in their names as an additional safety check. Before any delete, verify the resolved name starts with `TEST:`. This catches bugs where an ID was somehow wrong. But the prefix is the last line of defense, not the primary mechanism.

### Why This Is Better

| Concern | Old (prefix-based) | New (run-scoped) |
|---------|-------------------|------------------|
| Parallel runs | Collision — both see each other's TEST: items | Safe — each has unique container + registry |
| Crashed run leaves items | Global cleanup deletes ALL TEST: items (maybe from another run) | Standalone cleanup targets a specific run folder by name |
| Accidental name match | Deletes legitimate item named "TEST: something" | Only deletes tracked IDs inside the run container |
| Ambiguous deletes | Name-based lookup could match wrong item | ID-based deletion is unambiguous |

## TestRegistry

Central tracking object, shared across the test run:

```typescript
class TestRegistry {
  private items: Map<string, { id: string; name: string; type: 'task' | 'project' | 'tag' | 'folder' }>;

  /** The unique run folder name, e.g. "TEST:1710612345678" */
  readonly runFolder: string;

  /** Record an item created during this run */
  track(id: string, name: string, type: 'task' | 'project' | 'tag' | 'folder'): void;

  /** Get all tracked items of a given type */
  getByType(type: string): Array<{ id: string; name: string }>;

  /** Remove an item from tracking (after successful deletion) */
  untrack(id: string): void;

  /** Clean up all tracked items in safe order: tasks → projects → tags → folder */
  async cleanupAll(): Promise<void>;
}
```

The registry is instantiated in `setup.ts` and exported for use in test files.

## Test Lifecycle

### Setup (`beforeAll`)

1. **Pre-flight check** — run trivial AppleScript to verify OmniFocus is running; skip suite with clear message if not
2. **Create run folder** — `make new folder with properties {name:"TEST:1710612345678"}` via AppleScript; track the folder ID in the registry
3. **Create test project** — `addProject({ name: 'TEST:Sample Project', folderName: 'TEST:1710612345678' })`; track the project ID

### Teardown (`afterAll`)

1. **`registry.cleanupAll()`** — iterates tracked items in safe order:
   - Delete all tracked tasks (by ID, with TEST: prefix verification on resolved name)
   - Delete all tracked projects (by ID, with same verification)
   - Delete all tracked tags (by ID, with same verification)
   - Delete the run folder (by ID, with same verification)
2. If any delete fails, log a warning but continue (don't let one failure prevent the rest from being cleaned up)

### Standalone Cleanup (`cleanup.ts`)

For crashed runs that left items behind. Takes a different approach since we don't have the registry:
- Lists all OmniFocus folders whose name matches `TEST:*` pattern
- For each, deletes all contents (tasks, projects) inside the folder, then the folder itself
- Also deletes any tags matching `TEST:*`
- This is the only place that uses name-pattern-based deletion, and it's a manually invoked escape hatch, not automated

## New AppleScript Helpers

Internal to test infrastructure only — NOT new MCP tools:

- **`createFolder(name: string)`** — `make new folder with properties {name:...}`, returns the created folder's ID
- **`deleteFolderById(id: string)`** — Deletes folder by ID after verifying its name starts with `TEST:`
- **`deleteTagById(id: string)`** — Deletes tag by ID after verifying its name starts with `TEST:`
- **`resolveItemName(id: string, type: string)`** — Looks up an item's current name by ID (for safety verification before delete)
- **`findItemsByPrefix(prefix: string, type: string)`** — For standalone cleanup only; finds items whose name starts with prefix

## Test Runner Configuration

### Vitest Config Changes

**`vitest.config.ts`** (modify existing) — exclude integration tests:
```typescript
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/tests/integration/**'],
  },
});
```

**`vitest.integration.config.ts`** (new) — integration tests only:
```typescript
export default defineConfig({
  test: {
    include: ['src/tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    sequence: { concurrent: false, shuffle: false },
  },
});
```

### Package.json Scripts

```json
{
  "test": "vitest run",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:integration:cleanup": "npx tsx src/tests/integration/cleanup.ts"
}
```

## File Structure

```
src/tests/integration/
  registry.ts               — TestRegistry class
  helpers.ts                — AppleScript helpers (createFolder, deleteById, resolveItemName, etc.)
  setup.ts                  — Global beforeAll/afterAll, creates registry and run folder
  cleanup.ts                — Standalone cleanup script for crashed runs
  task-lifecycle.test.ts    — Full task CRUD lifecycle
  project-lifecycle.test.ts — Full project CRUD lifecycle
```

## Test Suites

### Wrapped Create Helpers

Each test file imports convenience wrappers that call the real primitives AND track the result in the registry:

```typescript
// In the test file
const task = await createTrackedTask(registry, { name: 'TEST:Inbox Task' });
// Calls addOmniFocusTask, parses result, registers task.id in registry
```

This ensures every created item is automatically tracked for cleanup.

### `task-lifecycle.test.ts`

Tests run sequentially (shuffle disabled), building on each other. If an early test fails, later tests in the suite will also fail — this is expected for lifecycle tests.

1. **Create inbox task** — `createTrackedTask({ name: 'TEST:Inbox Task' })`, query to verify it exists in inbox
2. **Create project task** — `createTrackedTask({ name: 'TEST:Project Task', projectName: registry.testProject })`, query to verify
3. **Move inbox task to project** — `editItem({ id: task.id, newProjectName: registry.testProject })`, query to verify it moved
4. **Edit task properties** — Rename to `TEST:Renamed Task`, set due date, flag, add tags (`TEST:Tag A`); track the tag
5. **Change task status** — Mark complete, verify; mark incomplete, verify; mark dropped, verify
6. **Remove task** — `safeRemoveById(registry, task.id)`, verify gone, untrack from registry

### `project-lifecycle.test.ts`

1. **Create project** — `createTrackedProject({ name: 'TEST:New Project', folderName: registry.runFolder })`, query to verify
2. **Edit project** — Rename to `TEST:Edited Project`, change status, set sequential
3. **Add tasks to project** — Create tracked tasks, verify they appear under project
4. **Remove project** — `safeRemoveById(registry, project.id)`, verify tasks are also removed

### Batch Operations (in either file)

- **Batch add** — `batchAddItems` with mix of tasks and projects, all TEST: prefixed; parse result and track all IDs
- **Batch remove** — `batchRemoveItems` on the batch-added items by tracked ID

## What Is NOT In Scope

- Performance benchmarking
- Testing perspectives, tags listing, or database dump (read-only, low risk)
- Testing concurrent access or sync behavior
- CI/CD integration (these require a Mac with OmniFocus installed)
- Mocking OmniFocus — the whole point is real execution
- New MCP tools for folder/tag management (helpers are internal to tests only)

## Execution Requirements

- OmniFocus must be running on the Mac (pre-flight check verifies this)
- Tests modify real OmniFocus data (but only tracked items inside the run container)
- Tests must run sequentially (OmniFocus state is shared)
- Default timeout 30s per test; individual tests can override with `{ timeout: 60000 }` for batch operations
