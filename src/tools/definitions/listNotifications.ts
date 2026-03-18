import type { z } from 'zod';
import { ListNotificationsInputSchema } from '../../contracts/notification-tools/list-notifications.js';
import { listNotifications } from '../primitives/listNotifications.js';

export const schema = ListNotificationsInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await listNotifications(params);

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
