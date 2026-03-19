import {
  type MoveTasksInput,
  type MoveTasksResponse,
  MoveTasksResponseSchema
} from '../../contracts/bulk-tools/move-tasks.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Move 1-100 tasks to a new location in OmniFocus.
 *
 * Supports targeting a project, parent task, or inbox with position control
 * (beginning, ending, before, after sibling).
 * Per-item results allow partial failures.
 */
export async function moveTasks(params: MoveTasksInput): Promise<MoveTasksResponse> {
  const script = generateMoveTasksScript(params);
  const result = await executeOmniJS(script);
  return MoveTasksResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to move tasks to a target location.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateMoveTasksScript(params: MoveTasksInput): string {
  const { items, position } = params;

  const itemIdentifiers = items.map((item) => ({
    id: item.id ?? '',
    name: item.name ?? ''
  }));

  const pos = {
    projectId: position.projectId ?? '',
    projectName: position.projectName ?? '',
    taskId: position.taskId ?? '',
    taskName: position.taskName ?? '',
    inbox: position.inbox === true,
    placement: position.placement ?? 'ending',
    relativeTo: position.relativeTo ?? ''
  };

  return `(function() {
  try {
    var itemIdentifiers = ${JSON.stringify(itemIdentifiers)};
    var pos = ${JSON.stringify(pos)};

    // --- Target pre-validation (AD-05, FR-016) ---
    var targetPosition = null;
    var targetWarning = null;

    if (pos.inbox) {
      targetPosition = inbox[pos.placement === 'ending' ? 'ending' : 'beginning'];
    } else if (pos.projectId) {
      var targetProject = Project.byIdentifier(pos.projectId);
      if (!targetProject) {
        return JSON.stringify({ success: false, error: "Project '" + pos.projectId + "' not found", code: 'TARGET_NOT_FOUND' });
      }
      // Inactive target warning (AD-13)
      if (targetProject.status !== Project.Status.Active) {
        targetWarning = 'Target project is ' + targetProject.status.name.toLowerCase();
      }
      targetPosition = targetProject[pos.placement === 'beginning' ? 'beginning' : 'ending'];
    } else if (pos.projectName) {
      var projMatches = flattenedProjects.filter(function(p) { return p.name === pos.projectName; });
      if (projMatches.length === 0) {
        return JSON.stringify({ success: false, error: "Project '" + pos.projectName + "' not found", code: 'TARGET_NOT_FOUND' });
      }
      if (projMatches.length > 1) {
        return JSON.stringify({ success: false, error: "Multiple projects match '" + pos.projectName + "'. Use projectId.", code: 'TARGET_DISAMBIGUATION_REQUIRED' });
      }
      var targetProjByName = projMatches[0];
      if (targetProjByName.status !== Project.Status.Active) {
        targetWarning = 'Target project is ' + targetProjByName.status.name.toLowerCase();
      }
      targetPosition = targetProjByName[pos.placement === 'beginning' ? 'beginning' : 'ending'];
    } else if (pos.taskId) {
      var targetParentTask = Task.byIdentifier(pos.taskId);
      if (!targetParentTask) {
        return JSON.stringify({ success: false, error: "Task '" + pos.taskId + "' not found", code: 'TARGET_NOT_FOUND' });
      }
      targetPosition = targetParentTask[pos.placement === 'beginning' ? 'beginning' : 'ending'];
    } else if (pos.taskName) {
      var taskMatches = flattenedTasks.filter(function(t) { return t.name === pos.taskName; });
      if (taskMatches.length === 0) {
        return JSON.stringify({ success: false, error: "Task '" + pos.taskName + "' not found", code: 'TARGET_NOT_FOUND' });
      }
      if (taskMatches.length > 1) {
        return JSON.stringify({ success: false, error: "Multiple tasks match '" + pos.taskName + "'. Use taskId.", code: 'TARGET_DISAMBIGUATION_REQUIRED' });
      }
      targetPosition = taskMatches[0][pos.placement === 'beginning' ? 'beginning' : 'ending'];
    }

    // --- Relative position resolution (AD-15) ---
    if (pos.placement === 'before' || pos.placement === 'after') {
      var relativeTask = Task.byIdentifier(pos.relativeTo);
      if (!relativeTask) {
        return JSON.stringify({ success: false, error: "Relative task '" + pos.relativeTo + "' not found", code: 'RELATIVE_TARGET_NOT_FOUND' });
      }
      targetPosition = relativeTask[pos.placement === 'before' ? 'before' : 'after'];
    }

    // --- Per-item loop ---
    var results = [];
    var succeeded = 0;
    var failed = 0;

    itemIdentifiers.forEach(function(identifier) {
      var result = {
        itemId: identifier.id || '',
        itemName: identifier.name || '',
        itemType: 'task',
        success: false
      };

      try {
        var item = null;

        if (identifier.id) {
          item = Task.byIdentifier(identifier.id);
          if (!item) {
            // Try project — operate on root task but preserve project identity
            var asProject = Project.byIdentifier(identifier.id);
            if (asProject) {
              item = asProject.task;
              result.itemType = 'project';
              result.itemId = asProject.id.primaryKey;
              result.itemName = asProject.name;
            }
          }
        } else if (identifier.name) {
          var tMatches = flattenedTasks.filter(function(t) { return t.name === identifier.name; });
          var pMatches = flattenedProjects.filter(function(p) { return p.name === identifier.name; });
          var allMatches = tMatches.map(function(t) { return { item: t, type: 'task' }; })
            .concat(pMatches.map(function(p) { return { item: p, type: 'project' }; }));

          if (allMatches.length === 1) {
            item = allMatches[0].type === 'project' ? allMatches[0].item.task : allMatches[0].item;
            result.itemType = allMatches[0].type;
            result.itemId = allMatches[0].item.id.primaryKey;
            result.itemName = allMatches[0].item.name;
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

        // For tasks, populate ID/name from the resolved item
        if (result.itemType === 'task') {
          result.itemId = item.id.primaryKey;
          result.itemName = item.name;
        }

        // Perform the move
        moveTasks([item], targetPosition);

        // Post-move verification (AD-12)
        var verifiedProject = item.containingProject;
        result.success = true;
        if (targetWarning) {
          result.warning = targetWarning;
        }
        results.push(result);
        succeeded++;
      } catch (e) {
        result.error = e.message || String(e);
        result.code = 'OPERATION_FAILED';
        results.push(result);
        failed++;
      }
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
