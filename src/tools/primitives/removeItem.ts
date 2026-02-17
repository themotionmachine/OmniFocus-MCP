import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Interface for item removal parameters
export interface RemoveItemParams {
  id?: string;          // ID of the task or project to remove
  name?: string;        // Name of the task or project to remove (as fallback if ID not provided)
  itemType: 'task' | 'project'; // Type of item to remove
}

/**
 * Generate pure AppleScript for item removal
 */
function generateAppleScript(params: RemoveItemParams): string {
  // Sanitize and prepare parameters for AppleScript
  const id = params.id?.replace(/["\\]/g, '\\$&') || ''; // Escape quotes and backslashes
  const name = params.name?.replace(/["\\]/g, '\\$&') || '';
  const itemType = params.itemType;
  
  // Verify we have at least one identifier
  if (!id && !name) {
    return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
  }
  
  // Construct AppleScript with error handling
  let script = `
  try
    tell application "OmniFocus"
      tell front document
        -- Find the item to remove
        set foundItem to missing value
`;
        
  // Add ID search if provided
  if (id) {
    if (itemType === 'task') {
      script += `
        -- Try to find task by ID (search in projects first, then inbox)
        try
          set foundItem to first flattened task where id = "${id}"
        end try
        
        -- If not found in projects, search in inbox
        if foundItem is missing value then
          try
            set foundItem to first inbox task where id = "${id}"
          end try
        end if
`;
    } else {
      script += `
        -- Try to find project by ID
        try
          set foundItem to first flattened project where id = "${id}"
        end try
`;
    }
  }
        
  // Add name search if provided (and no ID or as fallback)
  if (!id && name) {
    if (itemType === 'task') {
      script += `
        -- Find task by name (search in projects first, then inbox)
        try
          set foundItem to first flattened task where name = "${name}"
        end try
        
        -- If not found in projects, search in inbox
        if foundItem is missing value then
          try
            set foundItem to first inbox task where name = "${name}"
          end try
        end if
`;
    } else {
      script += `
        -- Find project by name
        try
          set foundItem to first flattened project where name = "${name}"
        end try
`;
    }
  } else if (id && name) {
    if (itemType === 'task') {
      script += `
        -- If ID search failed, try to find by name as fallback
        if foundItem is missing value then
          try
            set foundItem to first flattened task where name = "${name}"
          end try
        end if
        
        -- If still not found, search in inbox
        if foundItem is missing value then
          try
            set foundItem to first inbox task where name = "${name}"
          end try
        end if
`;
    } else {
      script += `
        -- If ID search failed, try to find project by name as fallback
        if foundItem is missing value then
          try
            set foundItem to first flattened project where name = "${name}"
          end try
        end if
`;
    }
  }
        
  // Add the rest of the script
  script += `
        -- If we found the item, remove it
        if foundItem is not missing value then
          set itemName to name of foundItem
          set itemId to id of foundItem as string
          
          -- Delete the item
          delete foundItem
          
          -- Return success
          return "{\\\"success\\\":true,\\\"id\\\":\\"" & itemId & "\\",\\\"name\\\":\\"" & itemName & "\\"}"
        else
          -- Item not found
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Item not found\\\"}"
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
 * Remove a task or project from OmniFocus
 */
export async function removeItem(params: RemoveItemParams): Promise<{success: boolean, id?: string, name?: string, error?: string}> {
  try {
    // Generate AppleScript
    const script = generateAppleScript(params);
    
    console.error("Executing AppleScript for removal...");
    console.error(`Item type: ${params.itemType}, ID: ${params.id || 'not provided'}, Name: ${params.name || 'not provided'}`);
    
    // Log a preview of the script for debugging (first few lines)
    const scriptPreview = script.split('\n').slice(0, 10).join('\n') + '\n...';
    console.error("AppleScript preview:\n", scriptPreview);
    
    // Execute AppleScript directly
    const { stdout, stderr } = await execAsync(`osascript -e '${script}'`);
    
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
    console.error("Error in removeItem execution:", error);
    
    // Include more detailed error information
    if (error.message && error.message.includes('syntax error')) {
      console.error("This appears to be an AppleScript syntax error. Review the script generation logic.");
    }
    
    return {
      success: false,
      error: error?.message || "Unknown error in removeItem"
    };
  }
} 