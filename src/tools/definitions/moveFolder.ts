import { MoveFolderInputSchema } from '../../contracts/folder-tools/move-folder.js';
import { moveFolder } from '../primitives/moveFolder.js';

/**
 * Tool definition schema for move_folder
 */
export const schema = MoveFolderInputSchema;

/**
 * Handler for move_folder tool
 */
export async function handler(params: unknown) {
  // Validate input with Zod schema
  const parseResult = MoveFolderInputSchema.safeParse(params);

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
  const result = await moveFolder(parseResult.data);

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
