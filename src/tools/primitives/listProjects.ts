import type {
  ListProjectsInput,
  ListProjectsResponse
} from '../../contracts/project-tools/list-projects.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * List projects with optional filtering.
 *
 * @param params - Input parameters for listing projects
 * @returns Promise resolving to list of projects or error
 */
export async function listProjects(params: ListProjectsInput): Promise<ListProjectsResponse> {
  const script = generateListProjectsScript(params);
  const tempFile = writeSecureTempFile(script, 'list_projects', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string) as ListProjectsResponse;
  } finally {
    tempFile.cleanup();
  }
}

/**
 * Generate OmniJS script to list projects with filtering.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateListProjectsScript(params: ListProjectsInput): string {
  const {
    folderId,
    folderName,
    status,
    reviewStatus = 'any',
    flagged,
    includeCompleted = false,
    dueBefore,
    dueAfter,
    deferBefore,
    deferAfter,
    limit = 100
  } = params;

  // Clamp limit to 1-1000 range
  const clampedLimit = Math.max(1, Math.min(1000, limit));

  // Escape strings for safe embedding in JS
  const escapedFolderId = folderId ? escapeForJS(folderId) : null;
  const escapedFolderName = folderName ? escapeForJS(folderName) : null;
  const escapedStatus = status?.length ? status.map(escapeForJS) : null;
  const escapedDueBefore = dueBefore ? escapeForJS(dueBefore) : null;
  const escapedDueAfter = dueAfter ? escapeForJS(dueAfter) : null;
  const escapedDeferBefore = deferBefore ? escapeForJS(deferBefore) : null;
  const escapedDeferAfter = deferAfter ? escapeForJS(deferAfter) : null;

  return `(function() {
  try {
    var results = [];
    var projectList;

    // Determine source of projects based on folder filter
    ${generateFolderFilter(escapedFolderId, escapedFolderName)}

    // Map project status to string
    function mapStatus(project) {
      var ps = project.status;
      if (ps === Project.Status.Active) return "Active";
      if (ps === Project.Status.OnHold) return "OnHold";
      if (ps === Project.Status.Done) return "Done";
      if (ps === Project.Status.Dropped) return "Dropped";
      return "Active"; // Unknown status defaults to Active
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

    // Helper to determine project type
    function getProjectType(project) {
      if (project.containsSingletonActions) return "single-actions";
      if (project.sequential) return "sequential";
      return "parallel";
    }

    // Status filter array
    ${escapedStatus ? `var filterStatus = ${JSON.stringify(escapedStatus)};` : 'var filterStatus = null;'}

    // Review status filter logic
    var reviewStatusFilter = "${reviewStatus}";
    var today = new Date();
    var sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    function passesReviewFilter(project) {
      if (reviewStatusFilter === "any") return true;

      var nextReview = project.nextReviewDate;
      if (!nextReview) return false; // Exclude projects without review date for 'due'/'upcoming'

      var reviewTime = nextReview.getTime();
      var nowTime = today.getTime();
      var sevenDaysTime = sevenDaysFromNow.getTime();

      if (reviewStatusFilter === "due") {
        return reviewTime <= nowTime; // Review is overdue or due today
      }
      if (reviewStatusFilter === "upcoming") {
        return reviewTime > nowTime && reviewTime <= sevenDaysTime; // Within next 7 days
      }
      return true;
    }

    // Process projects
    var count = 0;
    var maxResults = ${clampedLimit};

    projectList.forEach(function(project) {
      if (count >= maxResults) return;

      var statusStr = mapStatus(project);

      // Apply includeCompleted filter (excludes Done AND Dropped by default)
      ${
        !includeCompleted
          ? `if (statusStr === "Done" || statusStr === "Dropped") return;`
          : '// includeCompleted is true - include all projects'
      }

      // Apply status filter (OR logic if array provided)
      ${escapedStatus ? `if (filterStatus.indexOf(statusStr) === -1) return;` : '// No status filter'}

      // Apply flagged filter
      ${flagged !== undefined ? `if (project.flagged !== ${flagged}) return;` : '// No flagged filter'}

      // Apply date filters
      ${generateDateFilters(escapedDueAfter, escapedDueBefore, escapedDeferAfter, escapedDeferBefore)}

      // Apply review status filter
      if (!passesReviewFilter(project)) return;

      // Build result object matching ProjectSummary schema
      var folder = project.parentFolder;
      var rootTask = project.task;

      results.push({
        id: project.id.primaryKey,
        name: project.name,
        status: statusStr,
        flagged: project.flagged,
        projectType: getProjectType(project),
        deferDate: toISO(project.deferDate),
        dueDate: toISO(project.dueDate),
        nextReviewDate: toISO(project.nextReviewDate),
        parentFolderId: folder ? folder.id.primaryKey : null,
        parentFolderName: folder ? folder.name : null,
        taskCount: rootTask.tasks.length,
        remainingCount: rootTask.tasks.filter(function(t) {
          return t.taskStatus !== Task.Status.Completed && t.taskStatus !== Task.Status.Dropped;
        }).length
      });

      count++;
    });

    return JSON.stringify({ success: true, projects: results });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}

/**
 * Generate folder filter logic for the OmniJS script.
 */
function generateFolderFilter(folderId: string | null, folderName: string | null): string {
  // Priority: folderId > folderName > all projects
  if (folderId) {
    return `
    // Filter by folder ID (includes nested subfolders)
    var folder = Folder.byIdentifier("${folderId}");
    if (!folder) {
      return JSON.stringify({
        success: false,
        error: "Folder '${folderId}' not found"
      });
    }
    projectList = folder.flattenedProjects;
    `;
  }

  if (folderName) {
    return `
    // Filter by folder name (includes nested subfolders)
    var folder = flattenedFolders.byName("${folderName}");
    if (!folder) {
      return JSON.stringify({
        success: false,
        error: "Folder '${folderName}' not found"
      });
    }
    projectList = folder.flattenedProjects;
    `;
  }

  // Default: all projects
  return `
    // No folder filter - get all projects
    projectList = flattenedProjects;
    `;
}

/**
 * Generate date filter logic for the OmniJS script.
 */
function generateDateFilters(
  dueAfter: string | null,
  dueBefore: string | null,
  deferAfter: string | null,
  deferBefore: string | null
): string {
  const filters: string[] = [];

  if (dueAfter || dueBefore) {
    filters.push(`
      // Due date filter
      if (!dateInRange(project.dueDate, ${dueAfter ? `"${dueAfter}"` : 'null'}, ${dueBefore ? `"${dueBefore}"` : 'null'})) return;
    `);
  }

  if (deferAfter || deferBefore) {
    filters.push(`
      // Defer date filter
      if (!dateInRange(project.deferDate, ${deferAfter ? `"${deferAfter}"` : 'null'}, ${deferBefore ? `"${deferBefore}"` : 'null'})) return;
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
