import type { z } from 'zod';
import { RemoveAttachmentInputSchema } from '../../contracts/attachment-tools/remove-attachment.js';
import { removeAttachment } from '../primitives/removeAttachment.js';

export const schema = RemoveAttachmentInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await removeAttachment(params);

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
