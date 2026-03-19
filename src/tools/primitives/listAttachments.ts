import {
  type ListAttachmentsInput,
  type ListAttachmentsResponse,
  ListAttachmentsResponseSchema
} from '../../contracts/attachment-tools/list-attachments.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * List all attachments for a task or project in OmniFocus.
 *
 * Accepts a task ID or project ID. Projects are resolved to their root task
 * per AD-002 (Task.byIdentifier first, then Project.byIdentifier with .task).
 *
 * @param params - Input parameters with a single id field
 * @returns Promise resolving to success response with attachments, or error
 */
export async function listAttachments(
  params: ListAttachmentsInput
): Promise<ListAttachmentsResponse> {
  const script = generateListAttachmentsScript(params);
  const result = await executeOmniJS(script);
  return ListAttachmentsResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to list attachments for a task or project.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateListAttachmentsScript(params: ListAttachmentsInput): string {
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

    // Iterate attachments and extract metadata
    var attachments = [];
    var attachmentArray = task.attachments;
    for (var i = 0; i < attachmentArray.length; i++) {
      var attachment = attachmentArray[i];

      // Filename resolution: preferredFilename || filename || 'unnamed'
      var filename = attachment.preferredFilename || attachment.filename || 'unnamed';

      // Map FileWrapper.Type to string (handle both SymbolicLink and Link enum names)
      var typeStr = 'File';
      try {
        if (attachment.type === FileWrapper.Type.Directory) {
          typeStr = 'Directory';
        } else if (FileWrapper.Type.SymbolicLink !== undefined && attachment.type === FileWrapper.Type.SymbolicLink) {
          typeStr = 'Link';
        } else if (FileWrapper.Type.Link !== undefined && attachment.type === FileWrapper.Type.Link) {
          typeStr = 'Link';
        } else {
          typeStr = 'File';
        }
      } catch (typeErr) {
        typeStr = 'File';
      }

      // Size from contents
      var size = 0;
      try {
        if (attachment.contents) {
          size = attachment.contents.length;
        }
      } catch (sizeErr) {
        size = 0;
      }

      attachments.push({
        index: i,
        filename: filename,
        type: typeStr,
        size: size
      });
    }

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: task.name,
      attachments: attachments
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
