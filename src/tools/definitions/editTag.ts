import { EditTagInputSchema } from '../../contracts/tag-tools/edit-tag.js';
import { editTag } from '../primitives/editTag.js';

/**
 * Tool definition schema for edit_tag
 */
export const schema = EditTagInputSchema;

/**
 * Handler for edit_tag tool
 */
export async function handler(params: unknown) {
  // Validate input with Zod schema
  const parseResult = EditTagInputSchema.safeParse(params);

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
  const result = await editTag(parseResult.data);

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
