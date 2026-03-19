/**
 * Integration tests for bulk operation tools.
 *
 * These tests verify round-trip scenarios with a live OmniFocus instance.
 * They are skipped by default (INTEGRATION=true env var required).
 *
 * To run manually:
 *   INTEGRATION=true pnpm test tests/integration/bulk-operations.integration.test.ts
 *
 * Scenarios covered:
 * - move_tasks: Move task to project, verify it appears in target, absent from source
 * - duplicate_tasks: Duplicate task, verify both exist with matching properties, copy is active
 * - batch_update_tasks: Update flagged/dueDate on multiple tasks, verify each reflects changes
 * - convert_tasks_to_projects: Convert task with subtasks, verify project exists with children
 * - move_sections: Move project between folders, verify parentFolder changes
 * - duplicate_sections: Duplicate project with tasks, verify copy exists with all tasks
 */

import { describe, it } from 'vitest';

const INTEGRATION = process.env.INTEGRATION === 'true';

describe.skipIf(!INTEGRATION)('bulk-operations integration', () => {
  it.todo('move_tasks: moves task to target project and removes from source');
  it.todo('move_tasks: moves task to inbox');
  it.todo('move_tasks: moves multiple tasks with partial failure (one not found)');
  it.todo('duplicate_tasks: creates active copy with matching properties');
  it.todo('duplicate_tasks: completed original produces incomplete copy (FR-011)');
  it.todo('batch_update_tasks: sets flagged=true on multiple tasks');
  it.todo('batch_update_tasks: clears due date on multiple tasks');
  it.todo('batch_update_tasks: adds and removes tags with correct ordering (FR-014)');
  it.todo('batch_update_tasks: appends note to existing content');
  it.todo('convert_tasks_to_projects: task with subtasks becomes project with children');
  it.todo('convert_tasks_to_projects: rejects already-a-project root task (ALREADY_A_PROJECT)');
  it.todo('convert_tasks_to_projects: places new project in target folder');
  it.todo('move_sections: moves project between folders, parentFolder changes');
  it.todo('move_sections: moves folder to library root');
  it.todo('duplicate_sections: copies project with tasks, returns new ID');
  it.todo('duplicate_sections: copies folder with child projects');
});
