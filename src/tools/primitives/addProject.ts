import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Interface for project creation parameters
export interface AddProjectParams {
  name: string;
  note?: string;
  dueDate?: string; // ISO date string
  deferDate?: string; // ISO date string
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[]; // Tag names
  folderName?: string; // Folder name to add project to
  sequential?: boolean; // Whether tasks should be sequential or parallel
}

/**
 * Generate OmniJS script for project creation
 */
function generateJXAScript(params: AddProjectParams): string {
  return `(() => {
  try {
    let newProject = null;

    ${params.folderName ? `
    // Create in specified folder
    const folderName = ${JSON.stringify(params.folderName)};
    let theFolder = flattenedFolders.find(f => f.name === folderName);

    if (!theFolder) {
      return JSON.stringify({
        success: false,
        error: "Folder not found: " + folderName
      });
    }

    newProject = new Project(${JSON.stringify(params.name)}, theFolder);
    ` : `
    // Create project at the root level (at end, less disruptive)
    newProject = new Project(${JSON.stringify(params.name)}, library.ending);
    `}

    // Set project properties
    ${params.note ? `newProject.note = ${JSON.stringify(params.note)};` : ''}
    ${params.dueDate ? `newProject.dueDate = new Date(${JSON.stringify(params.dueDate)});` : ''}
    ${params.deferDate ? `newProject.deferDate = new Date(${JSON.stringify(params.deferDate)});` : ''}
    ${params.flagged ? `newProject.flagged = true;` : ''}
    ${params.estimatedMinutes ? `newProject.estimatedMinutes = ${params.estimatedMinutes};` : ''}
    ${params.sequential !== undefined ? `newProject.sequential = ${params.sequential};` : ''}

    // Add tags if provided
    ${params.tags && params.tags.length > 0 ? `
    const tagNames = ${JSON.stringify(params.tags)};
    tagNames.forEach(tagName => {
      let tag = flattenedTags.find(t => t.name === tagName);
      if (!tag) {
        tag = new Tag(tagName);
      }
      newProject.addTag(tag);
    });
    ` : ''}

    const projectId = newProject.id.primaryKey;

    return JSON.stringify({
      success: true,
      projectId: projectId,
      name: ${JSON.stringify(params.name)}
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})();`;
}

/**
 * Add a project to OmniFocus using OmniJS
 */
export async function addProject(params: AddProjectParams): Promise<{success: boolean, projectId?: string, error?: string}> {
  try {
    // Generate OmniJS script
    const script = generateJXAScript(params);

    console.error("Executing OmniJS script for project creation...");

    // Write to a temporary file
    const tempFile = `${tmpdir()}/omnifocus_add_project_${Date.now()}.js`;
    writeFileSync(tempFile, script, { encoding: 'utf8' });

    // Execute the script
    const result = await executeOmniFocusScript(tempFile);

    // Cleanup temp file
    try { unlinkSync(tempFile); } catch {}

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    // Return the result
    return {
      success: result.success,
      projectId: result.projectId,
      error: result.error
    };
  } catch (error: any) {
    console.error("Error in addProject:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in addProject"
    };
  }
} 