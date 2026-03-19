import type {
  AddLinkedFileInput,
  AddLinkedFileResponse
} from '../../contracts/attachment-tools/add-linked-file.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Add a linked file reference to a task or project in OmniFocus.
 *
 * Uses URL.fromString() in OmniJS to parse the file:// URL.
 * The file:// scheme is validated by the Zod schema before reaching this function.
 *
 * @param params - Input with id and file:// URL
 * @returns Promise resolving to success response or error
 */
export async function addLinkedFile(params: AddLinkedFileInput): Promise<AddLinkedFileResponse> {
  const script = generateAddLinkedFileScript(params);
  const result = await executeOmniJS(script);
  return result as AddLinkedFileResponse;
}

/**
 * Generate OmniJS script to add a linked file URL to a task or project.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateAddLinkedFileScript(params: AddLinkedFileInput): string {
  const escapedId = escapeForJS(params.id);
  const escapedUrl = escapeForJS(params.url);

  return `(function() {
  try {
    var id = "${escapedId}";
    var urlString = "${escapedUrl}";

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

    // AD-007: URL.fromString() null check
    var url = URL.fromString(urlString);
    if (!url) {
      return JSON.stringify({
        success: false,
        error: "Could not create URL from string: " + urlString
      });
    }

    // Add the linked file URL
    task.addLinkedFileURL(url);

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: task.name,
      linkedFileCount: task.linkedFileURLs.length
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
