import { z } from 'zod';
import { DisambiguationErrorSchema } from '../task-tools/shared/disambiguation.js';
import { NotificationOutputSchema } from './shared/notification.js';
import { TaskIdentifierSchema } from './shared/task-identifier.js';

export const ListNotificationsInputSchema = TaskIdentifierSchema;
export type ListNotificationsInput = z.infer<typeof ListNotificationsInputSchema>;

export const ListNotificationsSuccessSchema = z.object({
  success: z.literal(true),
  taskId: z.string(),
  taskName: z.string(),
  count: z.number().int().min(0),
  notifications: z.array(NotificationOutputSchema)
});
export type ListNotificationsSuccess = z.infer<typeof ListNotificationsSuccessSchema>;

export const ListNotificationsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});
export type ListNotificationsError = z.infer<typeof ListNotificationsErrorSchema>;

export const ListNotificationsResponseSchema = z.union([
  ListNotificationsSuccessSchema,
  DisambiguationErrorSchema,
  ListNotificationsErrorSchema
]);
export type ListNotificationsResponse = z.infer<typeof ListNotificationsResponseSchema>;
