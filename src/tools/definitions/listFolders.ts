import { ListFoldersInputSchema } from '../../contracts/folder-tools/list-folders.js';
import { listFolders } from '../primitives/listFolders.js';

/**
 * Tool definition schema for list_folders
 */
export const schema = ListFoldersInputSchema;

/**
 * Handler for list_folders tool
 */
export async function handler(params: unknown) {
  // Validate input with Zod schema
  const parseResult = ListFoldersInputSchema.safeParse(params);

  if (!parseResult.success) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: parseResult.error.issues
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join(', ')
          })
        }
      ],
      isError: true
    };
  }

  // Call the primitive
  const result = await listFolders(parseResult.data);

  // Return formatted response
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result)
      }
    ],
    isError: !result.success
  };
}
