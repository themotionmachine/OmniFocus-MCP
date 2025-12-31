import { executeAppleScript } from '../../utils/scriptExecution.js';
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
  // Hierarchy support
  parentTaskId?: string;
  parentTaskName?: string;
  hierarchyLevel?: number; // ignored for single add
}

/**
 * Generate pure AppleScript for task creation
 */
function generateAppleScript(params: AddOmniFocusTaskParams): string {
  // Sanitize and prepare parameters for AppleScript
  const name = params.name.replace(/["\\]/g, '\\$&'); // Escape double quotes and backslashes
  const note = params.note?.replace(/["\\]/g, '\\$&') || '';
  const dueDate = params.dueDate || '';
  const deferDate = params.deferDate || '';
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes?.toString() || '';
  const tags = params.tags || [];
  const projectName = params.projectName?.replace(/["\\]/g, '\\$&') || '';
  const parentTaskId = params.parentTaskId?.replace(/["\\]/g, '\\$&') || '';
  const parentTaskName = params.parentTaskName?.replace(/["\\]/g, '\\$&') || '';
  
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
  -- Helper function to escape strings for JSON
  on escapeForJSON(inputText)
    set escapedText to inputText
    -- First, escape backslashes
    set AppleScript's text item delimiters to "\\\\"
    set textItems to text items of escapedText
    set AppleScript's text item delimiters to "\\\\\\\\"
    set escapedText to textItems as string
    -- Then, escape double quotes
    set AppleScript's text item delimiters to "\\""
    set textItems to text items of escapedText
    set AppleScript's text item delimiters to "\\\\\\""
    set escapedText to textItems as string
    set AppleScript's text item delimiters to ""
    return escapedText
  end escapeForJSON

  try
    tell application "OmniFocus"
      tell front document
        -- Resolve parent task if provided
        set newTask to missing value
        set parentTask to missing value
        set placement to ""

        if "${parentTaskId}" is not "" then
          try
            set parentTask to first flattened task where id = "${parentTaskId}"
          end try
          if parentTask is missing value then
            try
              set parentTask to first inbox task where id = "${parentTaskId}"
            end try
          end if
          -- If projectName provided, ensure parent is within that project
          if parentTask is not missing value and "${projectName}" is not "" then
            try
              set pproj to containing project of parentTask
              if pproj is missing value or name of pproj is not "${projectName}" then set parentTask to missing value
            end try
          end if
        end if

        if parentTask is missing value and "${parentTaskName}" is not "" then
          if "${projectName}" is not "" then
            -- Find by name but constrain to the specified project
            try
              set parentTask to first flattened task where name = "${parentTaskName}"
            end try
            if parentTask is not missing value then
              try
                set pproj to containing project of parentTask
                if pproj is missing value or name of pproj is not "${projectName}" then set parentTask to missing value
              end try
            end if
          else
            -- No project specified; allow global or inbox match by name
            try
              set parentTask to first flattened task where name = "${parentTaskName}"
            end try
            if parentTask is missing value then
              try
                set parentTask to first inbox task where name = "${parentTaskName}"
              end try
            end if
          end if
        end if

        if parentTask is not missing value then
          -- Create task under parent task
          set newTask to make new task with properties {name:"${name}"} at end of tasks of parentTask
        else if "${projectName}" is not "" then
          -- Create under specified project
          try
            set theProject to first flattened project where name = "${projectName}"
            set newTask to make new task with properties {name:"${name}"} at end of tasks of theProject
          on error
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Project not found: ${projectName}\\\"}"
          end try
        else
          -- Fallback to inbox
          set newTask to make new inbox task with properties {name:"${name}"}
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
        
        -- Derive placement from container; distinguish real parent vs project root task
        try
          set placement to "inbox"
          set ctr to container of newTask
          set cclass to class of ctr as string
          set ctrId to id of ctr as string
          if cclass is "project" then
            set placement to "project"
          else if cclass is "task" then
            if parentTask is not missing value then
              set parentId to id of parentTask as string
              if ctrId is equal to parentId then
                set placement to "parent"
              else
                -- Likely the project's root task; treat as project
                set placement to "project"
              end if
            else
              -- No explicit parent requested; container is root task -> treat as project
              set placement to "project"
            end if
          else
            set placement to "inbox"
          end if
        on error
          -- If container access fails (e.g., inbox), default based on projectName
          if "${projectName}" is not "" then
            set placement to "project"
          else
            set placement to "inbox"
          end if
        end try

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

        -- Return success with task ID and placement
        set taskName to name of newTask
        set escapedName to my escapeForJSON(taskName)
        return "{\\\"success\\\":true,\\\"taskId\\\":\\"" & taskId & "\\",\\\"name\\\":\\"" & escapedName & "\\\",\\\"placement\\\":\\"" & placement & "\\"}"
      end tell
    end tell
  on error errorMessage
    set escapedError to my escapeForJSON(errorMessage)
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & escapedError & "\\"}"
  end try
  `;
  
  return script;
}

/**
 * Add a task to OmniFocus
 */
export async function addOmniFocusTask(params: AddOmniFocusTaskParams): Promise<{success: boolean, taskId?: string, error?: string, placement?: 'parent' | 'project' | 'inbox'}> {
  try {
    // Generate AppleScript
    const script = generateAppleScript(params);
    console.error("Executing AppleScript via stdin...");

    // Execute AppleScript via stdin (no temp files, better security)
    const stdout = await executeAppleScript(script);

    console.error("AppleScript stdout:", stdout);

    // Parse the result
    try {
      const result = JSON.parse(stdout);

      // Return the result
      return {
        success: result.success,
        taskId: result.taskId,
        error: result.error,
        placement: result.placement
      };
    } catch (parseError) {
      console.error("Error parsing AppleScript result:", parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    console.error("Error in addOmniFocusTask:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in addOmniFocusTask"
    };
  }
} 
