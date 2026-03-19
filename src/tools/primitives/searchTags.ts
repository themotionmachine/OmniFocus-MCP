import type {
  SearchTagsInput,
  SearchTagsResponse
} from '../../contracts/search-tools/search-tags.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Search tags by name using Smart Match relevance ranking.
 *
 * @param params - Search query and limit
 * @returns Promise resolving to matching tags or error
 */
export async function searchTags(params: SearchTagsInput): Promise<SearchTagsResponse> {
  const script = generateSearchTagsScript(params);
  const result = await executeOmniJS(script);
  return result as SearchTagsResponse;
}

/**
 * Generate OmniJS script to search tags by name.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSearchTagsScript(params: SearchTagsInput): string {
  const { query, limit = 50 } = params;

  const escapedQuery = escapeForJS(query);

  return `(function() {
  try {
    var query = "${escapedQuery}";
    var limit = ${limit};

    var matches = tagsMatching(query);
    var totalMatches = matches.length;
    var limited = matches.slice(0, limit);

    function mapTagStatus(tag) {
      if (tag.status === Tag.Status.OnHold) return "onHold";
      if (tag.status === Tag.Status.Dropped) return "dropped";
      return "active";
    }

    var results = limited.map(function(tag) {
      return {
        id: tag.id.primaryKey,
        name: tag.name,
        status: mapTagStatus(tag),
        parentTagName: tag.parent ? tag.parent.name : null
      };
    });

    return JSON.stringify({
      success: true,
      results: results,
      totalMatches: totalMatches
    });
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
