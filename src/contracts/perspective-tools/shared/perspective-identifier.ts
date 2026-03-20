import { z } from 'zod';

/**
 * Shared perspective identifier schema for perspective tools.
 *
 * Accepts `name` (matches both built-in and custom) or `identifier`
 * (custom only, takes precedence when both provided).
 *
 * Follows the pattern from TaskIdentifierSchema in notification-tools.
 */
export const PerspectiveIdentifierSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Perspective name cannot be empty')
      .optional()
      .describe('Perspective name (case-insensitive for built-in perspectives)'),
    identifier: z
      .string()
      .min(1, 'Perspective identifier cannot be empty')
      .optional()
      .describe('Perspective identifier (custom perspectives only, takes precedence over name)')
  })
  .refine((d) => d.name !== undefined || d.identifier !== undefined, {
    message: 'At least one of name or identifier is required'
  });

export type PerspectiveIdentifier = z.infer<typeof PerspectiveIdentifierSchema>;

/**
 * Well-known built-in perspective names.
 * These are always present in macOS OmniFocus installations.
 */
export const BUILT_IN_PERSPECTIVE_NAMES = [
  'Inbox',
  'Projects',
  'Tags',
  'Forecast',
  'Flagged',
  'Review'
] as const;

export type BuiltInPerspectiveName = (typeof BUILT_IN_PERSPECTIVE_NAMES)[number];

/**
 * Perspective type enum.
 */
export const PerspectiveTypeSchema = z.enum(['builtin', 'custom']);
export type PerspectiveType = z.infer<typeof PerspectiveTypeSchema>;
