import type {
  AddAttachmentInput,
  AddAttachmentResponse
} from '../../contracts/attachment-tools/add-attachment.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/** 10 MB in bytes */
const WARNING_THRESHOLD_BYTES = 10 * 1024 * 1024;

/** 50 MB in bytes */
const REJECTION_THRESHOLD_BYTES = 50 * 1024 * 1024;

/** Base64 regex: valid chars only, optional 1-2 trailing '=' */
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Validation result from validateBase64.
 */
export interface Base64ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  decodedBytes?: number;
}

/**
 * Validate a base64 string (already whitespace-stripped by Zod).
 *
 * Checks:
 * 1. Regex format (/^[A-Za-z0-9+/]*={0,2}$/)
 * 2. Decoded size > 50 MB → SIZE_EXCEEDED
 * 3. Decoded size > 10 MB → warning
 *
 * Exported for unit testing.
 */
export function validateBase64(data: string): Base64ValidationResult {
  // Empty string is invalid
  if (data.length === 0) {
    return { valid: false, error: 'INVALID_BASE64: data is empty' };
  }

  // Regex validation
  if (!BASE64_REGEX.test(data)) {
    return {
      valid: false,
      error: 'INVALID_BASE64: data contains invalid base64 characters'
    };
  }

  // Calculate decoded size
  const decodedBytes = Math.floor((data.length * 3) / 4);

  // Check rejection threshold (>50 MB)
  if (decodedBytes > REJECTION_THRESHOLD_BYTES) {
    const sizeMB = (decodedBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `SIZE_EXCEEDED: decoded size (${sizeMB} MB) exceeds 50 MB limit`
    };
  }

  // Check warning threshold (>10 MB)
  if (decodedBytes > WARNING_THRESHOLD_BYTES) {
    const sizeMB = (decodedBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: true,
      warning: `Attachment size (${sizeMB} MB) exceeds 10 MB; may impact OmniFocus Sync performance`,
      decodedBytes
    };
  }

  return { valid: true, decodedBytes };
}

/**
 * Add a file attachment to a task or project in OmniFocus.
 *
 * Server-side validation:
 * 1. Validate base64 format
 * 2. Check size thresholds (>10 MB warning, >50 MB rejection)
 * 3. Generate OmniJS script to decode and attach via FileWrapper
 *
 * @param params - Input with id, filename, and base64-encoded data
 * @returns Promise resolving to success response or error
 */
export async function addAttachment(params: AddAttachmentInput): Promise<AddAttachmentResponse> {
  const { id, filename, data } = params;

  // Server-side base64 validation (after Zod whitespace stripping)
  const validation = validateBase64(data);

  if (!validation.valid) {
    const error = validation.error ?? 'INVALID_BASE64: validation failed';

    // Determine error code from error string
    if (error.startsWith('SIZE_EXCEEDED')) {
      return {
        success: false,
        error: error,
        code: 'SIZE_EXCEEDED'
      };
    }

    return {
      success: false,
      error: error,
      code: 'INVALID_BASE64'
    };
  }

  const script = generateAddAttachmentScript(id, filename, data, validation.warning);
  const result = await executeOmniJS(script);
  return result as AddAttachmentResponse;
}

/**
 * Generate OmniJS script to add an attachment to a task or project.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateAddAttachmentScript(
  id: string,
  filename: string,
  base64Data: string,
  warning?: string
): string {
  const escapedId = escapeForJS(id);
  const escapedFilename = escapeForJS(filename);
  const escapedBase64 = escapeForJS(base64Data);
  const escapedWarning = warning ? escapeForJS(warning) : '';

  return `(function() {
  try {
    var id = "${escapedId}";
    var filename = "${escapedFilename}";
    var base64Data = "${escapedBase64}";
    var warning = "${escapedWarning}";

    // AD-002: Try task first, then project
    var task = Task.byIdentifier(id);
    if (!task) {
      var project = Project.byIdentifier(id);
      if (!project) {
        return JSON.stringify({
          success: false,
          error: "ID '" + id + "' not found as task or project",
          code: "NOT_FOUND"
        });
      }
      task = project.task;
    }

    // Read count before add for read-back verification
    var countBefore = task.attachments.length;

    // AD-007: Decode base64 with null check
    var data = Data.fromBase64(base64Data);
    if (!data) {
      return JSON.stringify({
        success: false,
        error: "Failed to decode base64 data",
        code: "INVALID_BASE64"
      });
    }

    // Create FileWrapper and add attachment
    var wrapper = FileWrapper.withContents(filename, data);
    task.addAttachment(wrapper);

    // AD-007: Read-back verification
    var attachments = task.attachments;
    if (attachments.length <= countBefore) {
      return JSON.stringify({
        success: false,
        error: "Attachment was not added (count did not increase after add)"
      });
    }

    var response = {
      success: true,
      id: task.id.primaryKey,
      name: task.name,
      attachmentCount: attachments.length
    };

    if (warning && warning.length > 0) {
      response.warning = warning;
    }

    return JSON.stringify(response);
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
