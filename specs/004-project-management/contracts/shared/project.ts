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
 * **Invalid State**: sequential=true AND containsSingletonActions=true is invalid.
 * Implementation silently auto-clears the conflicting property (NOT a validation error).
 *
 * **Precedence**: When both provided as `true`, `containsSingletonActions` wins
 * (it's processed after `sequential`).
 *
 * **Unique to Phase 4**: No similar mutual exclusion exists in folders, tags, or tasks.
 *
 * See spec.md §Project Type Mutual Exclusion for complete behavior specification.
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
 * **WRONG Pattern** (does NOT work):
 * ```javascript
 * project.reviewInterval.steps = 14; // ❌ Modifies local copy only
 * ```
 * **WHY it fails**: `project.reviewInterval` returns a COPY of the object.
 * Modifying the copy has no effect on the project's actual reviewInterval.
 *
 * **CORRECT Pattern** (works):
 * ```javascript
 * project.reviewInterval = { steps: 14, unit: 'days' }; // ✓ Full reassignment
 * ```
 * **WHY it works**: Assignment triggers OmniFocus to update the project's
 * internal reviewInterval AND recalculate nextReviewDate.
 *
 * See quickstart.md §Review Interval Value Object for complete examples.
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
 * **Subset Constraint**: ProjectSummary MUST be a proper subset of ProjectFull.
 * All shared fields MUST have identical types. Type differences are NOT allowed.
 *
 * **Field Count**: 12 fields (vs 30 in ProjectFull)
 *
 * **Denormalized Fields**:
 * - `parentFolderId`: Derived from `parentFolder?.id`
 * - `parentFolderName`: Derived from `parentFolder?.name`
 *
 * **Exclusion Rationale - reviewInterval**: ProjectSummary includes `nextReviewDate`
 * but excludes `reviewInterval` because:
 * - Summary is optimized for list filtering (nextReviewDate enables 'due'/'upcoming' filters)
 * - reviewInterval is configuration detail, not state information needed for filtering
 * - Use get_project to retrieve full reviewInterval configuration
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
  nextReviewDate: z
    .string()
    .nullable()
    .describe('Next review date (ISO 8601) - READ-ONLY: computed by OmniFocus'),

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
  lastReviewDate: z
    .string()
    .nullable()
    .describe(
      'When last reviewed (ISO 8601) - READ-ONLY: managed by OmniFocus when user marks reviewed'
    ),
  nextReviewDate: z
    .string()
    .nullable()
    .describe(
      'When next review due (ISO 8601) - READ-ONLY: computed from lastReviewDate + reviewInterval'
    ),

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
 * **Filter Semantics**:
 * - `'due'`: nextReviewDate <= today (review is overdue or due today)
 * - `'upcoming'`: today < nextReviewDate <= today+7 days (review coming soon)
 * - `'any'`: No review filtering - returns ALL projects regardless of review state
 *
 * **Boundary Conditions** (Explicit Resolutions):
 * - **nextReviewDate = exactly today**: Classified as `'due'` (today is INCLUDED in `<=`)
 * - **nextReviewDate = exactly today+7**: Classified as `'upcoming'` (upper boundary is INCLUSIVE)
 *
 * **'any' Filter Behavior**:
 * Returns ALL projects including:
 * - Projects WITH review intervals (any nextReviewDate value)
 * - Projects WITHOUT review intervals (nextReviewDate = null)
 *
 * **Edge Case: reviewInterval Exists but nextReviewDate is Null**:
 * - This state is transient (sync timing issue)
 * - EXCLUDED from 'due' and 'upcoming' filters
 * - INCLUDED in 'any' filter
 *
 * **Error Handling**:
 * Invalid reviewStatus values are rejected by Zod schema validation.
 * Error format: `Invalid enum value. Expected 'due' | 'upcoming' | 'any', received '...'`
 *
 * See spec.md §Review Status Filter Behavior for complete specification.
 */
export const ReviewStatusFilterSchema = z.enum(['due', 'upcoming', 'any']);

export type ReviewStatusFilter = z.infer<typeof ReviewStatusFilterSchema>;
