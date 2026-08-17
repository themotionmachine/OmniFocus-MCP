import { z } from 'zod';
import { batchAddItems, BatchAddItemsParams } from '../primitives/batchAddItems.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  items: z.array(z.object({
    type: z.enum(['task', 'project']).describe("Type of item to add ('task' or 'project')"),
    name: z.string().describe("The name of the item"),
    note: z.string().optional().describe("Additional notes for the item"),
    dueDate: z.string().optional().describe("The due date in ISO format (YYYY-MM-DD or full ISO date)"),
    deferDate: z.string().optional().describe("The defer date in ISO format (YYYY-MM-DD or full ISO date)"),
    plannedDate: z.string().optional().describe("The planned date in ISO format (YYYY-MM-DD or full ISO date) - tasks only"),
    flagged: z.boolean().optional().describe("Whether the item is flagged or not"),
    estimatedMinutes: z.number().optional().describe("Estimated time to complete the item, in minutes"),
    tags: z.array(z.string()).optional().describe("Tags to assign to the item"),

    // Task-specific properties.
    // Keep these in sync with add_omnifocus_task's schema — the two drifted
    // apart once already (#97): projectId was missing here, so Zod stripped it
    // and every task in the batch landed in the inbox reporting success.
    projectId: z.string().optional().describe("For tasks: The id of the project to add the task to (preferred when the project name is ambiguous — e.g. multiple 'Single Actions' projects across folders). Obtain via query_omnifocus. Takes precedence over projectName when both are supplied."),
    projectName: z.string().optional().describe("For tasks: The name or folder path of the project to add the task to (e.g. 'My Project' or 'Work/My Project' to disambiguate by folder). Will add to inbox if not specified. Used when projectId is not supplied; for ambiguous names, prefer projectId."),
    parentTaskId: z.string().optional().describe("For tasks: ID of the parent task"),
    parentTaskName: z.string().optional().describe("For tasks: Name of the parent task (scoped to project when provided)"),
    tempId: z.string().optional().describe("For tasks: Temporary ID for within-batch references"),
    parentTempId: z.string().optional().describe("For tasks: Reference to parent's tempId within the batch"),
    hierarchyLevel: z.number().int().min(0).optional().describe("Optional ordering hint (0=root, 1=child, ...)"),
    
    // Project-specific properties
    folderName: z.string().optional().describe("For projects: The name of the folder to add the project to"),
    sequential: z.boolean().optional().describe("For projects: Whether tasks in the project should be sequential")
  })).describe("Array of items (tasks or projects) to add")
  ,
  createSequentially: z.boolean().optional().describe("Process parents before children; when false, best-effort order will still try to resolve parents first")
});

type PlacementRequest = {
  type: 'task' | 'project';
  name?: string;
  tempId?: string;
  projectId?: string;
  projectName?: string;
  parentTaskId?: string;
  parentTaskName?: string;
  parentTempId?: string;
};

/**
 * Render where a task actually landed, next to where it was asked to go.
 *
 * The reason this exists (#97): the batch result used to be `✅ task: "name"`
 * and nothing else, so a task that was supposed to go into a project but ended
 * up in the inbox looked identical to one that worked. A silent placement
 * fallthrough is only silent if nobody prints the placement.
 *
 * Returns '' for projects, which have no placement, and for results from a
 * primitive that didn't report one.
 */
