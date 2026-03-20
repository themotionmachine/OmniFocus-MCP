import { z } from 'zod';

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
