# Integration Test Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add integration tests that execute real AppleScript against OmniFocus with run-scoped containment for safety.

**Architecture:** Each test run creates a unique `TEST:<timestamp>` folder in OmniFocus. A `TestRegistry` tracks every item created by ID. Cleanup deletes only tracked items. Tests use vitest with a separate config so `npm test` never touches OmniFocus.

**Tech Stack:** TypeScript, vitest, AppleScript (via osascript temp files), OmniFocus

**Spec:** `docs/superpowers/specs/2026-03-16-integration-tests-design.md`

---

## File Structure

```
vitest.config.ts                          — MODIFY: add exclude for integration tests
vitest.integration.config.ts              — CREATE: separate config for integration tests
package.json                              — MODIFY: add test:integration and test:integration:cleanup scripts
src/tests/integration/
  registry.ts                             — CREATE: TestRegistry class (ID tracking, ordered cleanup)
  helpers.ts                              — CREATE: AppleScript helpers (createFolder, deleteById, resolveItemName, etc.)
  setup.ts                                — CREATE: shared beforeAll/afterAll (pre-flight, run folder, cleanup)
  cleanup.ts                              — CREATE: standalone cleanup script for crashed runs
  task-lifecycle.test.ts                  — CREATE: task CRUD lifecycle tests
  project-lifecycle.test.ts               — CREATE: project CRUD lifecycle tests
```

---

## Chunk 1: Infrastructure (registry, helpers, config)

### Task 1: Vitest Config and Package Scripts

**Files:**
- Modify: `vitest.config.ts`
- Create: `vitest.integration.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Update vitest.config.ts to exclude integration tests**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/tests/integration/**'],
  },
});
```

- [ ] **Step 2: Create vitest.integration.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    sequence: { concurrent: false, shuffle: false },
  },
});
```

- [ ] **Step 3: Add scripts to package.json**

Add to the `"scripts"` section:
```json
"test:integration": "vitest run --config vitest.integration.config.ts",
"test:integration:cleanup": "npx tsx src/tests/integration/cleanup.ts"
```

- [ ] **Step 4: Run existing unit tests to verify no breakage**

Run: `npm test`
Expected: All 68 tests pass. Integration directory exclusion has no effect yet (no files there).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts vitest.integration.config.ts package.json
git commit -m "Add integration test vitest config and npm scripts"
```

---

### Task 2: AppleScript Helpers

**Files:**
- Create: `src/tests/integration/helpers.ts`

These are raw AppleScript execution helpers for test infrastructure. They follow the same temp-file pattern used by the primitives (`writeFileSync` + `osascript` + `unlinkSync`).

- [ ] **Step 1: Create helpers.ts with execAppleScript utility**

The core utility that all helpers use — writes AppleScript to a temp file and executes it:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export const TEST_PREFIX = 'TEST:';

/**
 * Execute raw AppleScript via temp file. Returns stdout.
 */
export async function execAppleScript(script: string): Promise<string> {
  const tempFile = join(tmpdir(), `test_omnifocus_${Date.now()}.applescript`);
  try {
    writeFileSync(tempFile, script);
    const { stdout } = await execAsync(`osascript ${tempFile}`);
    return stdout.trim();
  } finally {
    try { unlinkSync(tempFile); } catch { /* ignore */ }
  }
}
```

- [ ] **Step 2: Add assertOmniFocusRunning**

```typescript
/**
 * Pre-flight check. Throws if OmniFocus is not running/accessible.
 */
export async function assertOmniFocusRunning(): Promise<void> {
  try {
    const result = await execAppleScript(`
      tell application "OmniFocus" to return "ok"
    `);
    if (!result.includes('ok')) {
      throw new Error('Unexpected response from OmniFocus');
    }
  } catch (error: any) {
    throw new Error(
      `OmniFocus is not running or not accessible. Integration tests require OmniFocus.\n${error.message}`
    );
  }
}
```

- [ ] **Step 3: Add createFolder**

```typescript
/**
 * Create a folder in OmniFocus. Returns the folder's ID.
 * Name must start with TEST_PREFIX.
 */
