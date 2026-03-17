import type {
  MarkReviewedInput,
  MarkReviewedResponse
} from '../../contracts/review-tools/mark-reviewed.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Mark one or more projects as reviewed by advancing their nextReviewDate.
 *
 * Uses Calendar API for date math (NEVER millisecond math) to correctly
 * handle months/years with varying lengths.
 *
 * Critical constraints:
 * - NO markReviewed() method exists in OmniJS
 * - Must set project.nextReviewDate = today + reviewInterval directly
 * - lastReviewDate is READ-ONLY; OmniFocus updates it only via UI (Shift-Cmd-R)
 *
 * @param params - Input containing projects array (1-100 items)
 * @returns Promise resolving to batch result with per-item success/failure
 */
export async function markReviewed(params: MarkReviewedInput): Promise<MarkReviewedResponse> {
  const script = generateMarkReviewedScript(params);
  const result = await executeOmniJS(script);
  return result as MarkReviewedResponse;
}

/**
 * Generate OmniJS script to mark projects as reviewed.
 * Exported for manual testing in OmniFocus Script Editor.
 *
 * The generated script:
 * 1. Iterates over project identifiers
 * 2. Resolves each project by ID or name
 * 3. Checks for reviewInterval (fails with NO_REVIEW_INTERVAL if missing)
 * 4. Calculates new nextReviewDate = today + reviewInterval using Calendar API
 * 5. Sets project.nextReviewDate directly
 * 6. Returns batch results with per-item success/failure
 */
export function generateMarkReviewedScript(params: MarkReviewedInput): string {
  const projectIdentifiers = params.projects.map((p) => ({
    id: p.id ?? '',
    name: p.name ?? ''
  }));

  return `(function() {
  try {
    var projectIdentifiers = ${JSON.stringify(projectIdentifiers)};
    var results = [];
    var succeeded = 0;
    var failed = 0;
    var today = Calendar.current.startOfDay(new Date());

    projectIdentifiers.forEach(function(identifier, index) {
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

      if (!project.reviewInterval) {
        result.projectId = project.id.primaryKey;
        result.projectName = project.name;
        result.error = "Project '" + project.name + "' has no review interval configured";
        result.code = 'NO_REVIEW_INTERVAL';
        results.push(result);
        failed++;
        return;
      }

      var previousNextReviewDate = project.nextReviewDate ? project.nextReviewDate.toISOString() : null;

      var dc = new DateComponents();
      switch (project.reviewInterval.unit) {
        case 'days':   dc.day   = project.reviewInterval.steps; break;
        case 'weeks':  dc.day   = project.reviewInterval.steps * 7; break;
        case 'months': dc.month = project.reviewInterval.steps; break;
        case 'years':  dc.year  = project.reviewInterval.steps; break;
      }

      var newNextReviewDate = Calendar.current.dateByAddingDateComponents(today, dc);
      project.nextReviewDate = newNextReviewDate;

      result.projectId = project.id.primaryKey;
      result.projectName = project.name;
      result.success = true;
      result.previousNextReviewDate = previousNextReviewDate;
      result.newNextReviewDate = newNextReviewDate.toISOString();

      results.push(result);
      succeeded++;
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: { total: projectIdentifiers.length, succeeded: succeeded, failed: failed }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
