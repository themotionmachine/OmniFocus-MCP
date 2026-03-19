import { SaveDatabaseInputSchema } from '../../contracts/database-tools/save-database.js';
import { saveDatabase } from '../primitives/saveDatabase.js';

export const schema = SaveDatabaseInputSchema;

export async function handler() {
  const result = await saveDatabase();

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
