import type { z } from 'zod';
import { ListAttachmentsInputSchema } from '../../contracts/attachment-tools/list-attachments.js';
import { listAttachments } from '../primitives/listAttachments.js';

export const schema = ListAttachmentsInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await listAttachments(params);

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
