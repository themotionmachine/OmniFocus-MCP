import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';
import { Logger } from '../utils/logger.js';

export async function readInbox(logger: Logger): Promise<ReadResourceResult> {
  logger.debug("resource:inbox", "Reading inbox items");

  const result = await queryOmnifocus({
    entity: 'tasks',
    filters: { inbox: true },
    fields: ['id', 'name', 'flagged', 'dueDate', 'deferDate', 'tagNames', 'taskStatus', 'note']
  });

  const data = result.success ? result.items ?? [] : { error: result.error };

  return {
    contents: [{
      uri: "omnifocus://inbox",
      mimeType: "application/json",
      text: JSON.stringify(data, null, 2)
    }]
  };
}
