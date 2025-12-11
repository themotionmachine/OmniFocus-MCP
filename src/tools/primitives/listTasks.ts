import type { ListTasksInput, ListTasksResponse } from '../../contracts/task-tools/list-tasks.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * List tasks with optional filtering.
 *
 * @param params - Input parameters for listing tasks
 * @returns Promise resolving to list of tasks or error
 */
export async function listTasks(params: ListTasksInput): Promise<ListTasksResponse> {
  const script = generateListTasksScript(params);
  const tempFile = writeSecureTempFile(script, 'list_tasks', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string) as ListTasksResponse;
  } finally {
    tempFile.cleanup();
  }
}

/**
 * Generate OmniJS script to list tasks with filtering.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateListTasksScript(params: ListTasksInput): string {
  const {
    projectId,
    projectName,
    folderId,
    folderName,
    tagIds,
    tagNames,
    tagFilterMode = 'any',
    status,
    flagged,
    includeCompleted = false,
    dueBefore,
    dueAfter,
    deferBefore,
    deferAfter,
    plannedBefore,
    plannedAfter,
    completedBefore,
    completedAfter,
    limit = 100,
    flatten = true
  } = params;

  // Escape strings for safe embedding in JS
  const escapedProjectId = projectId ? escapeForJS(projectId) : null;
  const escapedProjectName = projectName ? escapeForJS(projectName) : null;
  const escapedFolderId = folderId ? escapeForJS(folderId) : null;
  const escapedFolderName = folderName ? escapeForJS(folderName) : null;
  const escapedTagIds = tagIds?.length ? tagIds.map(escapeForJS) : null;
  const escapedTagNames = tagNames?.length ? tagNames.map(escapeForJS) : null;
  const escapedStatus = status?.length ? status.map(escapeForJS) : null;
  const escapedDueBefore = dueBefore ? escapeForJS(dueBefore) : null;
  const escapedDueAfter = dueAfter ? escapeForJS(dueAfter) : null;
  const escapedDeferBefore = deferBefore ? escapeForJS(deferBefore) : null;
  const escapedDeferAfter = deferAfter ? escapeForJS(deferAfter) : null;
  const escapedPlannedBefore = plannedBefore ? escapeForJS(plannedBefore) : null;
  const escapedPlannedAfter = plannedAfter ? escapeForJS(plannedAfter) : null;
  const escapedCompletedBefore = completedBefore ? escapeForJS(completedBefore) : null;
  const escapedCompletedAfter = completedAfter ? escapeForJS(completedAfter) : null;

  return `(function() {
  try {
    var results = [];
    var taskList;
    var container = null;

    // Determine source of tasks based on container filters
    ${generateContainerFilter(escapedProjectId, escapedProjectName, escapedFolderId, escapedFolderName, flatten)}

    // Map task status to string
    function mapStatus(task) {
      var ts = task.taskStatus;
      if (ts === Task.Status.Available) return "Available";
      if (ts === Task.Status.Blocked) return "Blocked";
      if (ts === Task.Status.Completed) return "Completed";
      if (ts === Task.Status.Dropped) return "Dropped";
      if (ts === Task.Status.DueSoon) return "DueSoon";
      if (ts === Task.Status.Next) return "Next";
      if (ts === Task.Status.Overdue) return "Overdue";
      return "Blocked"; // Unknown status defaults to Blocked
    }

    // Helper to format date as ISO string
    function toISO(d) {
      return d ? d.toISOString() : null;
    }

    // Helper to check date bounds
    function dateInRange(dateVal, afterStr, beforeStr) {
      if (!dateVal) return false; // Null dates excluded from date filters
      var dt = dateVal.getTime();
      if (afterStr && dt < new Date(afterStr).getTime()) return false;
      if (beforeStr && dt > new Date(beforeStr).getTime()) return false;
      return true;
    }

    // Tag filter arrays
    ${escapedTagIds ? `var filterTagIds = ${JSON.stringify(escapedTagIds)};` : 'var filterTagIds = null;'}
    ${escapedTagNames ? `var filterTagNames = ${JSON.stringify(escapedTagNames)};` : 'var filterTagNames = null;'}
    var tagMode = "${tagFilterMode}";

    // Helper to check tag filters
    function passesTagFilter(task) {
      if (!filterTagIds && !filterTagNames) return true;

      var taskTagIds = task.tags.map(function(t) { return t.id.primaryKey; });
      var taskTagNames = task.tags.map(function(t) { return t.name; });

      var allFilters = [];
      if (filterTagIds) allFilters = allFilters.concat(filterTagIds);
      if (filterTagNames) allFilters = allFilters.concat(filterTagNames);

      if (tagMode === "all") {
        // AND logic: task must have ALL specified tags
        for (var i = 0; i < allFilters.length; i++) {
          var f = allFilters[i];
          if (taskTagIds.indexOf(f) === -1 && taskTagNames.indexOf(f) === -1) {
            return false;
          }
        }
        return true;
      } else {
        // OR logic (default): task must have ANY specified tag
        for (var i = 0; i < allFilters.length; i++) {
          var f = allFilters[i];
          if (taskTagIds.indexOf(f) !== -1 || taskTagNames.indexOf(f) !== -1) {
            return true;
          }
        }
        return false;
      }
    }

    // Status filter array
    ${escapedStatus ? `var filterStatus = ${JSON.stringify(escapedStatus)};` : 'var filterStatus = null;'}

    // Process tasks
    var count = 0;
    var maxResults = ${limit};

    taskList.forEach(function(task) {
      if (count >= maxResults) return;

      var statusStr = mapStatus(task);

      // Apply includeCompleted filter (excludes Completed AND Dropped by default)
      ${
        !includeCompleted
          ? `if (statusStr === "Completed" || statusStr === "Dropped") return;`
          : '// includeCompleted is true - include all tasks'
      }

      // Apply status filter
      ${escapedStatus ? `if (filterStatus.indexOf(statusStr) === -1) return;` : '// No status filter'}

      // Apply flagged filter
      ${flagged !== undefined ? `if (task.flagged !== ${flagged}) return;` : '// No flagged filter'}

      // Apply date filters
      ${generateDateFilters(escapedDueAfter, escapedDueBefore, escapedDeferAfter, escapedDeferBefore, escapedPlannedAfter, escapedPlannedBefore, escapedCompletedAfter, escapedCompletedBefore)}

      // Apply tag filter
      if (!passesTagFilter(task)) return;

      // Build result object matching TaskSummary schema
      var proj = task.containingProject;
      results.push({
        id: task.id.primaryKey,
        name: task.name,
        taskStatus: statusStr,
        flagged: task.flagged,
        deferDate: toISO(task.deferDate),
        dueDate: toISO(task.dueDate),
        plannedDate: task.plannedDate !== undefined ? toISO(task.plannedDate) : null,
        projectId: proj ? proj.id.primaryKey : null,
        projectName: proj ? proj.name : null,
        tagIds: task.tags.map(function(t) { return t.id.primaryKey; }),
        tagNames: task.tags.map(function(t) { return t.name; })
      });

      count++;
    });

    return JSON.stringify({ success: true, tasks: results });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}

/**
 * Generate container filter logic for the OmniJS script.
 */
