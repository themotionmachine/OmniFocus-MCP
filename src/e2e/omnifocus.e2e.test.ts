/**
 * End-to-end tests that require OmniFocus to be running on macOS.
 *
 * These tests are EXCLUDED from `npm test` and only run via:
 *   npm run test:e2e
 *
 * They will create real items in OmniFocus and then clean them up.
 * Run manually when you need to verify actual OmniFocus integration.
 */
import { describe, it, expect } from 'vitest';
import { addOmniFocusTask } from '../tools/primitives/addOmniFocusTask.js';
import { addProject } from '../tools/primitives/addProject.js';
import { removeItem } from '../tools/primitives/removeItem.js';
import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';

describe('OmniFocus E2E', () => {
  it('creates a task, verifies it exists, and deletes it', async () => {
    const created = await addOmniFocusTask({ name: '__E2E_TEST_TASK__' });
    expect(created.success).toBe(true);
    expect(created.taskId).toBeDefined();

    try {
      // Verify via query — match by name since ID formats may differ
      const query = await queryOmnifocus({
        entity: 'tasks',
        filters: {},
        limit: 1000,
      });
      expect(query.success).toBe(true);
      const found = query.items?.some((t: any) => t.name === '__E2E_TEST_TASK__');
      expect(found).toBe(true);
    } finally {
      // Always clean up, even if verification fails
      const removed = await removeItem({ id: created.taskId, itemType: 'task' });
      expect(removed.success).toBe(true);
    }
  });

  it('creates a project, verifies it exists, and deletes it', async () => {
    const created = await addProject({ name: '__E2E_TEST_PROJECT__' });
    expect(created.success).toBe(true);
    expect(created.projectId).toBeDefined();

    try {
      // Verify via query — match by name since ID formats may differ
      // between AppleScript (addProject) and OmniJS (queryOmnifocus)
      const query = await queryOmnifocus({
        entity: 'projects',
        filters: {},
        limit: 1000,
      });
      expect(query.success).toBe(true);
      const found = query.items?.some((p: any) => p.name === '__E2E_TEST_PROJECT__');
      expect(found).toBe(true);
    } finally {
      // Always clean up — use name as fallback since removeItem uses AppleScript
      // which should match the ID format from addProject
      const removed = await removeItem({ id: created.projectId, itemType: 'project' });
      if (!removed.success) {
        // Fallback: try by name
        await removeItem({ name: '__E2E_TEST_PROJECT__', itemType: 'project' });
      }
    }
  });
});
