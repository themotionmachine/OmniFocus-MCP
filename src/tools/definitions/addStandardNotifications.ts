import type { z } from 'zod';
import { AddStandardNotificationsInputSchema } from '../../contracts/notification-tools/add-standard-notifications.js';
import { addStandardNotifications } from '../primitives/addStandardNotifications.js';

export const schema = AddStandardNotificationsInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await addStandardNotifications(params);

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