function generateContainerFilter(
  projectId: string | null,
  projectName: string | null,
  folderId: string | null,
  folderName: string | null,
  flatten: boolean
): string {
  // Priority: projectId > projectName > folderId > folderName > all tasks
  if (projectId) {
    return `
    // Filter by project ID
    var project = Project.byIdentifier("${projectId}");
    if (!project) {
      return JSON.stringify({
        success: false,
        error: "Project '${projectId}' not found"
      });
    }
    container = project;
    taskList = ${flatten ? 'project.flattenedTasks' : 'project.tasks'};
    `;
  }

  if (projectName) {
    return `
    // Filter by project name
    var project = flattenedProjects.byName("${projectName}");
    if (!project) {
      return JSON.stringify({
        success: false,
        error: "Project '${projectName}' not found"
      });
    }
    container = project;
    taskList = ${flatten ? 'project.flattenedTasks' : 'project.tasks'};
    `;
  }

  if (folderId) {
    return `
    // Filter by folder ID (includes all nested projects)
    var folder = Folder.byIdentifier("${folderId}");
    if (!folder) {
      return JSON.stringify({
        success: false,
        error: "Folder '${folderId}' not found"
      });
    }
    container = folder;
    taskList = ${flatten ? 'folder.flattenedTasks' : 'folder.tasks'};
    `;
  }

  if (folderName) {
    return `
    // Filter by folder name (includes nested projects)
    var folder = flattenedFolders.byName("${folderName}");
    if (!folder) {
      return JSON.stringify({
        success: false,
        error: "Folder '${folderName}' not found"
      });
    }
    container = folder;
    taskList = ${flatten ? 'folder.flattenedTasks' : 'folder.tasks'};
    `;
  }

  // Default: all tasks
  return `
    // No container filter - get all tasks
    taskList = ${flatten ? 'flattenedTasks' : 'tasks'};
    `;
}

/**
 * Generate date filter logic for the OmniJS script.
 */
function generateDateFilters(
  dueAfter: string | null,
  dueBefore: string | null,
  deferAfter: string | null,
  deferBefore: string | null,
  plannedAfter: string | null,
  plannedBefore: string | null,
  completedAfter: string | null,
  completedBefore: string | null
): string {
  const filters: string[] = [];

  if (dueAfter || dueBefore) {
    filters.push(`
      // Due date filter
      if (!dateInRange(task.dueDate, ${dueAfter ? `"${dueAfter}"` : 'null'}, ${dueBefore ? `"${dueBefore}"` : 'null'})) return;
    `);
  }

  if (deferAfter || deferBefore) {
    filters.push(`
      // Defer date filter
      if (!dateInRange(task.deferDate, ${deferAfter ? `"${deferAfter}"` : 'null'}, ${deferBefore ? `"${deferBefore}"` : 'null'})) return;
    `);
  }

  if (plannedAfter || plannedBefore) {
    filters.push(`
      // Planned date filter (v4.7+)
      if (task.plannedDate !== undefined) {
        if (!dateInRange(task.plannedDate, ${plannedAfter ? `"${plannedAfter}"` : 'null'}, ${plannedBefore ? `"${plannedBefore}"` : 'null'})) return;
      }
    `);
  }

  if (completedAfter || completedBefore) {
    filters.push(`
      // Completed date filter
      if (!dateInRange(task.completionDate, ${completedAfter ? `"${completedAfter}"` : 'null'}, ${completedBefore ? `"${completedBefore}"` : 'null'})) return;
    `);
  }

  return filters.length > 0 ? filters.join('\n') : '// No date filters';
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
