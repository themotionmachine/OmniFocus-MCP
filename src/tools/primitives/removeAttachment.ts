import {
  type RemoveAttachmentInput,
  type RemoveAttachmentResponse,
  RemoveAttachmentResponseSchema
} from '../../contracts/attachment-tools/remove-attachment.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Remove a specific attachment from a task or project by zero-based index.
 *
 * The index is obtained from list_attachments. OmniJS performs bounds checking
 * before calling removeAttachmentAtIndex to provide clear error messages.
 *
 * @param params - Input with id and zero-based index
 * @returns Promise resolving to success response or error
 */
export async function removeAttachment(
  params: RemoveAttachmentInput
): Promise<RemoveAttachmentResponse> {
  const script = generateRemoveAttachmentScript(params);
  const result = await executeOmniJS(script);
  return RemoveAttachmentResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to remove an attachment from a task or project.
 * Exported for manual testing in OmniFocus Script Editor.
 *
 * CRITICAL: Performs bounds checking before removeAttachmentAtIndex (AD-007 pattern).
 */
export function generateRemoveAttachmentScript(params: RemoveAttachmentInput): string {
  const escapedId = escapeForJS(params.id);
  const index = params.index;

  return `(function() {
  try {
    var id = "${escapedId}";
    var removeIndex = ${index};

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

    // AD-007: Bounds checking BEFORE calling native method
    var attachments = task.attachments;
    if (attachments.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Task has no attachments to remove"
      });
    }

    if (removeIndex >= attachments.length) {
      return JSON.stringify({
        success: false,
        error: "Attachment index " + removeIndex + " is out of bounds (task has " + attachments.length + " attachments, valid range: 0 to " + (attachments.length - 1) + ")"
      });
    }

    // Capture filename before removal
    var removedAttachment = attachments[removeIndex];
    var removedFilename = removedAttachment.preferredFilename || removedAttachment.filename || 'unnamed';

    // Capture count before removal for read-back verification
    var countBefore = task.attachments.length;

    // Remove by index
    task.removeAttachmentAtIndex(removeIndex);

    // Read-back verification
    if (task.attachments.length >= countBefore) {
      return JSON.stringify({
        success: false,
        error: "Attachment was not removed (count did not decrease after removal)"
      });
    }

    // Read back remaining attachments with re-indexed positions
    var remainingArray = task.attachments;
    var remaining = [];
    for (var i = 0; i < remainingArray.length; i++) {
      var att = remainingArray[i];
      var filename = att.preferredFilename || att.filename || 'unnamed';

      var typeStr = 'File';
      try {
        if (att.type === FileWrapper.Type.Directory) {
          typeStr = 'Directory';
        } else if (FileWrapper.Type.SymbolicLink !== undefined && att.type === FileWrapper.Type.SymbolicLink) {
          typeStr = 'Link';
        } else if (FileWrapper.Type.Link !== undefined && att.type === FileWrapper.Type.Link) {
          typeStr = 'Link';
        }
      } catch (typeErr) {
        typeStr = 'File';
      }

      var size = 0;
      try {
        if (att.contents) {
          size = att.contents.length;
        }
      } catch (sizeErr) {
        size = 0;
      }

      remaining.push({
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
      removedFilename: removedFilename,
      remainingAttachments: remaining
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
