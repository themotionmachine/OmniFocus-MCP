import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';
import { Logger } from '../utils/logger.js';

export async function readFlagged(logger: Logger): Promise<ReadResourceResult> {
  logger.debug("resource:flagged", "Reading flagged items");

  const result = await queryOmnifocus({
    entity: 'tasks',
    filters: { flagged: true },
    fields: ['id', 'name', 'dueDate', 'projectName', 'tagNames', 'taskStatus']
  });

  const data = result.success ? result.items ?? [] : { error: result.error };

  return {
    contents: [{
      uri: "omnifocus://flagged",
      mimeType: "application/json",
      text: JSON.stringify(data, null, 2)
    }]
  };
}