export function describePlacement(
  item: PlacementRequest,
  placement?: 'parent' | 'project' | 'inbox',
  batch: PlacementRequest[] = []
): string {
  if (item.type !== 'task' || !placement) return '';

  // A parentTempId is meaningless to the caller on its own; resolve it back to
  // the name of the sibling item it points at.
  const sibling = item.parentTempId
    ? batch.find((other) => other.tempId === item.parentTempId)
    : undefined;
  const tempLabel = sibling?.name
    ? `"${sibling.name}"`
    : item.parentTempId
      ? `tempId ${item.parentTempId}`
      : undefined;

  // Ids are rendered bare and names quoted, matching add_omnifocus_task — a
  // quoted id reads as a name the caller can go look for and won't find.
  const parentRequest = item.parentTaskId
    ? `id ${item.parentTaskId}`
    : item.parentTaskName
      ? `"${item.parentTaskName}"`
      : tempLabel;
  const projectRequest = item.projectName
    ? `"${item.projectName}"`
    : item.projectId
      ? `id ${item.projectId}`
      : undefined;

  if (placement === 'inbox') {
    const requested = parentRequest ?? projectRequest;
    return requested ? ` → ⚠️ inbox — requested ${requested}, not honored` : ' → inbox';
  }

  if (placement === 'parent') {
    return parentRequest ? ` → under parent ${parentRequest}` : ' → under parent task';
  }

  // placement === 'project'
  const label = projectRequest ?? tempLabel;
  // Mirrors add_omnifocus_task: an explicitly named parent that didn't take is
  // worth flagging even though the task did land somewhere reasonable.
  const parentMissed = item.parentTaskId || item.parentTaskName
    ? ' ⚠️ parent not found'
    : '';
  return `${label ? ` → in project ${label}` : ' → in a project'}${parentMissed}`;
}

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Call the batchAddItems function
    const result = await batchAddItems(args.items as BatchAddItemsParams[]);
    
    if (result.success) {
      const successCount = result.results.filter(r => r.success).length;
      const failureCount = result.results.filter(r => !r.success).length;
      
      let message = `✅ Successfully added ${successCount} items.`;
      
      if (failureCount > 0) {
        message += ` ⚠️ Failed to add ${failureCount} items.`;
      }

      // Hoist silent misplacement into the summary line. Callers — agents
      // especially — routinely read the first line and stop, which is how #97
      // went unnoticed long enough to be reported as data loss.
      const misplaced = result.results.filter((r, index) => {
        if (!r.success || r.placement !== 'inbox') return false;
        const item = args.items[index];
        return Boolean(
          item.projectId || item.projectName || item.parentTaskId || item.parentTaskName || item.parentTempId
        );
      }).length;
      if (misplaced > 0) {
        message += ` ⚠️ ${misplaced} landed in the inbox despite a requested project or parent.`;
      }

      // Include details about added items
      const details = result.results.map((item, index) => {
        if (item.success) {
          const itemType = args.items[index].type;
          const itemName = args.items[index].name;
          const where = describePlacement(args.items[index], item.placement, args.items);
          // Echo each created id (#104): batch callers otherwise re-query for
          // every id they need for follow-up edits.
          const idText = item.id ? ` (id: ${item.id})` : '';
          return `- ✅ ${itemType}: "${itemName}"${idText}${where}`;
        } else {
          const itemType = args.items[index].type;
          const itemName = args.items[index].name;
          return `- ❌ ${itemType}: "${itemName}" - Error: ${item.error}`;
        }
      }).join('\n');
      
      return {
        content: [{
          type: "text" as const,
          text: `${message}\n\n${details}`
        }]
      };
    } else {
      console.error('[batch_add_items] failure result:', JSON.stringify(result));
      // Batch operation failed completely or no items succeeded.
      const failureDetails = (result.results && result.results.length > 0)
        ? result.results.map((r, index) => {
            const itemType = args.items[index].type;
            const itemName = args.items[index].name;
            return r.success
              ? `- ✅ ${itemType}: \"${itemName}\"${r.id ? ` (id: ${r.id})` : ''}${describePlacement(args.items[index], r.placement, args.items)}`
              : `- ❌ ${itemType}: \"${itemName}\" - Error: ${r?.error || 'Unknown error'}`;
          }).join('\\n')
        : `No items processed. ${result.error || ''}`;

      return {
        content: [{
          type: "text" as const,
          text: `Failed to process batch operation.\\n\\n${failureDetails}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error processing batch operation: ${error.message}`
      }],
      isError: true
    };
  }
} 
