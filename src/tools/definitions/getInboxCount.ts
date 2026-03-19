import { GetInboxCountInputSchema } from '../../contracts/database-tools/get-inbox-count.js';
import { getInboxCount } from '../primitives/getInboxCount.js';

export const schema = GetInboxCountInputSchema;

export async function handler() {
  const result = await getInboxCount();

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
