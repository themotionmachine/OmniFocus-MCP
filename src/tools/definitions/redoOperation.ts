import { RedoInputSchema } from '../../contracts/database-tools/redo.js';
import { redoOperation } from '../primitives/redoOperation.js';

export const schema = RedoInputSchema;

export async function handler() {
  const result = await redoOperation();

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
