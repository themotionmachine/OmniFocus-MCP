import { afterEach, describe, expect, it } from 'vitest';
import { addNotification } from '../../../src/tools/primitives/addNotification.js';
import { addOmniFocusTask } from '../../../src/tools/primitives/addOmniFocusTask.js';
import { addStandardNotifications } from '../../../src/tools/primitives/addStandardNotifications.js';
import { listNotifications } from '../../../src/tools/primitives/listNotifications.js';
import { removeItem } from '../../../src/tools/primitives/removeItem.js';
import { removeNotification } from '../../../src/tools/primitives/removeNotification.js';
import { snoozeNotification } from '../../../src/tools/primitives/snoozeNotification.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';

/**
 * Integration tests for notification tools.
 *
 * These tests require OmniFocus to be running on macOS.
 * They verify the full round-trip: add → list → verify → snooze → verify → remove → verify.
 *
 * Tests are skipped automatically when OmniFocus is unavailable (CI environments).
 */
describe('Notification Tools Integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTaskIds: string[] = [];

  /**
   * Create a test task with a due date (required for relative notifications).
   */
  async function createTaskWithDueDate(label: string): Promise<{ id: string; name: string }> {
    const uniqueName = `Notif Test - ${label} ${Date.now()}`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await addOmniFocusTask({
      name: uniqueName,
      dueDate: tomorrow.toISOString()
    });

    if (!result.success || !result.taskId) {
      throw new Error(`Failed to create test task: ${JSON.stringify(result)}`);
    }

    createdTaskIds.push(result.taskId);
    await waitForSync();
    return { id: result.taskId, name: uniqueName };
  }

  /**
   * Create a test task without a due date (for testing relative-notification errors).
   */
  async function createTaskWithoutDueDate(label: string): Promise<{ id: string; name: string }> {
    const uniqueName = `Notif Test - ${label} ${Date.now()}`;

    const result = await addOmniFocusTask({ name: uniqueName });

    if (!result.success || !result.taskId) {
      throw new Error(`Failed to create test task: ${JSON.stringify(result)}`);
    }

    createdTaskIds.push(result.taskId);
    await waitForSync();
    return { id: result.taskId, name: uniqueName };
  }

  afterEach(async () => {
    for (const id of [...createdTaskIds].reverse()) {
      try {
        await removeItem({ id, itemType: 'task' });
      } catch {
        // Ignore cleanup errors — task may already be deleted
      }
    }
    createdTaskIds.length = 0;
  });

  // ---------------------------------------------------------------------------
  // list_notifications — empty task
  // ---------------------------------------------------------------------------

  it('should list empty notifications on a new task', async () => {
    const task = await createTaskWithDueDate('empty list');

    const result = await listNotifications({ taskId: task.id });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.count).toBe(0);
      expect(result.notifications).toHaveLength(0);
      expect(result.taskId).toBe(task.id);
    }
  });

  // ---------------------------------------------------------------------------
  // add_notification — absolute
  // ---------------------------------------------------------------------------

  it('should add an absolute notification and verify via list', async () => {
    const task = await createTaskWithDueDate('add absolute');
    const fireDate = new Date();
    fireDate.setDate(fireDate.getDate() + 1);
    fireDate.setHours(9, 0, 0, 0);
    const fireDateISO = fireDate.toISOString();

    const addResult = await addNotification({
      type: 'absolute',
      taskId: task.id,
      dateTime: fireDateISO
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) {
      expect(addResult.notification.kind).toBe('Absolute');
      if (addResult.notification.kind === 'Absolute') {
        expect(addResult.notification.absoluteFireDate).toBeTruthy();
      }
    }

    await waitForSync();

    const listResult = await listNotifications({ taskId: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(1);
      expect(listResult.notifications).toHaveLength(1);
      const notif = listResult.notifications[0];
      expect(notif.kind).toBe('Absolute');
      if (notif.kind === 'Absolute') {
        expect(notif.absoluteFireDate).toBeTruthy();
      }
    }
  });

  // ---------------------------------------------------------------------------
  // add_notification — relative
  // ---------------------------------------------------------------------------

  it('should add a relative notification (-3600 offset) and verify via list', async () => {
    const task = await createTaskWithDueDate('add relative');

    const addResult = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -3600
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) {
      expect(addResult.notification.kind).toBe('DueRelative');
      if (addResult.notification.kind === 'DueRelative') {
        expect(addResult.notification.relativeFireOffset).toBe(-3600);
      }
    }

    await waitForSync();

    const listResult = await listNotifications({ taskId: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(1);
      const notif = listResult.notifications[0];
      expect(notif.kind).toBe('DueRelative');
      if (notif.kind === 'DueRelative') {
        expect(notif.relativeFireOffset).toBe(-3600);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // add_standard_notifications — day_before preset
  // ---------------------------------------------------------------------------

  it('should add day_before preset and verify 1 notification at -86400 offset', async () => {
    const task = await createTaskWithDueDate('standard day_before');

    const addResult = await addStandardNotifications({
      taskId: task.id,
      preset: 'day_before'
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) {
      expect(addResult.addedCount).toBe(1);
      expect(addResult.notifications).toHaveLength(1);
      const notif = addResult.notifications[0];
      expect(notif.kind).toBe('DueRelative');
      if (notif.kind === 'DueRelative') {
        expect(notif.relativeFireOffset).toBe(-86400);
      }
    }

    await waitForSync();

    const listResult = await listNotifications({ taskId: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(1);
    }
  });

  // ---------------------------------------------------------------------------
  // add_standard_notifications — standard preset
  // ---------------------------------------------------------------------------

  it('should add standard preset and verify 2 notifications (-86400 and -3600)', async () => {
    const task = await createTaskWithDueDate('standard preset');

    const addResult = await addStandardNotifications({
      taskId: task.id,
      preset: 'standard'
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) {
      expect(addResult.addedCount).toBe(2);
      expect(addResult.notifications).toHaveLength(2);

      const offsets = addResult.notifications.map((n) => {
        if (n.kind === 'DueRelative') return n.relativeFireOffset;
        return null;
      });
      expect(offsets).toContain(-86400);
      expect(offsets).toContain(-3600);
    }

    await waitForSync();

    const listResult = await listNotifications({ taskId: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(2);
    }
  });

  // ---------------------------------------------------------------------------
  // remove_notification — count decreases
  // ---------------------------------------------------------------------------

  it('should remove a notification and verify count decreases', async () => {
    const task = await createTaskWithDueDate('remove notif');

    // Add one notification
    const addResult = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -3600
    });
    expect(addResult.success).toBe(true);
    await waitForSync();

    // Verify 1 notification exists
    const listBefore = await listNotifications({ taskId: task.id });
    expect(listBefore.success).toBe(true);
    if (listBefore.success) {
      expect(listBefore.count).toBe(1);
    }

    // Remove at index 0
    const removeResult = await removeNotification({ taskId: task.id, index: 0 });
    expect(removeResult.success).toBe(true);
    if (removeResult.success) {
      expect(removeResult.removedIndex).toBe(0);
      expect(removeResult.remainingCount).toBe(0);
    }

    await waitForSync();

    // Verify 0 notifications remain
    const listAfter = await listNotifications({ taskId: task.id });
    expect(listAfter.success).toBe(true);
    if (listAfter.success) {
      expect(listAfter.count).toBe(0);
      expect(listAfter.notifications).toHaveLength(0);
    }
  });

  // ---------------------------------------------------------------------------
  // snooze_notification — absoluteFireDate changes
  // ---------------------------------------------------------------------------

  it('should snooze an absolute notification and verify absoluteFireDate changed', async () => {
    const task = await createTaskWithDueDate('snooze notif');

    // Add an absolute notification (fires tomorrow at 9 AM)
    const originalDate = new Date();
    originalDate.setDate(originalDate.getDate() + 1);
    originalDate.setHours(9, 0, 0, 0);

    const addResult = await addNotification({
      type: 'absolute',
      taskId: task.id,
      dateTime: originalDate.toISOString()
    });
    expect(addResult.success).toBe(true);
    await waitForSync();

    // Snooze to a later date (day after tomorrow at 10 AM)
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 2);
    newDate.setHours(10, 0, 0, 0);
    const newDateISO = newDate.toISOString();

    const snoozeResult = await snoozeNotification({
      taskId: task.id,
      index: 0,
      snoozeUntil: newDateISO
    });

    expect(snoozeResult.success).toBe(true);
    if (snoozeResult.success) {
      expect(snoozeResult.notification.kind).toBe('Absolute');
      if (snoozeResult.notification.kind === 'Absolute') {
        // absoluteFireDate should reflect the new snooze time
        expect(snoozeResult.notification.absoluteFireDate).toBeTruthy();
        const returnedDate = new Date(snoozeResult.notification.absoluteFireDate);
        expect(returnedDate.getTime()).toBeGreaterThan(originalDate.getTime());
      }
    }

    await waitForSync();

    // Verify via list that absoluteFireDate changed
    const listResult = await listNotifications({ taskId: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(1);
      const notif = listResult.notifications[0];
      expect(notif.kind).toBe('Absolute');
      if (notif.kind === 'Absolute') {
        const listedDate = new Date(notif.absoluteFireDate);
        expect(listedDate.getTime()).toBeGreaterThan(originalDate.getTime());
      }
    }
  });

  // ---------------------------------------------------------------------------
  // remove is idempotent with correct bounds
  // ---------------------------------------------------------------------------

  it('should remove notifications sequentially and verify remainingCount at each step', async () => {
    const task = await createTaskWithDueDate('remove sequential');

    // Add 2 notifications
    const add1 = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -86400
    });
    expect(add1.success).toBe(true);
    await waitForSync();

    const add2 = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -3600
    });
    expect(add2.success).toBe(true);
    await waitForSync();

    // Verify 2 notifications exist
    const listBefore = await listNotifications({ taskId: task.id });
    expect(listBefore.success).toBe(true);
    if (listBefore.success) {
      expect(listBefore.count).toBe(2);
    }

    // Remove index 1 — remainingCount should be 1
    const remove1 = await removeNotification({ taskId: task.id, index: 1 });
    expect(remove1.success).toBe(true);
    if (remove1.success) {
      expect(remove1.remainingCount).toBe(1);
    }
    await waitForSync();

    // Remove index 0 — remainingCount should be 0
    const remove2 = await removeNotification({ taskId: task.id, index: 0 });
    expect(remove2.success).toBe(true);
    if (remove2.success) {
      expect(remove2.remainingCount).toBe(0);
    }
    await waitForSync();

    // Verify 0 notifications remain
    const listAfter = await listNotifications({ taskId: task.id });
    expect(listAfter.success).toBe(true);
    if (listAfter.success) {
      expect(listAfter.count).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // Error: relative notification without due date
  // ---------------------------------------------------------------------------

  it('should return error when adding relative notification without due date', async () => {
    const task = await createTaskWithoutDueDate('no due date');

    const result = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -3600
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toMatch(/due date|effectiveduedate/i);
    }
  });

  // ---------------------------------------------------------------------------
  // Error: snooze a non-Absolute notification
  // ---------------------------------------------------------------------------

  it('should return error when snoozing a non-Absolute (DueRelative) notification', async () => {
    const task = await createTaskWithDueDate('snooze relative error');

    // Add a relative notification
    const addResult = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -3600
    });
    expect(addResult.success).toBe(true);
    await waitForSync();

    // Attempt to snooze the relative notification
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 1);

    const snoozeResult = await snoozeNotification({
      taskId: task.id,
      index: 0,
      snoozeUntil: snoozeDate.toISOString()
    });

    expect(snoozeResult.success).toBe(false);
    if (!snoozeResult.success) {
      expect(snoozeResult.error.toLowerCase()).toMatch(/only absolute|cannot snooze/i);
    }
  });

  // ---------------------------------------------------------------------------
  // Error: remove out-of-bounds index
  // ---------------------------------------------------------------------------

  it('should return error when removing an out-of-bounds notification index', async () => {
    const task = await createTaskWithDueDate('remove oob');

    // Add exactly 1 notification
    const addResult = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -3600
    });
    expect(addResult.success).toBe(true);
    await waitForSync();

    // Try to remove index 5 (out of bounds — only index 0 exists)
    const removeResult = await removeNotification({ taskId: task.id, index: 5 });

    expect(removeResult.success).toBe(false);
    if (!removeResult.success) {
      expect(removeResult.error.toLowerCase()).toMatch(/out of bounds|index.*5/i);
    }
  });

  // ---------------------------------------------------------------------------
  // Error: task not found
  // ---------------------------------------------------------------------------

  it('should return error when listing notifications for a nonexistent task ID', async () => {
    const result = await listNotifications({ taskId: 'nonexistent-task-id-99999' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toMatch(/not found/i);
    }
  });

  // ---------------------------------------------------------------------------
  // Full round-trip: add → list → snooze → list → remove → list
  // ---------------------------------------------------------------------------

  it('should complete a full round-trip: add → list → snooze → list → remove → list', async () => {
    const task = await createTaskWithDueDate('full round-trip');

    // Step 1: Add absolute notification
    const fireDate = new Date();
    fireDate.setDate(fireDate.getDate() + 1);
    fireDate.setHours(8, 0, 0, 0);

    const addResult = await addNotification({
      type: 'absolute',
      taskId: task.id,
      dateTime: fireDate.toISOString()
    });
    expect(addResult.success).toBe(true);
    await waitForSync();

    // Step 2: List — verify 1 notification
    const listAfterAdd = await listNotifications({ taskId: task.id });
    expect(listAfterAdd.success).toBe(true);
    if (listAfterAdd.success) {
      expect(listAfterAdd.count).toBe(1);
    }

    // Step 3: Snooze to a later time
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() + 3);
    snoozeDate.setHours(9, 0, 0, 0);

    const snoozeResult = await snoozeNotification({
      taskId: task.id,
      index: 0,
      snoozeUntil: snoozeDate.toISOString()
    });
    expect(snoozeResult.success).toBe(true);
    await waitForSync();

    // Step 4: List — verify absoluteFireDate is updated
    const listAfterSnooze = await listNotifications({ taskId: task.id });
    expect(listAfterSnooze.success).toBe(true);
    if (listAfterSnooze.success) {
      expect(listAfterSnooze.count).toBe(1);
      const notif = listAfterSnooze.notifications[0];
      expect(notif.kind).toBe('Absolute');
      if (notif.kind === 'Absolute') {
        const listedDate = new Date(notif.absoluteFireDate);
        expect(listedDate.getTime()).toBeGreaterThan(fireDate.getTime());
      }
    }

    // Step 5: Remove the notification
    const removeResult = await removeNotification({ taskId: task.id, index: 0 });
    expect(removeResult.success).toBe(true);
    if (removeResult.success) {
      expect(removeResult.remainingCount).toBe(0);
    }
    await waitForSync();

    // Step 6: List — verify 0 notifications
    const listAfterRemove = await listNotifications({ taskId: task.id });
    expect(listAfterRemove.success).toBe(true);
    if (listAfterRemove.success) {
      expect(listAfterRemove.count).toBe(0);
      expect(listAfterRemove.notifications).toHaveLength(0);
    }
  });

  // ---------------------------------------------------------------------------
  // Script Editor Verification Gates (T016, T023, T030, T037, T044)
  // ---------------------------------------------------------------------------

  // T016: Mixed notification kinds on same task
  it('T016: should list mixed absolute and relative notifications on the same task', async () => {
    const task = await createTaskWithDueDate('T016 mixed kinds');

    // Add an absolute notification (fires day after tomorrow at 9 AM)
    const absoluteDate = new Date();
    absoluteDate.setDate(absoluteDate.getDate() + 2);
    absoluteDate.setHours(9, 0, 0, 0);

    const addAbsolute = await addNotification({
      type: 'absolute',
      taskId: task.id,
      dateTime: absoluteDate.toISOString()
    });
    expect(addAbsolute.success).toBe(true);
    await waitForSync();

    // Add a relative notification (-3600 offset, i.e. 1 hour before due)
    const addRelative = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -3600
    });
    expect(addRelative.success).toBe(true);
    await waitForSync();

    // List and verify both are present with correct kinds and kind-conditional fields
    const listResult = await listNotifications({ taskId: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(2);
      expect(listResult.notifications).toHaveLength(2);

      const absoluteNotif = listResult.notifications.find((n) => n.kind === 'Absolute');
      const relativeNotif = listResult.notifications.find((n) => n.kind === 'DueRelative');

      // Absolute notification must carry absoluteFireDate
      expect(absoluteNotif).toBeDefined();
      if (absoluteNotif?.kind === 'Absolute') {
        expect(absoluteNotif.absoluteFireDate).toBeTruthy();
      }

      // Relative notification must carry relativeFireOffset of -3600
      expect(relativeNotif).toBeDefined();
      if (relativeNotif?.kind === 'DueRelative') {
        expect(relativeNotif.relativeFireOffset).toBe(-3600);
      }
    }
  });

  // T023: Verify addNotification(Number) unit is seconds
  it('T023: should store relativeFireOffset in seconds and initialFireDate approximately 3600s before due', async () => {
    // Create a task due exactly 24 hours from now
    const uniqueName = `Notif Test - T023 seconds unit ${Date.now()}`;
    const dueDate = new Date();
    dueDate.setTime(dueDate.getTime() + 24 * 60 * 60 * 1000); // exactly 24 h from now

    const createResult = await addOmniFocusTask({
      name: uniqueName,
      dueDate: dueDate.toISOString()
    });
    expect(createResult.success).toBe(true);
    if (!createResult.success || !createResult.taskId) {
      throw new Error('Failed to create task for T023');
    }
    createdTaskIds.push(createResult.taskId);
    await waitForSync();

    // Add relative notification at -3600 (1 hour before due)
    const addResult = await addNotification({
      type: 'relative',
      taskId: createResult.taskId,
      offsetSeconds: -3600
    });
    expect(addResult.success).toBe(true);
    await waitForSync();

    const listResult = await listNotifications({ taskId: createResult.taskId });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(1);
      const notif = listResult.notifications[0];
      expect(notif.kind).toBe('DueRelative');
      if (notif.kind === 'DueRelative') {
        // If unit were minutes, OmniFocus would store -60 instead of -3600
        expect(notif.relativeFireOffset).toBe(-3600);

        // initialFireDate should be approximately 1 hour before dueDate
        // Allow a 60-second tolerance for rounding and sync delays
        if (notif.initialFireDate) {
          const initialMs = new Date(notif.initialFireDate).getTime();
          const dueMs = dueDate.getTime();
          const differenceSeconds = (dueMs - initialMs) / 1000;
          expect(differenceSeconds).toBeGreaterThan(3540); // at least 59 minutes
          expect(differenceSeconds).toBeLessThan(3660); // at most 61 minutes
        }
      }
    }
  });

  // T030: Index-to-object translation for remove (multi-notification)
  it('T030: should remove middle notification by index and preserve first and third', async () => {
    const task = await createTaskWithDueDate('T030 index translation');

    // Add 3 relative notifications: -86400, -3600, -900
    const add1 = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -86400
    });
    expect(add1.success).toBe(true);
    await waitForSync();

    const add2 = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -3600
    });
    expect(add2.success).toBe(true);
    await waitForSync();

    const add3 = await addNotification({
      type: 'relative',
      taskId: task.id,
      offsetSeconds: -900
    });
    expect(add3.success).toBe(true);
    await waitForSync();

    // List to see actual order (OmniFocus may reorder by fire time)
    const listBefore = await listNotifications({ taskId: task.id });
    expect(listBefore.success).toBe(true);
    if (!listBefore.success) return;
    expect(listBefore.count).toBe(3);

    // Find the index of the -3600 notification (not guaranteed to be index 1)
    const targetIndex = listBefore.notifications.findIndex(
      (n) => n.kind === 'DueRelative' && n.relativeFireOffset === -3600
    );
    expect(targetIndex).toBeGreaterThanOrEqual(0);

    // Remove the -3600 notification by its actual index
    const removeResult = await removeNotification({ taskId: task.id, index: targetIndex });
    expect(removeResult.success).toBe(true);
    if (removeResult.success) {
      expect(removeResult.removedIndex).toBe(targetIndex);
      expect(removeResult.remainingCount).toBe(2);
    }
    await waitForSync();

    // Verify 2 remain and the -3600 one is gone
    const listAfter = await listNotifications({ taskId: task.id });
    expect(listAfter.success).toBe(true);
    if (listAfter.success) {
      expect(listAfter.count).toBe(2);
      expect(listAfter.notifications).toHaveLength(2);

      const offsets = listAfter.notifications.map((n) => {
        if (n.kind === 'DueRelative') return n.relativeFireOffset;
        return null;
      });

      // The -3600 notification should be gone
      expect(offsets).not.toContain(-3600);
      // The -86400 and -900 should remain
      expect(offsets).toContain(-86400);
      expect(offsets).toContain(-900);
    }
  });

  // T037: Verify ALL preset offsets (hour_before, 15_minutes, week_before)
  it('T037: should add hour_before preset and verify 1 notification at -3600', async () => {
    const task = await createTaskWithDueDate('T037 hour_before preset');

    const addResult = await addStandardNotifications({
      taskId: task.id,
      preset: 'hour_before'
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) {
      expect(addResult.addedCount).toBe(1);
      expect(addResult.notifications).toHaveLength(1);
      const notif = addResult.notifications[0];
      expect(notif.kind).toBe('DueRelative');
      if (notif.kind === 'DueRelative') {
        expect(notif.relativeFireOffset).toBe(-3600);
      }
    }

    await waitForSync();

    const listResult = await listNotifications({ taskId: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(1);
      const notif = listResult.notifications[0];
      if (notif.kind === 'DueRelative') {
        expect(notif.relativeFireOffset).toBe(-3600);
      }
    }
  });

  it('T037: should add 15_minutes preset and verify 1 notification at -900', async () => {
    const task = await createTaskWithDueDate('T037 15_minutes preset');

    const addResult = await addStandardNotifications({
      taskId: task.id,
      preset: '15_minutes'
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) {
      expect(addResult.addedCount).toBe(1);
      expect(addResult.notifications).toHaveLength(1);
      const notif = addResult.notifications[0];
      expect(notif.kind).toBe('DueRelative');
      if (notif.kind === 'DueRelative') {
        expect(notif.relativeFireOffset).toBe(-900);
      }
    }

    await waitForSync();

    const listResult = await listNotifications({ taskId: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(1);
      const notif = listResult.notifications[0];
      if (notif.kind === 'DueRelative') {
        expect(notif.relativeFireOffset).toBe(-900);
      }
    }
  });

  it('T037: should add week_before preset and verify 1 notification at -604800', async () => {
    // week_before requires the task to be due at least 1 week from now
    const uniqueName = `Notif Test - T037 week_before ${Date.now()}`;
    const dueInTwoWeeks = new Date();
    dueInTwoWeeks.setDate(dueInTwoWeeks.getDate() + 14);

    const createResult = await addOmniFocusTask({
      name: uniqueName,
      dueDate: dueInTwoWeeks.toISOString()
    });
    expect(createResult.success).toBe(true);
    if (!createResult.success || !createResult.taskId) {
      throw new Error('Failed to create task for T037 week_before');
    }
    createdTaskIds.push(createResult.taskId);
    await waitForSync();

    const addResult = await addStandardNotifications({
      taskId: createResult.taskId,
      preset: 'week_before'
    });

    expect(addResult.success).toBe(true);
    if (addResult.success) {
      expect(addResult.addedCount).toBe(1);
      expect(addResult.notifications).toHaveLength(1);
      const notif = addResult.notifications[0];
      expect(notif.kind).toBe('DueRelative');
      if (notif.kind === 'DueRelative') {
        expect(notif.relativeFireOffset).toBe(-604800);
      }
    }

    await waitForSync();

    const listResult = await listNotifications({ taskId: createResult.taskId });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(1);
      const notif = listResult.notifications[0];
      if (notif.kind === 'DueRelative') {
        expect(notif.relativeFireOffset).toBe(-604800);
      }
    }
  });

  // T044: Invalid Date behavior for absoluteFireDate (TypeScript pre-validation)
  it('T044: should reject snoozeUntil with an invalid date string before reaching OmniJS', async () => {
    const task = await createTaskWithDueDate('T044 invalid date');

    // Add an absolute notification so a snooze call is meaningful
    const fireDate = new Date();
    fireDate.setDate(fireDate.getDate() + 1);
    fireDate.setHours(9, 0, 0, 0);

    const addResult = await addNotification({
      type: 'absolute',
      taskId: task.id,
      dateTime: fireDate.toISOString()
    });
    expect(addResult.success).toBe(true);
    await waitForSync();

    // Attempt snooze with a clearly invalid date string — TypeScript pre-validation should reject it
    const invalidSnoozeResult = await snoozeNotification({
      taskId: task.id,
      index: 0,
      snoozeUntil: 'not-a-date'
    });

    expect(invalidSnoozeResult.success).toBe(false);
    if (!invalidSnoozeResult.success) {
      expect(invalidSnoozeResult.error.toLowerCase()).toMatch(/invalid.*date|snoozeuntil/i);
    }

    // Verify the original notification is unchanged (count still 1)
    await waitForSync();
    const listResult = await listNotifications({ taskId: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(1);
    }
  });

  it('T044: should reject snoozeUntil with an empty string before reaching OmniJS', async () => {
    const task = await createTaskWithDueDate('T044 empty string date');

    // Add an absolute notification
    const fireDate = new Date();
    fireDate.setDate(fireDate.getDate() + 1);
    fireDate.setHours(9, 0, 0, 0);

    const addResult = await addNotification({
      type: 'absolute',
      taskId: task.id,
      dateTime: fireDate.toISOString()
    });
    expect(addResult.success).toBe(true);
    await waitForSync();

    // Attempt snooze with an empty string — should also fail pre-validation
    const emptySnoozeResult = await snoozeNotification({
      taskId: task.id,
      index: 0,
      snoozeUntil: ''
    });

    expect(emptySnoozeResult.success).toBe(false);
    if (!emptySnoozeResult.success) {
      expect(emptySnoozeResult.error.toLowerCase()).toMatch(/invalid.*date|snoozeuntil/i);
    }

    // Verify the original notification is unchanged (count still 1)
    await waitForSync();
    const listResult = await listNotifications({ taskId: task.id });
    expect(listResult.success).toBe(true);
    if (listResult.success) {
      expect(listResult.count).toBe(1);
    }
  });
});
