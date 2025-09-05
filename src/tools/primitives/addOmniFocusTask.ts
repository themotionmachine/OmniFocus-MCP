import { runAppleScript } from '../../utils/scriptExecution.js';
import { createDateOutsideTellBlock } from '../../utils/dateFormatting.js';

// Interface for task creation parameters
export interface AddOmniFocusTaskParams {
  name: string;
  note?: string;
  dueDate?: string; // ISO date string
  deferDate?: string; // ISO date string
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[]; // Tag names
  projectName?: string; // Project name to add task to
}

/**
 * Generate pure AppleScript for task creation
 */
function generateAppleScript(params: AddOmniFocusTaskParams): string {
  // Sanitize and prepare parameters for AppleScript
  const name = params.name.replace(/["\\]/g, '\\$&'); // Escape quotes and backslashes
  const note = params.note?.replace(/["\\]/g, '\\$&') || '';
  const dueDate = params.dueDate || '';
  const deferDate = params.deferDate || '';
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes?.toString() || '';
  const tags = params.tags || [];
  const projectName = params.projectName?.replace(/["\\]/g, '\\$&') || '';
  
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
        -- Determine the container (inbox or project)
        if "${projectName}" is "" then
          -- Use inbox of the document
          set newTask to make new inbox task with properties {name:"${name}"}
        else
          -- Use specified project
          try
            set theProject to first flattened project where name = "${projectName}"
            set newTask to make new task at end of tasks of theProject with properties {name:"${name}"}
          on error
            return "ERROR: Project not found: ${projectName}"
          end try
        end if
        
        -- Set task properties
        ${note ? `set note of newTask to "${note}"` : ''}
        ${dueDate ? `
          -- Set due date
          set due date of newTask to ` + dueDateVar : ''}
        ${deferDate ? `
          -- Set defer date
          set defer date of newTask to ` + deferDateVar : ''}
        ${flagged ? `set flagged of newTask to true` : ''}
        ${estimatedMinutes ? `set estimated minutes of newTask to ${estimatedMinutes}` : ''}
        
        -- Get the task ID
        set taskId to id of newTask as string
        
        -- Add tags if provided
        ${tags.length > 0 ? tags.map(tag => {
          const sanitizedTag = tag.replace(/["\\]/g, '\\$&');
          return `
          try
            set theTag to first flattened tag where name = "${sanitizedTag}"
            add theTag to tags of newTask
          on error
            -- Tag might not exist, try to create it
            try
              set theTag to make new tag with properties {name:"${sanitizedTag}"}
              add theTag to tags of newTask
            on error
              -- Could not create or add tag
            end try
          end try`;
        }).join('\n') : ''}
        
        -- Return success with task ID (plain string)
        return taskId
      end tell
    end tell
  on error errorMessage
    return "ERROR: " & errorMessage
  end try
  `;
  
  return script;
}

/**
 * Add a task to OmniFocus
 */
export async function addOmniFocusTask(params: AddOmniFocusTaskParams): Promise<{success: boolean, taskId?: string, error?: string}> {
  try {
    // Generate AppleScript
    const script = generateAppleScript(params);
    const stdout = await runAppleScript(script);
    if (stdout.startsWith('ERROR:')) {
      return { success: false, error: stdout.slice(6).trim() };
    }
    return { success: true, taskId: stdout.trim() };
  } catch (error: any) {
    console.error("Error in addOmniFocusTask:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in addOmniFocusTask"
    };
  }
}
