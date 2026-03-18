import type { DropItemsInput, DropItemsResponse } from '../../contracts/status-tools/drop-items.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Drop one or more tasks or projects in OmniFocus.
 *
 * Preserves items in the database but removes them from active views.
 * Requires OmniFocus 3.8+. The script performs a fail-fast version check.
 *
 * Drop semantics:
 * - Tasks: `task.drop(allOccurrences)` — controls repeating task behavior
 * - Projects: `project.status = Project.Status.Dropped` — no drop() method
 *
 * Idempotent: already-dropped items return success=true with ALREADY_DROPPED code.
 *
 * @param params - Input containing items array (1-100) and allOccurrences flag
 * @returns Promise resolving to batch result with per-item success/failure
 */
export async function dropItems(params: DropItemsInput): Promise<DropItemsResponse> {
  const script = generateDropItemsScript(params);
  const result = await executeOmniJS(script);
  return result as DropItemsResponse;
}

/**
 * Generate OmniJS script to drop items (tasks or projects).
 * Exported for manual testing in OmniFocus Script Editor.
 *
 * The generated script:
 * 1. Performs fail-fast version check (OmniFocus 3.8+)
 * 2. Iterates over item identifiers
 * 3. Resolves each item by ID (tries task then project) or name
 * 4. Checks if already dropped (idempotent)
 * 5. Drops: task.drop(allOccurrences) or project.status = Project.Status.Dropped
 * 6. Returns batch results with per-item success/failure
 */
export function generateDropItemsScript(params: DropItemsInput): string {
  const itemIdentifiers = params.items.map((item) => ({
    id: item.id ?? '',
    name: item.name ?? ''
  }));

  const allOccurrences = params.allOccurrences ?? true;

  return `(function() {
  try {
    // Fail-fast version check: requires OmniFocus 3.8+
    if (!app.userVersion.atLeast(new Version("3.8"))) {
      return JSON.stringify({
        success: false,
        error: "drop_items requires OmniFocus 3.8 or later. Current version: " + app.userVersion.versionString
      });
    }

    var itemIdentifiers = ${JSON.stringify(itemIdentifiers)};
    var allOccurrences = ${JSON.stringify(allOccurrences)};
    var results = [];
    var succeeded = 0;
    var failed = 0;

    itemIdentifiers.forEach(function(identifier) {
      var item = null;
      var isProject = false;
      var result = {
        itemId: identifier.id || '',
        itemName: identifier.name || '',
        itemType: 'task',
        success: false
      };

      if (identifier.id) {
        // Try task first, then project
        item = Task.byIdentifier(identifier.id);
        if (!item) {
          item = Project.byIdentifier(identifier.id);
          if (item) {
            isProject = true;
            result.itemType = 'project';
          }
        }
      } else if (identifier.name) {
        // Search tasks first
        var taskMatches = flattenedTasks.filter(function(t) { return t.name === identifier.name; });
        var projectMatches = flattenedProjects.filter(function(p) { return p.name === identifier.name; });
        var allMatches = taskMatches.map(function(t) { return { id: t.id.primaryKey, name: t.name, type: 'task' }; })
          .concat(projectMatches.map(function(p) { return { id: p.id.primaryKey, name: p.name, type: 'project' }; }));

        if (allMatches.length === 1) {
          if (taskMatches.length === 1) {
            item = taskMatches[0];
          } else {
            item = projectMatches[0];
            isProject = true;
            result.itemType = 'project';
          }
        } else if (allMatches.length > 1) {
          result.error = "Multiple items match '" + identifier.name + "'. Use ID for precision.";
          result.code = 'DISAMBIGUATION_REQUIRED';
          result.candidates = allMatches;
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

      // Populate resolved identity
      result.itemId = item.id.primaryKey;
      result.itemName = item.name;

      // Idempotent check: already dropped?
      var alreadyDropped = isProject
        ? (item.status === Project.Status.Dropped)
        : (item.dropDate !== null);

      if (alreadyDropped) {
        result.success = true;
        result.code = 'ALREADY_DROPPED';
        results.push(result);
        succeeded++;
        return;
      }

      // Perform the drop
      if (isProject) {
        item.status = Project.Status.Dropped;
      } else {
        item.drop(allOccurrences);
      }

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
