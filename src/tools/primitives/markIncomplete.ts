import type {
  MarkIncompleteInput,
  MarkIncompleteResponse
} from '../../contracts/status-tools/mark-incomplete.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Reopen one or more completed or dropped tasks/projects.
 *
 * Auto-detects item state and uses the appropriate mechanism:
 * - Completed task → task.markIncomplete()
 * - Dropped task → task.active = true
 * - Completed project → project.markIncomplete()
 * - Dropped project → project.status = Project.Status.Active
 * - Already active → no-op success with code: 'ALREADY_ACTIVE'
 *
 * @param params - Input containing items array (1-100 items)
 * @returns Promise resolving to batch result with per-item success/failure
 */
export async function markIncomplete(params: MarkIncompleteInput): Promise<MarkIncompleteResponse> {
  const script = generateMarkIncompleteScript(params);
  const result = await executeOmniJS(script);
  return result as MarkIncompleteResponse;
}

/**
 * Generate OmniJS script to reopen completed or dropped items.
 * Exported for manual testing in OmniFocus Script Editor.
 *
 * The generated script:
 * 1. Iterates over item identifiers
 * 2. Resolves each item by ID (tries Task then Project) or by name
 * 3. Detects current state (completed/dropped/active)
 * 4. Applies the appropriate method to reopen
 * 5. Returns batch results with per-item success/failure
 */
export function generateMarkIncompleteScript(params: MarkIncompleteInput): string {
  const itemIdentifiers = params.items.map((item) => ({
    id: item.id ?? '',
    name: item.name ?? ''
  }));

  return `(function() {
  try {
    var itemIdentifiers = ${JSON.stringify(itemIdentifiers)};
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
        var taskById = Task.byIdentifier(identifier.id);
        if (taskById) {
          item = taskById;
          isProject = false;
        } else {
          var projectById = Project.byIdentifier(identifier.id);
          if (projectById) {
            item = projectById;
            isProject = true;
          }
        }
      } else if (identifier.name) {
        // Search tasks and projects by name
        var taskMatches = flattenedTasks.filter(function(t) { return t.name === identifier.name; });
        var projectMatches = flattenedProjects.filter(function(p) { return p.name === identifier.name; });
        var allMatches = taskMatches.map(function(t) {
          return { item: t, isProject: false };
        }).concat(projectMatches.map(function(p) {
          return { item: p, isProject: true };
        }));

        if (allMatches.length === 1) {
          item = allMatches[0].item;
          isProject = allMatches[0].isProject;
        } else if (allMatches.length > 1) {
          result.error = "Multiple items match '" + identifier.name + "'. Use ID.";
          result.code = 'DISAMBIGUATION_REQUIRED';
          result.candidates = allMatches.map(function(m) {
            return {
              id: m.item.id.primaryKey,
              name: m.item.name,
              type: m.isProject ? 'project' : 'task'
            };
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

      result.itemId = item.id.primaryKey;
      result.itemName = item.name;
      result.itemType = isProject ? 'project' : 'task';

      if (isProject) {
        if (item.status === Project.Status.Done) {
          item.markIncomplete();
        } else if (item.status === Project.Status.Dropped) {
          item.status = Project.Status.Active;
        } else {
          result.code = 'ALREADY_ACTIVE';
        }
      } else {
        if (item.completed) {
          item.markIncomplete();
        } else if (item.dropDate !== null) {
          item.active = true;
        } else {
          result.code = 'ALREADY_ACTIVE';
        }
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
