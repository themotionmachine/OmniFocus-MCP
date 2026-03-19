/**
 * Bulk Tools Contracts - Barrel Export
 *
 * Exports all Zod schemas and types for the 6 bulk operation tools.
 *
 * Zod version: 4.2.x
 */

// batch_update_tasks
export {
  type BatchUpdateTasksError,
  BatchUpdateTasksErrorSchema,
  type BatchUpdateTasksInput,
  BatchUpdateTasksInputSchema,
  type BatchUpdateTasksResponse,
  BatchUpdateTasksResponseSchema,
  type BatchUpdateTasksSuccess,
  BatchUpdateTasksSuccessSchema
} from './batch-update-tasks.js';
// convert_tasks_to_projects
export {
  type ConvertTasksToProjectsError,
  ConvertTasksToProjectsErrorSchema,
  type ConvertTasksToProjectsInput,
  ConvertTasksToProjectsInputSchema,
  type ConvertTasksToProjectsResponse,
  ConvertTasksToProjectsResponseSchema,
  type ConvertTasksToProjectsSuccess,
  ConvertTasksToProjectsSuccessSchema
} from './convert-tasks-to-projects.js';
// duplicate_sections
export {
  type DuplicateSectionsError,
  DuplicateSectionsErrorSchema,
  type DuplicateSectionsInput,
  DuplicateSectionsInputSchema,
  type DuplicateSectionsResponse,
  DuplicateSectionsResponseSchema,
  type DuplicateSectionsSuccess,
  DuplicateSectionsSuccessSchema
} from './duplicate-sections.js';
// duplicate_tasks
export {
  type DuplicateTasksError,
  DuplicateTasksErrorSchema,
  type DuplicateTasksInput,
  DuplicateTasksInputSchema,
  type DuplicateTasksResponse,
  DuplicateTasksResponseSchema,
  type DuplicateTasksSuccess,
  DuplicateTasksSuccessSchema
} from './duplicate-tasks.js';
// move_sections
export {
  type MoveSectionsError,
  MoveSectionsErrorSchema,
  type MoveSectionsInput,
  MoveSectionsInputSchema,
  type MoveSectionsResponse,
  MoveSectionsResponseSchema,
  type MoveSectionsSuccess,
  MoveSectionsSuccessSchema
} from './move-sections.js';
// move_tasks
export {
  type MoveTasksError,
  MoveTasksErrorSchema,
  type MoveTasksInput,
  MoveTasksInputSchema,
  type MoveTasksResponse,
  MoveTasksResponseSchema,
  type MoveTasksSuccess,
  MoveTasksSuccessSchema
} from './move-tasks.js';
// Shared schemas
export {
  type BulkBatchItemResult,
  BulkBatchItemResultSchema,
  type ItemIdentifier,
  ItemIdentifierSchema,
  type PropertyUpdateSet,
  PropertyUpdateSetSchema,
  type SectionPosition,
  SectionPositionSchema,
  type Summary,
  SummarySchema,
  type TaskPosition,
  TaskPositionSchema
} from './shared.js';
