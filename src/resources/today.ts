import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';
import { Logger } from '../utils/logger.js';

export async function readToday(logger: Logger): Promise<ReadResourceResult> {
  logger.debug("resource:today", "Reading today's agenda");

  const [dueResult, plannedResult, overdueResult] = await Promise.all([
    queryOmnifocus({ entity: 'tasks', filters: { dueOn: 0 }, fields: ['id', 'name', 'flagged', 'dueDate', 'projectName', 'tagNames', 'taskStatus'] }),
    queryOmnifocus({ entity: 'tasks', filters: { plannedOn: 0 }, fields: ['id', 'name', 'flagged', 'plannedDate', 'projectName', 'tagNames', 'taskStatus'] }),
    queryOmnifocus({ entity: 'tasks', filters: { status: ['Overdue'] }, fields: ['id', 'name', 'flagged', 'dueDate', 'projectName', 'tagNames', 'taskStatus'] })
  ]);

  const data = {
    dueToday: dueResult.success ? dueResult.items ?? [] : [],
    plannedToday: plannedResult.success ? plannedResult.items ?? [] : [],
    overdue: overdueResult.success ? overdueResult.items ?? [] : []
  };

  return {
    contents: [{
      uri: "omnifocus://today",
      mimeType: "application/json",
      text: JSON.stringify(data, null, 2)
    }]
  };
}
