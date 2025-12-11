import { z } from 'zod';

/**
 * Task status enumeration.
 *
 * Represents the current state of a task as computed by OmniFocus.
 * Values are PascalCase and case-sensitive.
 *
 * **OmniJS Mapping**: Maps 1:1 with `Task.Status.*` constants:
 * - Task.Status.Available ↔ 'Available'
 * - Task.Status.Blocked ↔ 'Blocked'
 * - Task.Status.Completed ↔ 'Completed'
 * - Task.Status.Dropped ↔ 'Dropped'
 * - Task.Status.DueSoon ↔ 'DueSoon'
 * - Task.Status.Next ↔ 'Next'
 * - Task.Status.Overdue ↔ 'Overdue'
 *
 * **Semantic Note**: DueSoon, Next, and Overdue are refinements of Available -
 * the task is workable but has special scheduling conditions.
 *
 * **Unknown Status Handling**: If OmniJS returns an unrecognized status value,
 * implementations SHOULD map it to 'Blocked' and log a warning, rather than
 * failing the entire operation.
 */
export const TaskStatusSchema = z.enum([
  'Available', // Task is available to work on
  'Blocked', // Not available (deferred, sequential, on-hold tag)
  'Completed', // Task is completed
  'Dropped', // Task is dropped/abandoned
  'DueSoon', // Due within configured threshold (refinement of Available)
  'Next', // First available task in sequential project (refinement of Available)
  'Overdue' // Past due date (refinement of Available)
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/**
 * Task summary schema for list results.
 *
 * Contains essential task information for efficient listing.
 * This is a **denormalized projection** of TaskFull optimized for list responses.
 *
 * **Denormalization Rationale**:
 * - `projectId`/`projectName` flatten `TaskFull.containingProject: EntityReference | null`
 * - `tagIds`/`tagNames` flatten `TaskFull.tags: TagReference[]`
 *
 * This reduces response payload size and simplifies client filtering without
 * requiring nested object traversal.
 *
 * **Subset Relationship**: The 7 core fields (id, name, taskStatus, flagged,
 * deferDate, dueDate, plannedDate) have IDENTICAL types in both TaskSummary
 * and TaskFull. The denormalized fields represent transformed views of TaskFull's
 * relationship objects.
 */
export const TaskSummarySchema = z.object({
  id: z.string().describe("Task's unique identifier"),
  name: z.string().describe("Task's display name"),
  taskStatus: TaskStatusSchema.describe('Current task status'),
  flagged: z.boolean().describe('Flagged indicator'),
  deferDate: z.string().nullable().describe('Defer date (ISO 8601)'),
  dueDate: z.string().nullable().describe('Due date (ISO 8601)'),
  plannedDate: z.string().nullable().describe('Planned date (ISO 8601, v4.7+)'),
  projectId: z.string().nullable().describe('Containing project ID (null if inbox)'),
  projectName: z.string().nullable().describe('Containing project name'),
  tagIds: z.array(z.string()).describe('Associated tag IDs'),
  tagNames: z.array(z.string()).describe('Associated tag names')
});

export type TaskSummary = z.infer<typeof TaskSummarySchema>;

/**
 * Reference schema for related entities (project, parent task).
 *
 * **OmniJS Extraction Pattern**:
 * ```javascript
 * // For containingProject or parent task
 * var ref = entity ? { id: entity.id.primaryKey, name: entity.name } : null;
 * ```
 *
 * **Orphan Reference Handling**: If a referenced entity is deleted (e.g., project
 * deleted while task remains), OmniFocus sets the reference to null. Implementations
 * should handle null gracefully rather than expecting orphan references.
 */
export const EntityReferenceSchema = z.object({
  id: z.string(),
  name: z.string()
});

export type EntityReference = z.infer<typeof EntityReferenceSchema>;

/**
 * Tag reference schema.
 */
export const TagReferenceSchema = z.object({
  id: z.string(),
  name: z.string()
});

export type TagReference = z.infer<typeof TagReferenceSchema>;

/**
 * Complete task schema with all properties.
 *
 * Used by get_task for full task details.
 *
 * **Date Handling**:
 * - All dates use ISO 8601 format (e.g., "2025-01-15T09:00:00.000Z")
 * - Dates are nullable - null indicates "not set"
 * - OmniJS serialization: `date ? date.toISOString() : null`
 * - OmniJS null → JSON null → Zod nullable (seamless chain)
 *
 * **Version-Conditional Fields** (may return null on older versions):
 * - plannedDate: v4.7+ (returns null if version too old or not migrated)
 * - effectivePlannedDate: v4.7.1+ (returns null if version too old)
 * - estimatedMinutes: v3.5+ macOS only (returns null on iOS/iPadOS)
 * - shouldUseFloatingTimeZone: v3.6+ (defaults to false on older versions)
 */
export const TaskFullSchema = z.object({
  // Identity
  id: z.string().describe("Task's unique identifier"),
  name: z.string().describe("Task's display name"),
  note: z.string().describe('Note content'),

  // Status
  taskStatus: TaskStatusSchema.describe('Current task status'),
  completed: z.boolean().describe('Completion status'),
  flagged: z.boolean().describe('Flagged indicator'),
  effectiveFlagged: z.boolean().describe('Computed flagged status'),

  // Dates (writable)
  deferDate: z.string().nullable().describe('Defer date (ISO 8601)'),
  dueDate: z.string().nullable().describe('Due date (ISO 8601)'),
  plannedDate: z
    .string()
    .nullable()
    .describe('Planned date (ISO 8601, v4.7+, null if unsupported)'),

  // Dates (computed/read-only)
  effectiveDeferDate: z.string().nullable().describe('Computed defer date (ISO 8601)'),
  effectiveDueDate: z.string().nullable().describe('Computed due date (ISO 8601)'),
  effectivePlannedDate: z
    .string()
    .nullable()
    .describe('Computed planned date (ISO 8601, v4.7.1+, null if unsupported)'),
  completionDate: z.string().nullable().describe('When completed (ISO 8601)'),
  dropDate: z.string().nullable().describe('When dropped (ISO 8601)'),
  added: z.string().nullable().describe('Creation date (ISO 8601)'),
  modified: z.string().nullable().describe('Last modified date (ISO 8601)'),

  // Time Estimation
  estimatedMinutes: z
    .number()
    .nullable()
    .describe('Time estimate in minutes (v3.5+ macOS only, null on iOS/iPadOS)'),

  // Hierarchy Configuration
  sequential: z.boolean().describe('Children form dependency chain'),
  completedByChildren: z.boolean().describe('Auto-complete when children done'),
  shouldUseFloatingTimeZone: z
    .boolean()
    .describe('Use floating timezone (v3.6+, defaults false on older)'),

  // Hierarchy Status
  hasChildren: z.boolean().describe('Has child tasks'),
  inInbox: z.boolean().describe('Direct child of inbox'),

  // Relationships
  containingProject: EntityReferenceSchema.nullable().describe('Host project (null if inbox)'),
  parent: EntityReferenceSchema.nullable().describe('Parent task (null if root task)'),
  tags: z.array(TagReferenceSchema).describe('Associated tags')
});

export type TaskFull = z.infer<typeof TaskFullSchema>;
