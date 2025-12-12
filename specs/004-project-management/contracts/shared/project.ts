import { z } from 'zod';

/**
 * Project status enumeration.
 *
 * Represents the user-set status of a project.
 * Values are PascalCase and case-sensitive.
 *
 * **OmniJS Mapping**: Maps 1:1 with `Project.Status.*` constants:
 * - Project.Status.Active ↔ 'Active'
 * - Project.Status.OnHold ↔ 'OnHold'
 * - Project.Status.Done ↔ 'Done'
 * - Project.Status.Dropped ↔ 'Dropped'
 *
 * **Note**: Unlike TaskStatus, ProjectStatus is explicitly set by the user,
 * not computed by OmniFocus.
 */
export const ProjectStatusSchema = z.enum([
  'Active', // Project is active and available (default)
  'OnHold', // Project is paused
  'Done', // Project is completed
  'Dropped' // Project is dropped/abandoned
]);

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

/**
 * Project type enumeration.
 *
 * Derived from `sequential` and `containsSingletonActions` properties.
 *
 * **Derivation Logic**:
 * - parallel: sequential=false, containsSingletonActions=false (default)
 * - sequential: sequential=true, containsSingletonActions=false
 * - single-actions: sequential=false, containsSingletonActions=true
 *
 * **Note**: sequential=true AND containsSingletonActions=true is invalid;
 * implementation auto-clears the conflicting property.
 */
export const ProjectTypeSchema = z.enum([
  'parallel', // All tasks available simultaneously (default)
  'sequential', // Tasks form dependency chain (first available only)
  'single-actions' // Individual actions, no next task
]);

export type ProjectType = z.infer<typeof ProjectTypeSchema>;

/**
 * Review unit enumeration for review intervals.
 */
export const ReviewUnitSchema = z.enum(['days', 'weeks', 'months', 'years']);

export type ReviewUnit = z.infer<typeof ReviewUnitSchema>;

/**
 * Review interval value object schema.
 *
 * Represents a repeating schedule for project reviews.
 *
 * **Value Object Semantics**: This is a value object - changes to properties
 * don't affect the project directly. Must create new object and re-assign
 * to `project.reviewInterval`.
 *
 * **OmniJS Usage**:
 * ```javascript
 * project.reviewInterval = { steps: 2, unit: 'weeks' };
 * ```
 */
export const ReviewIntervalSchema = z.object({
  steps: z.number().int().min(1).describe('Number of units (e.g., 14 for "every 14 days")'),
  unit: ReviewUnitSchema.describe('Unit type for the interval')
});

export type ReviewInterval = z.infer<typeof ReviewIntervalSchema>;

/**
 * Reference schema for related entities (folder, project, task).
 *
 * **OmniJS Extraction Pattern**:
 * ```javascript
 * var ref = entity ? { id: entity.id.primaryKey, name: entity.name } : null;
 * ```
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
 * Project summary schema for list results.
 *
 * Contains essential project information for efficient listing.
 * This is a **denormalized projection** of ProjectFull optimized for list responses.
 *
 * **Subset Relationship**: Core fields have identical types in both ProjectSummary
 * and ProjectFull. The denormalized fields represent transformed views.
 */
export const ProjectSummarySchema = z.object({
  // Identity
  id: z.string().describe("Project's unique identifier"),
  name: z.string().describe("Project's display name"),

  // Status
  status: ProjectStatusSchema.describe('Current project status'),
  flagged: z.boolean().describe('Flagged indicator'),

  // Project Type (derived)
  projectType: ProjectTypeSchema.describe('Project organizational type'),

  // Dates
  deferDate: z.string().nullable().describe('Defer date (ISO 8601)'),
  dueDate: z.string().nullable().describe('Due date (ISO 8601)'),
  nextReviewDate: z.string().nullable().describe('Next review date (ISO 8601)'),

  // Relationships (denormalized)
  parentFolderId: z.string().nullable().describe('Containing folder ID (null if root)'),
  parentFolderName: z.string().nullable().describe('Containing folder name'),

  // Statistics
  taskCount: z.number().int().min(0).describe('Number of direct child tasks'),
  remainingCount: z.number().int().min(0).describe('Number of incomplete tasks')
});

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

