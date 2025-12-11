import type { z } from 'zod';
import { AppendNoteInputSchema } from '../../contracts/task-tools/append-note.js';
import { appendNote } from '../primitives/appendNote.js';

export const schema = AppendNoteInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await appendNote(params);

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
