import type { AssignTagsInput, AssignTagsResponse } from '../../contracts/tag-tools/assign-tags.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

export async function assignTags(params: AssignTagsInput): Promise<AssignTagsResponse> {
  const script = generateAssignTagsScript(params);
  const tempFile = writeSecureTempFile(script, 'assign_tags', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string);
  } finally {
    tempFile.cleanup();
  }
}

function generateAssignTagsScript(params: AssignTagsInput): string {
  const { taskIds, tagIds } = params;

  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const taskIdsJSON = JSON.stringify(taskIds.map(escapeForJS));
  const tagIdsJSON = JSON.stringify(tagIds.map(escapeForJS));

  return `(function() {
  try {
    var taskIds = ${taskIdsJSON};
    var tagIds = ${tagIdsJSON};
    var results = [];
    var resolvedTags = [];

    // Step 1: Resolve all tags first (with disambiguation check)
    var tagErrors = [];
    for (var i = 0; i < tagIds.length; i++) {
      var tagId = tagIds[i];
      var tag = null;

      // Try to find by ID first
      try {
        tag = Tag.byIdentifier(tagId);
      } catch (e) {
        // Not a valid ID, continue to name lookup
      }

      // If not found by ID, try by name
      if (!tag) {
        var matchesByName = flattenedTags.filter(function(t) {
          return t.name === tagId;
        });

        if (matchesByName.length > 1) {
          // Disambiguation required - collect IDs for error
          tagErrors.push({
            name: tagId,
            code: "DISAMBIGUATION_REQUIRED",
            matchingIds: matchesByName.map(function(t) { return t.id.primaryKey; })
          });
        } else if (matchesByName.length === 1) {
          tag = matchesByName[0];
        }
      }

      if (tag) {
        resolvedTags.push(tag);
      }
    }

    // If no valid tags could be resolved, return error
    if (resolvedTags.length === 0) {
      if (tagErrors.length > 0) {
        return JSON.stringify({
          success: false,
          error: "Tag disambiguation required: " + tagErrors.map(function(e) { return e.name; }).join(", ")
        });
      }
      return JSON.stringify({
        success: false,
        error: "No valid tags could be resolved"
      });
    }

    // Step 2: Process each task and assign the resolved tags
    for (var j = 0; j < taskIds.length; j++) {
      var taskId = taskIds[j];

      try {
        var task = null;

        // Try to find by ID first
        try {
          task = Task.byIdentifier(taskId);
        } catch (e) {
          // Not a valid ID, continue to name lookup
        }

        // If not found by ID, try by name
        if (!task) {
          var matchesByName = flattenedTasks.filter(function(t) {
            return t.name === taskId;
          });

          if (matchesByName.length > 1) {
            // Multiple matches - return disambiguation error for this task
            results.push({
              taskId: taskId,
              taskName: "",
              success: false,
              error: "Multiple tasks named '" + taskId + "' found",
              code: "DISAMBIGUATION_REQUIRED",
              matchingIds: matchesByName.map(function(t) { return t.id.primaryKey; })
            });
            continue;
          } else if (matchesByName.length === 1) {
            task = matchesByName[0];
          }
        }

        if (!task) {
          results.push({
            taskId: taskId,
            taskName: "",
            success: false,
            error: "Task '" + taskId + "' not found"
          });
          continue;
        }

        // Assign all resolved tags to the task
        for (var k = 0; k < resolvedTags.length; k++) {
          task.addTag(resolvedTags[k]); // Idempotent - won't duplicate
        }

        results.push({
          taskId: task.id.primaryKey,
          taskName: task.name,
          success: true
        });
      } catch (e) {
        results.push({
          taskId: taskId,
          taskName: "",
          success: false,
          error: e.message || String(e)
        });
      }
    }

    return JSON.stringify({ success: true, results: results });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
