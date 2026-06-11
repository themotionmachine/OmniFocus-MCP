import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { escapeAppleScriptString } from '../../utils/appleScriptHelpers.js';
const execAsync = promisify(exec);

export interface CreateTagParams {
  name: string;
  parentTagName?: string; // Name of an existing tag to nest the new tag under
  parentTagID?: string;   // ID of an existing tag to nest the new tag under (takes precedence over parentTagName)
}

/**
 * Generate pure AppleScript for tag creation
 */
export function generateAppleScript(params: CreateTagParams): string {
  const name = escapeAppleScriptString(params.name);

  // Resolve the parent tag (by id or name) when nesting is requested.
  let parentLookup = '';
  let creationTarget = 'make new tag with properties {name:"' + name + '"}';

  if (params.parentTagID) {
    const parentId = escapeAppleScriptString(params.parentTagID);
    const errorJson = `{\\\"success\\\":false,\\\"error\\\":\\\"Parent tag not found: ${parentId}\\\"}`;
    parentLookup = `
        set parentTag to missing value
        try
          set parentTag to first flattened tag whose id is "${parentId}"
        end try
        if parentTag is missing value then
          return "${errorJson}"
        end if`;
    creationTarget = 'make new tag with properties {name:"' + name + '"} at end of tags of parentTag';
  } else if (params.parentTagName) {
    const parentName = escapeAppleScriptString(params.parentTagName);
    const errorJson = `{\\\"success\\\":false,\\\"error\\\":\\\"Parent tag not found: ${parentName}\\\"}`;
    parentLookup = `
        set parentTag to missing value
        try
          set parentTag to first flattened tag where name = "${parentName}"
        end try
        if parentTag is missing value then
          return "${errorJson}"
        end if`;
    creationTarget = 'make new tag with properties {name:"' + name + '"} at end of tags of parentTag';
  }

  const script = `
  try
    tell application "OmniFocus"
      tell front document
        ${parentLookup}
        set newTag to ${creationTarget}
        set tagId to id of newTag as string
        return "{\\\"success\\\":true,\\\"tagId\\\":\\"" & tagId & "\\",\\\"name\\\":\\"${name}\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
  end try
  `;

  return script;
}

/**
 * Create a tag in OmniFocus
 */
export async function createTag(params: CreateTagParams): Promise<{success: boolean, tagId?: string, name?: string, error?: string}> {
  let tempFile: string | undefined;

  try {
    const script = generateAppleScript(params);

    tempFile = join(tmpdir(), `create_tag_${crypto.randomUUID()}.applescript`);
    writeFileSync(tempFile, script, { encoding: 'utf8' });

    const { stdout, stderr } = await execAsync(`osascript "${tempFile}"`);

    try { unlinkSync(tempFile); } catch {}

    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }

    try {
      const result = JSON.parse(stdout);
      return {
        success: result.success,
        tagId: result.tagId,
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
    if (tempFile) {
      try { unlinkSync(tempFile); } catch {}
    }

    console.error("Error in createTag:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in createTag"
    };
  }
}
