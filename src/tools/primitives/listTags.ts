import type { ListTagsInput, ListTagsResponse } from '../../contracts/tag-tools/list-tags.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * List tags with optional filtering.
 *
 * @param params - Input parameters for listing tags
 * @returns Promise resolving to list of tags or error
 */
export async function listTags(params: ListTagsInput): Promise<ListTagsResponse> {
  const script = generateListTagsScript(params);
  const tempFile = writeSecureTempFile(script, 'list_tags', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string) as ListTagsResponse;
  } finally {
    tempFile.cleanup();
  }
}

/**
 * Generate OmniJS script to list tags with filtering.
 */
function generateListTagsScript(params: ListTagsInput): string {
  const { status, parentId, includeChildren = true } = params;

  // Escape status and parentId for safe embedding in JS
  const escapedStatus = status ? escapeForJS(status) : null;
  const escapedParentId = parentId ? escapeForJS(parentId) : null;

  return `(function() {
  try {
    var results = [];
    var tagList;

    // Determine which tag collection to use
    ${
      escapedParentId
        ? `
    // Filter by parent
    var parent = Tag.byIdentifier("${escapedParentId}");
    if (!parent) {
      return JSON.stringify({
        success: false,
        error: "Parent tag '${escapedParentId}' not found"
      });
    }
    tagList = ${includeChildren ? 'parent.flattenedTags' : 'parent.tags'};
    `
        : `
    // Use database tags
    tagList = ${includeChildren ? 'flattenedTags' : 'tags'};
    `
    }

    // Map status helper function
    function mapStatus(tag) {
      if (tag.status === Tag.Status.OnHold) return "onHold";
      if (tag.status === Tag.Status.Dropped) return "dropped";
      return "active";
    }

    // Process tags
    tagList.forEach(function(tag) {
      var tagStatus = mapStatus(tag);

      // Apply status filter if specified
      ${escapedStatus ? `if (tagStatus !== "${escapedStatus}") return;` : '// No status filter'}

      results.push({
        id: tag.id.primaryKey,
        name: tag.name,
        status: tagStatus,
        parentId: tag.parent ? tag.parent.id.primaryKey : null,
        allowsNextAction: tag.allowsNextAction,
        taskCount: tag.remainingTasks.length
      });
    });

    return JSON.stringify({ success: true, tags: results });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}

/**
 * Escape string for safe embedding in JavaScript.
 */
function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
