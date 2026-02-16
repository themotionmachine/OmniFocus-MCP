import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

export interface ListTagsParams {
  includeDropped?: boolean;
}

export interface TagInfo {
  id: string;
  name: string;
  parentTagID: string | null;
  parentName: string | null;
  active: boolean;
  allowsNextAction: boolean;
  taskCount: number;
}

interface ListTagsResult {
  success: boolean;
  tags?: TagInfo[];
  error?: string;
}

export async function listTags(params: ListTagsParams = {}): Promise<ListTagsResult> {
  const { includeDropped = false } = params;

  try {
    const result = await executeOmniFocusScript('@listTags.js');

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    let tags: TagInfo[] = result.tags || [];

    if (!includeDropped) {
      tags = tags.filter((t: TagInfo) => t.active);
    }

    return {
      success: true,
      tags
    };

  } catch (error) {
    console.error('Error listing tags:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
