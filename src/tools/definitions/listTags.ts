import type { z } from 'zod';
import { ListTagsInputSchema } from '../../contracts/tag-tools/list-tags.js';
import { listTags } from '../primitives/listTags.js';

export const schema = ListTagsInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await listTags(params);

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
