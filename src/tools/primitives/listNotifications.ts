import type {
  ListNotificationsInput,
  ListNotificationsResponse
} from '../../contracts/notification-tools/list-notifications.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * List notifications for a task.
 *
 * @param params - Input parameters: taskId or taskName (at least one required)
 * @returns Promise resolving to success response with notifications, or error
 */
export async function listNotifications(
  params: ListNotificationsInput
): Promise<ListNotificationsResponse> {
  const script = generateListNotificationsScript(params);
  const result = await executeOmniJS(script);
  return result as ListNotificationsResponse;
}

/**
 * Generate OmniJS script to list notifications for a task.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateListNotificationsScript(params: ListNotificationsInput): string {
  const { taskId, taskName } = params;

  const escapedId = taskId ? escapeForJS(taskId) : '';
  const escapedName = taskName ? escapeForJS(taskName) : '';

  return `(function() {
  try {
    var taskId = "${escapedId}";
    var taskName = "${escapedName}";
    var foundTask = null;

    // Validate we have at least one identifier
    if (!taskId && !taskName) {
      return JSON.stringify({
        success: false,
        error: "Either taskId or taskName must be provided"
      });
    }

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

      // Search in inbox (avoid duplicates)
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

    // Iterate notifications
    var notifications = [];
    var notifArray = foundTask.notifications;
    for (var n = 0; n < notifArray.length; n++) {
      var notif = notifArray[n];

      // Defensive kind detection
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

      // Compute nextFireDate safely
      var nextFireDate = null;
      try {
        if (notif.nextFireDate) {
          nextFireDate = notif.nextFireDate.toISOString();
        }
      } catch (nfdErr) {
        nextFireDate = null;
      }

      var notifData = {
        index: n,
        kind: kindStr,
        initialFireDate: notif.initialFireDate.toISOString(),
        nextFireDate: nextFireDate,
        isSnoozed: notif.isSnoozed || false,
        repeatInterval: notif.repeatInterval !== undefined && notif.repeatInterval !== null ? notif.repeatInterval : null
      };

      // Kind-conditional properties
      if (kindStr === "Absolute") {
        notifData.absoluteFireDate = notif.absoluteFireDate.toISOString();
      }
      if (kindStr === "DueRelative" || kindStr === "DeferRelative") {
        notifData.relativeFireOffset = notif.relativeFireOffset;
      }

      notifications.push(notifData);
    }

    return JSON.stringify({
      success: true,
      taskId: foundTask.id.primaryKey,
      taskName: foundTask.name,
      count: notifications.length,
      notifications: notifications
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
