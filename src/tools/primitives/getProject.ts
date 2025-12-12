import type {
  GetProjectInput,
  GetProjectResponse
} from '../../contracts/project-tools/get-project.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Get a single project by ID or name.
 *
 * @param params - Input parameters for getting a project
 * @returns Promise resolving to project details or error
 */
export async function getProject(params: GetProjectInput): Promise<GetProjectResponse> {
  const script = generateGetProjectScript(params);
  const tempFile = writeSecureTempFile(script, 'get_project', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string) as GetProjectResponse;
  } finally {
    tempFile.cleanup();
  }
}

/**
 * Generate OmniJS script to get a project by ID or name.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateGetProjectScript(params: GetProjectInput): string {
  const { id, name } = params;

  // Escape strings for safe embedding in JS
  const escapedId = id ? escapeForJS(id) : null;
  const escapedName = name ? escapeForJS(name) : null;

  return `(function() {
  try {
    var project = null;

    // ID takes precedence over name
    ${
      escapedId
        ? `
    // Find by ID
    project = Project.byIdentifier("${escapedId}");
    if (!project) {
      return JSON.stringify({
        success: false,
        error: "Project '${escapedId}' not found"
      });
    }
    `
        : escapedName
          ? `
    // Find by name
    var matchingProjects = flattenedProjects.filter(function(p) {
      return p.name === "${escapedName}";
    });

    if (matchingProjects.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Project '${escapedName}' not found"
      });
    }

    if (matchingProjects.length > 1) {
      return JSON.stringify({
        success: false,
        error: "Multiple projects match name '${escapedName}'",
        code: "DISAMBIGUATION_REQUIRED",
        matchingIds: matchingProjects.map(function(p) { return p.id.primaryKey; })
      });
    }

    project = matchingProjects[0];
    `
          : `
    // Should never happen - contract validation ensures id or name
    return JSON.stringify({
      success: false,
      error: "At least one of id or name is required"
    });
    `
    }

    // Map project status to string
    function mapStatus(project) {
      var ps = project.status;
      if (ps === Project.Status.Active) return "Active";
      if (ps === Project.Status.OnHold) return "OnHold";
      if (ps === Project.Status.Done) return "Done";
      if (ps === Project.Status.Dropped) return "Dropped";
      return "Active"; // Unknown status defaults to Active
    }

    // Derive project type from sequential and containsSingletonActions
    function deriveProjectType(project) {
      if (project.containsSingletonActions) return "single-actions";
      if (project.sequential) return "sequential";
      return "parallel";
    }

    // Helper to format date as ISO string
    function toISO(d) {
      return d ? d.toISOString() : null;
    }

    // Build ProjectFull object
    var folder = project.parentFolder;
    var next = project.nextTask;
    var rootTask = project.task;

    var result = {
      id: project.id.primaryKey,
      name: project.name,
      note: rootTask.note || "",
      status: mapStatus(project),
      completed: project.completed,
      flagged: project.flagged,
      effectiveFlagged: project.effectiveFlagged,
      sequential: project.sequential,
      containsSingletonActions: project.containsSingletonActions,
      projectType: deriveProjectType(project),
      completedByChildren: project.completedByChildren,
      defaultSingletonActionHolder: project.defaultSingletonActionHolder,
      deferDate: toISO(project.deferDate),
      dueDate: toISO(project.dueDate),
      effectiveDeferDate: toISO(project.effectiveDeferDate),
      effectiveDueDate: toISO(project.effectiveDueDate),
      completionDate: toISO(project.completionDate),
      dropDate: toISO(project.dropDate),
      estimatedMinutes: project.estimatedMinutes !== undefined ? project.estimatedMinutes : null,
      reviewInterval: project.reviewInterval ? {
        steps: project.reviewInterval.steps,
        unit: project.reviewInterval.unit
      } : null,
      lastReviewDate: toISO(project.lastReviewDate),
      nextReviewDate: toISO(project.nextReviewDate),
      repetitionRule: project.repetitionRule ? project.repetitionRule.toString() : null,
      shouldUseFloatingTimeZone: project.shouldUseFloatingTimeZone !== undefined ? project.shouldUseFloatingTimeZone : false,
      hasChildren: project.task.hasChildren,
      nextTask: next ? { id: next.id.primaryKey, name: next.name } : null,
      parentFolder: folder ? { id: folder.id.primaryKey, name: folder.name } : null,
      tags: project.task.tags.map(function(t) {
        return { id: t.id.primaryKey, name: t.name };
      }),
      taskCount: project.task.children.length,
      remainingCount: project.task.children.filter(function(t) { return !t.completed; }).length
    };

    return JSON.stringify({ success: true, project: result });
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
