import { mkdirSync, writeFileSync, readFileSync, rmSync, statSync } from 'fs';
import { join } from 'path';

/**
 * A cross-process advisory lock built on atomic `mkdir`.
 *
 * Ten agents starting at once is the normal case for this project (issue #80),
 * so "who creates the daemon" has to be settled without a coordinator. `mkdir`
 * is atomic on every POSIX filesystem: exactly one caller creates the directory,
 * everyone else gets EEXIST. That is the whole mechanism.
 *
 * Node has no `flock` in core, and a lock that only exists in memory would be
 * useless here — the contenders are separate processes. The cost of the mkdir
 * approach is that a process killed while holding the lock leaves the directory
 * behind, so acquisition also has to recognise and break a dead holder's lock.
 */

/** How long before an unattended lock is presumed dead. */
export const DEFAULT_STALE_MS = 30_000;

export interface Lock {
  /** Remove the lock directory. Idempotent. */
  release: () => void;
}

export interface AcquireOptions {
  staleMs?: number;
  /** Injected for tests. Returns true if the pid is alive. */
  isAlive?: (pid: number) => boolean;
  /** Injected for tests. The pid recorded as the holder. */
  pid?: number;
}

function defaultIsAlive(pid: number): boolean {
  try {
    // Signal 0 performs the permission/existence check without delivering a
    // signal — the standard liveness probe.
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means the process exists but belongs to someone else. Since the
    // socket dir is 0700 that shouldn't happen, but "exists" is the safe read.
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * Is this lock directory abandoned?
 *
 * Either signal is enough to break it: a dead holder, or an old lock. That is
 * deliberately eager, and the asymmetry of the two failure modes is why.
 *
 * Breaking a lock too readily costs almost nothing — two daemons start, one
 * loses the bind race and exits. Refusing to break one costs a great deal: every
 * client falls back to its own standalone server, which is precisely the process
 * pileup of issue #80. So a holder that is alive but wedged past the stale window
 * still loses its lock; being alive is not by itself proof of progress.
 *
 * The pid check is what makes recovery from a SIGKILLed daemon fast (immediate
 * rather than a full stale window); the age check is the backstop for when the
 * pid file is missing or we caught the holder mid-write.
 */
function isStale(lockDir: string, staleMs: number, isAlive: (pid: number) => boolean): boolean {
  let holder: number | undefined;
  try {
    const raw = readFileSync(join(lockDir, 'pid'), 'utf-8').trim();
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed) && parsed > 0) holder = parsed;
  } catch {
    /* no pid file yet, or unreadable — fall through to the age check */
  }

  if (holder !== undefined && !isAlive(holder)) return true;

  try {
    return Date.now() - statSync(lockDir).mtimeMs > staleMs;
  } catch {
    // Vanished underneath us; treat as free rather than stale — the caller's
    // retry will simply create it.
    return true;
  }
}

/**
 * Try to take the lock without blocking. Returns null if someone else holds it.
 */
export function tryAcquireLock(lockDir: string, options: AcquireOptions = {}): Lock | null {
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const isAlive = options.isAlive ?? defaultIsAlive;
  const pid = options.pid ?? process.pid;

  const claim = (): Lock | null => {
    try {
      mkdirSync(lockDir, { recursive: false, mode: 0o700 });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') return null;
      throw err;
    }
    try {
      writeFileSync(join(lockDir, 'pid'), String(pid), { mode: 0o600 });
    } catch {
      /* the directory is the lock; the pid file is only a diagnostic aid */
    }
    return { release: () => releaseLock(lockDir) };
  };

  const lock = claim();
  if (lock) return lock;

  if (!isStale(lockDir, staleMs, isAlive)) return null;

  // Break the dead holder's lock, then race everyone else who noticed at the
  // same moment. Exactly one of us wins the re-claim, which is the point.
  try {
    rmSync(lockDir, { recursive: true, force: true });
  } catch {
    return null;
  }
  return claim();
}

export function releaseLock(lockDir: string): void {
  try {
    rmSync(lockDir, { recursive: true, force: true });
  } catch {
    /* already gone */
  }
}
