import type {
  DeleteProjectInput,
  DeleteProjectResponse
} from '../../contracts/project-tools/index.js';
import { logger } from '../../utils/logger.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Generate Omni Automation JavaScript for deleting a project
 */
function generateOmniScript(params: DeleteProjectInput): string {
  const { id, name } = params;

  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

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
    var taskCount = project.flattenedTasks.length;

    // Delete the project (cascade deletion of tasks is automatic)
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
 * Deleting a project automatically removes all child tasks (cascade delete).
 * This is OmniFocus's native behavior.
 *
 * @param params - Identification parameters (id or name)
 * @returns Promise with deleted project info (including cascade message), disambiguation error, or standard error
 */
export async function deleteProject(params: DeleteProjectInput): Promise<DeleteProjectResponse> {
  // Generate Omni Automation script
  const script = generateOmniScript(params);

  // Write script to secure temporary file
  const tempFile = writeSecureTempFile(script, 'delete_project', '.js');

  try {
    // Execute via Omni Automation
    const result = await executeOmniFocusScript(tempFile.path);

    // Parse the result - executeOmniFocusScript already parses JSON
    // Type narrowing: ensure result is a valid response
    if (typeof result === 'string') {
      // Fallback: if somehow it's a string, parse it
      return JSON.parse(result) as DeleteProjectResponse;
    }

    // Result is already parsed from JSON
    return result as DeleteProjectResponse;
  } catch (error: unknown) {
    logger.error('Error in deleteProject', 'deleteProject', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in deleteProject'
    };
  } finally {
    // Clean up temp file
    tempFile.cleanup();
  }
}
