import { homedir, tmpdir } from 'os';
import { join } from 'path';

/**
 * Where the daemon listens, and why it's a Unix socket rather than a TCP port
 * (issue #80, Option 2 / the stdio-shim hybrid).
 *
 * A loopback TCP port would need an auth story — every local process and every
 * local user can reach 127.0.0.1, and this server can read and *delete* the
 * user's entire task database. A Unix domain socket inside a 0700 directory
 * delegates that to the filesystem: only the owning uid can connect, enforced by
 * the kernel, with no token to mint, store, or leak.
 *
 * It also avoids an SDK bump. The installed @modelcontextprotocol/sdk (1.8.0) has
 * no Streamable HTTP transport, and SSE is deprecated — but `StdioServerTransport`
 * accepts any (Readable, Writable) pair, and a net.Socket is both. So the daemon
 * speaks exactly the same newline-delimited JSON-RPC framing over the socket that
 * the stdio server speaks over a pipe, using the SDK's own transport.
 */

/** Directory mode: owner-only. The access control for the socket lives here. */
export const SOCKET_DIR_MODE = 0o700;

/**
 * Socket paths are capped near 104 bytes on macOS (`sun_path` in sockaddr_un).
 * Exceeding it fails at bind() with a confusing EINVAL/ENAMETOOLONG, so callers
 * check against this and fall back to a shorter base.
 */
export const MAX_SOCKET_PATH_LENGTH = 100;

export const SOCKET_FILENAME = 'daemon.sock';

export interface SocketPathEnv {
  /** Explicit override; used verbatim. */
  OMNIFOCUS_MCP_SOCKET?: string;
  XDG_RUNTIME_DIR?: string;
}

/**
 * Resolve the daemon socket directory for a uid.
 *
 * Preference order: explicit override → `XDG_RUNTIME_DIR` (already per-user and
 * 0700 by spec) → `~/.omnifocus-mcp` → a uid-qualified path under the temp dir.
 * The uid qualifier matters on the last one: `/tmp` is world-writable and shared,
 * so an unqualified name would let one user squat the path another user expects.
 */
export function resolveSocketDir(
  env: SocketPathEnv = process.env as SocketPathEnv,
  uid: number | undefined = process.getuid?.(),
  home: string = homedir(),
  temp: string = tmpdir()
): string {
  if (env.XDG_RUNTIME_DIR) return join(env.XDG_RUNTIME_DIR, 'omnifocus-mcp');
  if (home) {
    const candidate = join(home, '.omnifocus-mcp');
    if (join(candidate, SOCKET_FILENAME).length <= MAX_SOCKET_PATH_LENGTH) {
      return candidate;
    }
  }
  return join(temp, `omnifocus-mcp-${uid ?? 'nouid'}`);
}

/**
 * Full path to the daemon socket. `OMNIFOCUS_MCP_SOCKET` overrides everything so
 * tests (and anyone running two isolated daemons) can point elsewhere.
 */
export function resolveSocketPath(
  env: SocketPathEnv = process.env as SocketPathEnv,
  uid: number | undefined = process.getuid?.(),
  home: string = homedir(),
  temp: string = tmpdir()
): string {
  if (env.OMNIFOCUS_MCP_SOCKET) return env.OMNIFOCUS_MCP_SOCKET;
  return join(resolveSocketDir(env, uid, home, temp), SOCKET_FILENAME);
}

/**
 * The startup lock guarding a given socket. Derived from the socket path rather
 * than fixed, so two daemons pointed at different sockets (tests, or a
 * deliberately isolated instance) never serialise against each other.
 */
export function resolveLockDir(socketPath: string): string {
  return `${socketPath}.lock`;
}
