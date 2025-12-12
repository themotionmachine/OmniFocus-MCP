import type { MoveProjectInput, MoveProjectResponse } from '../../contracts/project-tools/index.js';
import { logger } from '../../utils/logger.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Generate Omni Automation JavaScript for moving a project
 */
function generateOmniScript(params: MoveProjectInput): string {
  const {
    id,
    name,
    targetFolderId,
    targetFolderName,
    root,
    position,
    beforeProject,
    afterProject
  } = params;

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
  const targetFolderIdEscaped = targetFolderId ? escapeForJS(targetFolderId) : '';
  const targetFolderNameEscaped = targetFolderName ? escapeForJS(targetFolderName) : '';
  const isRoot = root === true;
  const positionValue = position || 'ending';
  const beforeProjectEscaped = beforeProject ? escapeForJS(beforeProject) : '';
  const afterProjectEscaped = afterProject ? escapeForJS(afterProject) : '';

  return `(function() {
  try {
    var projectId = "${idEscaped}";
    var projectName = "${nameEscaped}";
    var targetFolderId = "${targetFolderIdEscaped}";
    var targetFolderName = "${targetFolderNameEscaped}";
    var moveToRoot = ${isRoot};
    var position = "${positionValue}";
    var beforeProject = "${beforeProjectEscaped}";
    var afterProject = "${afterProjectEscaped}";

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
          error: "Multiple projects match '" + projectName + "'. Please use ID to specify which one.",
          code: "DISAMBIGUATION_REQUIRED",
          message: "Multiple projects match '" + projectName + "'. Please use ID to specify which one.",
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

    // Determine target position
    var targetPosition;

    if (moveToRoot) {
      // Move to library root
      targetPosition = library[position];
    } else if (targetFolderId && targetFolderId.length > 0) {
      // Move to folder by ID
      var folder = Folder.byIdentifier(targetFolderId);
      if (!folder) {
        return JSON.stringify({
          success: false,
          error: "Folder '" + targetFolderId + "' not found"
        });
      }
      targetPosition = folder[position];
    } else if (targetFolderName && targetFolderName.length > 0) {
      // Move to folder by name - check for disambiguation
      var matchingFolders = [];
      flattenedFolders.forEach(function(f) {
        if (f.name === targetFolderName) {
          matchingFolders.push(f);
        }
      });

      if (matchingFolders.length === 0) {
        return JSON.stringify({
          success: false,
          error: "Folder '" + targetFolderName + "' not found"
        });
      }

      if (matchingFolders.length > 1) {
        return JSON.stringify({
          success: false,
          error: "Multiple folders match '" + targetFolderName + "'. Please use targetFolderId to specify which one."
        });
      }

      var targetFolder = matchingFolders[0];
      targetPosition = targetFolder[position];
    } else {
      return JSON.stringify({
        success: false,
        error: "Must specify targetFolderId, targetFolderName, or root: true"
      });
    }

    // Handle beforeProject/afterProject if specified
    if (beforeProject && beforeProject.length > 0) {
      var beforeProj = Project.byIdentifier(beforeProject);
      if (!beforeProj) {
        return JSON.stringify({
          success: false,
          error: "Before project '" + beforeProject + "' not found"
        });
      }
      targetPosition = beforeProj.before;
    } else if (afterProject && afterProject.length > 0) {
      var afterProj = Project.byIdentifier(afterProject);
      if (!afterProj) {
        return JSON.stringify({
          success: false,
          error: "After project '" + afterProject + "' not found"
        });
      }
      targetPosition = afterProj.after;
    }

    // Move the project using moveSections
    moveSections([project], targetPosition);

    // Get parent folder info after move
    var parentFolderId = null;
    var parentFolderName = null;
    if (project.parentFolder) {
      parentFolderId = project.parentFolder.id.primaryKey;
      parentFolderName = project.parentFolder.name;
    }

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      parentFolderId: parentFolderId,
      parentFolderName: parentFolderName
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * Move a project to a new location in OmniFocus using Omni Automation JavaScript
 *
 * @param params - Identification and target parameters
 * @returns Promise with moved project info, disambiguation error, or standard error
 */
export async function moveProject(params: MoveProjectInput): Promise<MoveProjectResponse> {
  // Generate Omni Automation script
  const script = generateOmniScript(params);

  // Write script to secure temporary file
  const tempFile = writeSecureTempFile(script, 'move_project', '.js');

  try {
    // Execute via Omni Automation
    const scriptResult = await executeOmniFocusScript(tempFile.path);

    // Parse result if it's a string, otherwise use as-is
    const result =
      typeof scriptResult === 'string'
        ? (JSON.parse(scriptResult) as MoveProjectResponse)
        : (scriptResult as MoveProjectResponse);

    // Pass through the result (success, error, or disambiguation)
    return result;
  } catch (error: unknown) {
    logger.error('Error in moveProject', 'moveProject', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in moveProject'
    };
  } finally {
    // Clean up temp file
    tempFile.cleanup();
  }
}
