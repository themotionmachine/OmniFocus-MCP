import { createServer, connect, Server, Socket } from 'net';
import { mkdirSync, unlinkSync, existsSync } from 'fs';
import { dirname } from 'path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createOmniFocusServer } from '../buildServer.js';
import { resolveSocketPath, resolveLockDir, SOCKET_DIR_MODE } from './socketPath.js';
import { tryAcquireLock, releaseLock, type Lock } from './lock.js';
import { resolveIdleTimeoutMinutes } from '../utils/idleTimeout.js';

/**
 * The shared daemon (issue #80).
 *
 * Problem A (process accumulation) and problem B (AppleEvent contention) both
 * come from the same root: every agent spawns its own server, and each one holds
 * its own copy of the osascript concurrency bound. Ten agents meant ten servers
 * and an effective bound of 10×4 concurrent osascript children hammering one
 * single-threaded OmniFocus.app.
 *
 * Here, one process hosts every session. Sessions are still independent — MCP is
 * stateful, so each connection gets its own `McpServer` — but they all route
 * through the *same* module-level semaphore in `scriptExecution.ts`, so the bound
 * is finally global. That is the substantive fix; collapsing the process count is
 * the bonus.
 */

/** Fires `onIdle` once the daemon has had zero connections for `minutes`. */
export class IdleReaper {
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly minutes: number,
    private readonly onIdle: () => void,
    private readonly setTimer: typeof setTimeout = setTimeout,
    private readonly clearTimer: typeof clearTimeout = clearTimeout
  ) {}

  /** Arm the countdown — call when the connection count reaches zero. */
  arm(): void {
    if (!(this.minutes > 0)) return;
    this.disarm();
    this.timer = this.setTimer(this.onIdle, this.minutes * 60_000);
    (this.timer as { unref?: () => void }).unref?.();
  }

  /** Cancel the countdown — call when a connection arrives. */
  disarm(): void {
    if (this.timer !== undefined) {
      this.clearTimer(this.timer);
      this.timer = undefined;
    }
  }

  get armed(): boolean {
    return this.timer !== undefined;
  }
}

/**
 * Is something actually listening on `socketPath`?
 *
 * A socket file left behind by a killed daemon looks identical to a live one on
 * disk, and bind() over it fails with EADDRINUSE either way. The only honest test
 * is to try to connect: ECONNREFUSED means stale, success means a daemon owns it.
 * Getting this wrong in the other direction is worse than leaving a stale file —
 * unlinking a *live* socket silently orphans every connected client — so this
 * treats any non-ECONNREFUSED error as "assume live".
 */
export function probeSocket(socketPath: string, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!existsSync(socketPath)) return resolve(false);

    const probe = connect(socketPath);
    let settled = false;
    const finish = (alive: boolean): void => {
      if (settled) return;
      settled = true;
      probe.destroy();
      resolve(alive);
    };

    const timer = setTimeout(() => finish(true), timeoutMs);
    (timer as { unref?: () => void }).unref?.();

    probe.on('connect', () => {
      clearTimeout(timer);
      finish(true);
    });
    probe.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      finish(err.code !== 'ECONNREFUSED');
    });
  });
}

export interface DaemonHandle {
  server: Server;
  socketPath: string;
  /** Live session count — exposed for tests and diagnostics. */
  connectionCount: () => number;
  close: () => Promise<void>;
}

export interface StartDaemonOptions {
  socketPath?: string;
  idleTimeoutMinutes?: number;
  /** Injected for tests so a fake session can stand in for the real server. */
  onConnection?: (socket: Socket) => void;
  /**
   * Set when the caller already holds the startup lock — the shim takes it
   * before spawning so that only one daemon is ever launched, and hands the
   * critical section to the child rather than making it re-contend.
   */
  lockHeldByCaller?: boolean;
}

/**
 * Bind the socket and serve MCP sessions until idle or terminated.
 *
 * Rejects with EADDRINUSE if a live daemon already owns the socket — the caller
 * (the shim) treats that as "someone beat me to it" and simply connects instead.
 */
export async function startDaemon(options: StartDaemonOptions = {}): Promise<DaemonHandle> {
  const socketPath = options.socketPath ?? resolveSocketPath();
  const idleMinutes =
    options.idleTimeoutMinutes ??
    resolveIdleTimeoutMinutes(process.env.OMNIFOCUS_MCP_IDLE_TIMEOUT_MINUTES);

  const lockDir = resolveLockDir(socketPath);

  mkdirSync(dirname(socketPath), { recursive: true, mode: SOCKET_DIR_MODE });

  // Probe → unlink → bind has to be one critical section. Without a lock there
  // is an interleaving where B probes a *stale* socket, A wins the race and
  // binds, and then B unlinks A's now-live socket — leaving A running but
  // unreachable and every client that finds the missing file spawning another
  // daemon. Exactly the pileup issue #80 is about.
  //
  // The shim takes this lock before spawning, so the child inherits the critical
  // section rather than re-contending for it (and would otherwise deadlock
  // against its own parent).
  const lock: Lock = options.lockHeldByCaller
    ? { release: () => releaseLock(lockDir) }
    : (tryAcquireLock(lockDir) ?? throwAddrInUse(`another process is starting a daemon on ${socketPath}`));

  try {
    // Reclaim a socket whose owner died; never touch one that answers.
    if (existsSync(socketPath)) {
      if (await probeSocket(socketPath)) {
        throwAddrInUse(`a daemon is already listening on ${socketPath}`);
      }
      try {
        unlinkSync(socketPath);
      } catch {
        /* raced with another starter; bind will surface the real problem */
      }
    }

    let connections = 0;
    const sockets = new Set<Socket>();

    const shutdown = async (): Promise<void> => {
      reaper.disarm();
      for (const socket of sockets) socket.destroy();
      sockets.clear();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      try {
        unlinkSync(socketPath);
      } catch {
        /* already gone */
      }
    };

    const reaper = new IdleReaper(idleMinutes, () => {
      console.error(
        `[omnifocus-mcp] daemon idle for ${idleMinutes}m with no connections; exiting (issue #80).`
      );
      void shutdown().then(() => process.exit(0));
    });

    const handleConnection = (socket: Socket): void => {
      connections++;
      sockets.add(socket);
      reaper.disarm();

      socket.on('close', () => {
        connections--;
        sockets.delete(socket);
        if (connections === 0) reaper.arm();
      });
      // A client vanishing mid-request is routine, not an error worth crashing on.
      socket.on('error', () => socket.destroy());

      if (options.onConnection) {
        options.onConnection(socket);
        return;
      }

      // One MCP session per connection; all sessions share the process-global
      // osascript semaphore, which is the entire point of the daemon.
      const { server: session } = createOmniFocusServer();
      const transport = new StdioServerTransport(socket, socket);
      session.connect(transport).catch((err) => {
        console.error(`[omnifocus-mcp] failed to attach session: ${err}`);
        socket.destroy();
      });
    };

    const server = createServer(handleConnection);

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });

    // Nothing is connected yet, so start the clock immediately: a daemon that
    // was autostarted for a client that then died must not linger forever.
    reaper.arm();

    return {
      server,
      socketPath,
      connectionCount: () => connections,
      close: shutdown,
    };
  } finally {
    // The critical section ends at bind(). From here on, a competing starter
    // finds a socket that answers and backs off on its own.
    lock.release();
  }
}

function throwAddrInUse(message: string): never {
  const err: NodeJS.ErrnoException = new Error(message);
  err.code = 'EADDRINUSE';
  throw err;
}
