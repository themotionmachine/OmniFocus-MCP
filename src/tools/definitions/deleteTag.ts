import type { z } from 'zod';
import { DeleteTagInputSchema } from '../../contracts/tag-tools/delete-tag.js';
import { deleteTag } from '../primitives/deleteTag.js';

export const schema = DeleteTagInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await deleteTag(params);

  if (!result.success) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      isError: true
    };
  }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result) }]
  };
}
