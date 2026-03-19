import type {
  SearchTasksInput,
  SearchTasksResponse
} from '../../contracts/search-tools/search-tasks.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Search tasks by name using case-insensitive substring matching.
 *
 * @param params - Search query, limit, and optional status filter
 * @returns Promise resolving to matching tasks or error
 */
export async function searchTasks(params: SearchTasksInput): Promise<SearchTasksResponse> {
  const script = generateSearchTasksScript(params);
  const result = await executeOmniJS(script);
  return result as SearchTasksResponse;
}

/**
 * Generate OmniJS script to search tasks by name.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSearchTasksScript(params: SearchTasksInput): string {
  const { query, limit = 50, status = 'active' } = params;

  const escapedQuery = escapeForJS(query);

  return `(function() {
  try {
    var query = "${escapedQuery}";
    var limit = ${limit};
    var statusFilter = "${status}";

    var queryLower = query.toLowerCase();

    var matches = flattenedTasks.filter(function(task) {
      // Skip root tasks of projects (they represent the project itself)
      if (task.containingProject !== null) {
        if (task.id.primaryKey === task.containingProject.id.primaryKey) {
          return false;
        }
      }

      // Name match (case-insensitive substring)
      if (!task.name.toLowerCase().includes(queryLower)) {
        return false;
      }

      // Status filter
      var status = task.taskStatus;
      if (statusFilter === "active") {
        return (
          status === Task.Status.Available ||
          status === Task.Status.Blocked ||
          status === Task.Status.DueSoon ||
          status === Task.Status.Next ||
          status === Task.Status.Overdue
        );
      } else if (statusFilter === "completed") {
        return status === Task.Status.Completed;
      } else if (statusFilter === "dropped") {
        return status === Task.Status.Dropped;
      }
      // "all" - no status filter
      return true;
    });

    var totalMatches = matches.length;
    var limited = matches.slice(0, limit);

    function mapTaskStatus(task) {
      var s = task.taskStatus;
      if (s === Task.Status.Available) return "available";
      if (s === Task.Status.Blocked) return "blocked";
      if (s === Task.Status.Completed) return "completed";
      if (s === Task.Status.Dropped) return "dropped";
      if (s === Task.Status.DueSoon) return "dueSoon";
      if (s === Task.Status.Next) return "next";
      if (s === Task.Status.Overdue) return "overdue";
      return "available";
    }

    var results = limited.map(function(task) {
      var projectName = null;
      if (task.inInbox) {
        projectName = "Inbox";
      } else if (task.containingProject) {
        projectName = task.containingProject.name;
      }

      return {
        id: task.id.primaryKey,
        name: task.name,
        status: mapTaskStatus(task),
        projectName: projectName,
        flagged: task.flagged
      };
    });

    return JSON.stringify({
      success: true,
      results: results,
      totalMatches: totalMatches
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
