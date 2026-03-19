import {
  type AddAttachmentInput,
  type AddAttachmentResponse,
  AddAttachmentResponseSchema
} from '../../contracts/attachment-tools/add-attachment.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/** 10 MB in bytes — default warning threshold */
export const WARNING_THRESHOLD_BYTES = 10 * 1024 * 1024;

/** 50 MB in bytes — default rejection threshold */
export const REJECTION_THRESHOLD_BYTES = 50 * 1024 * 1024;

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
 * 2. Decoded size > rejectionBytes → SIZE_EXCEEDED
 * 3. Decoded size > warningBytes → warning
 *
 * Exported for unit testing. Optional thresholds allow tests
 * to use small values instead of allocating ~70M strings.
 */
export function validateBase64(
  data: string,
  options?: { warningBytes?: number; rejectionBytes?: number }
): Base64ValidationResult {
  const warningBytes = options?.warningBytes ?? WARNING_THRESHOLD_BYTES;
  const rejectionBytes = options?.rejectionBytes ?? REJECTION_THRESHOLD_BYTES;
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

  // Strict structural validation: base64 length must not be 1 mod 4
  // (valid base64 produces lengths 0, 2, 3, or 0 mod 4 — never 1 mod 4)
  if (data.length % 4 === 1) {
    return {
      valid: false,
      error: 'INVALID_BASE64: invalid base64 length (length % 4 === 1)'
    };
  }

  // If padding is present, total length must be a multiple of 4
  if (data.includes('=') && data.length % 4 !== 0) {
    return {
      valid: false,
      error: 'INVALID_BASE64: padded base64 must have length divisible by 4'
    };
  }

  // Calculate decoded size, accounting for padding
  let padding = 0;
  if (data.endsWith('==')) padding = 2;
  else if (data.endsWith('=')) padding = 1;
  const decodedBytes = Math.floor((data.length * 3) / 4) - padding;

  // Guard against negative decoded bytes from malformed input
  if (decodedBytes < 0) {
    return {
      valid: false,
      error: 'INVALID_BASE64: computed decoded size is negative'
    };
  }

  // Check rejection threshold (>50 MB by default)
  if (decodedBytes > rejectionBytes) {
    const sizeMB = (decodedBytes / (1024 * 1024)).toFixed(1);
    const limitMB = (rejectionBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `SIZE_EXCEEDED: decoded size (${sizeMB} MB) exceeds ${limitMB} MB limit`
    };
  }

  // Check warning threshold (>10 MB by default)
  if (decodedBytes > warningBytes) {
    const sizeMB = (decodedBytes / (1024 * 1024)).toFixed(1);
    const warnMB = (warningBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: true,
      warning: `Attachment size (${sizeMB} MB) exceeds ${warnMB} MB; may impact OmniFocus Sync performance`,
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
  return AddAttachmentResponseSchema.parse(result);
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
  const escapedWarning = warning ? escapeForJS(warning) : '';

  return `(function() {
  try {
    var id = "${escapedId}";
    var filename = "${escapedFilename}";
    var base64Data = "${base64Data}";
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
