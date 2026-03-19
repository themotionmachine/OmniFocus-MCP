/**
 * Search Tools Contract Definitions (Design Artifact)
 *
 * These Zod schemas define the contracts for search_tasks, search_projects,
 * search_folders, and search_tags tools. During implementation, these will
 * be placed in src/contracts/search-tools/ with one file per tool plus
 * a shared/ directory for common schemas.
 *
 * File mapping:
 *   src/contracts/search-tools/shared/search-result.ts  — Result item schemas
 *   src/contracts/search-tools/search-tasks.ts          — SearchTasks I/O
 *   src/contracts/search-tools/search-projects.ts       — SearchProjects I/O
 *   src/contracts/search-tools/search-folders.ts        — SearchFolders I/O
 *   src/contracts/search-tools/search-tags.ts           — SearchTags I/O
 *   src/contracts/search-tools/index.ts                 — Barrel exports
 */

import { z } from 'zod';

// =============================================================================
// shared/search-result.ts — Result item schemas per type
// =============================================================================

/** Task status values as returned by OmniJS Task.Status mapping */
export const TaskStatusValueSchema = z.enum([
  'available',
  'blocked',
  'completed',
  'dropped',
  'dueSoon',
  'next',
  'overdue'
]);

export type TaskStatusValue = z.infer<typeof TaskStatusValueSchema>;

/** A task matched by search */
export const SearchTaskResultSchema = z.object({
  id: z.string().describe("Task's unique identifier"),
  name: z.string().describe("Task's display name"),
  status: TaskStatusValueSchema.describe("Task's current status"),
  projectName: z
    .string()
    .nullable()
    .describe('Containing project name, "Inbox" if in inbox, null if orphaned'),
  flagged: z.boolean().describe('Whether the task is flagged')
});

export type SearchTaskResult = z.infer<typeof SearchTaskResultSchema>;

/** Project status values */
export const ProjectStatusValueSchema = z.enum(['active', 'done', 'dropped', 'onHold']);

export type ProjectStatusValue = z.infer<typeof ProjectStatusValueSchema>;

/** A project matched by search */
export const SearchProjectResultSchema = z.object({
  id: z.string().describe("Project's unique identifier"),
  name: z.string().describe("Project's display name"),
  status: ProjectStatusValueSchema.describe("Project's current status"),
  folderName: z.string().nullable().describe('Parent folder name, null if root-level')
});

export type SearchProjectResult = z.infer<typeof SearchProjectResultSchema>;

/** A folder matched by search */
export const SearchFolderResultSchema = z.object({
  id: z.string().describe("Folder's unique identifier"),
  name: z.string().describe("Folder's display name"),
  parentFolderName: z.string().nullable().describe('Parent folder name, null if root-level')
});

export type SearchFolderResult = z.infer<typeof SearchFolderResultSchema>;

/** Tag status values */
export const TagStatusValueSchema = z.enum(['active', 'onHold', 'dropped']);

export type TagStatusValue = z.infer<typeof TagStatusValueSchema>;

/** A tag matched by search */
export const SearchTagResultSchema = z.object({
  id: z.string().describe("Tag's unique identifier"),
  name: z.string().describe("Tag's display name"),
  status: TagStatusValueSchema.describe("Tag's current status"),
  parentTagName: z.string().nullable().describe('Parent tag name, null if root-level')
});

export type SearchTagResult = z.infer<typeof SearchTagResultSchema>;

// =============================================================================
// search-tasks.ts
// =============================================================================

/** Status filter parameter for task search */
export const TaskStatusFilterSchema = z.enum(['active', 'completed', 'dropped', 'all']);

export type TaskStatusFilter = z.infer<typeof TaskStatusFilterSchema>;

export const SearchTasksInputSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query must be at least 1 character')
    .describe('Search string for case-insensitive substring matching'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe('Maximum number of results to return (1-1000, default 50)'),
  status: TaskStatusFilterSchema.default('active').describe(
    'Status filter: "active" (default), "completed", "dropped", or "all"'
  )
});

export type SearchTasksInput = z.infer<typeof SearchTasksInputSchema>;

export const SearchTasksSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(SearchTaskResultSchema),
  totalMatches: z.number().int().min(0).describe('Total matches before limit applied')
});

export type SearchTasksSuccess = z.infer<typeof SearchTasksSuccessSchema>;

export const SearchTasksErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SearchTasksError = z.infer<typeof SearchTasksErrorSchema>;

export const SearchTasksResponseSchema = z.discriminatedUnion('success', [
  SearchTasksSuccessSchema,
  SearchTasksErrorSchema
]);

export type SearchTasksResponse = z.infer<typeof SearchTasksResponseSchema>;

// =============================================================================
// search-projects.ts
// =============================================================================

export const SearchProjectsInputSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query must be at least 1 character')
    .describe('Search string for Smart Match relevance matching (Quick Open semantics)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe('Maximum number of results to return (1-1000, default 50)')
});

export type SearchProjectsInput = z.infer<typeof SearchProjectsInputSchema>;

export const SearchProjectsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(SearchProjectResultSchema),
  totalMatches: z.number().int().min(0).describe('Total matches before limit applied')
});

export type SearchProjectsSuccess = z.infer<typeof SearchProjectsSuccessSchema>;

export const SearchProjectsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SearchProjectsError = z.infer<typeof SearchProjectsErrorSchema>;

export const SearchProjectsResponseSchema = z.discriminatedUnion('success', [
  SearchProjectsSuccessSchema,
  SearchProjectsErrorSchema
]);

export type SearchProjectsResponse = z.infer<typeof SearchProjectsResponseSchema>;

// =============================================================================
// search-folders.ts
// =============================================================================

export const SearchFoldersInputSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query must be at least 1 character')
    .describe('Search string for Smart Match relevance matching (Quick Open semantics)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe('Maximum number of results to return (1-1000, default 50)')
});

export type SearchFoldersInput = z.infer<typeof SearchFoldersInputSchema>;

export const SearchFoldersSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(SearchFolderResultSchema),
  totalMatches: z.number().int().min(0).describe('Total matches before limit applied')
});

export type SearchFoldersSuccess = z.infer<typeof SearchFoldersSuccessSchema>;

export const SearchFoldersErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SearchFoldersError = z.infer<typeof SearchFoldersErrorSchema>;

export const SearchFoldersResponseSchema = z.discriminatedUnion('success', [
  SearchFoldersSuccessSchema,
  SearchFoldersErrorSchema
]);

export type SearchFoldersResponse = z.infer<typeof SearchFoldersResponseSchema>;

// =============================================================================
// search-tags.ts
// =============================================================================

export const SearchTagsInputSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query must be at least 1 character')
    .describe('Search string for Smart Match relevance matching (Quick Open semantics)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50)
    .describe('Maximum number of results to return (1-1000, default 50)')
});

export type SearchTagsInput = z.infer<typeof SearchTagsInputSchema>;

export const SearchTagsSuccessSchema = z.object({
  success: z.literal(true),
  results: z.array(SearchTagResultSchema),
  totalMatches: z.number().int().min(0).describe('Total matches before limit applied')
});

export type SearchTagsSuccess = z.infer<typeof SearchTagsSuccessSchema>;

export const SearchTagsErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export type SearchTagsError = z.infer<typeof SearchTagsErrorSchema>;

export const SearchTagsResponseSchema = z.discriminatedUnion('success', [
  SearchTagsSuccessSchema,
  SearchTagsErrorSchema
]);

export type SearchTagsResponse = z.infer<typeof SearchTagsResponseSchema>;
