import type { z } from 'zod';
import { SearchTagsInputSchema } from '../../contracts/search-tools/search-tags.js';
import { searchTags } from '../primitives/searchTags.js';

export const schema = SearchTagsInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await searchTags(params);

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
