import { connect, Socket } from 'net';
import { spawn } from 'child_process';
import { mkdirSync, openSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { resolveSocketPath, resolveLockDir, SOCKET_DIR_MODE } from './socketPath.js';
import { tryAcquireLock } from './lock.js';
import { resolveIdleTimeoutMinutes, installIdleTimeout } from '../utils/idleTimeout.js';
import { SessionTracker } from './sessionReplay.js';

/**
 * The client-facing half of the daemon (issue #80).
 *
 * This is what an MCP client launches. It speaks no protocol of its own: it
 * connects to the shared daemon and splices stdin/stdout onto that socket. MCP
 * over stdio is newline-delimited JSON-RPC with no per-connection framing beyond
 * the newline, so a byte-for-byte pipe is a complete implementation.
 *
 * Why a shim at all, rather than pointing clients at the daemon directly? Because
 * every MCP client in existence knows how to launch a command and talk to its
 * pipes, and almost none know how to talk to a Unix socket. Keeping the launch
 * contract identical is what lets this ship without every user editing config.
 *
 * The shim is ~1 MB of resident node instead of a full server holding an
 * OmniFocus bridge, and — the actual point — it holds no osascript semaphore, so
 * ten clients no longer mean ten independent concurrency budgets aimed at one
 * single-threaded app.
 */

/** How long to wait for a freshly spawned daemon to start accepting. */
export const DAEMON_START_TIMEOUT_MS = 10_000;
const CONNECT_RETRY_INTERVAL_MS = 50;
/** How many daemon restarts one shim will transparently survive (#123). */
const MAX_RECONNECTS = 5;

export interface RunShimOptions {
  socketPath?: string;
  /** Injected for tests. Spawns the daemon process; returns its pid. */
  spawnDaemon?: (socketPath: string) => void;
  /** Injected for tests. Runs the server in-process when the daemon is unusable. */
  fallback?: () => Promise<void>;
  startTimeoutMs?: number;
}

/**
 * Deliberately does NOT unref the timer. While we wait for the daemon to come
 * up, this timer is the only referenced handle in the process — stdin is still
 * paused and no socket is open yet. An unref'd timer here let the event loop
 * drain, and node exited 0 mid-wait: the client saw a server that started,
 * printed nothing, and vanished. Warm connects hid it, because they return on
 * the first attempt and never reach this.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** One connection attempt. Resolves to null on any failure. */
export function tryConnect(socketPath: string): Promise<Socket | null> {
  return new Promise((resolve) => {
    const socket = connect(socketPath);
    const onError = (): void => {
      socket.destroy();
      resolve(null);
    };
    socket.once('error', onError);
    socket.once('connect', () => {
      socket.removeListener('error', onError);
      resolve(socket);
    });
  });
}

/** Retry until the daemon is accepting or the deadline passes. */
async function connectWithRetry(socketPath: string, timeoutMs: number): Promise<Socket | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const socket = await tryConnect(socketPath);
    if (socket) return socket;
    if (Date.now() >= deadline) return null;
    await sleep(CONNECT_RETRY_INTERVAL_MS);
  }
}

/**
 * Launch the daemon as a detached, fully orphan-proof background process.
 *
 * `detached` + `unref` are what let this shim exit without killing the daemon —
 * it has to outlive the client that happened to start it. Its stderr goes to a
 * log file rather than being inherited: inheriting would tie the daemon's fate to
 * the first client's terminal, and a write to a closed pipe after that client
 * dies would take the daemon down with EPIPE, taking every other session with it.
 */
function defaultSpawnDaemon(socketPath: string): void {
  const socketDir = dirname(socketPath);
  mkdirSync(socketDir, { recursive: true, mode: SOCKET_DIR_MODE });

  const logFd = openSync(join(socketDir, 'daemon.log'), 'a', 0o600);
  const daemonEntry = fileURLToPath(new URL('./main.js', import.meta.url));

  const child = spawn(process.execPath, [daemonEntry], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: {
      ...process.env,
      OMNIFOCUS_MCP_SOCKET: socketPath,
      // We hold the startup lock; hand the critical section to the child so it
      // doesn't deadlock waiting on its own parent.
      OMNIFOCUS_MCP_LOCK_HELD: '1',
    },
  });
  child.unref();
}

/**
 * Obtain a daemon connection: connect if one is running, otherwise start one.
 *
 * The lock is what keeps ten simultaneous cold starts from spawning ten daemons.
 * Whoever takes it spawns; everyone else skips straight to waiting, because a
 * daemon is demonstrably on its way. Losing the race is the common path, not the
 * exceptional one — this project's normal load is a burst of agents at once.
 */
export async function obtainConnection(
  socketPath: string,
  spawnDaemon: (socketPath: string) => void,
  startTimeoutMs: number
): Promise<Socket | null> {
  const existing = await tryConnect(socketPath);
  if (existing) return existing;

  // The lock lives beside the socket, so the directory has to exist before we
  // can take it — on a fresh install nothing here exists yet. (Cold start failed
  // to the standalone fallback on every first run until this line was added.)
  mkdirSync(dirname(socketPath), { recursive: true, mode: SOCKET_DIR_MODE });

  const lock = tryAcquireLock(resolveLockDir(socketPath));
  if (!lock) return connectWithRetry(socketPath, startTimeoutMs);

  try {
    spawnDaemon(socketPath);
  } catch (err) {
    lock.release();
    console.error(`[omnifocus-mcp] could not start daemon: ${err}`);
    return null;
  }

  // The daemon releases the lock itself once it has bound (it inherited the
  // critical section), so we must not release it here — doing so would reopen
  // the probe/unlink/bind race we took the lock to close.
  return connectWithRetry(socketPath, startTimeoutMs);
}

