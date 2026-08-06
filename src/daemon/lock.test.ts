import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { tryAcquireLock, releaseLock } from './lock.js';

describe('tryAcquireLock', () => {
  let dir: string;
  let lockDir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'of-lock-'));
    lockDir = join(dir, 'daemon.sock.lock');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('grants the lock when it is free', () => {
    const lock = tryAcquireLock(lockDir);
    expect(lock).not.toBeNull();
    expect(existsSync(lockDir)).toBe(true);
  });

  it('refuses a second holder while the first is alive', () => {
    // This is the whole contract: a burst of agents starting at once must
    // produce exactly one daemon.
    const first = tryAcquireLock(lockDir);
    expect(first).not.toBeNull();
    expect(tryAcquireLock(lockDir)).toBeNull();
  });

  it('lets the next caller in after a release', () => {
    tryAcquireLock(lockDir)!.release();
    expect(existsSync(lockDir)).toBe(false);
    expect(tryAcquireLock(lockDir)).not.toBeNull();
  });

  it('breaks a lock whose recorded holder is gone', () => {
    // A daemon killed with SIGKILL leaves the directory behind. Without pid
    // liveness the next start would wait out the full stale window for nothing.
    mkdirSync(lockDir);
    writeFileSync(join(lockDir, 'pid'), '4242');
    const lock = tryAcquireLock(lockDir, { isAlive: () => false });
    expect(lock).not.toBeNull();
  });

  it('respects a fresh lock whose holder is alive', () => {
    mkdirSync(lockDir);
    writeFileSync(join(lockDir, 'pid'), String(process.pid));
    expect(tryAcquireLock(lockDir, { isAlive: () => true, staleMs: 30_000 })).toBeNull();
  });

  it('breaks a lock held past the stale window even by a live holder', () => {
    // Deliberate: a wedged-but-alive holder must not be able to block every
    // client forever, because the fallback for a blocked client is a standalone
    // server — the exact process pileup the daemon exists to prevent. Losing
    // this race merely costs an extra daemon that exits on its own.
    mkdirSync(lockDir);
    writeFileSync(join(lockDir, 'pid'), String(process.pid));
    const longAgo = new Date(Date.now() - 60_000);
    utimesSync(lockDir, longAgo, longAgo);
    expect(tryAcquireLock(lockDir, { isAlive: () => true, staleMs: 30_000 })).not.toBeNull();
  });

  it('ages out a lock with no readable pid', () => {
    // The pid file may be missing if we caught the holder mid-write; the mtime
    // check is the backstop that keeps a lock from being permanent.
    mkdirSync(lockDir);
    const longAgo = new Date(Date.now() - 60_000);
    utimesSync(lockDir, longAgo, longAgo);
    expect(tryAcquireLock(lockDir, { staleMs: 30_000 })).not.toBeNull();
  });

  it('holds a young lock with no readable pid', () => {
    mkdirSync(lockDir);
    expect(tryAcquireLock(lockDir, { staleMs: 30_000 })).toBeNull();
  });

  it('records the holder pid for diagnosis', () => {
    tryAcquireLock(lockDir, { pid: 777 });
    expect(existsSync(join(lockDir, 'pid'))).toBe(true);
    // A second caller that believes 777 is dead may break in.
    expect(tryAcquireLock(lockDir, { isAlive: (pid) => pid !== 777 })).not.toBeNull();
  });

  it('is idempotent on release', () => {
    const lock = tryAcquireLock(lockDir)!;
    lock.release();
    expect(() => lock.release()).not.toThrow();
    expect(() => releaseLock(lockDir)).not.toThrow();
  });
});
