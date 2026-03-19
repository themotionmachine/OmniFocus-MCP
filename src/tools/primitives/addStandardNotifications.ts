import {
  type AddStandardNotificationsInput,
  type AddStandardNotificationsResponse,
  AddStandardNotificationsResponseSchema
} from '../../contracts/notification-tools/add-standard-notifications.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Add standard preset notifications to a task in OmniFocus.
 *
 * Resolves the task by ID or name, then applies one or more relative
 * notifications based on the chosen preset. Requires the task to have
 * an effectiveDueDate since all preset notifications are DueRelative.
 *
 * The operation is additive: existing notifications are preserved and
 * only the newly added notifications are returned.
 *
 * @param params - Input parameters (task identifier + preset name)
 * @returns Promise resolving to success or error response
 */
export async function addStandardNotifications(
  params: AddStandardNotificationsInput
): Promise<AddStandardNotificationsResponse> {
  const script = generateAddStandardNotificationsScript(params);
  const result = await executeOmniJS(script);
  return AddStandardNotificationsResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to add preset notifications to a task.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateAddStandardNotificationsScript(
  params: AddStandardNotificationsInput
): string {
  const taskId = params.taskId ?? '';
  const taskName = params.taskName ?? '';
  const preset = params.preset;

  const escapedTaskId = escapeForJS(taskId);
  const escapedTaskName = escapeForJS(taskName);
  const escapedPreset = escapeForJS(preset);

  return `(function() {
  try {
    var taskId = "${escapedTaskId}";
    var taskName = "${escapedTaskName}";
    var preset = "${escapedPreset}";
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

    // Map preset to offset seconds array
    var presetMap = {
      'day_before': [-86400],
      'hour_before': [-3600],
      '15_minutes': [-900],
      'week_before': [-604800],
      'standard': [-86400, -3600]
    };

    var offsets = presetMap[preset];
    if (!offsets) {
      return JSON.stringify({
        success: false,
        error: "Unknown preset: '" + preset + "'"
      });
    }

    // Require effectiveDueDate since all presets are due-relative
    if (!task.effectiveDueDate) {
      return JSON.stringify({
        success: false,
        error: "Task '" + task.id.primaryKey + "' has no due date; cannot add relative notifications"
      });
    }

    // Record count before adding so we can read back only the new notifications
    var beforeCount = task.notifications.length;

    // Add each notification offset
    for (var i = 0; i < offsets.length; i++) {
      task.addNotification(offsets[i]);
    }

    // Read back the newly added notifications (from beforeCount to end)
    var addedNotifs = [];
    for (var j = beforeCount; j < task.notifications.length; j++) {
      var notif = task.notifications[j];

      // Detect kind
      var kindStr;
      if (notif.kind === Task.Notification.Kind.Absolute) {
        kindStr = 'Absolute';
      } else if (notif.kind === Task.Notification.Kind.DueRelative) {
        kindStr = 'DueRelative';
      } else if (typeof Task.Notification.Kind.DeferRelative !== 'undefined' &&
                 notif.kind === Task.Notification.Kind.DeferRelative) {
        kindStr = 'DeferRelative';
      } else {
        kindStr = 'Unknown';
      }

      var notifData = {
        index: j,
        kind: kindStr,
        initialFireDate: notif.initialFireDate.toISOString(),
        nextFireDate: notif.nextFireDate ? notif.nextFireDate.toISOString() : null,
        isSnoozed: notif.isSnoozed || false,
        repeatInterval: notif.repeatInterval > 0 ? notif.repeatInterval : null
      };

      // Add kind-specific fields (always present for their respective kinds)
      if (kindStr === 'Absolute') {
        notifData.absoluteFireDate = notif.absoluteFireDate.toISOString();
      } else if (kindStr === 'DueRelative' || kindStr === 'DeferRelative') {
        notifData.relativeFireOffset = notif.relativeFireOffset;
      }

      addedNotifs.push(notifData);
    }

    return JSON.stringify({
      success: true,
      taskId: task.id.primaryKey,
      taskName: task.name,
      addedCount: addedNotifs.length,
      notifications: addedNotifs
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
