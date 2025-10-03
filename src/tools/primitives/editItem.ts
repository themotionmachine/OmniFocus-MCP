import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateDateAssignmentV2 } from '../../utils/dateFormatting.js';
const execAsync = promisify(exec);

// Status options for tasks and projects
type TaskStatus = 'incomplete' | 'completed' | 'dropped';
type ProjectStatus = 'active' | 'completed' | 'dropped' | 'onHold';

// Interface for item edit parameters
export interface EditItemParams {
  id?: string;                  // ID of the task or project to edit
  name?: string;                // Name of the task or project to edit (as fallback if ID not provided)
  itemType: 'task' | 'project'; // Type of item to edit
  
  // Common editable fields
  newName?: string;             // New name for the item
  newNote?: string;             // New note for the item
  newDueDate?: string;          // New due date in ISO format (empty string to clear)
  newDeferDate?: string;        // New defer date in ISO format (empty string to clear)
  newPlannedDate?: string;      // New planned date in ISO format (empty string to clear, tasks only)
  newFlagged?: boolean;         // New flagged status (false to remove flag, true to add flag)
  newEstimatedMinutes?: number; // New estimated minutes
  
  // Task-specific fields
  newStatus?: TaskStatus;       // New status for tasks (incomplete, completed, dropped)
  addTags?: string[];           // Tags to add to the task
  removeTags?: string[];        // Tags to remove from the task
  replaceTags?: string[];       // Tags to replace all existing tags with
  
  // Project-specific fields
  newSequential?: boolean;      // Whether the project should be sequential
  newFolderName?: string;       // New folder to move the project to
  newProjectStatus?: ProjectStatus; // New status for projects
}

/**
 * Generate pure AppleScript for item editing with dates constructed outside tell blocks
 */
