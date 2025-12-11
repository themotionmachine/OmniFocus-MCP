import { RemoveFolderInputSchema } from '../../contracts/folder-tools/remove-folder.js';
import { removeFolder } from '../primitives/removeFolder.js';

/**
 * Tool definition schema for remove_folder
 */
export const schema = RemoveFolderInputSchema;

/**
 * Handler for remove_folder tool
 */
export async function handler(params: unknown) {
  // Validate input with Zod schema
  const parseResult = RemoveFolderInputSchema.safeParse(params);

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
  const result = await removeFolder(parseResult.data);

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
