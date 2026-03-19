/**
 * Integration tests for Window & UI Control tools.
 *
 * These tests require OmniFocus to be running on macOS and verify
 * end-to-end execution through the OmniJS layer. They confirm that
 * the generated OmniJS scripts run without error against a live
 * OmniFocus instance and return correctly shaped responses.
 *
 * PERSPECTIVE AWARENESS:
 * Content-tree operations (reveal, expand, collapse, select, expandNote,
 * collapseNote) depend on `tree.nodeForObject()` which only returns a node
 * if the item is visible in the CURRENT perspective. Items resolved by ID
 * may get NODE_NOT_FOUND if the active perspective doesn't show them.
 * Tests accept both success=true and code=NODE_NOT_FOUND as valid outcomes
 * for these operations — both prove the OmniJS code path executes correctly.
 *
 * Focus/unfocus do NOT use the content tree, so they always succeed for
 * valid projects/folders.
 *
 * To run: ensure OmniFocus is open, then `pnpm test:integration -- tests/integration/window-tools/`
 */
import { afterEach, describe, expect, it } from 'vitest';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { collapseItems } from '../../../src/tools/primitives/collapseItems.js';
import { collapseNotes } from '../../../src/tools/primitives/collapseNotes.js';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { expandItems } from '../../../src/tools/primitives/expandItems.js';
import { expandNotes } from '../../../src/tools/primitives/expandNotes.js';
import { focusItems } from '../../../src/tools/primitives/focusItems.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { revealItems } from '../../../src/tools/primitives/revealItems.js';
import { selectItems } from '../../../src/tools/primitives/selectItems.js';
import { unfocus } from '../../../src/tools/primitives/unfocus.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

/** OmniFocus operations can be very slow — use generous timeouts */
const LONG_TIMEOUT = 60_000;

/**
 * Assert that an item was correctly resolved: either the UI operation
 * succeeded (success=true) or the item exists but isn't visible in the
 * current perspective (NODE_NOT_FOUND). Both prove the OmniJS script
 * executed correctly — only the perspective determines visibility.
 */
function expectResolvedItem(
  itemResult: { success: boolean; code?: string; error?: string },
  label: string
): void {
  if (!itemResult.success) {
    expect(
      itemResult.code,
      `${label}: expected success or NODE_NOT_FOUND, got code=${itemResult.code} error=${itemResult.error}`
    ).toBe('NODE_NOT_FOUND');
  }
}

