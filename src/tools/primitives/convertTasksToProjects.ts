import type {
  ConvertTasksToProjectsInput,
  ConvertTasksToProjectsResponse
} from '../../contracts/bulk-tools/convert-tasks-to-projects.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Convert 1-100 tasks to projects in OmniFocus.
 *
 * Converts tasks using the native convertTasksToProjects() OmniJS API.
 * Subtasks become child project tasks. Original task is consumed.
 * Returns new project IDs and names (FR-017).
 * Tasks already serving as project root tasks return ALREADY_A_PROJECT (FR-012).
 */
export async function convertTasksToProjects(
  params: ConvertTasksToProjectsInput
): Promise<ConvertTasksToProjectsResponse> {
  const script = generateConvertTasksToProjectsScript(params);
  const result = await executeOmniJS(script);
  return result as ConvertTasksToProjectsResponse;
}

/**
 * Generate OmniJS script to convert tasks to projects.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateConvertTasksToProjectsScript(params: ConvertTasksToProjectsInput): string {
  const { items, targetFolderId, targetFolderName } = params;

  const itemIdentifiers = items.map((item) => ({
    id: item.id ?? '',
    name: item.name ?? ''
  }));

  const folderLookup = {
    targetFolderId: targetFolderId ?? '',
    targetFolderName: targetFolderName ?? ''
  };

  return `(function() {
  try {
    var itemIdentifiers = ${JSON.stringify(itemIdentifiers)};
    var folderLookup = ${JSON.stringify(folderLookup)};

    // --- Target folder pre-validation (AD-05, FR-016) ---
    var targetContainer = library;

    if (folderLookup.targetFolderId) {
      var targetFolder = Folder.byIdentifier(folderLookup.targetFolderId);
      if (!targetFolder) {
        return JSON.stringify({ success: false, error: "Folder '" + folderLookup.targetFolderId + "' not found", code: 'TARGET_NOT_FOUND' });
      }
      targetContainer = targetFolder;
    } else if (folderLookup.targetFolderName) {
      var folderMatches = flattenedFolders.filter(function(f) { return f.name === folderLookup.targetFolderName; });
      if (folderMatches.length === 0) {
        return JSON.stringify({ success: false, error: "Folder '" + folderLookup.targetFolderName + "' not found", code: 'TARGET_NOT_FOUND' });
      }
      if (folderMatches.length > 1) {
        return JSON.stringify({ success: false, error: "Multiple folders match '" + folderLookup.targetFolderName + "'. Use targetFolderId.", code: 'TARGET_NOT_FOUND' });
      }
      targetContainer = folderMatches[0];
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
        } else if (identifier.name) {
          var tMatches = flattenedTasks.filter(function(t) { return t.name === identifier.name; });
          if (tMatches.length === 1) {
            item = tMatches[0];
          } else if (tMatches.length > 1) {
            result.error = "Multiple tasks match '" + identifier.name + "'. Use ID for precision.";
            result.code = 'DISAMBIGUATION_REQUIRED';
            result.candidates = tMatches.map(function(t) {
              return { id: t.id.primaryKey, name: t.name, type: 'task' };
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

        // Check if task is already a project root (FR-012)
        if (item.containingProject && item.containingProject.task === item) {
          result.error = 'Task is already a project root';
          result.code = 'ALREADY_A_PROJECT';
          result.itemType = 'project';
          results.push(result);
          failed++;
          return;
        }

        // Perform the conversion
        var newProjects = convertTasksToProjects([item], targetContainer.ending);
        var newProject = newProjects[0];

        result.success = true;
        result.newId = newProject.id.primaryKey;
        result.newName = newProject.name;
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
