import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createDateOutsideTellBlock } from '../../utils/dateFormatting.js';
import { escapeAppleScriptString } from '../../utils/appleScriptHelpers.js';
const execAsync = promisify(exec);

// Interface for task creation parameters
export interface AddOmniFocusTaskParams {
  name: string;
  note?: string;
  dueDate?: string; // ISO date string
  deferDate?: string; // ISO date string
  plannedDate?: string; // ISO date string
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[]; // Tag names
  projectId?: string; // Project id to add task to (preferred when disambiguation is needed)
  projectName?: string; // Project name to add task to (used when projectId is not supplied)
  // Hierarchy support
  parentTaskId?: string;
  parentTaskName?: string;
  hierarchyLevel?: number; // ignored for single add
}

/**
 * Generate pure AppleScript for task creation
 */
export function generateAppleScript(params: AddOmniFocusTaskParams): string {
  // Sanitize and prepare parameters for AppleScript
  const name = escapeAppleScriptString(params.name);
  const note = params.note ? escapeAppleScriptString(params.note, { preserveNewlines: true }) : '';
  const dueDate = params.dueDate || '';
  const deferDate = params.deferDate || '';
  const plannedDate = params.plannedDate || '';
  const flagged = params.flagged === true;
  const estimatedMinutes = params.estimatedMinutes?.toString() || '';
  const tags = params.tags || [];
  const projectId = params.projectId ? escapeAppleScriptString(params.projectId) : '';
  const projectName = params.projectName ? escapeAppleScriptString(params.projectName) : '';
  const parentTaskId = params.parentTaskId ? escapeAppleScriptString(params.parentTaskId) : '';
  const parentTaskName = params.parentTaskName ? escapeAppleScriptString(params.parentTaskName) : '';

  // Generate date constructions outside tell blocks
  let datePreScript = '';
  let dueDateVar = '';
  let deferDateVar = '';
  let plannedDateVar = '';

  if (dueDate) {
    dueDateVar = `dueDate${Math.random().toString(36).substr(2, 9)}`;
    datePreScript += createDateOutsideTellBlock(dueDate, dueDateVar) + '\n\n';
  }

  if (deferDate) {
    deferDateVar = `deferDate${Math.random().toString(36).substr(2, 9)}`;
    datePreScript += createDateOutsideTellBlock(deferDate, deferDateVar) + '\n\n';
  }

  if (plannedDate) {
    plannedDateVar = `plannedDate${Math.random().toString(36).substr(2, 9)}`;
    datePreScript += createDateOutsideTellBlock(plannedDate, plannedDateVar) + '\n\n';
  }
  
  // Construct AppleScript with error handling
  let script = datePreScript + `
  try
    tell application "OmniFocus"
      tell front document
        -- Resolve target project up front: by id if provided, else by name, else missing
        set targetProject to missing value
        if "${projectId}" is not "" then
          try
            set targetProject to first flattened project where id = "${projectId}"
          end try
          if targetProject is missing value then
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Project not found: id ${projectId}\\\"}"
          end if
        else if "${projectName}" is not "" then
          try
            set targetProject to first flattened project where name = "${projectName}"
          end try
          if targetProject is missing value then
            return "{\\\"success\\\":false,\\\"error\\\":\\\"Project not found: ${projectName}\\\"}"
          end if
        end if

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
          -- If target project resolved, ensure parent is within that project
          if parentTask is not missing value and targetProject is not missing value then
            try
              set pproj to containing project of parentTask
              if pproj is missing value or (id of pproj as string) is not equal to (id of targetProject as string) then set parentTask to missing value
            end try
          end if
        end if

        if parentTask is missing value and "${parentTaskName}" is not "" then
          if targetProject is not missing value then
            -- Find by name but constrain to the target project
            try
              set parentTask to first flattened task where name = "${parentTaskName}"
            end try
            if parentTask is not missing value then
              try
                set pproj to containing project of parentTask
                if pproj is missing value or (id of pproj as string) is not equal to (id of targetProject as string) then set parentTask to missing value
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
        else if targetProject is not missing value then
          -- Create under the resolved target project
          set newTask to make new task with properties {name:"${name}"} at end of tasks of targetProject
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
        ${plannedDate ? `
          -- Set planned date
          set planned date of newTask to ` + plannedDateVar : ''}
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
          -- If container access fails (e.g., inbox), default based on whether a project was targeted
          if "${projectId}" is not "" or "${projectName}" is not "" then
            set placement to "project"
          else
            set placement to "inbox"
          end if
        end try

        -- Get the task ID
        set taskId to id of newTask as string
        
        -- Add tags if provided
        ${tags.length > 0 ? tags.map(tag => {
          const sanitizedTag = escapeAppleScriptString(tag);
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
        return "{\\\"success\\\":true,\\\"taskId\\\":\\"" & taskId & "\\",\\\"name\\\":\\"${name}\\\",\\\"placement\\\":\\"" & placement & "\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
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
    console.error("Executing AppleScript via temp file...");

    // Write to a temporary AppleScript file to avoid shell escaping issues
    const tempFile = join(tmpdir(), `omnifocus_add_${crypto.randomUUID()}.applescript`);
    writeFileSync(tempFile, script, { encoding: 'utf8' });

    // Execute AppleScript from file
    const { stdout, stderr } = await execAsync(`osascript "${tempFile}"`);

    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }
    
    console.error("AppleScript stdout:", stdout);
    
    // Cleanup temp file
    try { unlinkSync(tempFile); } catch {}
    
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
