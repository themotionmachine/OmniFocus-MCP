import type { z } from 'zod';
import { RemoveTagsInputSchema } from '../../contracts/tag-tools/remove-tags.js';
import { removeTags } from '../primitives/removeTags.js';

export const schema = RemoveTagsInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await removeTags(params);

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
