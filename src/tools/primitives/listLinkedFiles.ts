import type {
  ListLinkedFilesInput,
  ListLinkedFilesResponse
} from '../../contracts/attachment-tools/list-linked-files.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * List all linked file URLs for a task or project in OmniFocus.
 *
 * Iterates task.linkedFileURLs and extracts url, filename (lastPathComponent),
 * and extension (pathExtension) per LinkedFileInfoSchema.
 *
 * @param params - Input parameters with a single id field
 * @returns Promise resolving to success response with linked files, or error
 */
export async function listLinkedFiles(
  params: ListLinkedFilesInput
): Promise<ListLinkedFilesResponse> {
  const script = generateListLinkedFilesScript(params);
  const result = await executeOmniJS(script);
  return result as ListLinkedFilesResponse;
}

/**
 * Generate OmniJS script to list linked file URLs for a task or project.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateListLinkedFilesScript(params: ListLinkedFilesInput): string {
  const escapedId = escapeForJS(params.id);

  return `(function() {
  try {
    var id = "${escapedId}";

    // AD-002: Try task first, then project
    var task = Task.byIdentifier(id);
    if (!task) {
      var project = Project.byIdentifier(id);
      if (!project) {
        return JSON.stringify({
          success: false,
          error: "ID '" + id + "' not found as task or project"
        });
      }
      task = project.task;
    }

    // Iterate linkedFileURLs
    var linkedFiles = [];
    var urlArray = task.linkedFileURLs;
    for (var i = 0; i < urlArray.length; i++) {
      var url = urlArray[i];
      linkedFiles.push({
        url: url.absoluteString,
        filename: url.lastPathComponent,
        extension: url.pathExtension
      });
    }

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: task.name,
      linkedFiles: linkedFiles
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}

/**
 * Escape a string for safe embedding in a JavaScript string literal.
 */
function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
