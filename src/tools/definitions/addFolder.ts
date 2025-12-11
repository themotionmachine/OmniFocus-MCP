import { AddFolderInputSchema } from '../../contracts/folder-tools/add-folder.js';
import { addFolder } from '../primitives/addFolder.js';

/**
 * Tool definition schema for add_folder
 */
export const schema = AddFolderInputSchema;

/**
 * Handler for add_folder tool
 */
export async function handler(params: unknown) {
  // Validate input with Zod schema
  const parseResult = AddFolderInputSchema.safeParse(params);

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
  const result = await addFolder(parseResult.data);

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