export async function createFolder(name: string): Promise<string> {
  assertTestPrefix(name);
  const escapedName = name.replace(/["\\]/g, '\\$&');
  const result = await execAppleScript(`
    tell application "OmniFocus"
      tell front document
        set newFolder to make new folder with properties {name:"${escapedName}"}
        return id of newFolder as string
      end tell
    end tell
  `);
  return result;
}

/**
 * Throws if name doesn't start with TEST_PREFIX.
 */
export function assertTestPrefix(name: string): void {
  if (!name.startsWith(TEST_PREFIX)) {
    throw new Error(`Safety check failed: "${name}" does not start with "${TEST_PREFIX}"`);
  }
}
```

- [ ] **Step 4: Add resolveItemName**

```typescript
/**
 * Look up an item's current name by ID and type.
 * Returns the name, or null if not found.
 */
export async function resolveItemName(
  id: string,
  type: 'task' | 'project' | 'tag' | 'folder'
): Promise<string | null> {
  const escapedId = id.replace(/["\\]/g, '\\$&');
  const collection =
    type === 'task' ? 'flattened tasks' :
    type === 'project' ? 'flattened projects' :
    type === 'tag' ? 'flattened tags' :
    'flattened folders';
  try {
    const result = await execAppleScript(`
      tell application "OmniFocus"
        tell front document
          set foundItem to first ${type === 'task' ? 'flattened task' : type === 'project' ? 'flattened project' : type === 'tag' ? 'flattened tag' : 'flattened folder'} whose id is "${escapedId}"
          return name of foundItem
        end tell
      end tell
    `);
    return result || null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Add deleteById helpers**

```typescript
/**
 * Delete an item by ID after verifying its name starts with TEST_PREFIX.
 * This is the core safe-delete mechanism.
 */
export async function safeDeleteById(
  id: string,
  type: 'task' | 'project' | 'tag' | 'folder'
): Promise<boolean> {
  // Resolve actual name from OmniFocus
  const name = await resolveItemName(id, type);
  if (name === null) {
    // Item already gone — that's fine
    return false;
  }
  assertTestPrefix(name);

  const escapedId = id.replace(/["\\]/g, '\\$&');
  const singular =
    type === 'task' ? 'flattened task' :
    type === 'project' ? 'flattened project' :
    type === 'tag' ? 'flattened tag' :
    'flattened folder';

  await execAppleScript(`
    tell application "OmniFocus"
      tell front document
        delete (first ${singular} whose id is "${escapedId}")
      end tell
    end tell
  `);
  return true;
}
```

- [ ] **Step 6: Add findItemsByPrefix (for standalone cleanup)**

```typescript
/**
 * Find all items of a type whose name starts with a prefix.
 * Used by standalone cleanup script only.
 */
export async function findItemsByPrefix(
  prefix: string,
  type: 'task' | 'project' | 'tag' | 'folder'
): Promise<Array<{ id: string; name: string }>> {
  const escapedPrefix = prefix.replace(/["\\]/g, '\\$&');
  const collection =
    type === 'task' ? 'flattened tasks' :
    type === 'project' ? 'flattened projects' :
    type === 'tag' ? 'flattened tags' :
    'flattened folders';

  const result = await execAppleScript(`
    tell application "OmniFocus"
      tell front document
        set matches to {}
        repeat with anItem in ${collection}
          if name of anItem starts with "${escapedPrefix}" then
            set end of matches to (id of anItem as string) & "|||" & name of anItem
          end if
        end repeat
        set AppleScript's text item delimiters to "\\n"
        return matches as text
      end tell
    end tell
  `);

  if (!result) return [];
  return result.split('\n').filter(Boolean).map(line => {
    const [id, name] = line.split('|||');
    return { id, name };
  });
}
```

- [ ] **Step 7: Verify helpers compile**

Run: `npx tsc --noEmit src/tests/integration/helpers.ts`
Expected: No errors (or run full build and check).

- [ ] **Step 8: Commit**

```bash
git add src/tests/integration/helpers.ts
git commit -m "Add AppleScript test helpers with safety checks"
```

---

### Task 3: TestRegistry

**Files:**
- Create: `src/tests/integration/registry.ts`

- [ ] **Step 1: Create registry.ts**

```typescript
import { safeDeleteById } from './helpers.js';

type ItemType = 'task' | 'project' | 'tag' | 'folder';

interface TrackedItem {
  id: string;
  name: string;
  type: ItemType;
}

/**
 * Tracks all OmniFocus items created during a test run.
 * Cleanup deletes only tracked items in safe dependency order.
 */
export class TestRegistry {
  private items = new Map<string, TrackedItem>();

  /** The unique run folder name, e.g. "TEST:1710612345678" */
  readonly runFolder: string;

  /** The run folder's OmniFocus ID (set after creation) */
  runFolderId: string = '';

  /** The test project name inside the run folder */
  readonly testProject: string;

  /** The test project's OmniFocus ID (set after creation) */
  testProjectId: string = '';

  constructor() {
    this.runFolder = `TEST:${Date.now()}`;
    this.testProject = `TEST:Sample Project`;
  }

  /** Record an item created during this run */
  track(id: string, name: string, type: ItemType): void {
    this.items.set(id, { id, name, type });
  }

  /** Get all tracked items of a given type */
  getByType(type: ItemType): TrackedItem[] {
    return [...this.items.values()].filter(item => item.type === type);
  }

  /** Remove an item from tracking (after successful deletion) */
  untrack(id: string): void {
    this.items.delete(id);
  }

  /**
   * Clean up all tracked items in safe dependency order:
   * tasks → projects → tags → run folder
   */
  async cleanupAll(): Promise<void> {
    const order: ItemType[] = ['task', 'project', 'tag', 'folder'];
    for (const type of order) {
      for (const item of this.getByType(type)) {
        try {
          await safeDeleteById(item.id, item.type);
          this.untrack(item.id);
        } catch (error) {
          console.warn(`Cleanup warning: failed to delete ${item.type} "${item.name}" (${item.id}):`, error);
        }
      }
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/tests/integration/registry.ts`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tests/integration/registry.ts
git commit -m "Add TestRegistry for run-scoped item tracking"
```

---

### Task 4: Setup/Teardown

**Files:**
- Create: `src/tests/integration/setup.ts`

This exports a shared `beforeAll`/`afterAll` for test files to import, plus the registry instance and tracked-create wrappers.

- [ ] **Step 1: Create setup.ts**

```typescript
import { beforeAll, afterAll } from 'vitest';
import { TestRegistry } from './registry.js';
import {
  assertOmniFocusRunning,
  createFolder,
  TEST_PREFIX,
} from './helpers.js';
import { addOmniFocusTask } from '../../tools/primitives/addOmniFocusTask.js';
import { addProject } from '../../tools/primitives/addProject.js';
import { editItem } from '../../tools/primitives/editItem.js';
import { removeItem } from '../../tools/primitives/removeItem.js';
import { batchAddItems } from '../../tools/primitives/batchAddItems.js';
import { batchRemoveItems } from '../../tools/primitives/batchRemoveItems.js';

export const registry = new TestRegistry();

/**
 * Create a task and track it in the registry. Returns the parsed result.
 */
export async function createTrackedTask(
  params: Parameters<typeof addOmniFocusTask>[0]
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const result = await addOmniFocusTask(params);
  if (result.success && result.taskId) {
    registry.track(result.taskId, params.name, 'task');
  }
  return result;
}

/**
 * Create a project and track it in the registry. Returns the parsed result.
 */
export async function createTrackedProject(
  params: Parameters<typeof addProject>[0]
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  const result = await addProject(params);
  if (result.success && result.projectId) {
    registry.track(result.projectId, params.name, 'project');
  }
  return result;
}

/**
 * Remove an item by ID, untrack from registry.
 */
export async function safeRemoveTracked(
  id: string,
  itemType: 'task' | 'project'
): Promise<{ success: boolean; error?: string }> {
  const result = await removeItem({ id, itemType });
  if (result.success) {
    registry.untrack(id);
  }
  return result;
}

// Re-export primitives for direct use in tests
export { editItem, removeItem, batchAddItems, batchRemoveItems };

/**
 * Call in each test file's top-level describe:
 *   setupIntegration();
 */
export function setupIntegration() {
  beforeAll(async () => {
    await assertOmniFocusRunning();

    // Create unique run folder
    const folderId = await createFolder(registry.runFolder);
    registry.runFolderId = folderId;
    registry.track(folderId, registry.runFolder, 'folder');

    // Create test project inside the run folder
    const projResult = await addProject({
      name: registry.testProject,
      folderName: registry.runFolder,
    });
    if (!projResult.success || !projResult.projectId) {
      throw new Error(`Failed to create test project: ${projResult.error}`);
    }
    registry.testProjectId = projResult.projectId;
    registry.track(projResult.projectId, registry.testProject, 'project');
  }, 60000); // generous timeout for setup

  afterAll(async () => {
    await registry.cleanupAll();
  }, 60000);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/tests/integration/setup.ts`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tests/integration/setup.ts
git commit -m "Add integration test setup with registry and tracked wrappers"
```

---

### Task 5: Standalone Cleanup Script

**Files:**
- Create: `src/tests/integration/cleanup.ts`

- [ ] **Step 1: Create cleanup.ts**

```typescript
import { findItemsByPrefix, safeDeleteById, TEST_PREFIX } from './helpers.js';

/**
 * Standalone cleanup: find and remove all TEST:-prefixed items.
 * Run manually after a crashed test run: npm run test:integration:cleanup
 */
async function main() {
  console.log(`Cleaning up all OmniFocus items with prefix "${TEST_PREFIX}"...`);

  const types = ['task', 'project', 'tag', 'folder'] as const;

  for (const type of types) {
    const items = await findItemsByPrefix(TEST_PREFIX, type);
    if (items.length === 0) {
      console.log(`  ${type}s: none found`);
      continue;
    }
    console.log(`  ${type}s: found ${items.length}`);
    for (const item of items) {
      try {
        await safeDeleteById(item.id, type);
        console.log(`    deleted: ${item.name}`);
      } catch (error: any) {
        console.warn(`    FAILED to delete ${item.name}: ${error.message}`);
      }
    }
  }

  console.log('Cleanup complete.');
}

main().catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add src/tests/integration/cleanup.ts
git commit -m "Add standalone cleanup script for crashed test runs"
```

---

## Chunk 2: Test Suites

### Task 6: Task Lifecycle Tests

**Files:**
- Create: `src/tests/integration/task-lifecycle.test.ts`

- [ ] **Step 1: Create task-lifecycle.test.ts with create tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  setupIntegration,
  registry,
  createTrackedTask,
  editItem,
  safeRemoveTracked,
} from './setup.js';

describe('Task Lifecycle (integration)', () => {
  setupIntegration();

  let inboxTaskId: string;
  let projectTaskId: string;

  it('creates an inbox task', async () => {
    const result = await createTrackedTask({ name: 'TEST:Inbox Task' });
    expect(result.success).toBe(true);
    expect(result.taskId).toBeTruthy();
    inboxTaskId = result.taskId!;
  });

  it('creates a task in the test project', async () => {
    const result = await createTrackedTask({
      name: 'TEST:Project Task',
      projectName: registry.testProject,
    });
    expect(result.success).toBe(true);
    expect(result.taskId).toBeTruthy();
    projectTaskId = result.taskId!;
  });

  it('moves inbox task to the test project', async () => {
    const result = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newProjectName: registry.testProject,
    });
    expect(result.success).toBe(true);
    expect(result.changedProperties).toContain('project');
  });

  it('edits task properties', async () => {
    const result = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newName: 'TEST:Renamed Task',
      newFlagged: true,
    });
    expect(result.success).toBe(true);
    expect(result.changedProperties).toContain('name');
    expect(result.changedProperties).toContain('flagged');
  });

  it('marks task complete then incomplete', async () => {
    const complete = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newStatus: 'completed',
    });
    expect(complete.success).toBe(true);

    const incomplete = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newStatus: 'incomplete',
    });
    expect(incomplete.success).toBe(true);
  });

  it('marks task dropped', async () => {
    const result = await editItem({
      itemType: 'task',
      id: inboxTaskId,
      newStatus: 'dropped',
    });
    expect(result.success).toBe(true);
  });

  it('removes a task', async () => {
    const result = await safeRemoveTracked(projectTaskId, 'task');
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `npm run test:integration`
Expected: All tests pass (OmniFocus must be running). Tests create items inside the run folder, exercise CRUD, and clean up.

- [ ] **Step 3: Commit**

```bash
git add src/tests/integration/task-lifecycle.test.ts
git commit -m "Add task lifecycle integration tests"
```

---

### Task 7: Project Lifecycle Tests

**Files:**
- Create: `src/tests/integration/project-lifecycle.test.ts`

- [ ] **Step 1: Create project-lifecycle.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import {
  setupIntegration,
  registry,
  createTrackedProject,
  createTrackedTask,
  editItem,
  safeRemoveTracked,
} from './setup.js';

describe('Project Lifecycle (integration)', () => {
  setupIntegration();

  let projectId: string;

  it('creates a project in the run folder', async () => {
    const result = await createTrackedProject({
      name: 'TEST:New Project',
      folderName: registry.runFolder,
    });
    expect(result.success).toBe(true);
    expect(result.projectId).toBeTruthy();
    projectId = result.projectId!;
  });

  it('edits project properties', async () => {
    const result = await editItem({
      itemType: 'project',
      id: projectId,
      newName: 'TEST:Edited Project',
      newSequential: true,
    });
    expect(result.success).toBe(true);
    expect(result.changedProperties).toContain('name');
    expect(result.changedProperties).toContain('sequential');
  });

  it('changes project status', async () => {
    const onHold = await editItem({
      itemType: 'project',
      id: projectId,
      newProjectStatus: 'onHold',
    });
    expect(onHold.success).toBe(true);

    const active = await editItem({
      itemType: 'project',
      id: projectId,
      newProjectStatus: 'active',
    });
    expect(active.success).toBe(true);
  });

  it('adds a task to the project', async () => {
    const result = await createTrackedTask({
      name: 'TEST:Child Task',
      projectName: 'TEST:Edited Project',
    });
    expect(result.success).toBe(true);
  });

  it('removes the project', async () => {
    const result = await safeRemoveTracked(projectId, 'project');
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `npm run test:integration`
Expected: All tests in both suites pass.

- [ ] **Step 3: Run unit tests to verify no interference**

Run: `npm test`
Expected: All 68 unit tests still pass. Integration tests not included.

- [ ] **Step 4: Commit**

```bash
git add src/tests/integration/project-lifecycle.test.ts
git commit -m "Add project lifecycle integration tests"
```

---

### Task 8: Final Verification and Cleanup

- [ ] **Step 1: Run full integration suite end-to-end**

Run: `npm run test:integration`
Expected: All tests pass. Verify in OmniFocus that no TEST: items remain after the run.

- [ ] **Step 2: Test the standalone cleanup script**

Create a TEST: item manually in OmniFocus (or let a test fail mid-run), then:
Run: `npm run test:integration:cleanup`
Expected: Script finds and removes all TEST: prefixed items, reports what it deleted.

- [ ] **Step 3: Run unit tests one more time**

Run: `npm test`
Expected: All 68 unit tests pass.

- [ ] **Step 4: Commit everything and push**

```bash
git add -A
git commit -m "Integration test infrastructure complete"
git push origin feature/task-moves-and-fixes
```
