import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, Server } from 'net';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { obtainConnection, tryConnect } from './shim.js';
import { tryAcquireLock } from './lock.js';
import { resolveLockDir } from './socketPath.js';

describe('tryConnect', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'of-shim-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('returns null when nothing is listening', async () => {
    await expect(tryConnect(join(dir, 'absent.sock'))).resolves.toBeNull();
  });

  it('returns a socket when a daemon is listening', async () => {
    const path = join(dir, 'live.sock');
    const server = createServer();
    await new Promise<void>((r) => server.listen(path, r));
    try {
      const socket = await tryConnect(path);
      expect(socket).not.toBeNull();
      socket!.destroy();
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});

describe('obtainConnection', () => {
  let dir: string;
  let socketPath: string;
  let server: Server | undefined;

  const listen = async (): Promise<void> => {
    server = createServer();
    await new Promise<void>((r) => server!.listen(socketPath, r));
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'of-shim-'));
    socketPath = join(dir, 'daemon.sock');
  });

  afterEach(async () => {
    if (server) await new Promise<void>((r) => server!.close(() => r()));
    server = undefined;
    rmSync(dir, { recursive: true, force: true });
  });

  it('connects to a running daemon without spawning another', async () => {
    await listen();
    const spawnDaemon = vi.fn();

    const socket = await obtainConnection(socketPath, spawnDaemon, 1000);

    expect(socket).not.toBeNull();
    expect(spawnDaemon).not.toHaveBeenCalled();
    socket!.destroy();
  });

  it('spawns a daemon when none is running, then connects to it', async () => {
    const spawnDaemon = vi.fn(() => {
      // Stand in for the real detached daemon coming up asynchronously.
      setTimeout(() => void listen(), 30);
    });

    const socket = await obtainConnection(socketPath, spawnDaemon, 5000);

    expect(spawnDaemon).toHaveBeenCalledOnce();
    expect(socket).not.toBeNull();
    socket!.destroy();
  });

  it('waits instead of spawning when another starter holds the lock', async () => {
    // The thundering-herd guard. Ten agents launching at once is this project's
    // normal load; nine of them must recognise a daemon is already on its way
    // rather than each starting one.
    const held = tryAcquireLock(resolveLockDir(socketPath));
    expect(held).not.toBeNull();

    const spawnDaemon = vi.fn();
    setTimeout(() => void listen(), 30);

    const socket = await obtainConnection(socketPath, spawnDaemon, 5000);

    expect(spawnDaemon).not.toHaveBeenCalled();
    expect(socket).not.toBeNull();
    socket!.destroy();
    held!.release();
  });

  it('gives up after the start deadline so the caller can fall back', async () => {
    const spawnDaemon = vi.fn(); // spawns nothing; the daemon never appears
    const socket = await obtainConnection(socketPath, spawnDaemon, 150);
    expect(socket).toBeNull();
  });

  it('reports failure rather than throwing when the spawn itself fails', async () => {
    // A sandbox that forbids spawning must degrade to the standalone server, not
    // crash the client's MCP launch.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spawnDaemon = vi.fn(() => {
      throw new Error('spawn forbidden');
    });

    const socket = await obtainConnection(socketPath, spawnDaemon, 150);

    expect(socket).toBeNull();
    spy.mockRestore();
  });

  it('releases the lock when the spawn fails, so a retry can try again', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await obtainConnection(
      socketPath,
      () => {
        throw new Error('spawn forbidden');
      },
      100
    );
    spy.mockRestore();

    const lock = tryAcquireLock(resolveLockDir(socketPath));
    expect(lock).not.toBeNull();
    lock!.release();
  });
});