function generateAppleScript(params: EditItemParams): string {
  // Sanitize and prepare parameters for AppleScript
  const id = params.id?.replace(/['"\\]/g, '\\$&') || ''; // Escape quotes and backslashes
  const name = params.name?.replace(/['"\\]/g, '\\$&') || '';
  const itemType = params.itemType;
  
  // Verify we have at least one identifier
  if (!id && !name) {
    return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
  }
  
  // Collect all date constructions that need to happen outside tell blocks
  const datePreScripts: string[] = [];
  const dateAssignments: { [key: string]: string } = {};
  
  // Process due date if provided
  const dueDateParts = generateDateAssignmentV2('foundItem', 'due date', params.newDueDate);
  if (dueDateParts) {
    if (dueDateParts.preScript) {
      datePreScripts.push(dueDateParts.preScript);
    }
    dateAssignments['due date'] = dueDateParts.assignmentScript;
  }
  
  // Process defer date if provided
  const deferDateParts = generateDateAssignmentV2('foundItem', 'defer date', params.newDeferDate);
  if (deferDateParts) {
    if (deferDateParts.preScript) {
      datePreScripts.push(deferDateParts.preScript);
    }
    dateAssignments['defer date'] = deferDateParts.assignmentScript;
  }

  // Process planned date if provided (tasks only)
  const plannedDateParts = generateDateAssignmentV2('foundItem', 'planned date', params.newPlannedDate);
  if (plannedDateParts) {
    if (plannedDateParts.preScript) {
      datePreScripts.push(plannedDateParts.preScript);
    }
    dateAssignments['planned date'] = plannedDateParts.assignmentScript;
  }
  
  // Build the complete script
  let script = '';
  
  // Add date constructions outside tell blocks
  if (datePreScripts.length > 0) {
    script += datePreScripts.join('\n') + '\n\n';
  }
  
  // Start the main script
  script += `try
  tell application "OmniFocus"
    tell front document
      -- Find the item to edit
      set foundItem to missing value
`;
  
  // Add ID search if provided
  if (id) {
    if (itemType === 'task') {
      script += `
      -- Try to find task by ID
      repeat with aTask in (flattened tasks)
        if (id of aTask as string) = "${id}" then
          set foundItem to aTask
          exit repeat
        end if
      end repeat
      
      -- If not found in projects, search in inbox
      if foundItem is missing value then
        repeat with aTask in (inbox tasks)
          if (id of aTask as string) = "${id}" then
            set foundItem to aTask
            exit repeat
          end if
        end repeat
      end if
`;
    } else {
      script += `
      -- Try to find project by ID
      repeat with aProject in (flattened projects)
        if (id of aProject as string) = "${id}" then
          set foundItem to aProject
          exit repeat
        end if
      end repeat
`;
    }
  }
  
  // Add name search if provided (and no ID or as fallback)
  if (!id && name) {
    if (itemType === 'task') {
      script += `
      -- Find task by name (search in projects first, then inbox)
      repeat with aTask in (flattened tasks)
        if (name of aTask) = "${name}" then
          set foundItem to aTask
          exit repeat
        end if
      end repeat
      
      -- If not found in projects, search in inbox
      if foundItem is missing value then
        repeat with aTask in (inbox tasks)
          if (name of aTask) = "${name}" then
            set foundItem to aTask
            exit repeat
          end if
        end repeat
      end if
`;
    } else {
      script += `
      -- Find project by name
      repeat with aProject in (flattened projects)
        if (name of aProject) = "${name}" then
          set foundItem to aProject
          exit repeat
        end if
      end repeat
`;
    }
  } else if (id && name) {
    if (itemType === 'task') {
      script += `
      -- If ID search failed, try to find by name as fallback
      if foundItem is missing value then
        repeat with aTask in (flattened tasks)
          if (name of aTask) = "${name}" then
            set foundItem to aTask
            exit repeat
          end if
        end repeat
      end if
      
      -- If still not found, search in inbox
      if foundItem is missing value then
        repeat with aTask in (inbox tasks)
          if (name of aTask) = "${name}" then
            set foundItem to aTask
            exit repeat
          end if
        end repeat
      end if
`;
    } else {
      script += `
      -- If ID search failed, try to find project by name as fallback
      if foundItem is missing value then
        repeat with aProject in (flattened projects)
          if (name of aProject) = "${name}" then
            set foundItem to aProject
            exit repeat
          end if
        end repeat
      end if
`;
    }
  }
  
  // Add the item editing logic
  script += `
      -- If we found the item, edit it
      if foundItem is not missing value then
        set itemName to name of foundItem
        set itemId to id of foundItem as string
        set changedProperties to {}
`;
  
  // Common property updates for both tasks and projects
  if (params.newName !== undefined) {
    script += `
        -- Update name
        set name of foundItem to "${params.newName.replace(/['"\\]/g, '\\$&')}"
        set end of changedProperties to "name"
`;
  }
  
  if (params.newNote !== undefined) {
    script += `
        -- Update note
        set note of foundItem to "${params.newNote.replace(/['"\\]/g, '\\$&')}"
        set end of changedProperties to "note"
`;
  }
  
  // Add date assignments (using pre-constructed dates)
  if (dateAssignments['due date']) {
    script += `
        -- Update due date
        ${dateAssignments['due date']}
        set end of changedProperties to "due date"
`;
  }
  
  if (dateAssignments['defer date']) {
    script += `
        -- Update defer date
        ${dateAssignments['defer date']}
        set end of changedProperties to "defer date"
`;
  }

  if (dateAssignments['planned date']) {
    script += `
        -- Update planned date
        ${dateAssignments['planned date']}
        set end of changedProperties to "planned date"
`;
  }

  if (params.newFlagged !== undefined) {
    script += `
        -- Update flagged status
        set flagged of foundItem to ${params.newFlagged}
        set end of changedProperties to "flagged"
`;
  }
  
  if (params.newEstimatedMinutes !== undefined) {
    script += `
        -- Update estimated minutes
        set estimated minutes of foundItem to ${params.newEstimatedMinutes}
        set end of changedProperties to "estimated minutes"
`;
  }
  
  // Task-specific updates
  if (itemType === 'task') {
    // Update task status
    if (params.newStatus !== undefined) {
      if (params.newStatus === 'completed') {
        script += `
        -- Mark task as completed
        set completed of foundItem to true
        set end of changedProperties to "status (completed)"
`;
      } else if (params.newStatus === 'dropped') {
        script += `
        -- Mark task as dropped
        set dropped of foundItem to true
        set end of changedProperties to "status (dropped)"
`;
      } else if (params.newStatus === 'incomplete') {
        script += `
        -- Mark task as incomplete
        set completed of foundItem to false
        set dropped of foundItem to false
        set end of changedProperties to "status (incomplete)"
`;
      }
    }
    
    // Handle tag operations
    if (params.replaceTags && params.replaceTags.length > 0) {
      const tagsList = params.replaceTags.map(tag => `"${tag.replace(/['"\\]/g, '\\$&')}"`).join(", ");
      script += `
        -- Replace all tags
        set tagNames to {${tagsList}}
        set existingTags to tags of foundItem
        
        -- First clear all existing tags
        repeat with existingTag in existingTags
          remove existingTag from tags of foundItem
        end repeat
        
        -- Then add new tags
        repeat with tagName in tagNames
          set tagObj to missing value
          try
            set tagObj to first flattened tag where name = (tagName as string)
          on error
            -- Tag doesn't exist, create it
            set tagObj to make new tag with properties {name:(tagName as string)}
          end try
          if tagObj is not missing value then
            add tagObj to tags of foundItem
          end if
        end repeat
        set end of changedProperties to "tags (replaced)"
`;
    } else {
      // Add tags if specified
      if (params.addTags && params.addTags.length > 0) {
        const tagsList = params.addTags.map(tag => `"${tag.replace(/['"\\]/g, '\\$&')}"`).join(", ");
        script += `
        -- Add tags
        set tagNames to {${tagsList}}
        repeat with tagName in tagNames
          set tagObj to missing value
          try
            set tagObj to first flattened tag where name = (tagName as string)
          on error
            -- Tag doesn't exist, create it
            set tagObj to make new tag with properties {name:(tagName as string)}
          end try
          if tagObj is not missing value then
            add tagObj to tags of foundItem
          end if
        end repeat
        set end of changedProperties to "tags (added)"
`;
      }
      
      // Remove tags if specified
      if (params.removeTags && params.removeTags.length > 0) {
        const tagsList = params.removeTags.map(tag => `"${tag.replace(/['"\\]/g, '\\$&')}"`).join(", ");
        script += `
        -- Remove tags
        set tagNames to {${tagsList}}
        repeat with tagName in tagNames
          try
            set tagObj to first flattened tag where name = (tagName as string)
            remove tagObj from tags of foundItem
          end try
        end repeat
        set end of changedProperties to "tags (removed)"
`;
      }
    }
  }
  
  // Project-specific updates
  if (itemType === 'project') {
    // Update sequential status
    if (params.newSequential !== undefined) {
      script += `
        -- Update sequential status
        set sequential of foundItem to ${params.newSequential}
        set end of changedProperties to "sequential"
`;
    }
    
    // Update project status
    if (params.newProjectStatus !== undefined) {
      const statusValue = params.newProjectStatus === 'active' ? 'active status' : 
                          params.newProjectStatus === 'completed' ? 'done status' :
                          params.newProjectStatus === 'dropped' ? 'dropped status' :
                          'on hold status';
      script += `
        -- Update project status
        set status of foundItem to ${statusValue}
        set end of changedProperties to "status"
`;
    }
    
    // Move to a new folder
    if (params.newFolderName !== undefined) {
      const folderName = params.newFolderName.replace(/['"\\]/g, '\\$&');
      script += `
        -- Move to new folder
        set destFolder to missing value
        try
          set destFolder to first flattened folder where name = "${folderName}"
        end try
        
        if destFolder is missing value then
          -- Create the folder if it doesn't exist
          set destFolder to make new folder with properties {name:"${folderName}"}
        end if
        
        -- Move project to the folder
        move foundItem to destFolder
        set end of changedProperties to "folder"
`;
    }
  }
  
  script += `
        -- Prepare the changed properties as a string
        set changedPropsText to ""
        repeat with i from 1 to count of changedProperties
          set changedPropsText to changedPropsText & item i of changedProperties
          if i < count of changedProperties then
            set changedPropsText to changedPropsText & ", "
          end if
        end repeat
        
        -- Return success with details
        return "{\\\"success\\\":true,\\\"id\\\":\\"" & itemId & "\\",\\\"name\\\":\\"" & itemName & "\\",\\\"changedProperties\\\":\\"" & changedPropsText & "\\"}"
      else
        -- Item not found
        return "{\\\"success\\\":false,\\\"error\\\":\\\"Item not found\\"}"
      end if
    end tell
  end tell
on error errorMessage
  return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
end try
`;
  
  return script;
}

/**
 * Edit a task or project in OmniFocus
 */
export async function editItem(params: EditItemParams): Promise<{
  success: boolean, 
  id?: string, 
  name?: string, 
  changedProperties?: string,
  error?: string
}> {
  let tempFile: string | undefined;
  
  try {
    // Generate AppleScript
    const script = generateAppleScript(params);
    
    console.error("Executing AppleScript for editing (V2)...");
    console.error(`Item type: ${params.itemType}, ID: ${params.id || 'not provided'}, Name: ${params.name || 'not provided'}`);
    
    // Log a preview of the script for debugging (first few lines)
    const scriptPreview = script.split('\n').slice(0, 10).join('\n') + '\n...';
    console.error("AppleScript preview:\n", scriptPreview);
    
    // Write script to temporary file to avoid shell escaping issues
    tempFile = join(tmpdir(), `edit_omnifocus_${Date.now()}.applescript`);
    writeFileSync(tempFile, script);
    
    // Execute AppleScript from file
    const { stdout, stderr } = await execAsync(`osascript ${tempFile}`);
    
    // Clean up temp file
    try {
      unlinkSync(tempFile);
    } catch (cleanupError) {
      console.error("Failed to clean up temp file:", cleanupError);
    }
    
    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }
    
    console.error("AppleScript stdout:", stdout);
    
    // Parse the result
    try {
      const result = JSON.parse(stdout);
      
      // Return the result
      return {
        success: result.success,
        id: result.id,
        name: result.name,
        changedProperties: result.changedProperties,
        error: result.error
      };
    } catch (parseError) {
      console.error("Error parsing AppleScript result:", parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    // Clean up temp file if it exists
    if (tempFile) {
      try {
        unlinkSync(tempFile);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    console.error("Error in editItem execution:", error);
    
    // Include more detailed error information
    if (error.message && error.message.includes('syntax error')) {
      console.error("This appears to be an AppleScript syntax error. Review the script generation logic.");
    }
    
    return {
      success: false,
      error: error?.message || "Unknown error in editItem"
    };
  }
}