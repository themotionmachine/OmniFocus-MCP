import {
  type SearchTagsInput,
  type SearchTagsResponse,
  SearchTagsResponseSchema
} from '../../contracts/search-tools/search-tags.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Search tags by name using Smart Match relevance ranking.
 *
 * @param params - Search query and limit
 * @returns Promise resolving to matching tags or error
 */
export async function searchTags(params: SearchTagsInput): Promise<SearchTagsResponse> {
  const script = generateSearchTagsScript(params);
  try {
    const result = SearchTagsResponseSchema.parse(await executeOmniJS(script));
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('Error in searchTags', 'searchTags', { error });
    return { success: false, error };
  }
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
