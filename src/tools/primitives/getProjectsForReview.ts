import type {
  GetProjectsForReviewInput,
  GetProjectsForReviewResponse
} from '../../contracts/review-tools/get-projects-for-review.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Get projects that are due for periodic GTD review.
 *
 * @param params - Input parameters for filtering review projects
 * @returns Promise resolving to list of review projects or error
 */
export async function getProjectsForReview(
  params: GetProjectsForReviewInput
): Promise<GetProjectsForReviewResponse> {
  const script = generateGetProjectsForReviewScript(params);
  const result = await executeOmniJS(script);
  return result as GetProjectsForReviewResponse;
}

/**
 * Generate OmniJS script to query projects due for review.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateGetProjectsForReviewScript(params: GetProjectsForReviewInput): string {
  const {
    includeFuture = false,
    futureDays = 7,
    includeAll = false,
    includeInactive = false,
    folderId,
    folderName,
    limit = 100
  } = params;

  // Clamp limit to 1-1000 range
  const clampedLimit = Math.max(1, Math.min(1000, limit));

  // Escape strings for safe embedding in JS
  const escapedFolderId = folderId ? escapeForJS(folderId) : null;
  const escapedFolderName = folderName ? escapeForJS(folderName) : null;

  return `(function() {
  try {
    var today = Calendar.current.startOfDay(new Date());
    var includeFuture = ${includeFuture};
    var futureDays = ${futureDays};
    var includeAll = ${includeAll};
    var includeInactive = ${includeInactive};
    var limit = ${clampedLimit};
    var folderId = ${escapedFolderId !== null ? `"${escapedFolderId}"` : 'null'};
    var folderName = ${escapedFolderName !== null ? `"${escapedFolderName}"` : 'null'};

    // Calculate future horizon using Calendar API (not millisecond math)
    // Note: DateComponents has no 'week' property in OmniJS, so futureDays is always in days
    var futureDC = new DateComponents();
    futureDC.day = futureDays;
    var futureHorizon = Calendar.current.dateByAddingDateComponents(today, futureDC);

    // Validate folderId is not empty string (extra guard beyond schema)
    if (folderId !== null && folderId.length === 0) {
      return JSON.stringify({ success: false, error: 'Invalid folderId: cannot be empty string' });
    }

    // Resolve folder scope
    var targetFolder = null;
    if (folderId) {
      targetFolder = Folder.byIdentifier(folderId);
      if (!targetFolder) {
        return JSON.stringify({ success: false, error: 'Folder not found: ' + folderId });
      }
    } else if (folderName) {
      targetFolder = flattenedFolders.byName(folderName);
      if (!targetFolder) {
        return JSON.stringify({ success: false, error: 'Folder not found: ' + folderName });
      }
    }

    var results = [];
    var dueCount = 0;
    var upcomingCount = 0;

    flattenedProjects.forEach(function(project) {
      // Exclude projects without review interval configured
      if (!project.reviewInterval) return;
      // Exclude projects without a nextReviewDate (transient state)
      if (!project.nextReviewDate) return;

      // Exclude projects disabled via set_review_interval (365-year sentinel workaround).
      // OmniJS cannot set reviewInterval/nextReviewDate to null, so disabling uses
      // a sentinel of { steps: 365, unit: 'years' } with nextReviewDate pushed far future.
      if (project.reviewInterval.steps === 365 && project.reviewInterval.unit === 'years') return;

      // Status filter: exclude Done/Dropped unless includeInactive
      if (!includeInactive) {
        var s = project.status.name;
        if (s === 'Done' || s === 'Dropped') return;
      }

      // Folder scope filter (recursive ancestor check)
      if (targetFolder) {
        var inFolder = false;
        var f = project.parentFolder;
        while (f) {
          if (f.id.primaryKey === targetFolder.id.primaryKey) {
            inFolder = true;
            break;
          }
          f = f.parent;
        }
        if (!inFolder) return;
      }

      // Date-based inclusion check
      var nextReview = project.nextReviewDate;
      var isDue = nextReview.getTime() <= today.getTime();
      var isUpcoming = !isDue && nextReview.getTime() <= futureHorizon.getTime();
      var included = includeAll || isDue || (includeFuture && isUpcoming);
      if (!included) return;

      // Track counts
      if (isDue) {
        dueCount++;
      } else {
        upcomingCount++;
      }

      results.push({
        id: project.id.primaryKey,
        name: project.name,
        status: project.status.name,
        flagged: project.flagged,
        reviewInterval: {
          steps: project.reviewInterval.steps,
          unit: project.reviewInterval.unit
        },
        lastReviewDate: project.lastReviewDate ? project.lastReviewDate.toISOString() : null,
        nextReviewDate: project.nextReviewDate.toISOString(),
        remainingCount: project.flattenedTasks.filter(function(t) {
          return t.taskStatus !== Task.Status.Completed && t.taskStatus !== Task.Status.Dropped;
        }).length
      });
    });

    // Sort: nextReviewDate ascending, then name alphabetical as tiebreaker
    results.sort(function(a, b) {
      var dateCompare = new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.name.localeCompare(b.name);
    });

    var totalCount = results.length;
    if (results.length > limit) {
      results = results.slice(0, limit);
    }

    return JSON.stringify({
      success: true,
      projects: results,
      totalCount: totalCount,
      dueCount: dueCount,
      upcomingCount: upcomingCount
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
