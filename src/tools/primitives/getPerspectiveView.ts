import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface GetPerspectiveViewParams {
  perspectiveName: string;
  limit?: number | undefined;
  includeMetadata?: boolean | undefined;
  fields?: string[] | undefined;
}

export interface PerspectiveItem {
  id?: string;
  name?: string;
  note?: string;
  flagged?: boolean;
  completed?: boolean;
  dueDate?: string | null;
  deferDate?: string | null;
  completionDate?: string | null;
  taskStatus?: string;
  projectName?: string;
  tagNames?: string[];
  estimatedMinutes?: number | null;
  [key: string]: unknown; // Allow additional properties from JXA
}

interface PerspectiveViewResult {
  success: boolean;
  items?: PerspectiveItem[];
  error?: string;
}

export async function getPerspectiveView(
  params: GetPerspectiveViewParams
): Promise<PerspectiveViewResult> {
  const { perspectiveName, limit = 100, fields } = params;
  // Note: includeMetadata is reserved for future use

  try {
    // Execute the OmniJS script to get perspective view
    // Note: This gets the current perspective view, not a specific one
    // OmniJS doesn't easily allow switching perspectives
    const result = (await executeOmniFocusScript('@getPerspectiveView.js')) as {
      error?: string;
      perspectiveName?: string;
      items?: PerspectiveItem[];
    };

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    // Check if the current perspective matches what was requested
    const currentPerspective = result.perspectiveName;
    if (currentPerspective && currentPerspective.toLowerCase() !== perspectiveName.toLowerCase()) {
      console.warn(
        `Note: Current perspective is "${currentPerspective}", not "${perspectiveName}". OmniJS cannot easily switch perspectives.`
      );
    }

    // Filter and limit items
    let items = result.items || [];

    // Apply field filtering if specified
    if (fields && fields.length > 0) {
      items = items.map((item) => {
        const filtered: PerspectiveItem = {};
        fields.forEach((field) => {
          if (Object.hasOwn(item, field)) {
            filtered[field] = item[field];
          }
        });
        return filtered;
      });
    }

    // Apply limit
    if (limit && items.length > limit) {
      items = items.slice(0, limit);
    }

    return {
      success: true,
      items: items
    };
  } catch (error) {
    console.error('Error getting perspective view:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
