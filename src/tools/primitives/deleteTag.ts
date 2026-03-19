import {
  type DeleteTagInput,
  type DeleteTagResponse,
  DeleteTagResponseSchema
} from '../../contracts/tag-tools/delete-tag.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Deletes a tag from OmniFocus by ID or name.
 * When deleting a parent tag, all child tags are also deleted (OmniFocus native behavior).
 * Tasks that had the deleted tag will have the tag reference removed (tasks are NOT deleted).
 *
 * @param params - Delete tag parameters (id or name)
 * @returns DeleteTagResponse with success status and deleted tag details, or error with disambiguation if needed
 */
export async function deleteTag(params: DeleteTagInput): Promise<DeleteTagResponse> {
  const script = generateDeleteTagScript(params);
  const result = await executeOmniJS(script);
  return DeleteTagResponseSchema.parse(result);
}

/**
 * Generates the OmniJS script to delete a tag.
 */
function generateDeleteTagScript(params: DeleteTagInput): string {
  const { id, name } = params;

  return `(function() {
  try {
    var tag = null;

    // Find tag by ID or name
    ${
      id
        ? `
    try {
      tag = Tag.byIdentifier("${escapeForJS(id)}");
    } catch (e) {
      // Tag.byIdentifier throws if not found
      tag = null;
    }
    `
        : ''
    }
    ${
      name && !id
        ? `
    var nameToFind = "${escapeForJS(name)}";
    var matchingTags = flattenedTags.filter(function(t) {
      return t.name === nameToFind;
    });

    if (matchingTags.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Tag '" + nameToFind + "' not found"
      });
    }

    if (matchingTags.length > 1) {
      var matchingIds = matchingTags.map(function(t) {
        return t.id.primaryKey;
      });
      return JSON.stringify({
        success: false,
        error: "Ambiguous tag name '" + nameToFind + "'. Found " + matchingIds.length + " matches: " + matchingIds.join(", ") + ". Please specify by ID.",
        code: "DISAMBIGUATION_REQUIRED",
        matchingIds: matchingIds
      });
    }

    tag = matchingTags[0];
    `
        : ''
    }

    // Check if tag was found
    if (!tag) {
      return JSON.stringify({
        success: false,
        error: "Tag '${id ? escapeForJS(id) : name ? escapeForJS(name) : ''}' not found"
      });
    }

    // Capture tag info BEFORE deletion
    var tagId = tag.id.primaryKey;
    var tagName = tag.name;

    // Delete the tag (children are deleted automatically by OmniFocus)
    deleteObject(tag);

    return JSON.stringify({
      success: true,
      id: tagId,
      name: tagName
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
