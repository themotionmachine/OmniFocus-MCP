import { DeleteProjectInputSchema } from '../../contracts/project-tools/index.js';
import { deleteProject } from '../primitives/deleteProject.js';

/**
 * Tool definition schema for delete_project
 */
export const schema = DeleteProjectInputSchema;

/**
 * Handler for delete_project tool
 */
export async function handler(params: unknown) {
  // Validate input with Zod schema
  const parseResult = DeleteProjectInputSchema.safeParse(params);

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
  const result = await deleteProject(parseResult.data);

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
