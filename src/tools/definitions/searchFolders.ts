import type { z } from 'zod';
import { SearchFoldersInputSchema } from '../../contracts/search-tools/search-folders.js';
import { searchFolders } from '../primitives/searchFolders.js';

export const schema = SearchFoldersInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await searchFolders(params);

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
