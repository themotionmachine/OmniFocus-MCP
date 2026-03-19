import type { z } from 'zod';
import { AddLinkedFileInputSchema } from '../../contracts/attachment-tools/add-linked-file.js';
import { addLinkedFile } from '../primitives/addLinkedFile.js';

export const schema = AddLinkedFileInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await addLinkedFile(params);

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
