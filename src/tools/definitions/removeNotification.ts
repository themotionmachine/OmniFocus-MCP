import type { z } from 'zod';
import { RemoveNotificationInputSchema } from '../../contracts/notification-tools/remove-notification.js';
import { removeNotification } from '../primitives/removeNotification.js';

export const schema = RemoveNotificationInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await removeNotification(params);

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
