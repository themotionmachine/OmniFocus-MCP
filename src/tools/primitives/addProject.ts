import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

// Interface for project creation parameters
export interface AddProjectParams {
  name: string;
  note?: string | undefined;
  dueDate?: string | undefined; // ISO date string
  deferDate?: string | undefined; // ISO date string
  flagged?: boolean | undefined;
  estimatedMinutes?: number | undefined;
  tags?: string[] | undefined; // Tag names
  folderName?: string | undefined; // Folder name to add project to
  sequential?: boolean | undefined; // Whether tasks should be sequential or parallel
}

/**
 * Generate Omni Automation JavaScript for project creation
 */
function generateOmniScript(params: AddProjectParams): string {
  // Escape strings for JavaScript - escape backslashes first, then quotes
  const escapeForJS = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const name = escapeForJS(params.name);
  const note = params.note ? escapeForJS(params.note) : '';
  const dueDate = params.dueDate || '';
  const deferDate = params.deferDate || '';
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes || 0;
  const tags = params.tags || [];
  const folderName = params.folderName ? escapeForJS(params.folderName) : '';
  const sequential = params.sequential === true;

  // Generate tags array for OmniJS
  const tagsArrayStr = JSON.stringify(tags);

  return `(function() {
  try {
    var name = "${name}";
    var note = "${note}";
    var dueDate = ${dueDate ? `"${dueDate}"` : 'null'};
    var deferDate = ${deferDate ? `"${deferDate}"` : 'null'};
    var flagged = ${flagged};
    var estimatedMinutes = ${estimatedMinutes};
    var tags = ${tagsArrayStr};
    var folderName = "${folderName}";
    var sequential = ${sequential};

    // Determine position (folder or root)
    var position = null;
    if (folderName && folderName.length > 0) {
      var folder = flattenedFolders.byName(folderName);
      if (!folder) {
        return JSON.stringify({ success: false, error: "Folder not found: " + folderName });
      }
      position = folder;
    }

    // Create project
    var project = new Project(name, position);

    // Set properties on project's root task
    if (note && note.length > 0) {
      project.task.note = note;
    }

    if (dueDate) {
      project.task.dueDate = new Date(dueDate);
    }

    if (deferDate) {
      project.task.deferDate = new Date(deferDate);
    }

    if (flagged) {
      project.flagged = true;
    }

    if (estimatedMinutes > 0) {
      project.task.estimatedMinutes = estimatedMinutes;
    }

    // Set sequential/parallel mode
    project.sequential = sequential;

    // Add tags
    if (tags && tags.length > 0) {
      tags.forEach(function(tagName) {
        var tag = flattenedTags.byName(tagName);
        if (!tag) {
          tag = new Tag(tagName);
        }
        project.addTag(tag);
      });
    }

    // Return success with project ID
    return JSON.stringify({
      success: true,
      projectId: project.id.primaryKey,
      name: project.name
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}

/**
 * Add a new project to OmniFocus using Omni Automation JavaScript
 */
export async function addProject(
  params: AddProjectParams
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  // Validate required parameters
  if (!params || typeof params.name !== 'string' || params.name.trim().length === 0) {
    return {
      success: false,
      error: 'Project name is required and must be a non-empty string'
    };
  }

  // Generate Omni Automation script
  const script = generateOmniScript(params);

  // Write script to secure temporary file
  const tempFile = writeSecureTempFile(script, 'add_project', '.js');

  try {
    // Execute via Omni Automation
    const result = (await executeOmniFocusScript(tempFile.path)) as {
      success: boolean;
      projectId?: string;
      name?: string;
      error?: string;
    };

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    // Build success response, only including defined properties
    const response: { success: boolean; projectId?: string; error?: string } = {
      success: result.success
    };
    if (result.projectId !== undefined) {
      response.projectId = result.projectId;
    }
    return response;
  } catch (error: unknown) {
    console.error('Error in addProject:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage || 'Unknown error in addProject'
    };
  } finally {
    // Clean up temp file
    tempFile.cleanup();
  }
}
