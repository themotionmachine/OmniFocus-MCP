import type { RemoveTagsInput, RemoveTagsResponse } from '../../contracts/tag-tools/remove-tags.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

export async function removeTags(params: RemoveTagsInput): Promise<RemoveTagsResponse> {
  const script = generateRemoveTagsScript(params);
  const tempFile = writeSecureTempFile(script, 'remove_tags', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string);
  } finally {
    tempFile.cleanup();
  }
}

function generateRemoveTagsScript(params: RemoveTagsInput): string {
  const { taskIds, tagIds, clearAll } = params;

  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const taskIdsArray = taskIds.map((id) => `"${escapeForJS(id)}"`).join(', ');
  const tagIdsArray = tagIds ? tagIds.map((id) => `"${escapeForJS(id)}"`).join(', ') : '[]';

  return `(function() {
  try {
    var taskIds = [${taskIdsArray}];
    var tagIds = [${tagIdsArray}];
    var clearAll = ${clearAll ? 'true' : 'false'};
    var results = [];

    // Validate mutual exclusivity (should be caught by schema, but double-check)
    if (clearAll && tagIds.length > 0) {
      return JSON.stringify({
        success: false,
        error: "Cannot specify both clearAll and tagIds"
      });
    }

    // Validate that we have either clearAll or tagIds
    if (!clearAll && tagIds.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Must specify either clearAll=true or provide tagIds"
      });
    }

    // If not clearAll, resolve tags first
    var resolvedTags = [];
    if (!clearAll) {
      for (var i = 0; i < tagIds.length; i++) {
        var tagId = tagIds[i];
        var tag = null;

        try {
          tag = Tag.byIdentifier(tagId);
        } catch (e) {
          // Not a valid ID, try by name
        }

        if (!tag) {
          // Try lookup by name
          var matches = flattenedTags.filter(function(t) {
            return t.name === tagId;
          });

          if (matches.length === 0) {
            return JSON.stringify({
              success: false,
              error: "Tag '" + tagId + "' not found"
            });
          } else if (matches.length > 1) {
            var matchingIds = matches.map(function(t) {
              return t.id.primaryKey;
            });
            return JSON.stringify({
              success: false,
              error: "Ambiguous tag name '" + tagId + "'. Found " + matches.length + " matches: " + matchingIds.join(", "),
              code: "DISAMBIGUATION_REQUIRED",
              matchingIds: matchingIds
            });
          } else {
            tag = matches[0];
          }
        }

        if (tag) {
          resolvedTags.push(tag);
        }
      }
    }

    // Process each task
    for (var j = 0; j < taskIds.length; j++) {
      var taskId = taskIds[j];

      try {
        var task = null;

        try {
          task = Task.byIdentifier(taskId);
        } catch (e) {
          // Not a valid ID, try by name
        }

        if (!task) {
          // Try lookup by name
          var taskMatches = flattenedTasks.filter(function(t) {
            return t.name === taskId;
          });

          if (taskMatches.length === 0) {
            results.push({
              taskId: taskId,
              taskName: "",
              success: false,
              error: "Task '" + taskId + "' not found"
            });
            continue;
          } else if (taskMatches.length > 1) {
            var taskMatchingIds = taskMatches.map(function(t) {
              return t.id.primaryKey;
            });
            results.push({
              taskId: taskId,
              taskName: "",
              success: false,
              code: "DISAMBIGUATION_REQUIRED",
              matchingIds: taskMatchingIds,
              error: "Ambiguous task name '" + taskId + "'. Found " + taskMatches.length + " matches: " + taskMatchingIds.join(", ")
            });
            continue;
          } else {
            task = taskMatches[0];
          }
        }

        // Remove tags from task
        if (clearAll) {
          task.clearTags();
        } else {
          for (var k = 0; k < resolvedTags.length; k++) {
            task.removeTag(resolvedTags[k]); // Idempotent - no error if tag not assigned
          }
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

    return JSON.stringify({
      success: true,
      results: results
    });

  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
