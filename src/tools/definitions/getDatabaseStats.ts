import { GetDatabaseStatsInputSchema } from '../../contracts/database-tools/get-database-stats.js';
import { getDatabaseStats } from '../primitives/getDatabaseStats.js';

export const schema = GetDatabaseStatsInputSchema;

export async function handler() {
  const result = await getDatabaseStats();

  if (!result.success) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      isError: true
    };
  }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result) }]
  };
}
