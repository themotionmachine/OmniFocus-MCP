import {
  type SnoozeNotificationInput,
  type SnoozeNotificationResponse,
  SnoozeNotificationResponseSchema
} from '../../contracts/notification-tools/snooze-notification.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Snooze an Absolute notification on a task by updating its absoluteFireDate.
 *
 * Only Absolute notifications can be snoozed. DueRelative and DeferRelative
 * notifications are tied to their task's due/defer date and cannot have their
 * fire time changed independently.
 *
 * @param params - Input parameters including task identifier, notification index, and new date
 * @returns Promise resolving to success response or error
 */
export async function snoozeNotification(
  params: SnoozeNotificationInput
): Promise<SnoozeNotificationResponse> {
  // Pre-validate snoozeUntil on the TypeScript side before invoking OmniJS.
  // This provides fast feedback and avoids a round-trip for obviously invalid dates.
  const dateObj = new Date(params.snoozeUntil);
  if (Number.isNaN(dateObj.getTime())) {
    return {
      success: false,
      error: `Invalid snoozeUntil date: ${params.snoozeUntil}`
    };
  }

  const script = generateSnoozeNotificationScript(params);
  const result = await executeOmniJS(script);
  return SnoozeNotificationResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to snooze a notification on a task.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSnoozeNotificationScript(params: SnoozeNotificationInput): string {
  const { taskId, taskName, index, snoozeUntil } = params;

  const escapedTaskId = taskId ? escapeForJS(taskId) : '';
  const escapedTaskName = taskName ? escapeForJS(taskName) : '';
  const escapedSnoozeUntil = escapeForJS(snoozeUntil);

  return `(function() {
  try {
    var taskId = "${escapedTaskId}";
    var taskName = "${escapedTaskName}";
    var notifIndex = ${index};
    var snoozeUntil = "${escapedSnoozeUntil}";
    var foundTask = null;

    // Resolve task by ID (takes precedence over name)
    if (taskId && taskId.length > 0) {
      foundTask = Task.byIdentifier(taskId);
      if (!foundTask) {
        return JSON.stringify({
          success: false,
          error: "Task '" + taskId + "' not found"
        });
      }
    }
    // Fall back to name search with disambiguation
    else if (taskName && taskName.length > 0) {
      var matches = [];

      flattenedTasks.forEach(function(task) {
        if (task.name === taskName) {
          matches.push(task);
        }
      });

      inbox.forEach(function(task) {
        if (task.name === taskName) {
          var isDuplicate = false;
          for (var i = 0; i < matches.length; i++) {
            if (matches[i].id.primaryKey === task.id.primaryKey) {
              isDuplicate = true;
              break;
            }
          }
          if (!isDuplicate) {
            matches.push(task);
          }
        }
      });

      if (matches.length === 0) {
        return JSON.stringify({
          success: false,
          error: "Task '" + taskName + "' not found"
        });
      } else if (matches.length > 1) {
        var matchingIds = matches.map(function(t) {
          return t.id.primaryKey;
        });
        return JSON.stringify({
          success: false,
          error: "Multiple tasks match name '" + taskName + "'",
          code: "DISAMBIGUATION_REQUIRED",
          matchingIds: matchingIds
        });
      }

      foundTask = matches[0];
    } else {
      return JSON.stringify({
        success: false,
        error: "Either taskId or taskName must be provided"
      });
    }

    // Check that the task has notifications
    var notifications = foundTask.notifications;
    if (!notifications || notifications.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Task '" + foundTask.id.primaryKey + "' has no notifications"
      });
    }

    // Validate index bounds
    if (notifIndex >= notifications.length) {
      return JSON.stringify({
        success: false,
        error: "Notification index " + notifIndex + " out of bounds: task has " + notifications.length + " notification(s)"
      });
    }

    var notif = notifications[notifIndex];

    // Determine kind using defensive pattern (DeferRelative may not appear in enum listing)
    var kindStr;
    if (notif.kind === Task.Notification.Kind.Absolute) {
      kindStr = "Absolute";
    } else if (notif.kind === Task.Notification.Kind.DueRelative) {
      kindStr = "DueRelative";
    } else if (Task.Notification.Kind.DeferRelative && notif.kind === Task.Notification.Kind.DeferRelative) {
      kindStr = "DeferRelative";
    } else {
      kindStr = "Unknown";
    }

    // Only Absolute notifications can be snoozed
    if (kindStr !== "Absolute") {
      return JSON.stringify({
        success: false,
        error: "Cannot snooze notification at index " + notifIndex + ": only Absolute notifications can be snoozed (this notification is " + kindStr + ")"
      });
    }

    // Validate and parse the snooze date
    var dateObj = new Date(snoozeUntil);
    if (isNaN(dateObj.getTime())) {
      return JSON.stringify({
        success: false,
        error: "Invalid snoozeUntil date: '" + snoozeUntil + "'"
      });
    }

    // Set the new absoluteFireDate (this is the snooze operation)
    notif.absoluteFireDate = dateObj;

    // Read back the updated notification to return current state
    var updatedNotif = foundTask.notifications[notifIndex];

    var notifOutput = {
      index: notifIndex,
      kind: "Absolute",
      absoluteFireDate: updatedNotif.absoluteFireDate ? updatedNotif.absoluteFireDate.toISOString() : dateObj.toISOString(),
      initialFireDate: updatedNotif.initialFireDate ? updatedNotif.initialFireDate.toISOString() : dateObj.toISOString(),
      nextFireDate: updatedNotif.nextFireDate ? updatedNotif.nextFireDate.toISOString() : null,
      isSnoozed: updatedNotif.isSnoozed !== undefined ? updatedNotif.isSnoozed : true,
      repeatInterval: updatedNotif.repeatInterval !== undefined ? updatedNotif.repeatInterval : null
    };

    return JSON.stringify({
      success: true,
      taskId: foundTask.id.primaryKey,
      taskName: foundTask.name,
      notification: notifOutput
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
