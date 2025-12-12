import type {
  CreateProjectInput,
  CreateProjectResponse
} from '../../contracts/project-tools/index.js';
import { logger } from '../../utils/logger.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Generate Omni Automation JavaScript for creating a project
 */
function generateOmniScript(params: CreateProjectInput): string {
  const {
    name,
    folderId,
    folderName,
    position = 'ending',
    beforeProject,
    afterProject,
    sequential,
    containsSingletonActions,
    note,
    status = 'Active',
    flagged,
    completedByChildren,
    defaultSingletonActionHolder,
    deferDate,
    dueDate,
    reviewInterval,
    shouldUseFloatingTimeZone,
    estimatedMinutes
  } = params;

  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

  const nameEscaped = escapeForJS(name);
  const folderIdEscaped = folderId ? escapeForJS(folderId) : '';
  const folderNameEscaped = folderName ? escapeForJS(folderName) : '';
  const noteEscaped = note ? escapeForJS(note) : '';
  const beforeProjectEscaped = beforeProject ? escapeForJS(beforeProject) : '';
  const afterProjectEscaped = afterProject ? escapeForJS(afterProject) : '';

  return `(function() {
  try {
    var projectName = "${nameEscaped}";
    var folderId = "${folderIdEscaped}";
    var folderName = "${folderNameEscaped}";
    var position = "${position}";
    var beforeProject = "${beforeProjectEscaped}";
    var afterProject = "${afterProjectEscaped}";

    // Determine insertion location
    var insertionLocation;

    // Handle beforeProject/afterProject positioning
    if (beforeProject && beforeProject.length > 0) {
      var siblingProj = Project.byIdentifier(beforeProject);
      if (!siblingProj) {
        // Try by name
        var projects = flattenedProjects.filter(function(p) { return p.name === beforeProject; });
        if (projects.length === 0) {
          return JSON.stringify({
            success: false,
            error: "Project '" + beforeProject + "' not found"
          });
        }
        if (projects.length > 1) {
          return JSON.stringify({
            success: false,
            code: "DISAMBIGUATION_REQUIRED",
            message: "Multiple projects found with name '" + beforeProject + "'",
            matchingIds: projects.map(function(p) { return p.id.primaryKey; })
          });
        }
        siblingProj = projects[0];
      }
      insertionLocation = siblingProj.before;
    } else if (afterProject && afterProject.length > 0) {
      var siblingProj = Project.byIdentifier(afterProject);
      if (!siblingProj) {
        // Try by name
        var projects = flattenedProjects.filter(function(p) { return p.name === afterProject; });
        if (projects.length === 0) {
          return JSON.stringify({
            success: false,
            error: "Project '" + afterProject + "' not found"
          });
        }
        if (projects.length > 1) {
          return JSON.stringify({
            success: false,
            code: "DISAMBIGUATION_REQUIRED",
            message: "Multiple projects found with name '" + afterProject + "'",
            matchingIds: projects.map(function(p) { return p.id.primaryKey; })
          });
        }
        siblingProj = projects[0];
      }
      insertionLocation = siblingProj.after;
    } else {
      // Handle folder placement with beginning/ending position
      var targetFolder = null;

      if (folderId && folderId.length > 0) {
        targetFolder = Folder.byIdentifier(folderId);
        if (!targetFolder) {
          return JSON.stringify({
            success: false,
            error: "Folder '" + folderId + "' not found"
          });
        }
      } else if (folderName && folderName.length > 0) {
        var folders = flattenedFolders.filter(function(f) { return f.name === folderName; });
        if (folders.length === 0) {
          return JSON.stringify({
            success: false,
            error: "Folder '" + folderName + "' not found"
          });
        }
        if (folders.length > 1) {
          return JSON.stringify({
            success: false,
            code: "DISAMBIGUATION_REQUIRED",
            message: "Multiple folders found with name '" + folderName + "'",
            matchingIds: folders.map(function(f) { return f.id.primaryKey; })
          });
        }
        targetFolder = folders[0];
      }

      if (targetFolder) {
        insertionLocation = targetFolder[position];
      } else {
        // Library root
        insertionLocation = library[position];
      }
    }

    // Create the project
    var newProject = new Project(projectName, insertionLocation);

    // Set optional properties
    ${note !== undefined ? `newProject.note = "${noteEscaped}";` : ''}
    ${status ? `newProject.status = Project.Status.${status};` : ''}
    ${flagged !== undefined ? `newProject.flagged = ${flagged};` : ''}
    ${completedByChildren !== undefined ? `newProject.completedByChildren = ${completedByChildren};` : ''}
    ${defaultSingletonActionHolder !== undefined ? `newProject.defaultSingletonActionHolder = ${defaultSingletonActionHolder};` : ''}

    // Handle project type with auto-clear pattern
    // Per spec: containsSingletonActions wins if both true
    ${
      sequential !== undefined && containsSingletonActions !== undefined
        ? `
    // Both flags provided - containsSingletonActions wins (auto-clear sequential)
    newProject.sequential = false;
    newProject.containsSingletonActions = ${containsSingletonActions};
    `
        : sequential !== undefined
          ? `
    // Only sequential provided
    newProject.sequential = ${sequential};
    newProject.containsSingletonActions = false;
    `
          : containsSingletonActions !== undefined
            ? `
    // Only containsSingletonActions provided
    newProject.sequential = false;
    newProject.containsSingletonActions = ${containsSingletonActions};
    `
            : ''
    }

    // Set dates
    ${deferDate !== undefined && deferDate !== null ? `newProject.deferDate = new Date("${deferDate}");` : deferDate === null ? 'newProject.deferDate = null;' : ''}
    ${dueDate !== undefined && dueDate !== null ? `newProject.dueDate = new Date("${dueDate}");` : dueDate === null ? 'newProject.dueDate = null;' : ''}

    // Set review interval
    ${
      reviewInterval !== undefined && reviewInterval !== null
        ? `
    newProject.reviewInterval = new Project.ReviewInterval(${reviewInterval.steps}, "${reviewInterval.unit}");
    `
        : reviewInterval === null
          ? 'newProject.reviewInterval = null;'
          : ''
    }

    // Set timezone
    ${shouldUseFloatingTimeZone !== undefined ? `newProject.shouldUseFloatingTimeZone = ${shouldUseFloatingTimeZone};` : ''}

    // Set time estimation
    ${estimatedMinutes !== undefined && estimatedMinutes !== null ? `newProject.estimatedMinutes = ${estimatedMinutes};` : estimatedMinutes === null ? 'newProject.estimatedMinutes = null;' : ''}

    return JSON.stringify({
      success: true,
      id: newProject.id.primaryKey,
      name: newProject.name
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * Create a new project in OmniFocus using Omni Automation JavaScript
 *
 * @param params - Project parameters (name, folder, settings, etc.)
 * @returns Promise with created project info or error
 */
export async function createProject(params: CreateProjectInput): Promise<CreateProjectResponse> {
  // Generate Omni Automation script
  const script = generateOmniScript(params);

  // Write script to secure temporary file
  const tempFile = writeSecureTempFile(script, 'create_project', '.js');

  try {
    // Execute via Omni Automation
    const result = await executeOmniFocusScript(tempFile.path);

    // Parse the result - executeOmniFocusScript already parses JSON
    // Type narrowing: ensure result is a valid response
    if (typeof result === 'string') {
      // Fallback: if somehow it's a string, parse it
      return JSON.parse(result) as CreateProjectResponse;
    }

    // Result is already parsed from JSON
    return result as CreateProjectResponse;
  } catch (error: unknown) {
    logger.error('Error in createProject', 'createProject', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in createProject'
    };
  } finally {
    // Clean up temp file
    tempFile.cleanup();
  }
}
