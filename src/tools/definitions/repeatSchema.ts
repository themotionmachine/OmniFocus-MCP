import { z } from 'zod';

/**
 * The shared `repeat` shape for every write tool (issue #116).
 *
 * Defined once and imported, so the four tools that accept a repeat cannot drift
 * apart — the failure mode of #97, where `projectId` existed on
 * add_omnifocus_task but was missing from batch_add_items, so Zod stripped it
 * and every batched task silently landed in the inbox reporting success.
 *
 * Descriptions are kept deliberately terse (#105): sharing the object in source
 * does NOT share it on the wire — each tool's serialized JSON schema carries its
 * own copy, so every character here is paid four times per session.
 *
 * The one piece of guidance worth its tokens is that `start-after-completion` is
 * the usual intent. A census of a real database found it in ~70% of rules, and
 * getting it wrong is expensive in a specific way: a `fixed` rule keeps
 * generating occurrences whether or not the last was done, so a missed week
 * leaves debris to sweep rather than simply resuming.
 */
export const repeatShape = z
  .object({
    method: z
      .enum(['fixed', 'start-after-completion', 'due-after-completion'])
      .describe(
        "Schedule basis. 'start-after-completion' counts from when it's actually done (usual choice, no backlog); 'fixed' counts from the calendar regardless"
      ),
    unit: z.enum(['day', 'week', 'month', 'year']).describe('Interval unit'),
    steps: z.number().int().min(1).optional().describe('Every N units (default 1)'),
    weekdays: z
      .array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']))
      .optional()
      .describe("Specific days, e.g. ['MO','WE','FR']; requires unit 'week'"),
  })
  .describe('Repetition rule');
