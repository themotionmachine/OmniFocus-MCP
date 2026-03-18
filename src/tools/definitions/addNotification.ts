import { z } from 'zod';
import type { AddNotificationInput } from '../../contracts/notification-tools/add-notification.js';
import { AddNotificationInputSchema } from '../../contracts/notification-tools/add-notification.js';
import { addNotification } from '../primitives/addNotification.js';

/**
 * Flat schema for MCP tool registration.
 * server.tool() requires schema.shape (only available on z.object).
 * The actual union validation happens via AddNotificationInputSchema in the handler.
 */
export const schema = z.object({
  taskId: z.string().min(1).optional().describe('Task ID (takes precedence over taskName)'),
  taskName: z.string().min(1).optional().describe('Task name (used if no taskId provided)'),
  type: z
    .enum(['absolute', 'relative'])
    .describe(
      'Notification type: "absolute" for specific datetime, "relative" for due-date offset'
    ),
  dateTime: z.string().optional().describe('ISO 8601 datetime (required when type is "absolute")'),
  offsetSeconds: z
    .number()
    .finite()
    .optional()
    .describe(
      'Offset in seconds from due date (required when type is "relative", negative = before)'
    )
});

export async function handler(params: z.infer<typeof schema>) {
  // Validate with the full union schema for proper type discrimination
  const parsed = AddNotificationInputSchema.safeParse(params);
  if (!parsed.success) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: parsed.error.issues[0]?.message ?? 'Invalid input'
          })
        }
      ],
      isError: true
    };
  }

  const result = await addNotification(parsed.data as AddNotificationInput);

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
