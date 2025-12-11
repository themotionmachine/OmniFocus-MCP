import { EditFolderInputSchema } from '../../contracts/folder-tools/edit-folder.js';
import { editFolder } from '../primitives/editFolder.js';

/**
 * Tool definition schema for edit_folder
 */
export const schema = EditFolderInputSchema;

/**
 * Handler for edit_folder tool
 */
export async function handler(params: unknown) {
  // Validate input with Zod schema
  const parseResult = EditFolderInputSchema.safeParse(params);

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
  const result = await editFolder(parseResult.data);

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
