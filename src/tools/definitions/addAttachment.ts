import type { z } from 'zod';
import { AddAttachmentInputSchema } from '../../contracts/attachment-tools/add-attachment.js';
import { addAttachment } from '../primitives/addAttachment.js';

export const schema = AddAttachmentInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await addAttachment(params);

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
