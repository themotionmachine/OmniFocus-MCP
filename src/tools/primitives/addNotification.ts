import {
  type AddNotificationInput,
  type AddNotificationResponse,
  AddNotificationResponseSchema
} from '../../contracts/notification-tools/add-notification.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Add a notification to a task in OmniFocus.
 *
 * Supports two notification types:
 * - "absolute": fires at a specific date/time
 * - "relative": fires relative to the task's effectiveDueDate
 *
 * TypeScript validates the dateTime string before generating the OmniJS script
 * to provide clear error messages without hitting OmniFocus.
 *
 * @param params - Input parameters (discriminated union on `type`)
 * @returns Promise resolving to success or error response
 */
export async function addNotification(
  params: AddNotificationInput
): Promise<AddNotificationResponse> {
  // Pre-validate dateTime on the TypeScript side before generating OmniJS
  if (params.type === 'absolute') {
    const d = new Date(params.dateTime);
    if (Number.isNaN(d.getTime())) {
      return {
        success: false,
        error: `Invalid dateTime: "${params.dateTime}". Must be a valid ISO 8601 date string.`
      };
    }
  }

  const script = generateAddNotificationScript(params);
  const result = await executeOmniJS(script);
  return AddNotificationResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to add a notification to a task.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateAddNotificationScript(params: AddNotificationInput): string {
  const taskId = params.taskId ?? '';
  const taskName = params.taskName ?? '';

  const escapedTaskId = escapeForJS(taskId);
  const escapedTaskName = escapeForJS(taskName);

  // Build the type-specific notification logic
  let notificationBlock: string;

  if (params.type === 'absolute') {
    const escapedDateTime = escapeForJS(params.dateTime);
    notificationBlock = `
    // Absolute notification — fires at a specific date/time
    var dateObj = new Date("${escapedDateTime}");
    if (isNaN(dateObj.getTime())) {
      return JSON.stringify({
        success: false,
        error: "Invalid dateTime: \\"${escapedDateTime}\\""
      });
    }
    task.addNotification(dateObj);`;
  } else {
    // relative
    const offsetSeconds = params.offsetSeconds;
    notificationBlock = `
    // Relative notification — fires relative to task's effectiveDueDate
    if (!task.effectiveDueDate) {
      return JSON.stringify({
        success: false,
        error: "Task '" + task.id.primaryKey + "' has no due date; cannot add relative notification"
      });
    }
    task.addNotification(${offsetSeconds});`;
  }

  return `(function() {
  try {
    var taskId = "${escapedTaskId}";
    var taskName = "${escapedTaskName}";
    var task = null;

    // Resolve task by ID (takes precedence) or by name
    if (taskId && taskId.length > 0) {
      task = Task.byIdentifier(taskId);
      if (!task) {
        return JSON.stringify({
          success: false,
          error: "Task '" + taskId + "' not found"
        });
      }
    } else if (taskName && taskName.length > 0) {
      var matches = [];

      // Search flattenedTasks
      flattenedTasks.forEach(function(t) {
        if (t.name === taskName) {
          matches.push(t);
        }
      });

      // Search inbox (avoid duplicates)
      inbox.forEach(function(t) {
        if (t.name === taskName) {
          var isDuplicate = false;
          for (var i = 0; i < matches.length; i++) {
            if (matches[i].id.primaryKey === t.id.primaryKey) {
              isDuplicate = true;
              break;
            }
          }
          if (!isDuplicate) {
            matches.push(t);
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

      task = matches[0];
    } else {
      return JSON.stringify({
        success: false,
        error: "Either taskId or taskName must be provided"
      });
    }
${notificationBlock}

    // Read back the newly added notification (last in array)
    var notifications = task.notifications;
    if (!notifications || notifications.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Notification was not created (task.notifications is empty after add)"
      });
    }

    var notif = notifications[notifications.length - 1];
    var kind = "Unknown";
    if (notif.kind === Task.Notification.Kind.Absolute) {
      kind = "Absolute";
    } else if (notif.kind === Task.Notification.Kind.DueRelative) {
      kind = "DueRelative";
    } else if (typeof Task.Notification.Kind.DeferRelative !== "undefined" &&
               notif.kind === Task.Notification.Kind.DeferRelative) {
      kind = "DeferRelative";
    }

    var notifData = {
      index: notifications.length - 1,
      kind: kind,
      initialFireDate: notif.initialFireDate.toISOString(),
      nextFireDate: notif.nextFireDate ? notif.nextFireDate.toISOString() : null,
      isSnoozed: notif.isSnoozed || false,
      repeatInterval: notif.repeatInterval > 0 ? notif.repeatInterval : null
    };

    // Add kind-specific fields (always present for their respective kinds)
    if (kind === "Absolute") {
      notifData.absoluteFireDate = notif.absoluteFireDate.toISOString();
    } else if (kind === "DueRelative" || kind === "DeferRelative") {
      notifData.relativeFireOffset = notif.relativeFireOffset;
    }

    return JSON.stringify({
      success: true,
      taskId: task.id.primaryKey,
      taskName: task.name,
      notification: notifData
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
