import { CreateTagInputSchema } from '../../contracts/tag-tools/create-tag.js';
import { createTag } from '../primitives/createTag.js';

/**
 * Tool definition schema for create_tag
 */
export const schema = CreateTagInputSchema;

/**
 * Handler for create_tag tool
 */
export async function handler(params: unknown) {
  // Validate input with Zod schema
  const parseResult = CreateTagInputSchema.safeParse(params);

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
  const result = await createTag(parseResult.data);

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