/**
 * Run as a stdio client of the shared daemon, falling back to an in-process
 * server if the daemon can't be reached.
 *
 * The fallback matters more than it looks: this code path is on the critical
 * path of every user of the package, including ones who will never read issue
 * #80. If anything about the socket is unusable — a sandbox with no writable
 * runtime dir, an exotic filesystem, a path length blown past sun_path — the
 * server must still work exactly as it did before, just without the sharing.
 */
export async function runShim(options: RunShimOptions = {}): Promise<void> {
  const socketPath = options.socketPath ?? resolveSocketPath();
  const spawnDaemon = options.spawnDaemon ?? defaultSpawnDaemon;
  const startTimeoutMs = options.startTimeoutMs ?? DAEMON_START_TIMEOUT_MS;
  const fallback =
    options.fallback ??
    (async () => {
      await import('../server.js');
    });

  let socket: Socket | null = null;
  try {
    socket = await obtainConnection(socketPath, spawnDaemon, startTimeoutMs);
  } catch (err) {
    console.error(`[omnifocus-mcp] daemon connect failed: ${err}`);
  }

  if (!socket) {
    console.error('[omnifocus-mcp] daemon unavailable; running standalone server.');
    await fallback();
    return;
  }

  // Session state that has to survive a daemon restart (#123). Observing only —
  // the pipe below stays byte-for-byte.
  const session = new SessionTracker();
  let active: Socket = socket;
  let clientClosed = false;
  let reconnecting = false;
  let reconnectsLeft = MAX_RECONNECTS;

  // Nothing has touched stdin until now, so it is still paused and no client
  // bytes have been dropped while we were connecting.
  process.stdin.on('data', (chunk: Buffer) => {
    session.observeOutbound(chunk.toString('utf8'));
    active.write(chunk);
  });

  const attachSocket = (sock: Socket): void => {
    active = sock;
    sock.on('data', (chunk: Buffer) => {
      session.observeInbound(chunk.toString('utf8'));
      process.stdout.write(chunk);
    });
    sock.on('close', onSocketGone);
    sock.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
        console.error(`[omnifocus-mcp] daemon connection error: ${err.message}`);
      }
      onSocketGone();
    });
  };

  const exit = (): void => {
    active.destroy();
    process.exit(0);
  };

  /**
   * The daemon went away. Historically this exited, on the assumption the client
   * would relaunch — which is false for clients that treat a stdio exit as
   * terminal (#123). Try to rebuild the session on a new daemon instead, and only
   * exit if that cannot be done.
   */
  async function onSocketGone(): Promise<void> {
    if (clientClosed || reconnecting) return;
    reconnecting = true;
    try {
      if (!session.canReplay || reconnectsLeft <= 0) {
        exit();
        return;
      }
      reconnectsLeft--;
      let next: Socket | null = null;
      try {
        next = await obtainConnection(socketPath, spawnDaemon, startTimeoutMs);
      } catch {
        next = null;
      }
      if (!next) {
        console.error('[omnifocus-mcp] daemon gone and not recoverable; exiting.');
        exit();
        return;
      }
      console.error('[omnifocus-mcp] daemon restarted; re-establishing session (#123).');
      attachSocket(next);
      // Rebuild server-side session state before anything else reaches it.
      for (const line of session.replayLines()) next.write(line + '\n');
      // Fail in-flight requests explicitly rather than letting the client hang
      // on responses that died with the old daemon.
      for (const line of session.orphanedResponses()) process.stdout.write(line + '\n');
      session.clearPending();
    } finally {
      reconnecting = false;
    }
  }

  // A client that closes its end of the pipes is a disconnect, not a fault. With
  // no handler, node's default for an 'error' event is to rethrow, so a client
  // exiting mid-response killed the shim with an EPIPE stack trace on the way
  // out — noise that looks like a server crash and buries the real cause.
  const onPipeError = (err: NodeJS.ErrnoException): void => {
    clientClosed = true;
    if (err.code !== 'EPIPE' && err.code !== 'ERR_STREAM_DESTROYED') {
      console.error(`[omnifocus-mcp] stdio error: ${err.message}`);
    }
    exit();
  };
  process.stdout.on('error', onPipeError);
  process.stdin.on('error', onPipeError);

  attachSocket(socket);

  process.stdin.on('end', () => {
    clientClosed = true;
    active.end();
  });
  process.on('SIGTERM', exit);
  process.on('SIGHUP', exit);
  process.on('SIGINT', exit);

  // Same orphan backstop as the standalone server: if the client is SIGKILLed
  // and the wrapper chain holds stdin open, no EOF ever arrives. A stranded shim
  // is far cheaper than a stranded server, but it still pins a daemon session.
  const idleMinutes = resolveIdleTimeoutMinutes(process.env.OMNIFOCUS_MCP_IDLE_TIMEOUT_MINUTES);
  installIdleTimeout(process.stdin, idleMinutes, () => {
    console.error(
      `[omnifocus-mcp] no client traffic for ${idleMinutes}m; closing daemon session (issue #80).`
    );
    exit();
  });
}
