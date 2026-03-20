import type { ExportTaskpaperResponse } from '../../contracts/taskpaper-tools/export-taskpaper.js';
import { ExportTaskpaperResponseSchema } from '../../contracts/taskpaper-tools/export-taskpaper.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/** Inferred input type matching what callers provide after Zod parsing */
interface ExportParams {
  projectId?: string | undefined;
  folderId?: string | undefined;
  taskIds?: string[] | undefined;
  status: string;
}

/**
 * Export tasks/projects/folders to TaskPaper transport text.
 *
 * @param params - Scope (projectId, folderId, or taskIds) and status filter
 * @returns Promise resolving to transport text or error
 */
export async function exportTaskpaper(params: ExportParams): Promise<ExportTaskpaperResponse> {
  const script = generateExportScript(params);
  const result = await executeOmniJS(script);

  if (!result) {
    return {
      success: false,
      error: 'OmniJS script returned empty output — possible silent failure'
    };
  }

  return ExportTaskpaperResponseSchema.parse(result);
}

/**
 * Generate OmniJS script for exporting to transport text.
 * Exported for testing and manual verification in OmniFocus Script Editor.
 */
export function generateExportScript(params: ExportParams): string {
  const statusFilter = params.status || 'active';

  // Build the scope resolution block
  let scopeBlock: string;
  if (params.projectId) {
    scopeBlock = `
    var project = Project.byIdentifier("${params.projectId}");
    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found: ${params.projectId}" });
    }
    var rootTasks = project.task.children;
    var scopeType = "project";`;
  } else if (params.folderId) {
    scopeBlock = `
    var folder = Folder.byIdentifier("${params.folderId}");
    if (!folder) {
      return JSON.stringify({ success: false, error: "Folder not found: ${params.folderId}" });
    }
    // Collect all projects in this folder recursively
    var allProjects = [];
    function collectProjects(f) {
      var projs = f.projects;
      for (var i = 0; i < projs.length; i++) {
        allProjects.push(projs[i]);
      }
      var subfolders = f.folders;
      for (var j = 0; j < subfolders.length; j++) {
        collectProjects(subfolders[j]);
      }
    }
    collectProjects(folder);
    var scopeType = "folder";`;
  } else if (params.taskIds) {
    const idsArray = JSON.stringify(params.taskIds);
    scopeBlock = `
    var taskIdList = ${idsArray};
    var resolvedTasks = [];
    for (var i = 0; i < taskIdList.length; i++) {
      var t = Task.byIdentifier(taskIdList[i]);
      if (!t) {
        return JSON.stringify({ success: false, error: "Task not found: " + taskIdList[i] });
      }
      resolvedTasks.push(t);
    }
    var scopeType = "taskIds";`;
  } else {
    scopeBlock = `
    return JSON.stringify({ success: false, error: "No export scope provided" });`;
  }

  return `(function() {
  try {
    ${scopeBlock}

    var statusFilter = "${statusFilter}";
    var lines = [];
    var taskCount = 0;
    var projectCount = 0;
    var maxDepth = 0;
    var warnings = [];
    var lineNumber = 0;

    function formatDate(d) {
      if (!d) return null;
      var y = d.getFullYear();
      var m = (d.getMonth() + 1);
      var day = d.getDate();
      return y + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
    }

    function matchesStatus(task) {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return task.taskStatus === Task.Status.Available || task.taskStatus === Task.Status.Blocked || task.taskStatus === Task.Status.Next;
      if (statusFilter === "completed") return task.taskStatus === Task.Status.Completed;
      if (statusFilter === "dropped") return task.taskStatus === Task.Status.Dropped;
      return true;
    }

    function serializeTask(task, depth) {
      if (!matchesStatus(task)) return;

      var indent = "";
      for (var d = 0; d < depth; d++) indent += "\\t";

      if (depth > maxDepth) maxDepth = depth;
      lineNumber++;

      var line = indent + "- " + (task.name || "");

      if (!task.name || task.name.trim() === "") {
        warnings.push({ line: lineNumber, message: "Empty task name", content: line.trim() });
      }

      if (task.flagged) line += " @flagged";

      // Tags
      var tagNames = [];
      var tags = task.tags;
      for (var t = 0; t < tags.length; t++) {
        tagNames.push(tags[t].name);
      }
      if (tagNames.length > 0) line += " @tags(" + tagNames.join(", ") + ")";

      // Dates
      var deferStr = formatDate(task.deferDate);
      if (deferStr) line += " @defer(" + deferStr + ")";

      var dueStr = formatDate(task.dueDate);
      if (dueStr) line += " @due(" + dueStr + ")";

      // Estimate
      if (task.estimatedMinutes !== null && task.estimatedMinutes !== undefined && task.estimatedMinutes > 0) {
        line += " @estimate(" + task.estimatedMinutes + "m)";
      }

      // Done
      if (task.taskStatus === Task.Status.Completed && task.completionDate) {
        var doneStr = formatDate(task.completionDate);
        if (doneStr) line += " @done(" + doneStr + ")";
      }

      // Note
      if (task.note && task.note.trim().length > 0) {
        line += " //" + task.note.replace(/\\n/g, " ");
      }

      lines.push(line);
      taskCount++;

      // Recurse into children
      var children = task.children;
      for (var c = 0; c < children.length; c++) {
        serializeTask(children[c], depth + 1);
      }
    }

    if (scopeType === "project") {
      for (var i = 0; i < rootTasks.length; i++) {
        serializeTask(rootTasks[i], 0);
      }
    } else if (scopeType === "folder") {
      for (var p = 0; p < allProjects.length; p++) {
        var proj = allProjects[p];
        lineNumber++;
        lines.push(proj.name + ":");
        projectCount++;
        var projTasks = proj.task.children;
        for (var pt = 0; pt < projTasks.length; pt++) {
          serializeTask(projTasks[pt], 1);
        }
      }
    } else if (scopeType === "taskIds") {
      for (var ri = 0; ri < resolvedTasks.length; ri++) {
        serializeTask(resolvedTasks[ri], 0);
      }
    }

    return JSON.stringify({
      success: true,
      transportText: lines.join("\\n"),
      summary: {
        totalItems: taskCount + projectCount,
        tasks: taskCount,
        projects: projectCount,
        maxDepth: maxDepth
      },
      warnings: warnings
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
