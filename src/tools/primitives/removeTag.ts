import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { escapeAppleScriptString } from '../../utils/appleScriptHelpers.js';
const execAsync = promisify(exec);

export interface RemoveTagParams {
  id?: string;
  name?: string;
}

export function generateAppleScript(params: RemoveTagParams): string {
  const id = params.id ? escapeAppleScriptString(params.id) : '';
  const name = params.name ? escapeAppleScriptString(params.name) : '';

  if (!id && !name) {
    return `return "{\\\"success\\\":false,\\\"error\\\":\\\"Either id or name must be provided\\\"}"`;
  }

  let script = `
  try
    tell application "OmniFocus"
      tell front document
        set foundTag to missing value
`;

  if (id) {
    script += `
        try
          set foundTag to first flattened tag whose id is "${id}"
        end try
`;
  }

  if (!id && name) {
    script += `
        try
          set foundTag to first flattened tag whose name is "${name}"
        end try
`;
  } else if (id && name) {
    script += `
        if foundTag is missing value then
          try
            set foundTag to first flattened tag whose name is "${name}"
          end try
        end if
`;
  }

  script += `
        if foundTag is not missing value then
          set tagName to name of foundTag
          set tagId to id of foundTag as string
          delete foundTag
          return "{\\\"success\\\":true,\\\"id\\\":\\"" & tagId & "\\",\\\"name\\\":\\"" & tagName & "\\"}"
        else
          return "{\\\"success\\\":false,\\\"error\\\":\\\"Tag not found\\\"}"
        end if
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
  end try
  `;

  return script;
}

export async function removeTag(params: RemoveTagParams): Promise<{success: boolean, id?: string, name?: string, error?: string}> {
  let tempFile: string | undefined;

  try {
    const script = generateAppleScript(params);

    tempFile = join(tmpdir(), `remove_tag_${crypto.randomUUID()}.applescript`);
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
    if (tempFile) {
      try { unlinkSync(tempFile); } catch {}
    }

    console.error("Error in removeTag:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in removeTag"
    };
  }
}
