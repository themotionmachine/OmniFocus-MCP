#!/usr/bin/env node

import { startDaemon } from './daemon.js';
import { resolveSocketPath } from './socketPath.js';

/**
 * Daemon entrypoint (issue #80).
 *
 * Normally spawned detached by the shim, but also runnable by hand — it is the
 * only way to watch the shared server's logs live:
 *
 *   node dist/daemon/main.js
 *
 * Losing the startup race is an ordinary outcome, not an error: a burst of
 * clients means several of these can launch at once, and all but one should
 * notice a daemon already exists and quietly step aside.
 */

const socketPath = process.env.OMNIFOCUS_MCP_SOCKET ?? resolveSocketPath();

async function main(): Promise<void> {
  let handle;
  try {
    handle = await startDaemon({
      socketPath,
      // The shim took the lock before spawning us and handed over the critical
      // section; re-acquiring it would deadlock against our own parent.
      lockHeldByCaller: process.env.OMNIFOCUS_MCP_LOCK_HELD === '1',
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      console.error(`[omnifocus-mcp] daemon already running on ${socketPath}; exiting.`);
      process.exit(0);
    }
    console.error(`[omnifocus-mcp] daemon failed to start: ${err}`);
    process.exit(1);
  }

  console.error(`[omnifocus-mcp] daemon listening on ${handle.socketPath} (pid ${process.pid})`);

  // Unlink the socket on the way out. Skipping this is survivable — the next
  // daemon probes and reclaims a stale file — but it turns a clean restart into
  // a connect-timeout for whoever finds the corpse first.
  let closing = false;
  const shutdown = (signal: string) => async (): Promise<void> => {
    if (closing) return;
    closing = true;
    console.error(`[omnifocus-mcp] daemon received ${signal}; shutting down.`);
    await handle.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM')());
  process.on('SIGINT', () => void shutdown('SIGINT')());
  process.on('SIGHUP', () => void shutdown('SIGHUP')());
}

void main();
