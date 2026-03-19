import {
  type DeleteProjectInput,
  type DeleteProjectResponse,
  DeleteProjectResponseSchema
} from '../../contracts/project-tools/index.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Generate Omni Automation JavaScript for deleting a project
 */
function generateOmniScript(params: DeleteProjectInput): string {
  const { id, name } = params;

  const idEscaped = id ? escapeForJS(id) : '';
  const nameEscaped = name ? escapeForJS(name) : '';

  return `(function() {
  try {
    var projectId = "${idEscaped}";
    var projectName = "${nameEscaped}";

    var project = null;

    // Find project by ID (takes precedence) or by name
    if (projectId && projectId.length > 0) {
      project = Project.byIdentifier(projectId);
      if (!project) {
        return JSON.stringify({
          success: false,
          error: "Project '" + projectId + "' not found"
        });
      }
    } else if (projectName && projectName.length > 0) {
      // Find by name - need to check for disambiguation
      var matchingProjects = [];
      flattenedProjects.forEach(function(p) {
        if (p.name === projectName) {
          matchingProjects.push(p);
        }
      });

      if (matchingProjects.length === 0) {
        return JSON.stringify({
          success: false,
          error: "Project '" + projectName + "' not found"
        });
      }

      if (matchingProjects.length > 1) {
        var ids = [];
        matchingProjects.forEach(function(p) {
          ids.push(p.id.primaryKey);
        });
        return JSON.stringify({
          success: false,
          error: "Ambiguous project name '" + projectName + "'. Found " + matchingProjects.length + " matches. Please specify by ID.",
          code: "DISAMBIGUATION_REQUIRED",
          matchingIds: ids
        });
      }

      project = matchingProjects[0];
    } else {
      return JSON.stringify({
        success: false,
        error: "Either id or name must be provided to identify the project"
      });
    }

    // Capture project info and count tasks before deletion
    var capturedId = project.id.primaryKey;
    var capturedName = project.name;
    var tasks = project.flattenedTasks;
    var taskCount = tasks.length;

    // Explicitly delete all tasks first (OmniFocus does NOT cascade delete)
    // Per OmniJS docs: "To remove tasks from a project, use the deleteObject() function"
    tasks.forEach(function(task) {
      deleteObject(task);
    });

    // Now delete the project itself
    deleteObject(project);

    return JSON.stringify({
      success: true,
      id: capturedId,
      name: capturedName,
      message: "Project \\"" + capturedName + "\\" deleted (" + taskCount + " tasks removed)"
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * Delete a project from OmniFocus using Omni Automation JavaScript
 *
 * Per OmniJS documentation, deleting a project does NOT cascade delete child tasks.
 * Tasks must be explicitly deleted using deleteObject() before deleting the project.
 * This implementation handles the cascade deletion explicitly.
 *
 * @param params - Identification parameters (id or name)
 * @returns Promise with deleted project info (including task count), disambiguation error, or standard error
 */
export async function deleteProject(params: DeleteProjectInput): Promise<DeleteProjectResponse> {
  try {
    const script = generateOmniScript(params);
    const result = await executeOmniJS(script);
    return DeleteProjectResponseSchema.parse(result);
  } catch (error: unknown) {
    logger.error('Error in deleteProject', 'deleteProject', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in deleteProject'
    };
  }
}
