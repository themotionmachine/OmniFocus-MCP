import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { getDatabaseStats } from '../tools/dumpDatabaseOptimized.js';
import { Logger } from '../utils/logger.js';

export async function readStats(logger: Logger): Promise<ReadResourceResult> {
  logger.debug("resource:stats", "Reading database statistics");

  const stats = await getDatabaseStats();

  return {
    contents: [{
      uri: "omnifocus://stats",
      mimeType: "application/json",
      text: JSON.stringify(stats, null, 2)
    }]
  };
}
