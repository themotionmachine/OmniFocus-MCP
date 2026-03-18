import type {
  RemoveNotificationInput,
  RemoveNotificationResponse
} from '../../contracts/notification-tools/remove-notification.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Remove a specific notification from a task by its 0-based index.
 *
 * @param params - Input parameters identifying the task and notification index
 * @returns Promise resolving to success response or error
 */
export async function removeNotification(
  params: RemoveNotificationInput
): Promise<RemoveNotificationResponse> {
  const script = generateRemoveNotificationScript(params);
  const result = await executeOmniJS(script);
  return result as RemoveNotificationResponse;
}

/**
 * Generate OmniJS script to remove a notification from a task.
 * Exported for manual testing in OmniFocus Script Editor.
 *
 * CRITICAL: removeNotification() takes an OBJECT, not an index.
 * Must retrieve notification object before removing.
 */
export function generateRemoveNotificationScript(params: RemoveNotificationInput): string {
  const { taskId, taskName, index } = params;

  const escapedTaskId = taskId ? escapeForJS(taskId) : '';
  const escapedTaskName = taskName ? escapeForJS(taskName) : '';

  return `(function() {
  try {
    var taskId = "${escapedTaskId}";
    var taskName = "${escapedTaskName}";
    var notifIndex = ${index};
    var foundTask = null;

    // Find task by ID (takes precedence over name)
    if (taskId && taskId.length > 0) {
      foundTask = Task.byIdentifier(taskId);
      if (!foundTask) {
        return JSON.stringify({
          success: false,
          error: "Task '" + taskId + "' not found"
        });
      }
    }
    // Fall back to name search
    else if (taskName && taskName.length > 0) {
      var matches = [];

      // Search in flattenedTasks
      flattenedTasks.forEach(function(task) {
        if (task.name === taskName) {
          matches.push(task);
        }
      });

      // Search in inbox (deduplicated)
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
    }

    // Validate task has notifications
    var notifications = foundTask.notifications;
    if (notifications.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Task has no notifications to remove"
      });
    }

    // Validate index is in range
    if (notifIndex >= notifications.length) {
      return JSON.stringify({
        success: false,
        error: "Notification index " + notifIndex + " is out of bounds (task has " + notifications.length + " notifications, valid range: 0 to " + (notifications.length - 1) + ")"
      });
    }

    // Retrieve notification object and remove it (removeNotification takes object, not index)
    var notifToRemove = notifications[notifIndex];
    foundTask.removeNotification(notifToRemove);

    return JSON.stringify({
      success: true,
      taskId: foundTask.id.primaryKey,
      taskName: foundTask.name,
      removedIndex: notifIndex,
      remainingCount: foundTask.notifications.length
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}

/**
 * Escape string for safe embedding in JavaScript.
 */
function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
