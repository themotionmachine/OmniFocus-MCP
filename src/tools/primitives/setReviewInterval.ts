import type {
  SetReviewIntervalInput,
  SetReviewIntervalResponse
} from '../../contracts/review-tools/set-review-interval.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Set or clear the review interval for one or more projects.
 *
 * Applies the same interval to all specified projects in a single OmniJS
 * execution. Uses value object semantics for ReviewInterval assignment and
 * the Calendar API for date calculations.
 *
 * @param params - Input parameters including projects, interval, and options
 * @returns Promise resolving to batch results or catastrophic error
 */
export async function setReviewInterval(
  params: SetReviewIntervalInput
): Promise<SetReviewIntervalResponse> {
  const script = generateSetReviewIntervalScript(params);
  const result = await executeOmniJS(script);
  return result as SetReviewIntervalResponse;
}

/**
 * Generate OmniJS script to set review intervals for projects.
 * Exported for manual testing in OmniFocus Script Editor.
 *
 * Key API constraints:
 * - ReviewInterval is a value object proxy: read existing, modify .steps/.unit, write back
 * - When project has no reviewInterval (null), direct object assignment is used as fallback
 * - Cannot set project.reviewInterval = null (throws) — OmniJS limitation
 * - Disable uses 365-year sentinel; get_projects_for_review recognizes and excludes these
 * - Use Calendar/DateComponents API (never millisecond math)
 * - DateComponents has no 'week' property; use dc.day = steps * 7 for weeks
 * - When project has no nextReviewDate: always set initial nextReviewDate = today + interval
 */
export function generateSetReviewIntervalScript(params: SetReviewIntervalInput): string {
  const { projects, interval, recalculateNextReview } = params;

  const projectIdentifiers = projects.map((p) => ({
    id: p.id ?? '',
    name: p.name ?? ''
  }));

  const intervalJson = interval === null ? 'null' : JSON.stringify(interval);

  return `(function() {
  try {
    var projectIdentifiers = ${JSON.stringify(projectIdentifiers)};
    var interval = ${intervalJson};
    var recalculateNextReview = ${recalculateNextReview};
    var results = [];
    var succeeded = 0;
    var failed = 0;
    var today = Calendar.current.startOfDay(new Date());

    projectIdentifiers.forEach(function(identifier) {
      var project = null;
      var result = {
        projectId: identifier.id || '',
        projectName: identifier.name || '',
        success: false
      };

      if (identifier.id) {
        project = Project.byIdentifier(identifier.id);
      } else if (identifier.name) {
        var matches = flattenedProjects.filter(function(p) { return p.name === identifier.name; });
        if (matches.length === 1) {
          project = matches[0];
        } else if (matches.length > 1) {
          result.error = "Multiple projects match '" + identifier.name + "'. Use ID for precision.";
          result.code = 'DISAMBIGUATION_REQUIRED';
          result.candidates = matches.map(function(p) { return { id: p.id.primaryKey, name: p.name }; });
          results.push(result);
          failed++;
          return;
        }
      }

      if (!project) {
        result.error = 'Project not found: ' + (identifier.id || identifier.name);
        result.code = 'NOT_FOUND';
        results.push(result);
        failed++;
        return;
      }

      var previousInterval = project.reviewInterval ? {
        steps: project.reviewInterval.steps,
        unit: project.reviewInterval.unit
      } : null;

      result.projectId = project.id.primaryKey;
      result.projectName = project.name;
      result.previousInterval = previousInterval;

      if (interval === null) {
        // OmniJS limitation: reviewInterval and nextReviewDate cannot be set to null.
        // Workaround: set interval to maximum (365 years) and push nextReviewDate
        // far into the future so the project effectively never appears in review queries.
        if (project.reviewInterval) {
          var riDisable = project.reviewInterval;
          riDisable.steps = 365;
          riDisable.unit = 'years';
          project.reviewInterval = riDisable;
          var dcDisable = new DateComponents();
          dcDisable.year = 365;
          project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dcDisable);
        }
        result.newInterval = null;
      } else {
        // ReviewInterval is a value object proxy: read existing, modify, write back.
        // When project already has an interval, use read-modify-write.
        // When project has no interval (null), use direct object assignment.
        var ri = project.reviewInterval;
        if (ri) {
          ri.steps = interval.steps;
          ri.unit = interval.unit;
          project.reviewInterval = ri;
        } else {
          // Project has no reviewInterval yet — assign directly to enable reviews
          project.reviewInterval = { steps: interval.steps, unit: interval.unit };
        }
        if (!project.nextReviewDate || recalculateNextReview) {
          var dc = new DateComponents();
          switch (interval.unit) {
            case 'days':   dc.day   = interval.steps; break;
            case 'weeks':  dc.day   = interval.steps * 7; break;
            case 'months': dc.month = interval.steps; break;
            case 'years':  dc.year  = interval.steps; break;
          }
          project.nextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);
        }
        result.newInterval = { steps: interval.steps, unit: interval.unit };
      }

      result.success = true;
      results.push(result);
      succeeded++;
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: {
        total: projectIdentifiers.length,
        succeeded: succeeded,
        failed: failed
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
