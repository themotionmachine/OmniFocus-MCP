import type {
  ImportTaskpaperInput,
  ImportTaskpaperResponse
} from '../../contracts/taskpaper-tools/import-taskpaper.js';
import { ImportTaskpaperResponseSchema } from '../../contracts/taskpaper-tools/import-taskpaper.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Import transport text into OmniFocus using byParsingTransportText.
 *
 * @param params - Input with text and optional targetProjectId
 * @returns Promise resolving to import result with created item IDs
 */
export async function importTaskpaper(
  params: ImportTaskpaperInput
): Promise<ImportTaskpaperResponse> {
  // Guard: whitespace-only input (FR-008)
  if (params.text.trim().length === 0) {
    return {
      success: false,
      error: 'Transport text is empty or contains only whitespace'
    };
  }

  const script = generateImportScript(params.text, params.targetProjectId);
  const result = await executeOmniJS(script);

  if (!result) {
    return {
      success: false,
      error: 'OmniJS script returned empty output — possible silent failure'
    };
  }

  return ImportTaskpaperResponseSchema.parse(result);
}

/**
 * Generate OmniJS script for importing transport text.
 * Exported for testing and manual verification in OmniFocus Script Editor.
 */
export function generateImportScript(text: string, targetProjectId?: string): string {
  // Escape text for embedding in OmniJS string literal
  const escapedText = text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');

  const moveBlock = targetProjectId
    ? `
    var targetProject = Project.byIdentifier("${targetProjectId}");
    if (!targetProject) {
      return JSON.stringify({ success: false, error: "Target project not found: ${targetProjectId}" });
    }
    moveTasks(topLevel, targetProject);
    var movedToProject = true;`
    : `
    var movedToProject = false;`;

  return `(function() {
  try {
    var topLevel = Task.byParsingTransportText("${escapedText}", null);

    if (!topLevel || topLevel.length === 0) {
      return JSON.stringify({
        success: true,
        items: [],
        summary: { totalCreated: 0, tasks: 0, projects: 0, movedToProject: false }
      });
    }
    ${moveBlock}

    var items = [];
    var taskCount = 0;
    var projectCount = 0;

    function collectItems(taskArray) {
      for (var i = 0; i < taskArray.length; i++) {
        var t = taskArray[i];
        var itemType = "task";
        items.push({ id: t.id.primaryKey, name: t.name, type: itemType });
        taskCount++;
        if (t.children && t.children.length > 0) {
          collectItems(t.children);
        }
      }
    }

    collectItems(topLevel);

    return JSON.stringify({
      success: true,
      items: items,
      summary: {
        totalCreated: items.length,
        tasks: taskCount,
        projects: projectCount,
        movedToProject: movedToProject
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
