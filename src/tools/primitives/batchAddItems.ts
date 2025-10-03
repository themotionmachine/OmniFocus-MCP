import { addOmniFocusTask, AddOmniFocusTaskParams } from './addOmniFocusTask.js';
import { addProject, AddProjectParams } from './addProject.js';

// Define the parameters for the batch operation
export type BatchAddItemsParams = {
  type: 'task' | 'project';
  name: string;
  note?: string;
  dueDate?: string;
  deferDate?: string;
  plannedDate?: string; // For tasks
  flagged?: boolean;
  estimatedMinutes?: number;
  tags?: string[];
  projectName?: string; // For tasks
  // Hierarchy for tasks
  parentTaskId?: string;
  parentTaskName?: string;
  tempId?: string;
  parentTempId?: string;
  hierarchyLevel?: number;
  folderName?: string; // For projects
  sequential?: boolean; // For projects
};

// Define the result type for individual operations
type ItemResult = {
  success: boolean;
  id?: string;
  error?: string;
};

// Define the result type for the batch operation
type BatchResult = {
  success: boolean;
  results: ItemResult[];
  error?: string;
};

/**
 * Add multiple items (tasks or projects) to OmniFocus
 */
export async function batchAddItems(items: BatchAddItemsParams[]): Promise<BatchResult> {
  try {
    const results: ItemResult[] = new Array(items.length);
    const processed: boolean[] = new Array(items.length).fill(false);
    const tempToRealId = new Map<string, string>();

    // Pre-validate cycles in tempId -> parentTempId references
    const tempIndex = new Map<string, number>();
    items.forEach((it, idx) => { if (it.tempId) tempIndex.set(it.tempId, idx); });

    // Detect cycles using DFS and capture cycle paths
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const inCycle = new Set<string>();
    const cycleMessageByTempId = new Map<string, string>();
    const stack: string[] = [];

    function dfs(tempId: string) {
      if (visited.has(tempId) || inCycle.has(tempId)) return;
      if (visiting.has(tempId)) return; // already on stack, handled by caller
      visiting.add(tempId);
      stack.push(tempId);
      const idx = tempIndex.get(tempId)!;
      const parentTemp = items[idx].parentTempId;
      if (parentTemp && tempIndex.has(parentTemp)) {
        if (visiting.has(parentTemp)) {
          // Found a cycle; construct path
          const startIdx = stack.indexOf(parentTemp);
          const cycleIds = stack.slice(startIdx).concat(parentTemp);
          const cycleNames = cycleIds.map(tid => {
            const i = tempIndex.get(tid)!;
            return items[i].name || tid;
          });
          const pathText = `${cycleNames.join(' -> ')}`;
          for (const tid of cycleIds) {
            inCycle.add(tid);
            cycleMessageByTempId.set(tid, `Cycle detected: ${pathText}`);
          }
        } else {
          dfs(parentTemp);
        }
      }
      stack.pop();
      visiting.delete(tempId);
      visited.add(tempId);
    }

    for (const tid of tempIndex.keys()) dfs(tid);

    // Mark items that participate in cycles as failed early
    for (const tid of inCycle) {
      const idx = tempIndex.get(tid)!;
      const msg = cycleMessageByTempId.get(tid) || `Cycle detected involving tempId: ${tid}`;
      results[idx] = { success: false, error: msg };
      processed[idx] = true;
    }

    // Mark items with unknown parentTempId (and no explicit parentTaskId) as invalid early
    items.forEach((it, idx) => {
      if (processed[idx]) return;
      if (it.parentTempId && !tempIndex.has(it.parentTempId) && !it.parentTaskId) {
        results[idx] = { success: false, error: `Unknown parentTempId: ${it.parentTempId}` };
        processed[idx] = true;
      }
    });

    // Stable order: sort by hierarchyLevel (undefined -> 0), then original index
    const indexed = items.map((it, idx) => ({ ...it, __index: idx }));
    indexed.sort((a, b) => (a.hierarchyLevel ?? 0) - (b.hierarchyLevel ?? 0) || a.__index - b.__index);

    let madeProgress = true;
    while (processed.some(p => !p) && madeProgress) {
      madeProgress = false;
      for (const item of indexed) {
        const i = item.__index;
        if (processed[i]) continue;
        try {
          if (item.type === 'project') {
            const projectParams: AddProjectParams = {
              name: item.name,
              note: item.note,
              dueDate: item.dueDate,
              deferDate: item.deferDate,
              flagged: item.flagged,
              estimatedMinutes: item.estimatedMinutes,
              tags: item.tags,
              folderName: item.folderName,
              sequential: item.sequential
            };

            const projectResult = await addProject(projectParams);
            results[i] = {
              success: projectResult.success,
              id: projectResult.projectId,
              error: projectResult.error
            };
            processed[i] = true;
            madeProgress = true;
            continue;
          }

          // task
          let parentTaskId = item.parentTaskId;
          if (!parentTaskId && item.parentTempId) {
            parentTaskId = tempToRealId.get(item.parentTempId);
            if (!parentTaskId) {
              // Parent not created yet; skip this round
              continue;
            }
          }

          const taskParams: AddOmniFocusTaskParams = {
            name: item.name,
            note: item.note,
            dueDate: item.dueDate,
            deferDate: item.deferDate,
            plannedDate: item.plannedDate,
            flagged: item.flagged,
            estimatedMinutes: item.estimatedMinutes,
            tags: item.tags,
            projectName: item.projectName,
            parentTaskId,
            parentTaskName: item.parentTaskName,
            hierarchyLevel: item.hierarchyLevel
          };

          const taskResult = await addOmniFocusTask(taskParams);
          results[i] = {
            success: taskResult.success,
            id: taskResult.taskId,
            error: taskResult.error
          };
          if (item.tempId && taskResult.taskId && taskResult.success) {
            tempToRealId.set(item.tempId, taskResult.taskId);
          }
          processed[i] = true;
          madeProgress = true;
        } catch (itemError: any) {
          results[i] = {
            success: false,
            error: itemError?.message || 'Unknown error processing item'
          };
          processed[i] = true; // avoid infinite loop on thrown errors
          madeProgress = true;
        }
      }
    }

    // Any unprocessed due to dependencies/cycles -> fail with message
    for (const item of indexed) {
      const i = item.__index;
      if (!processed[i]) {
        const reason = item.parentTempId && !tempToRealId.has(item.parentTempId)
          ? `Unresolved parentTempId: ${item.parentTempId}`
          : 'Unresolved dependency or cycle';
        results[i] = { success: false, error: reason };
        processed[i] = true;
      }
    }

    const overallSuccess = results.some(r => r?.success);
    return { success: overallSuccess, results };
  } catch (error: any) {
    console.error('Error in batchAddItems:', error);
    return { success: false, results: [], error: error?.message || 'Unknown error in batchAddItems' };
  }
}
