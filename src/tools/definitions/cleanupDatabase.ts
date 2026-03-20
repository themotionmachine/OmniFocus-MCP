import { CleanupDatabaseInputSchema } from '../../contracts/database-tools/cleanup-database.js';
import { cleanupDatabase } from '../primitives/cleanupDatabase.js';

export const schema = CleanupDatabaseInputSchema;

export async function handler() {
  const result = await cleanupDatabase();

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
