import {
  type EditTagInput,
  type EditTagResponse,
  EditTagResponseSchema
} from '../../contracts/tag-tools/edit-tag.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Edit a tag's properties (name, status, allowsNextAction).
 *
 * @param params - The edit parameters (id or name, plus update fields)
 * @returns Response with updated tag info or error
 */
export async function editTag(params: EditTagInput): Promise<EditTagResponse> {
  const script = generateEditTagScript(params);
  const result = await executeOmniJS(script);
  return EditTagResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to edit a tag.
 */
function generateEditTagScript(params: EditTagInput): string {
  const { id, name, newName, status, allowsNextAction } = params;

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
