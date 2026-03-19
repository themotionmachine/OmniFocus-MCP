import {
  type MarkCompleteInput,
  type MarkCompleteResponse,
  MarkCompleteResponseSchema
} from '../../contracts/status-tools/mark-complete.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Mark one or more tasks or projects as complete.
 *
 * Supports optional backdating via completionDate (ISO 8601 string).
 * Idempotent: already-completed items return success: true with code ALREADY_COMPLETED.
 *
 * Item lookup order:
 * 1. If id: try Task.byIdentifier(id), then Project.byIdentifier(id)
 * 2. If name only: search flattenedTasks and flattenedProjects
 *
 * @param params - Input containing items array (1-100) and optional completionDate
 * @returns Promise resolving to batch result with per-item success/failure
 */
export async function markComplete(params: MarkCompleteInput): Promise<MarkCompleteResponse> {
  const script = generateMarkCompleteScript(params);
  const result = await executeOmniJS(script);
  return MarkCompleteResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to mark items (tasks or projects) as complete.
 * Exported for manual testing in OmniFocus Script Editor.
 *
 * The generated script:
 * 1. Iterates over item identifiers
 * 2. Resolves each item by ID (Task first, then Project) or by name
 * 3. Checks for disambiguation (multiple name matches)
 * 4. Checks for already-completed (idempotent)
 * 5. Calls item.markComplete(completionDate) where completionDate is new Date(string) or null
 * 6. Returns batch results with per-item success/failure
 */
export function generateMarkCompleteScript(params: MarkCompleteInput): string {
  const itemIdentifiers = params.items.map((item) => ({
    id: item.id ?? '',
    name: item.name ?? ''
  }));

  const completionDateStr = params.completionDate ?? null;

  return `(function() {
  try {
    var itemIdentifiers = ${JSON.stringify(itemIdentifiers)};
    var completionDateArg = ${completionDateStr ? JSON.stringify(completionDateStr) : 'null'};
    var completionDate = completionDateArg ? new Date(completionDateArg) : null;
    var results = [];
    var succeeded = 0;
    var failed = 0;
    var completedIds = {};

    itemIdentifiers.forEach(function(identifier) {
      var item = null;
      var itemType = 'task';
      var result = {
        itemId: identifier.id || '',
        itemName: identifier.name || '',
        itemType: 'task',
        success: false
      };

      if (identifier.id) {
        // Try Task first, then Project
        item = Task.byIdentifier(identifier.id);
        if (item) {
          itemType = 'task';
        } else {
          item = Project.byIdentifier(identifier.id);
          if (item) {
            itemType = 'project';
          }
        }
      } else if (identifier.name) {
        // Search both flattenedTasks and flattenedProjects by name
        var taskMatches = flattenedTasks.filter(function(t) { return t.name === identifier.name; });
        var projectMatches = flattenedProjects.filter(function(p) { return p.name === identifier.name; });
        var allMatches = taskMatches.map(function(t) { return { item: t, type: 'task' }; })
          .concat(projectMatches.map(function(p) { return { item: p, type: 'project' }; }));

        if (allMatches.length === 1) {
          item = allMatches[0].item;
          itemType = allMatches[0].type;
        } else if (allMatches.length > 1) {
          result.error = "Multiple items match '" + identifier.name + "'. Use ID for precision.";
          result.code = 'DISAMBIGUATION_REQUIRED';
          result.candidates = allMatches.map(function(m) {
            return { id: m.item.id.primaryKey, name: m.item.name, type: m.type };
          });
          results.push(result);
          failed++;
          return;
        }
      }

      if (!item) {
        result.error = 'Item not found: ' + (identifier.id || identifier.name);
        result.code = 'NOT_FOUND';
        results.push(result);
        failed++;
        return;
      }

      var primaryKey = item.id.primaryKey;
      result.itemId = primaryKey;
      result.itemName = item.name;
      result.itemType = itemType;

      // Idempotent: check if already completed (or completed in this batch)
      var isCompleted = false;
      if (itemType === 'task') {
        isCompleted = item.completed || (completedIds[primaryKey] === true);
      } else {
        isCompleted = (item.status && item.status.name === 'Done') || (completedIds[primaryKey] === true);
      }

      if (isCompleted) {
        result.success = true;
        result.code = 'ALREADY_COMPLETED';
        results.push(result);
        succeeded++;
        return;
      }

      // Mark complete
      if (completionDate) {
        item.markComplete(completionDate);
      } else {
        item.markComplete();
      }
      completedIds[primaryKey] = true;

      result.success = true;
      results.push(result);
      succeeded++;
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: { total: itemIdentifiers.length, succeeded: succeeded, failed: failed }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
