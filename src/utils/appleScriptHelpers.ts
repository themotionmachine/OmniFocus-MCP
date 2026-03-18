/**
 * Shared AppleScript generation helpers for OmniFocus MCP primitives.
 */

/**
 * Generate AppleScript that resolves a folder by path (e.g. "Work/Engineering")
 * or by simple name (e.g. "Work"). Sets `varName` to the found folder object,
 * or returns `errorReturnJson` if not found.
 *
 * The generated code must be placed inside a `tell front document` block.
 */
export function generateFolderLookupScript(
  rawFolderPath: string,
  varName: string,
  errorReturnJson: string
): string {
  const components = rawFolderPath.split('/').filter(c => c.length > 0);
  if (components.length === 0) {
    return `set ${varName} to missing value`;
  }

  const escaped = components.map(c => c.replace(/["\\]/g, '\\$&').replace(/[\r\n]/g, ' '));
  const leafName = escaped[escaped.length - 1];

  if (components.length === 1) {
    // Simple name lookup — same behavior as the original code
    return `set ${varName} to missing value
        try
          set ${varName} to first flattened folder where name = "${leafName}"
        end try
        if ${varName} is missing value then
          return "${errorReturnJson}"
        end if`;
  }

  // Path-based lookup: find the leaf folder, then verify ancestor chain
  const listItems = escaped.map(c => `"${c}"`).join(', ');
  return `set ${varName} to missing value
        set pathComponents to {${listItems}}
        repeat with aFolder in (flattened folders)
          if name of aFolder = "${leafName}" then
            -- Verify ancestor chain matches path
            set ancestorOk to true
            set currentItem to aFolder
            repeat with i from ((count of pathComponents) - 1) to 1 by -1
              try
                set currentItem to container of currentItem
                if class of currentItem is not folder or name of currentItem is not equal to (item i of pathComponents) then
                  set ancestorOk to false
                  exit repeat
                end if
              on error
                set ancestorOk to false
                exit repeat
              end try
            end repeat
            if ancestorOk then
              set ${varName} to aFolder
              exit repeat
            end if
          end if
        end repeat
        if ${varName} is missing value then
          return "${errorReturnJson}"
        end if`;
}

/**
 * Generate AppleScript that resolves a project by name or folder-qualified path
 * (e.g. "Community Outreach" or "Work/Community Outreach").
 * Sets `varName` to the found project object, or returns `errorReturnJson` if not found.
 *
 * When a path is provided, all components except the last are treated as the folder
 * ancestry (parent, grandparent, etc.) and the last component is the project name.
 *
 * The generated code must be placed inside a `tell front document` block.
 */
export function generateProjectLookupScript(
  rawProjectPath: string,
  varName: string,
  errorReturnJson: string
): string {
  const components = rawProjectPath.split('/').filter(c => c.length > 0);
  if (components.length === 0) {
    return `set ${varName} to missing value`;
  }

  const escaped = components.map(c => c.replace(/["\\]/g, '\\$&').replace(/[\r\n]/g, ' '));
  const projectName = escaped[escaped.length - 1];

  if (components.length === 1) {
    // Simple name lookup — whose gives a direct reference
    return `set ${varName} to missing value
        try
          set ${varName} to first flattened project whose name is "${projectName}"
        end try
        if ${varName} is missing value then
          return "${errorReturnJson}"
        end if`;
  }

  // Path-based lookup: last component is project name, preceding are folder ancestry
  const folderComponents = escaped.slice(0, -1);
  const folderItems = folderComponents.map(c => `"${c}"`).join(', ');
  return `set ${varName} to missing value
        set folderPath to {${folderItems}}
        repeat with aProject in (flattened projects)
          if (name of aProject as string) = "${projectName}" then
            -- Verify folder ancestry matches path
            set ancestorOk to true
            set currentItem to container of aProject
            repeat with i from (count of folderPath) to 1 by -1
              try
                if class of currentItem is not folder or name of currentItem is not equal to (item i of folderPath) then
                  set ancestorOk to false
                  exit repeat
                end if
                set currentItem to container of currentItem
              on error
                set ancestorOk to false
                exit repeat
              end try
            end repeat
            if ancestorOk then
              set ${varName} to aProject
              exit repeat
            end if
          end if
        end repeat
        if ${varName} is missing value then
          return "${errorReturnJson}"
        end if`;
}
