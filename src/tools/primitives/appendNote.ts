import type {
  AppendNoteInput,
  AppendNoteResponse
} from '../../contracts/task-tools/append-note.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Append text to a task's note.
 *
 * @param params - Input parameters for appending note
 * @returns Promise resolving to success response or error
 */
export async function appendNote(params: AppendNoteInput): Promise<AppendNoteResponse> {
  const script = generateAppendNoteScript(params);
  const tempFile = writeSecureTempFile(script, 'append_note', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string) as AppendNoteResponse;
  } finally {
    tempFile.cleanup();
  }
}

/**
 * Generate OmniJS script to append note to a task.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateAppendNoteScript(params: AppendNoteInput): string {
  const { id, name, text } = params;

  // Escape strings for safe embedding in JS
  const escapedId = id ? escapeForJS(id) : '';
  const escapedName = name ? escapeForJS(name) : '';
  const escapedText = escapeForJS(text);

  return `(function() {
  try {
    var id = "${escapedId}";
    var name = "${escapedName}";
    var textToAppend = "${escapedText}";
    var foundTask = null;

    // Validate we have at least one identifier
    if (!id && !name) {
      return JSON.stringify({
        success: false,
        error: "Either id or name must be provided"
      });
    }

    // Find task by ID (precedence over name)
    if (id && id.length > 0) {
      foundTask = Task.byIdentifier(id);
      if (!foundTask) {
        return JSON.stringify({
          success: false,
          error: "Task '" + id + "' not found"
        });
      }
    }
    // Fall back to name search
    else if (name && name.length > 0) {
      var matches = [];

      // Search in flattenedTasks
      flattenedTasks.forEach(function(task) {
        if (task.name === name) {
          matches.push(task);
        }
      });

      // Search in inbox
      inbox.forEach(function(task) {
        if (task.name === name) {
          // Check if already in matches (avoid duplicates)
          var isDuplicate = false;
          for (var i = 0; i < matches.length; i++) {
            if (matches[i].id.primaryKey === task.id.primaryKey) {
              isDuplicate = true;
              break;
            }
          }
          if (!isDuplicate) {
            matches.push(task);
          }
        }
      });

      if (matches.length === 0) {
        return JSON.stringify({
          success: false,
          error: "Task '" + name + "' not found"
        });
      } else if (matches.length > 1) {
        var matchingIds = matches.map(function(t) {
          return t.id.primaryKey;
        });
        return JSON.stringify({
          success: false,
          error: "Multiple tasks match name '" + name + "'",
          code: "DISAMBIGUATION_REQUIRED",
          matchingIds: matchingIds
        });
      }

      foundTask = matches[0];
    }

    // Append text to existing note
    var existingNote = foundTask.note || '';
    if (existingNote.length > 0 && !existingNote.endsWith('\\n')) {
      existingNote += '\\n';
    }
    foundTask.note = existingNote + textToAppend;

    // Return success with task details
    return JSON.stringify({
      success: true,
      id: foundTask.id.primaryKey,
      name: foundTask.name
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
 * Escape string for safe embedding in JavaScript.
 */
function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
