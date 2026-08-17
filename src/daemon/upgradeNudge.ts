import { readdirSync } from 'fs';
import { createConnection } from 'net';
import { join } from 'path';
import { SERVER_VERSION } from '../version.js';
import { resolveSocketDir } from './socketPath.js';

/**
 * In-band upgrade nudge (issue #113).
 *
 * #99 versioned the daemon socket so an upgrade can never silently serve old
 * code to new clients — but it left the inverse gap: clients attached to the
 * OLD daemon keep running it indefinitely, and nothing tells them a newer
 * version is available. The design principle here is that nobody should have
 * to remember anything: any tool call made while stale-attached carries one
 * appended line saying a newer daemon is serving and a reconnect upgrades.
 *
 * The signal is derived from the same mechanism #99 introduced: the socket
 * directory. A `daemon-<version>.sock` with a strictly newer semver, which is
 * actually accepting connections, means a newer server is live on this machine
 * right now. Liveness is probed so a crash-orphaned socket file cannot nag
 * forever, and the whole check is throttled so its cost amortizes to nothing.
 */

/** Only clean release versions participate; prereleases and odd slugs don't. */
const SOCKET_VERSION_RE = /^daemon-(\d+\.\d+\.\d+)\.sock$/;

export function parseSocketVersion(filename: string): string | null {
  const match = SOCKET_VERSION_RE.exec(filename);
  return match ? match[1] : null;
}

/** Standard numeric semver comparison for the major.minor.patch subset. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function upgradeNoticeText(current: string, newer: string): string {
  return `⬆️ omnifocus-mcp ${newer} is serving on this machine; this connection is on ${current}. Reconnect the MCP server to upgrade.`;
}

/** True if something is actually accepting connections on the socket. */
function probeSocketAlive(socketPath: string, timeoutMs = 250): Promise<boolean> {
  return new Promise(resolve => {
    const socket = createConnection(socketPath);
    let settled = false;
    const done = (alive: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(alive);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(timeoutMs, () => done(false));
  });
}

export interface NudgeDeps {
  currentVersion?: string;
  socketDir?: string;
  listDir?: (dir: string) => string[];
  probe?: (socketPath: string) => Promise<boolean>;
}

/**
 * Find the newest strictly-newer version with a live daemon socket, or null.
 * Dependency-injected for tests; the real wiring comes from the defaults.
 */
export async function findNewerServingVersion(deps: NudgeDeps = {}): Promise<string | null> {
  const current = deps.currentVersion ?? SERVER_VERSION;
  const dir = deps.socketDir ?? resolveSocketDir();
  const listDir = deps.listDir ?? readdirSync;
  const probe = deps.probe ?? probeSocketAlive;

  let entries: string[];
  try {
    entries = listDir(dir);
  } catch {
    return null;
  }

  const newer = entries
    .map(name => ({ name, version: parseSocketVersion(name) }))
    .filter((e): e is { name: string; version: string } => e.version !== null)
    .filter(e => compareVersions(e.version, current) > 0)
    .sort((a, b) => compareVersions(b.version, a.version));

  for (const candidate of newer) {
    if (await probe(join(dir, candidate.name))) {
      return candidate.version;
    }
  }
  return null;
}

const CHECK_TTL_MS = 5 * 60_000;
let cache: { at: number; notice: string | null } | null = null;

/** Test hook: reset the throttle cache. */
export function _resetNudgeCache(): void {
  cache = null;
}

/**
 * The throttled, production entry point: the current notice text, or null.
 *
 * Skipped entirely under OMNIFOCUS_MCP_SOCKET — an isolated instance's socket
 * lives outside the shared directory, so the shared directory says nothing
 * about it.
 */
export async function upgradeNotice(): Promise<string | null> {
  if (process.env.OMNIFOCUS_MCP_SOCKET) return null;
  const now = Date.now();
  if (cache && now - cache.at < CHECK_TTL_MS) return cache.notice;
  let notice: string | null = null;
  try {
    const newer = await findNewerServingVersion();
    if (newer) notice = upgradeNoticeText(SERVER_VERSION, newer);
  } catch {
    // The nudge is best-effort; never let it break a tool result.
  }
  cache = { at: now, notice };
  return notice;
}

type ToolHandler = (...args: any[]) => Promise<any>;

/**
 * Wrap a tool handler so its result carries the upgrade notice while (and only
 * while) a newer daemon is serving. Appended as its own content block; error
 * results are nudged too — a stale client debugging an error is exactly the
 * client that should hear "reconnect".
 */
export function withUpgradeNudge(
  handler: ToolHandler,
  notice: () => Promise<string | null> = upgradeNotice
): ToolHandler {
  return async (...args: any[]) => {
    const result = await handler(...args);
    try {
      const text = await notice();
      if (text && result && Array.isArray(result.content)) {
        result.content.push({ type: 'text' as const, text });
      }
    } catch {
      // Never let the nudge interfere with the actual result.
    }
    return result;
  };
}
