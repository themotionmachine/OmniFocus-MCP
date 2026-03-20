import {
  type SearchProjectsInput,
  type SearchProjectsResponse,
  SearchProjectsResponseSchema
} from '../../contracts/search-tools/search-projects.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { logger } from '../../utils/logger.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Search projects by name using Smart Match relevance ranking.
 *
 * @param params - Search query and limit
 * @returns Promise resolving to matching projects or error
 */
export async function searchProjects(params: SearchProjectsInput): Promise<SearchProjectsResponse> {
  const script = generateSearchProjectsScript(params);
  try {
    const result = SearchProjectsResponseSchema.parse(await executeOmniJS(script));
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('Error in searchProjects', 'searchProjects', { error });
    return { success: false, error };
  }
}

/**
 * Generate OmniJS script to search projects by name.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSearchProjectsScript(params: SearchProjectsInput): string {
  const { query, limit = 50 } = params;

  const escapedQuery = escapeForJS(query);

  return `(function() {
  try {
    var query = "${escapedQuery}";
    var limit = ${limit};

    var matches = projectsMatching(query);
    var totalMatches = matches.length;
    var limited = matches.slice(0, limit);

    function mapProjectStatus(project) {
      var s = project.status;
      if (s === Project.Status.Active) return "active";
      if (s === Project.Status.Done) return "done";
      if (s === Project.Status.Dropped) return "dropped";
      if (s === Project.Status.OnHold) return "onHold";
      return "active";
    }

    var results = limited.map(function(project) {
      return {
        id: project.id.primaryKey,
        name: project.name,
        status: mapProjectStatus(project),
        folderName: project.parentFolder ? project.parentFolder.name : null
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
