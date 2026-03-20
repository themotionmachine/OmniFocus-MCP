import {
  type SearchFoldersInput,
  type SearchFoldersResponse,
  SearchFoldersResponseSchema
} from '../../contracts/search-tools/search-folders.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Search folders by name using Smart Match relevance ranking.
 *
 * @param params - Search query and limit
 * @returns Promise resolving to matching folders or error
 */
export async function searchFolders(params: SearchFoldersInput): Promise<SearchFoldersResponse> {
  const script = generateSearchFoldersScript(params);
  try {
    const result = SearchFoldersResponseSchema.parse(await executeOmniJS(script));
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('Error in searchFolders', 'searchFolders', { error });
    return { success: false, error };
  }
}

/**
 * Generate OmniJS script to search folders by name.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSearchFoldersScript(params: SearchFoldersInput): string {
  const { query, limit = 50 } = params;

  const escapedQuery = escapeForJS(query);

  return `(function() {
  try {
    var query = "${escapedQuery}";
    var limit = ${limit};

    var matches = foldersMatching(query);
    var totalMatches = matches.length;
    var limited = matches.slice(0, limit);

    var results = limited.map(function(folder) {
      return {
        id: folder.id.primaryKey,
        name: folder.name,
        parentFolderName: folder.parent ? folder.parent.name : null
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
