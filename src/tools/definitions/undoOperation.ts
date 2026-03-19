import { UndoInputSchema } from '../../contracts/database-tools/undo.js';
import { undoOperation } from '../primitives/undoOperation.js';

export const schema = UndoInputSchema;

export async function handler() {
  const result = await undoOperation();

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
