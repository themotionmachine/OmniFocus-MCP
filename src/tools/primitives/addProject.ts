import { runAppleScript } from '../../utils/scriptExecution.js';
import { createDateOutsideTellBlock } from '../../utils/dateFormatting.js';

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
 * Generate pure AppleScript for project creation
 */
function generateAppleScript(params: AddProjectParams): string {
  // Sanitize and prepare parameters for AppleScript
  const name = params.name.replace(/["\\]/g, '\\$&'); // Escape only double quotes and backslashes
  const note = params.note?.replace(/["\\]/g, '\\$&') || '';
  const dueDate = params.dueDate || '';
  const deferDate = params.deferDate || '';
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes?.toString() || '';
  const tags = params.tags || [];
  const folderName = params.folderName?.replace(/["\\]/g, '\\$&') || '';
  const sequential = params.sequential === true;
  
  // Generate date constructions outside tell blocks
  let datePreScript = '';
  let dueDateVar = '';
  let deferDateVar = '';
  
  if (dueDate) {
    dueDateVar = `dueDate${Math.random().toString(36).substr(2, 9)}`;
    datePreScript += createDateOutsideTellBlock(dueDate, dueDateVar) + '\n\n';
  }
  
  if (deferDate) {
    deferDateVar = `deferDate${Math.random().toString(36).substr(2, 9)}`;
    datePreScript += createDateOutsideTellBlock(deferDate, deferDateVar) + '\n\n';
  }
  
  // Construct AppleScript with error handling
  let script = datePreScript + `
  try
    tell application "OmniFocus"
      tell front document
        -- Determine the container (root or folder)
        if "${folderName}" is "" then
          -- Create project at the root level
          set newProject to make new project with properties {name:"${name}"}
        else
          -- Use specified folder
          try
            set theFolder to first flattened folder where name = "${folderName}"
            set newProject to make new project at end of projects of theFolder with properties {name:"${name}"}
          on error
            return "ERROR: Folder not found: ${folderName}"
          end try
        end if
        
        -- Set project properties
        ${note ? `set note of newProject to "${note}"` : ''}
        ${dueDate ? `
          -- Set due date
          set due date of newProject to ` + dueDateVar : ''}
        ${deferDate ? `
          -- Set defer date
          set defer date of newProject to ` + deferDateVar : ''}
        ${flagged ? `set flagged of newProject to true` : ''}
        ${estimatedMinutes ? `set estimated minutes of newProject to ${estimatedMinutes}` : ''}
        ${`set sequential of newProject to ${sequential}`}
        
        -- Get the project ID
        set projectId to id of newProject as string
        
        -- Add tags if provided
        ${tags.length > 0 ? tags.map(tag => {
          const sanitizedTag = tag.replace(/['"\\]/g, '\\$&');
          return `
          try
            set theTag to first flattened tag where name = "${sanitizedTag}"
            add theTag to tags of newProject
          on error
            -- Tag might not exist, try to create it
            try
              set theTag to make new tag with properties {name:"${sanitizedTag}"}
              add theTag to tags of newProject
            on error
              -- Could not create or add tag
            end try
          end try`;
        }).join('\n') : ''}
        
        -- Return success with project ID (plain string)
        return projectId
      end tell
    end tell
  on error errorMessage
    return "ERROR: " & errorMessage
  end try
  `;
  
  return script;
}

/**
 * Add a project to OmniFocus
 */
export async function addProject(params: AddProjectParams): Promise<{success: boolean, projectId?: string, error?: string}> {
  try {
    const script = generateAppleScript(params);
    const stdout = await runAppleScript(script);
    if (stdout.startsWith('ERROR:')) {
      return { success: false, error: stdout.slice(6).trim() };
    }
    return { success: true, projectId: stdout.trim() };
  } catch (error: any) {
    console.error("Error in addProject:", error);
    return { success: false, error: error?.message || "Unknown error in addProject" };
  }
}
