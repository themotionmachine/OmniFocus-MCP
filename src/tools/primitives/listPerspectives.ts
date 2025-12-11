import type { OmnifocusPerspective } from '../../types.js';
import { logger } from '../../utils/logger.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface ListPerspectivesParams {
  includeBuiltIn?: boolean;
  includeCustom?: boolean;
}

interface ListPerspectivesResult {
  success: boolean;
  perspectives?: OmnifocusPerspective[];
  error?: string;
}

export async function listPerspectives(
  params: ListPerspectivesParams = {}
): Promise<ListPerspectivesResult> {
  const { includeBuiltIn = true, includeCustom = true } = params;

  try {
    // Execute the OmniJS script to list perspectives
    // This uses the built-in OmniFocus JavaScript API
    const result = (await executeOmniFocusScript('@listPerspectives.js')) as {
      error?: string;
      perspectives?: OmnifocusPerspective[];
    };

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    // Filter perspectives based on parameters
    let perspectives = result.perspectives || [];

    if (!includeBuiltIn) {
      perspectives = perspectives.filter((p) => p.type !== 'builtin');
    }

    if (!includeCustom) {
      perspectives = perspectives.filter((p) => p.type !== 'custom');
    }

    return {
      success: true,
      perspectives: perspectives
    };
  } catch (error) {
    logger.error('Error listing perspectives', 'listPerspectives', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
