import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  escapeAppleScriptString,
  escapeForJsonInAppleScript,
  JSON_ESCAPE_HANDLER,
} from '../../utils/appleScriptHelpers.js';
import { runOsascriptFile } from '../../utils/scriptExecution.js';

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
    // escapeForJsonInAppleScript for the JSON payload — an AppleScript-escaped
    // quote would re-materialize raw inside the JSON and corrupt it (#103).
    const errorJson = `{\\\"success\\\":false,\\\"error\\\":\\\"Parent tag not found: ${escapeForJsonInAppleScript(params.parentTagID)}\\\"}`;
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
    const errorJson = `{\\\"success\\\":false,\\\"error\\\":\\\"Parent tag not found: ${escapeForJsonInAppleScript(params.parentTagName)}\\\"}`;
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

  const script = JSON_ESCAPE_HANDLER + `
  try
    tell application "OmniFocus"
      tell front document
        ${parentLookup}
        set newTag to ${creationTarget}
        set tagId to id of newTag as string
        -- The name is deliberately NOT echoed: the caller already knows it, and
        -- splicing it into hand-built JSON is how quotes corrupted payloads (#103).
        return "{\\\"success\\\":true,\\\"tagId\\\":\\"" & tagId & "\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & my jsonEscape(errorMessage) & "\\"}"
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

    const { stdout, stderr } = await runOsascriptFile(tempFile);

    try { unlinkSync(tempFile); } catch {}

    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }

    try {
      const result = JSON.parse(stdout);
      return {
        success: result.success,
        tagId: result.tagId,
        // The script no longer echoes the name (#103); the caller's input is the
        // authoritative value anyway.
        name: result.success ? params.name : undefined,
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
