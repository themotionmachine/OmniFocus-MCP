import { z } from 'zod';

/**
 * Notification kind enum matching OmniJS Task.Notification.Kind values.
 *
 * Note: DeferRelative is NOT in the official enum listing but IS referenced
 * in property docs (relativeFireOffset, initialFireDate). Exists at runtime
 * for defer-date notifications. Implementation uses defensive detection —
 * see research.md §Decision 8.
 */
export const NotificationKindSchema = z.enum([
  'Absolute',
  'DueRelative',
  'DeferRelative',
  'Unknown'
]);

export type NotificationKind = z.infer<typeof NotificationKindSchema>;

/**
 * Base notification fields common to all notification kinds.
 */
const NotificationBaseSchema = z.object({
  index: z.number().int().min(0).describe('0-based position in task.notifications array'),
  kind: NotificationKindSchema,
  initialFireDate: z
    .string()
    .describe('ISO 8601 computed fire datetime (universal, adjusts with due/defer)'),
  nextFireDate: z
    .string()
    .nullable()
    .describe('ISO 8601 next fire time; null if already fired and non-repeating'),
  isSnoozed: z.boolean().describe('Whether notification has been snoozed'),
  repeatInterval: z.number().nullable().describe('Seconds between repeats; null if non-repeating')
});

/**
 * Absolute notification — fires at a specific date/time.
 * Includes absoluteFireDate (writable for snooze operations).
 */
const AbsoluteNotificationSchema = NotificationBaseSchema.extend({
  kind: z.literal('Absolute'),
  absoluteFireDate: z.string().describe('ISO 8601 absolute fire datetime (writable for snooze)')
});

/**
 * Relative notification — fires relative to due date (DueRelative) or defer date (DeferRelative).
 * DueRelative and DeferRelative share the same structure (relativeFireOffset).
 * The kind field disambiguates which base date the offset applies to.
 */
const RelativeNotificationSchema = NotificationBaseSchema.extend({
  kind: z.enum(['DueRelative', 'DeferRelative']),
  relativeFireOffset: z
    .number()
    .describe('Offset in seconds from due/defer date (negative = before)')
});

/**
 * Unknown notification — base fields only, no kind-specific properties.
 */
const UnknownNotificationSchema = NotificationBaseSchema.extend({
  kind: z.literal('Unknown')
});

/**
 * Discriminated union of all notification output variants.
 * Discriminates on the `kind` field:
 * - Absolute → includes absoluteFireDate
 * - DueRelative/DeferRelative → includes relativeFireOffset
 * - Unknown → base fields only
 */
export const NotificationOutputSchema = z.discriminatedUnion('kind', [
  AbsoluteNotificationSchema,
  RelativeNotificationSchema,
  UnknownNotificationSchema
]);

export type NotificationOutput = z.infer<typeof NotificationOutputSchema>;