describe('Window & UI Control Integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];
  const createdProjectIds: string[] = [];

  async function createTask(suffix: string): Promise<{ id: string; name: string }> {
    const name = `Window Test - ${suffix} ${Date.now()}`;
    const result = await addOmniFocusTask({ name });
    if (!result.success || !result.taskId) {
      throw new Error(`Failed to create test task: ${JSON.stringify(result)}`);
    }
    createdTaskIds.push(result.taskId);
    await waitForSync();
    return { id: result.taskId, name };
  }

  async function createTestProject(suffix: string): Promise<{ id: string; name: string }> {
    const name = `Window Test Project - ${suffix} ${Date.now()}`;
    const result = await createProject({ name });
    if (!result.success) {
      throw new Error(`Failed to create test project: ${JSON.stringify(result)}`);
    }
    const projectId = (result as { success: true; id: string }).id;
    if (!projectId) {
      throw new Error(`createProject returned no id: ${JSON.stringify(result)}`);
    }
    createdProjectIds.push(projectId);
    await waitForSync();
    return { id: projectId, name };
  }

  afterEach(async () => {
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTaskIds.length = 0;

    for (const id of [...createdProjectIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'project' });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdProjectIds.length = 0;

    // Always unfocus after tests to leave OmniFocus in a clean state
    try {
      await unfocus({});
    } catch {
      // Ignore
    }
  });

  describe('reveal_items', () => {
    it('should resolve and attempt to reveal a task by ID', { timeout: LONG_TIMEOUT }, async () => {
      const task = await createTask('Reveal');

      const result = await revealItems({ items: [{ id: task.id }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(1);
        expectResolvedItem(result.results[0], 'reveal task');
        expect(result.summary.total).toBe(1);
      }
    });

    it('should return NOT_FOUND for a nonexistent item', { timeout: LONG_TIMEOUT }, async () => {
      const result = await revealItems({ items: [{ id: 'nonexistent-id-99999' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('NOT_FOUND');
        expect(result.summary.failed).toBe(1);
      }
    });

    it('should handle a batch with mixed valid and invalid items', {
      timeout: LONG_TIMEOUT
    }, async () => {
      const task = await createTask('RevealBatch');

      const result = await revealItems({
        items: [{ id: 'nonexistent-id-99999' }, { id: task.id }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('NOT_FOUND');
        expectResolvedItem(result.results[1], 'reveal batch task');
        expect(result.summary.total).toBe(2);
      }
    });

    it('should resolve and attempt to reveal a project by ID', {
      timeout: LONG_TIMEOUT
    }, async () => {
      const project = await createTestProject('RevealProject');

      const result = await revealItems({ items: [{ id: project.id }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(1);
        expectResolvedItem(result.results[0], 'reveal project');
        expect(result.summary.total).toBe(1);
      }
    });
  });

  describe('expand_items / collapse_items', () => {
    it('should resolve and attempt expand then collapse on a project', {
      timeout: LONG_TIMEOUT
    }, async () => {
      const project = await createTestProject('ExpandCollapse');

      const expandResult = await expandItems({ items: [{ id: project.id }] });
      expect(expandResult.success).toBe(true);
      if (expandResult.success) {
        expectResolvedItem(expandResult.results[0], 'expand project');
      }

      await waitForSync();

      const collapseResult = await collapseItems({ items: [{ id: project.id }] });
      expect(collapseResult.success).toBe(true);
      if (collapseResult.success) {
        expectResolvedItem(collapseResult.results[0], 'collapse project');
      }
    });

    it('should handle the completely parameter', { timeout: LONG_TIMEOUT }, async () => {
      const project = await createTestProject('ExpandCompletely');

      const result = await expandItems({
        items: [{ id: project.id }],
        completely: true
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expectResolvedItem(result.results[0], 'expand completely');
      }
    });

    it('should return NOT_FOUND for nonexistent item', { timeout: LONG_TIMEOUT }, async () => {
      const result = await expandItems({ items: [{ id: 'nonexistent-id-99999' }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('NOT_FOUND');
      }
    });
  });

  describe('expand_notes / collapse_notes', () => {
    it('should resolve and expand notes on a task by ID', { timeout: LONG_TIMEOUT }, async () => {
      const task = await createTask('ExpandNote');

      const result = await expandNotes({ items: [{ id: task.id }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expectResolvedItem(result.results[0], 'expandNote task');
      }
    });

    it('should resolve and collapse notes on a task by ID', { timeout: LONG_TIMEOUT }, async () => {
      const task = await createTask('CollapseNote');

      const result = await collapseNotes({ items: [{ id: task.id }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expectResolvedItem(result.results[0], 'collapseNote task');
      }
    });

    it('should handle completely parameter on a project', { timeout: LONG_TIMEOUT }, async () => {
      const project = await createTestProject('NotesCompletely');

      const expandResult = await expandNotes({
        items: [{ id: project.id }],
        completely: true
      });
      expect(expandResult.success).toBe(true);
      if (expandResult.success) {
        expectResolvedItem(expandResult.results[0], 'expandNote project');
      }

      await waitForSync();

      const collapseResult = await collapseNotes({
        items: [{ id: project.id }],
        completely: true
      });
      expect(collapseResult.success).toBe(true);
      if (collapseResult.success) {
        expectResolvedItem(collapseResult.results[0], 'collapseNote project');
      }
    });
  });

  describe('focus_items / unfocus', () => {
    it('should focus on a project by ID', { timeout: LONG_TIMEOUT }, async () => {
      const project = await createTestProject('Focus');

      const result = await focusItems({ items: [{ id: project.id }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].itemType).toBe('project');
        expect(result.summary.succeeded).toBe(1);
      }
    });

    it('should reject a task as an INVALID_TYPE focus target', {
      timeout: LONG_TIMEOUT
    }, async () => {
      const task = await createTask('FocusTask');

      const result = await focusItems({ items: [{ id: task.id }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('INVALID_TYPE');
        expect(result.summary.failed).toBe(1);
      }
    });

    it('should unfocus (clear focus) idempotently', { timeout: LONG_TIMEOUT }, async () => {
      const result1 = await unfocus({});
      expect(result1.success).toBe(true);

      const result2 = await unfocus({});
      expect(result2.success).toBe(true);
    });

    it('should complete focus → unfocus lifecycle', { timeout: LONG_TIMEOUT }, async () => {
      const project = await createTestProject('FocusLifecycle');

      const focusResult = await focusItems({ items: [{ id: project.id }] });
      expect(focusResult.success).toBe(true);
      if (focusResult.success) {
        expect(focusResult.results[0].success).toBe(true);
      }

      await waitForSync();

      const unfocusResult = await unfocus({});
      expect(unfocusResult.success).toBe(true);
    });

    it('should handle mixed valid and invalid focus targets in a batch', {
      timeout: LONG_TIMEOUT
    }, async () => {
      const project = await createTestProject('FocusBatch');
      const task = await createTask('FocusBatchTask');

      const result = await focusItems({
        items: [{ id: project.id }, { id: task.id }, { id: 'nonexistent-id-99999' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(3);
        // Project: should succeed (focus doesn't use content tree)
        expect(result.results[0].success).toBe(true);
        // Task: always INVALID_TYPE
        expect(result.results[1].success).toBe(false);
        expect(result.results[1].code).toBe('INVALID_TYPE');
        // Nonexistent: always NOT_FOUND
        expect(result.results[2].success).toBe(false);
        expect(result.results[2].code).toBe('NOT_FOUND');
      }
    });
  });

  describe('select_items', () => {
    it('should resolve and attempt to select a task by ID', { timeout: LONG_TIMEOUT }, async () => {
      const task = await createTask('Select');

      const result = await selectItems({ items: [{ id: task.id }] });

      expect(result.success).toBe(true);
      if (result.success) {
        expectResolvedItem(result.results[0], 'select task');
        expect(result.summary.total).toBe(1);
      }
    });

    it('should resolve and select multiple items', { timeout: LONG_TIMEOUT }, async () => {
      const task1 = await createTask('Select1');
      const task2 = await createTask('Select2');

      const result = await selectItems({
        items: [{ id: task1.id }, { id: task2.id }],
        extending: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results).toHaveLength(2);
        expectResolvedItem(result.results[0], 'select task1');
        expectResolvedItem(result.results[1], 'select task2');
      }
    });

    it('should handle extending parameter', { timeout: LONG_TIMEOUT }, async () => {
      const task1 = await createTask('SelectExt1');
      const task2 = await createTask('SelectExt2');

      await selectItems({ items: [{ id: task1.id }] });
      await waitForSync();

      const result = await selectItems({
        items: [{ id: task2.id }],
        extending: true
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expectResolvedItem(result.results[0], 'extend selection');
      }
    });

    it('should return NOT_FOUND for nonexistent items', { timeout: LONG_TIMEOUT }, async () => {
      const result = await selectItems({
        items: [{ id: 'nonexistent-id-99999' }]
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.results[0].success).toBe(false);
        expect(result.results[0].code).toBe('NOT_FOUND');
        expect(result.summary.failed).toBe(1);
      }
    });
  });

  describe('full workflow: reveal → expand → collapse → focus → unfocus → select', () => {
    it('should execute the complete UI lifecycle on a project', {
      timeout: LONG_TIMEOUT
    }, async () => {
      const project = await createTestProject('Workflow');
      const task = await createTask('WorkflowTask');

      // Step 1: Reveal the project (content-tree dependent)
      const revealResult = await revealItems({ items: [{ id: project.id }] });
      expect(revealResult.success).toBe(true);
      if (revealResult.success) {
        expectResolvedItem(revealResult.results[0], 'workflow reveal');
      }
      await waitForSync();

      // Step 2: Expand the project (content-tree dependent)
      const expandResult = await expandItems({ items: [{ id: project.id }] });
      expect(expandResult.success).toBe(true);
      if (expandResult.success) {
        expectResolvedItem(expandResult.results[0], 'workflow expand');
      }
      await waitForSync();

      // Step 3: Collapse the project (content-tree dependent)
      const collapseResult = await collapseItems({ items: [{ id: project.id }] });
      expect(collapseResult.success).toBe(true);
      if (collapseResult.success) {
        expectResolvedItem(collapseResult.results[0], 'workflow collapse');
      }
      await waitForSync();

      // Step 4: Focus on the project (does NOT use content tree)
      const focusResult = await focusItems({ items: [{ id: project.id }] });
      expect(focusResult.success).toBe(true);
      if (focusResult.success) {
        expect(focusResult.results[0].success).toBe(true);
      }
      await waitForSync();

      // Step 5: Unfocus
      const unfocusResult = await unfocus({});
      expect(unfocusResult.success).toBe(true);
      await waitForSync();

      // Step 6: Select the task (content-tree dependent)
      const selectResult = await selectItems({ items: [{ id: task.id }] });
      expect(selectResult.success).toBe(true);
      if (selectResult.success) {
        expectResolvedItem(selectResult.results[0], 'workflow select');
      }
    });
  });
});
