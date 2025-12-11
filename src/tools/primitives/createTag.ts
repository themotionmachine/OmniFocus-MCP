import type { CreateTagInput, CreateTagResponse } from '../../contracts/tag-tools/create-tag.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Escape a string for safe use in JavaScript string literals.
 * Handles quotes, backslashes, and newlines.
 */
function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Create a new tag in OmniFocus.
 *
 * @param params - The parameters for creating the tag
 * @returns Promise resolving to the create operation result
 */
export async function createTag(params: CreateTagInput): Promise<CreateTagResponse> {
  const script = generateCreateTagScript(params);
  const tempFile = writeSecureTempFile(script, 'create_tag', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string) as CreateTagResponse;
  } finally {
    tempFile.cleanup();
  }
}

/**
 * Generate OmniJS script to create a tag.
 *
 * @param params - The parameters for creating the tag
 * @returns The OmniJS script as a string
 */
function generateCreateTagScript(params: CreateTagInput): string {
  const { name, parentId, position, allowsNextAction = true } = params;
  const escapedName = escapeForJS(name);

  return `(function() {
  try {
    var position = null;
    var parentTag = null;

    // Resolve parent tag if parentId provided
    ${
      parentId
        ? `
    try {
      parentTag = Tag.byIdentifier("${escapeForJS(parentId)}");
      if (!parentTag) {
        return JSON.stringify({
          success: false,
          error: "Parent tag '${escapeForJS(parentId)}' not found"
        });
      }
    } catch (e) {
      return JSON.stringify({
        success: false,
        error: "Parent tag '${escapeForJS(parentId)}' not found"
      });
    }
    `
        : ''
    }

    // Resolve position if provided
    ${
      position
        ? `
    var placement = "${position.placement}";
    ${
      position.relativeTo
        ? `
    var relativeTo = "${escapeForJS(position.relativeTo)}";
    var referenceTag = null;
    try {
      referenceTag = Tag.byIdentifier(relativeTo);
      if (!referenceTag) {
        return JSON.stringify({
          success: false,
          error: "Reference tag '" + relativeTo + "' not found"
        });
      }
    } catch (e) {
      return JSON.stringify({
        success: false,
        error: "Reference tag '" + relativeTo + "' not found"
      });
    }

    // Calculate position based on placement and reference tag
    if (placement === "before") {
      position = referenceTag.before;
    } else if (placement === "after") {
      position = referenceTag.after;
    } else if (placement === "beginning") {
      // If relativeTo is specified with beginning, use as parent container
      if (referenceTag.tags) {
        position = referenceTag.tags.beginning;
      } else {
        position = tags.beginning;
      }
    } else if (placement === "ending") {
      // If relativeTo is specified with ending, use as parent container
      if (referenceTag.tags) {
        position = referenceTag.tags.ending;
      } else {
        position = tags.ending;
      }
    }
    `
        : `
    // No relativeTo - use root tags container
    if (placement === "beginning") {
      position = tags.beginning;
    } else if (placement === "ending") {
      position = tags.ending;
    }
    `
    }
    `
        : ''
    }

    // If no position specified, use default based on parent
    if (position === null) {
      if (parentTag) {
        position = parentTag.tags.ending;
      } else {
        position = tags.ending;
      }
    }

    // Create the new tag
    var newTag = new Tag("${escapedName}", position);
    newTag.allowsNextAction = ${allowsNextAction};

    return JSON.stringify({
      success: true,
      id: newTag.id.primaryKey,
      name: newTag.name
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
