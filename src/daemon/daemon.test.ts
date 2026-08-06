import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, connect, Server, Socket } from 'net';
import { mkdtempSync, rmSync, existsSync, renameSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { IdleReaper, probeSocket, startDaemon, type DaemonHandle } from './daemon.js';

describe('IdleReaper', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires after the window once armed', () => {
    const onIdle = vi.fn();
    new IdleReaper(5, onIdle).arm();
    vi.advanceTimersByTime(5 * 60_000 - 1);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledOnce();
  });

  it('does not fire once disarmed', () => {
    // The disarm path is what keeps a busy daemon alive: a connection arriving
    // must cancel a countdown that is already running.
    const onIdle = vi.fn();
    const reaper = new IdleReaper(5, onIdle);
    reaper.arm();
    vi.advanceTimersByTime(4 * 60_000);
    reaper.disarm();
    vi.advanceTimersByTime(60 * 60_000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('restarts the countdown from zero on re-arm', () => {
    const onIdle = vi.fn();
    const reaper = new IdleReaper(5, onIdle);
    reaper.arm();
    vi.advanceTimersByTime(4 * 60_000);
    reaper.arm();
    vi.advanceTimersByTime(4 * 60_000);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(onIdle).toHaveBeenCalledOnce();
  });

  it('treats zero minutes as "never reap"', () => {
    const onIdle = vi.fn();
    const reaper = new IdleReaper(0, onIdle);
    reaper.arm();
    expect(reaper.armed).toBe(false);
    vi.advanceTimersByTime(24 * 60 * 60_000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('reports armed state', () => {
    const reaper = new IdleReaper(5, vi.fn());
    expect(reaper.armed).toBe(false);
    reaper.arm();
    expect(reaper.armed).toBe(true);
    reaper.disarm();
    expect(reaper.armed).toBe(false);
  });
});

describe('probeSocket', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'of-probe-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('reports absent when there is no socket file', async () => {
    await expect(probeSocket(join(dir, 'nope.sock'))).resolves.toBe(false);
  });

  it('reports live when a server is listening', async () => {
    const path = join(dir, 'live.sock');
    const server = createServer();
    await new Promise<void>((r) => server.listen(path, r));
    try {
      await expect(probeSocket(path)).resolves.toBe(true);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it('reports stale for a socket file with no listener', async () => {
    // A daemon killed with SIGKILL leaves exactly this: an on-disk socket that
    // looks identical to a live one but refuses connections. Reproduced by
    // renaming the socket out from under a listening server, which is the only
    // way to keep the file after close() (close() unlinks the path it bound).
    const bound = join(dir, 'bound.sock');
    const orphaned = join(dir, 'orphaned.sock');
    const server = createServer();
    await new Promise<void>((r) => server.listen(bound, r));
    renameSync(bound, orphaned);
    await new Promise<void>((r) => server.close(() => r()));

    expect(existsSync(orphaned)).toBe(true);
    await expect(probeSocket(orphaned)).resolves.toBe(false);
  });
});

describe('startDaemon', () => {
  let dir: string;
  let socketPath: string;
  const running: DaemonHandle[] = [];

  const start = async (overrides = {}): Promise<DaemonHandle> => {
    const handle = await startDaemon({
      socketPath,
      idleTimeoutMinutes: 0, // never self-exit during tests
      // Stand in for a real MCP session so these tests never touch OmniFocus.
      onConnection: (socket: Socket) => socket.write('ready\n'),
      ...overrides,
    });
    running.push(handle);
    return handle;
  };

  const client = (path = socketPath): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const socket = connect(path);
      socket.once('connect', () => resolve(socket));
      socket.once('error', reject);
    });

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'of-daemon-'));
    socketPath = join(dir, 'daemon.sock');
  });

  afterEach(async () => {
    for (const handle of running.splice(0)) await handle.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  });

  it('binds the socket and greets a client', async () => {
    await start();
    expect(existsSync(socketPath)).toBe(true);

    const socket = await client();
    const greeting = await new Promise<string>((r) => socket.once('data', (d) => r(String(d))));
    expect(greeting).toBe('ready\n');
    socket.destroy();
  });

  it('serves several clients from one process', async () => {
    // The reason the daemon exists: N sessions, one process, one osascript
    // semaphore — instead of N processes each with their own concurrency budget.
    const handle = await start();
    const clients = await Promise.all([client(), client(), client()]);
    await vi.waitFor(() => expect(handle.connectionCount()).toBe(3));
    for (const c of clients) c.destroy();
    await vi.waitFor(() => expect(handle.connectionCount()).toBe(0));
  });

  it('tracks connections as they come and go', async () => {
    const handle = await start();
    expect(handle.connectionCount()).toBe(0);

    const first = await client();
    await vi.waitFor(() => expect(handle.connectionCount()).toBe(1));

    const second = await client();
    await vi.waitFor(() => expect(handle.connectionCount()).toBe(2));

    first.destroy();
    await vi.waitFor(() => expect(handle.connectionCount()).toBe(1));

    second.destroy();
    await vi.waitFor(() => expect(handle.connectionCount()).toBe(0));
  });

  it('refuses to start over a live daemon', async () => {
    // The loser of a startup race must back off rather than bind second or —
    // far worse — unlink the winner's socket and strand its clients.
    await start();
    await expect(start()).rejects.toMatchObject({ code: 'EADDRINUSE' });
  });

  it('reclaims a socket left behind by a dead daemon', async () => {
    const bound = join(dir, 'bound.sock');
    const server = createServer();
    await new Promise<void>((r) => server.listen(bound, r));
    renameSync(bound, socketPath);
    await new Promise<void>((r) => server.close(() => r()));
    expect(existsSync(socketPath)).toBe(true);

    const handle = await start();
    expect(handle.socketPath).toBe(socketPath);
    const socket = await client();
    socket.destroy();
  });

  it('releases the startup lock once bound, so a later start can proceed', async () => {
    const handle = await start();
    expect(existsSync(`${socketPath}.lock`)).toBe(false);
    await handle.close();
    running.length = 0;
    await expect(start()).resolves.toBeDefined();
  });

  it('unlinks the socket on close', async () => {
    const handle = await start();
    await handle.close();
    running.length = 0;
    expect(existsSync(socketPath)).toBe(false);
  });

  it('survives a client that disconnects mid-stream', async () => {
    const handle = await start();
    const socket = await client();
    socket.destroy();
    await vi.waitFor(() => expect(handle.connectionCount()).toBe(0));
    // Still serving.
    const next = await client();
    next.destroy();
  });
});
