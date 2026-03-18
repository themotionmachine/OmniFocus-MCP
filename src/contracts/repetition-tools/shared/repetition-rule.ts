import { z } from 'zod';
import {
  AnchorDateKeySchema,
  RepetitionMethodSchema,
  ScheduleTypeSchema
} from './repetition-enums.js';

/**
 * Repetition rule data returned when reading a task's or project's
 * repetition rule. Captures all available properties, with v4.7+
 * fields conditionally present (null on older versions).
 *
 * When no rule exists, the entire RepetitionRuleData is replaced
 * by `hasRule: false, rule: null` in the response.
 */
export const RepetitionRuleDataSchema = z.object({
  ruleString: z.string().describe('ICS RRULE format (e.g., FREQ=WEEKLY;BYDAY=MO)'),
  isRepeating: z.literal(true).describe('Always true when rule exists'),
  scheduleType: ScheduleTypeSchema.nullable().describe('v4.7+ only — null if unsupported'),
  anchorDateKey: AnchorDateKeySchema.nullable().describe('v4.7+ only — null if unsupported'),
  catchUpAutomatically: z.boolean().nullable().describe('v4.7+ only — null if unsupported'),
  method: RepetitionMethodSchema.nullable().describe(
    'DEPRECATED — included for backward compatibility'
  )
});

export type RepetitionRuleData = z.infer<typeof RepetitionRuleDataSchema>;
