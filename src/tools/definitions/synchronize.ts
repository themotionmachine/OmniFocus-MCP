import { z } from 'zod';
import { synchronize, MAX_WAIT_SECONDS } from '../primitives/synchronize.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  waitSeconds: z.number().min(0).max(MAX_WAIT_SECONDS).optional()
    .describe("Seconds to wait for the sync to finish (default 30; 0 = start it and return)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await synchronize({ waitSeconds: args.waitSeconds });

    if (!result.success) {
      return {
        content: [{
          type: "text" as const,
          text: `Sync failed: ${result.error}`
        }],
        isError: true
      };
    }

    const when = result.lastSyncDate ? ` Last sync: ${result.lastSyncDate}.` : '';
    const text = result.finished
      ? `Synced in ${((result.waitedMs ?? 0) / 1000).toFixed(1)}s.${when}`
      : args.waitSeconds === 0
        ? `Sync started.${when}`
        : `Sync started but had not finished after ${((result.waitedMs ?? 0) / 1000).toFixed(1)}s.${when}`;
    return {
      content: [{
        type: "text" as const,
        text
      }]
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Error synchronizing: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error synchronizing: ${error.message}`
      }],
      isError: true
    };
  }
}
