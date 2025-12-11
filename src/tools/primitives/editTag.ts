import type { EditTagInput, EditTagResponse } from '../../contracts/tag-tools/edit-tag.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Edit a tag's properties (name, status, allowsNextAction).
 *
 * @param params - The edit parameters (id or name, plus update fields)
 * @returns Response with updated tag info or error
 */
export async function editTag(params: EditTagInput): Promise<EditTagResponse> {
  const script = generateEditTagScript(params);
  const tempFile = writeSecureTempFile(script, 'edit_tag', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string) as EditTagResponse;
  } finally {
    tempFile.cleanup();
  }
}

/**
 * Generate OmniJS script to edit a tag.
 */
function generateEditTagScript(params: EditTagInput): string {
  const { id, name, newName, status, allowsNextAction } = params;

  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  // Build the script
  const idCheck = id
    ? `
    try {
      tag = Tag.byIdentifier("${escapeForJS(id)}");
    } catch (e) {
      // Tag.byIdentifier throws if not found
      tag = null;
    }
    `
    : '';

  const nameCheck = name
    ? `
    if (!tag) {
      var tagName = "${escapeForJS(name)}";
      var matches = flattenedTags.filter(function(t) { return t.name === tagName; });
      if (matches.length === 0) {
        return JSON.stringify({ success: false, error: "Tag '" + tagName + "' not found" });
      }
      if (matches.length > 1) {
        var matchingIds = matches.map(function(t) { return t.id.primaryKey; });
        return JSON.stringify({
          success: false,
          error: "Ambiguous tag name '" + tagName + "'. Found " + matches.length + " matches.",
          code: "DISAMBIGUATION_REQUIRED",
          matchingIds: matchingIds
        });
      }
      tag = matches[0];
    }
    `
    : '';

  // Status mapping
  const statusUpdate =
    status !== undefined
      ? `
    if ("${status}" === "active") {
      tag.status = Tag.Status.Active;
    } else if ("${status}" === "onHold") {
      tag.status = Tag.Status.OnHold;
    } else if ("${status}" === "dropped") {
      tag.status = Tag.Status.Dropped;
    }
  `
      : '';

  // Name update
  const nameUpdate = newName !== undefined ? `tag.name = "${escapeForJS(newName)}";` : '';

  // AllowsNextAction update
  const allowsNextActionUpdate =
    allowsNextAction !== undefined ? `tag.allowsNextAction = ${allowsNextAction};` : '';

  return `(function() {
  try {
    var tag = null;
    ${idCheck}
    ${nameCheck}

    if (!tag) {
      return JSON.stringify({ success: false, error: "Tag not found" });
    }

    // Apply updates
    ${nameUpdate}
    ${statusUpdate}
    ${allowsNextActionUpdate}

    return JSON.stringify({
      success: true,
      id: tag.id.primaryKey,
      name: tag.name
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
