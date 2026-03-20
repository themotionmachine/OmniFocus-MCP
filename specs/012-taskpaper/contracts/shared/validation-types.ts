import { z } from 'zod';

/** Type of parsed item */
export const ParsedItemTypeSchema = z.enum(['task', 'project']);

export type ParsedItemType = z.infer<typeof ParsedItemTypeSchema>;

/** A parsed item from transport text validation */
export const ParsedItemSchema: z.ZodType<ParsedItem> = z.lazy(() =>
  z.object({
    name: z.string().describe('Item name'),
    type: ParsedItemTypeSchema.describe('Whether item is a task or project'),
    depth: z.number().int().min(0).describe('Indentation depth (0 = root)'),
    tags: z.array(z.string()).describe('Tag names found on this item'),
    dueDate: z.string().nullable().describe('ISO 8601 date string or null'),
    deferDate: z.string().nullable().describe('ISO 8601 date string or null'),
    doneDate: z.string().nullable().describe('ISO 8601 date string for completed items or null'),
    flagged: z.boolean().describe('Whether item is flagged'),
    estimate: z.string().nullable().describe('Duration string or null'),
    note: z.string().nullable().describe('Note text or null'),
    children: z.array(ParsedItemSchema).describe('Nested child items')
  })
);

export interface ParsedItem {
  name: string;
  type: 'task' | 'project';
  depth: number;
  tags: string[];
  dueDate: string | null;
  deferDate: string | null;
  doneDate: string | null;
  flagged: boolean;
  estimate: string | null;
  note: string | null;
  children: ParsedItem[];
}

/** Summary statistics from transport text validation */
export const ValidationSummarySchema = z.object({
  tasks: z.number().int().min(0).describe('Total task count including nested'),
  projects: z.number().int().min(0).describe('Total project count'),
  tags: z.number().int().min(0).describe('Unique tag count'),
  maxDepth: z.number().int().min(0).describe('Maximum nesting depth')
});

export type ValidationSummary = z.infer<typeof ValidationSummarySchema>;

/** A warning about problematic content in transport text */
export const ValidationWarningSchema = z.object({
  line: z.number().int().min(1).describe('1-based line number'),
  message: z.string().describe('Description of the issue'),
  content: z.string().describe('The problematic line content')
});

export type ValidationWarning = z.infer<typeof ValidationWarningSchema>;
