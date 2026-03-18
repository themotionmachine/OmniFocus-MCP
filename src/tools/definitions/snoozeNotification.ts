import type { z } from 'zod';
import { SnoozeNotificationInputSchema } from '../../contracts/notification-tools/snooze-notification.js';
import { snoozeNotification } from '../primitives/snoozeNotification.js';

export const schema = SnoozeNotificationInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await snoozeNotification(params);

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
