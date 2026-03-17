import { z } from 'zod';
import { ProjectStatusSchema, ReviewIntervalSchema } from '../../project-tools/shared/project.js';

/**
 * Review project summary schema for get_projects_for_review results.
 *
 * Contains essential project information optimized for review workflows.
 * This is a **focused projection** designed for GTD periodic review context.
 *
 * **Field Selection Rationale**:
 * - Identity (id, name): Required for identification and display
 * - Review dates (lastReviewDate, nextReviewDate): Core review workflow data
 * - Review config (reviewInterval): Needed to understand review cadence
 * - Status: Enables understanding of project state during review
 * - Flagged: High-priority indicator relevant to review decisions
 * - remainingCount: Key metric for review decision-making
 *
 * **Exclusions vs ProjectSummary**:
 * - deferDate, dueDate: Not relevant to review scheduling
 * - parentFolderId/Name: Not needed for review workflow
 * - taskCount: remainingCount is more actionable for reviews
 * - projectType: Not relevant to review decisions
 *
 * **OmniJS Extraction Pattern**:
 * ```javascript
 * var summary = {
 *   id: project.id.primaryKey,
 *   name: project.name,
 *   status: project.status.name,
 *   flagged: project.flagged,
 *   reviewInterval: project.reviewInterval ?
 *     { steps: project.reviewInterval.steps, unit: project.reviewInterval.unit } : null,
 *   lastReviewDate: project.lastReviewDate ? project.lastReviewDate.toISOString() : null,
 *   nextReviewDate: project.nextReviewDate ? project.nextReviewDate.toISOString() : null,
 *   remainingCount: project.flattenedTasks.filter(t => !t.completed).length
 * };
 * ```
 */
export const ReviewProjectSummarySchema = z.object({
  // Identity
  id: z.string().describe("Project's unique identifier"),
  name: z.string().describe("Project's display name"),

  // Status
  status: ProjectStatusSchema.describe('Current project status'),
  flagged: z.boolean().describe('Flagged indicator'),

  // Review Configuration
  reviewInterval: ReviewIntervalSchema.nullable().describe(
    'Review schedule configuration (null if reviews disabled)'
  ),

  // Review Dates (read-only from OmniFocus perspective)
  lastReviewDate: z
    .string()
    .nullable()
    .describe(
      'When last reviewed (ISO 8601) - READ-ONLY: automatically set when nextReviewDate is advanced'
    ),
  nextReviewDate: z
    .string()
    .nullable()
    .describe('When next review due (ISO 8601) - WRITABLE: set this to "mark reviewed"'),

  // Statistics
  remainingCount: z.number().int().min(0).describe('Number of incomplete tasks')
});

export type ReviewProjectSummary = z.infer<typeof ReviewProjectSummarySchema>;
