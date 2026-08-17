import { z } from 'zod';
import { batchAddItems, BatchAddItemsParams } from '../primitives/batchAddItems.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  items: z.array(z.object({
    type: z.enum(['task', 'project']).describe("What to create"),
    name: z.string().describe("Item name"),
    note: z.string().optional().describe("Item note"),
    dueDate: z.string().optional().describe("Due date (YYYY-MM-DD or full ISO)"),
    deferDate: z.string().optional().describe("Defer date (YYYY-MM-DD or full ISO)"),
    plannedDate: z.string().optional().describe("Planned date (ISO; tasks only)"),
    flagged: z.boolean().optional().describe("Flag the item"),
    estimatedMinutes: z.number().optional().describe("Time estimate in minutes"),
    tags: z.array(z.string()).optional().describe("Tag names to assign"),

    // Task-specific properties.
    // Keep these in sync with add_omnifocus_task's schema — the two drifted
    // apart once already (#97): projectId was missing here, so Zod stripped it
    // and every task in the batch landed in the inbox reporting success.
    projectId: z.string().optional().describe("Tasks: project id to place the task in; takes precedence over projectName. Prefer when names are ambiguous"),
    projectName: z.string().optional().describe("Tasks: project name or folder path ('Work/My Project'); defaults to inbox"),
    parentTaskId: z.string().optional().describe("Tasks: parent task id"),
    parentTaskName: z.string().optional().describe("Tasks: parent task name, scoped to the project when one is given"),
    tempId: z.string().optional().describe("Tasks: temporary id other items in this batch can reference"),
    parentTempId: z.string().optional().describe("Tasks: nest under the batch item with this tempId"),
    hierarchyLevel: z.number().int().min(0).optional().describe("Ordering hint (0 = root)"),

    // Project-specific properties
    folderName: z.string().optional().describe("Projects: folder to place the project in"),
    sequential: z.boolean().optional().describe("Projects: make tasks sequential")
  })).describe("Items to add"),
  createSequentially: z.boolean().optional().describe("Process parents before children; even when false, parents are resolved first best-effort")
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
