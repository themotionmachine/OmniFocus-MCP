import type { z } from 'zod';
import { ListLinkedFilesInputSchema } from '../../contracts/attachment-tools/list-linked-files.js';
import { listLinkedFiles } from '../primitives/listLinkedFiles.js';

export const schema = ListLinkedFilesInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await listLinkedFiles(params);

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