/**
 * Complete project schema with all properties.
 *
 * Used by get_project for full project details.
 *
 * **Date Handling**:
 * - All dates use ISO 8601 format (e.g., "2025-01-15T09:00:00.000Z")
 * - Dates are nullable - null indicates "not set"
 * - OmniJS serialization: `date ? date.toISOString() : null`
 *
 * **Version-Conditional Fields** (may return null/default on older versions):
 * - estimatedMinutes: v3.5+ macOS only (returns null on iOS/iPadOS)
 * - shouldUseFloatingTimeZone: v3.6+ (defaults to false on older versions)
 */
export const ProjectFullSchema = z.object({
  // Identity
  id: z.string().describe("Project's unique identifier"),
  name: z.string().describe("Project's display name"),
  note: z.string().describe('Note content (via root task)'),

  // Status
  status: ProjectStatusSchema.describe('Current project status'),
  completed: z.boolean().describe('Completion status'),
  flagged: z.boolean().describe('Flagged indicator'),
  effectiveFlagged: z.boolean().describe('Computed flagged status (considers containers)'),

  // Project Type
  sequential: z.boolean().describe('Children form dependency chain'),
  containsSingletonActions: z.boolean().describe('Single-actions list type'),
  projectType: ProjectTypeSchema.describe('Derived project type'),

  // Completion Behavior
  completedByChildren: z.boolean().describe('Auto-complete when last child completes'),
  defaultSingletonActionHolder: z.boolean().describe('Receives inbox items on cleanup'),

  // Dates (writable)
  deferDate: z.string().nullable().describe('Defer date (ISO 8601)'),
  dueDate: z.string().nullable().describe('Due date (ISO 8601)'),

  // Dates (computed/read-only)
  effectiveDeferDate: z.string().nullable().describe('Computed defer date (ISO 8601)'),
  effectiveDueDate: z.string().nullable().describe('Computed due date (ISO 8601)'),
  completionDate: z.string().nullable().describe('When completed (ISO 8601)'),
  dropDate: z.string().nullable().describe('When dropped (ISO 8601)'),

  // Time Estimation
  estimatedMinutes: z
    .number()
    .nullable()
    .describe('Time estimate in minutes (v3.5+ macOS only, null on iOS/iPadOS)'),

  // Review Settings
  reviewInterval: ReviewIntervalSchema.nullable().describe('Review schedule (null if no review)'),
  lastReviewDate: z.string().nullable().describe('When last reviewed (ISO 8601)'),
  nextReviewDate: z.string().nullable().describe('When next review due (ISO 8601)'),

  // Repetition
  repetitionRule: z.string().nullable().describe('Repetition rule (serialized)'),

  // Timezone
  shouldUseFloatingTimeZone: z
    .boolean()
    .describe('Use floating timezone (v3.6+, defaults false on older)'),

  // Hierarchy Status
  hasChildren: z.boolean().describe('Has child tasks'),

  // Next Action
  nextTask: EntityReferenceSchema.nullable().describe(
    'Next available task (null for single-actions lists)'
  ),

  // Relationships
  parentFolder: EntityReferenceSchema.nullable().describe('Container folder (null if root)'),
  tags: z.array(TagReferenceSchema).describe('Associated tags'),

  // Statistics
  taskCount: z.number().int().min(0).describe('Number of direct child tasks'),
  remainingCount: z.number().int().min(0).describe('Number of incomplete tasks')
});

export type ProjectFull = z.infer<typeof ProjectFullSchema>;

/**
 * Review status filter for list_projects.
 *
 * - 'due': nextReviewDate <= today (review is overdue)
 * - 'upcoming': nextReviewDate within 7 days but not past due
 * - 'any': No review filtering (default)
 *
 * **Note**: Projects without review intervals are excluded from 'due' and 'upcoming' filters.
 */
export const ReviewStatusFilterSchema = z.enum(['due', 'upcoming', 'any']);

export type ReviewStatusFilter = z.infer<typeof ReviewStatusFilterSchema>;
