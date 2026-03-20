import {
  type GetDatabaseStatsResponse,
  GetDatabaseStatsResponseSchema
} from '../../contracts/database-tools/get-database-stats.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Get aggregate database statistics.
 *
 * @returns Promise resolving to database stats or error
 */
export async function getDatabaseStats(): Promise<GetDatabaseStatsResponse> {
  const script = generateGetDatabaseStatsScript();
  try {
    const result = GetDatabaseStatsResponseSchema.parse(await executeOmniJS(script));
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('Error in getDatabaseStats', 'getDatabaseStats', { error });
    return { success: false, error };
  }
}

/**
 * Generate OmniJS script to get database statistics.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateGetDatabaseStatsScript(): string {
  return `(function() {
  try {
    // Task stats
    var available = 0;
    var blocked = 0;
    var completed = 0;
    var dropped = 0;

    flattenedTasks.forEach(function(task) {
      // Skip root tasks of projects
      if (task.containingProject !== null) {
        if (task.id.primaryKey === task.containingProject.id.primaryKey) {
          return;
        }
      }

      var s = task.taskStatus;
      if (s === Task.Status.Completed) {
        completed++;
      } else if (s === Task.Status.Dropped) {
        dropped++;
      } else if (s === Task.Status.Blocked) {
        blocked++;
      } else {
        // Available, DueSoon, Next, Overdue
        available++;
      }
    });

    // Project stats
    var projActive = 0;
    var projOnHold = 0;
    var projCompleted = 0;
    var projDropped = 0;

    flattenedProjects.forEach(function(project) {
      var s = project.status;
      if (s === Project.Status.Active) projActive++;
      else if (s === Project.Status.OnHold) projOnHold++;
      else if (s === Project.Status.Done) projCompleted++;
      else if (s === Project.Status.Dropped) projDropped++;
    });

    return JSON.stringify({
      success: true,
      tasks: {
        available: available,
        blocked: blocked,
        completed: completed,
        dropped: dropped,
        total: available + blocked + completed + dropped
      },
      projects: {
        active: projActive,
        onHold: projOnHold,
        completed: projCompleted,
        dropped: projDropped,
        total: projActive + projOnHold + projCompleted + projDropped
      },
      folders: flattenedFolders.length,
      tags: flattenedTags.length,
      inbox: inbox.length
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
