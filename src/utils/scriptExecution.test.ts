import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Semaphore,
  isRetryableOsascriptError,
  classifyOsascriptError,
  withOsascriptRetry,
  markAppUnresponsive,
  markAppResponsive,
  isAppKnownUnresponsive,
  shouldProbeAppHealth,
  probeOmniFocusAlive,
  _resetAppHealth,
} from './scriptExecution.js';

describe('Semaphore', () => {
  it('never runs more than max tasks concurrently', async () => {
    const sem = new Semaphore(2);
    let active = 0;
    let peak = 0;
    const release: Array<() => void> = [];
    const make = () =>
      sem.run(
        () =>
          new Promise<void>((resolve) => {
            active++;
            peak = Math.max(peak, active);
            release.push(() => {
              active--;
              resolve();
            });
          })
      );

    const tasks = [make(), make(), make(), make()];
    // Give the semaphore a tick to admit the first batch.
    await Promise.resolve();
    await Promise.resolve();
    expect(active).toBe(2); // only 2 admitted
    // Drain them one at a time.
    while (release.length) {
      release.shift()!();
      await Promise.resolve();
      await Promise.resolve();
    }
    await Promise.all(tasks);
    expect(peak).toBe(2);
  });

  it('releases a slot even when the task throws', async () => {
    const sem = new Semaphore(1);
    await expect(sem.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    // If the slot leaked, this second task would hang; a resolved value proves release.
    await expect(sem.run(() => Promise.resolve('ok'))).resolves.toBe('ok');
  });
});

describe('isRetryableOsascriptError', () => {
  it('flags -1712 / AppleEvent timeouts and killed processes', () => {
    expect(isRetryableOsascriptError({ message: 'AppleEvent timed out (-1712)' })).toBe(true);
    expect(isRetryableOsascriptError({ stderr: 'execution error: -1712' })).toBe(true);
    expect(isRetryableOsascriptError({ killed: true })).toBe(true);
    expect(isRetryableOsascriptError({ signal: 'SIGTERM' })).toBe(true);
  });

  it('does not flag genuine script errors', () => {
    expect(isRetryableOsascriptError({ message: 'syntax error: Expected end of line' })).toBe(false);
    expect(isRetryableOsascriptError({ stderr: 'Project not found: Foo' })).toBe(false);
    expect(isRetryableOsascriptError(undefined)).toBe(false);
  });
});

describe('withOsascriptRetry', () => {
  const noSleep = () => Promise.resolve();

  it('returns immediately on success', async () => {
    const attempt = vi.fn().mockResolvedValue('ok');
    const out = await withOsascriptRetry(attempt, { shouldRetry: () => true, sleepFn: noSleep });
    expect(out).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('retries retryable failures then succeeds', async () => {
    const err = { message: '-1712' };
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');
    const out = await withOsascriptRetry(attempt, {
      shouldRetry: isRetryableOsascriptError,
      backoffsMs: [1, 1],
      sleepFn: noSleep,
    });
    expect(out).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable failures', async () => {
    const attempt = vi.fn().mockRejectedValue({ message: 'syntax error' });
    await expect(
      withOsascriptRetry(attempt, {
        shouldRetry: isRetryableOsascriptError,
        backoffsMs: [1, 1],
        sleepFn: noSleep,
      })
    ).rejects.toMatchObject({ message: 'syntax error' });
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('gives up after exhausting backoffs and rethrows the last error', async () => {
    const attempt = vi.fn().mockRejectedValue({ message: '-1712' });
    await expect(
      withOsascriptRetry(attempt, {
        shouldRetry: isRetryableOsascriptError,
        backoffsMs: [1, 1],
        sleepFn: noSleep,
      })
    ).rejects.toMatchObject({ message: '-1712' });
    // initial try + 2 backoff retries = 3 attempts
    expect(attempt).toHaveBeenCalledTimes(3);
  });
});

/**
 * Issue #121: retrying a client-kill replays a full query into an app that
 * never answered, and every killed osascript leaves a permanently blocked
 * AppleEvent queue inside OmniFocus (eight were counted in one process sample).
 * The retry policy must distinguish "app answered, busy" from "app is gone".
 */
describe('classifyOsascriptError (#121)', () => {
  it('classifies an app-reported timeout as app-timeout — the app answered', () => {
    expect(classifyOsascriptError({ message: 'AppleEvent timed out (-1712)' })).toBe('app-timeout');
    expect(classifyOsascriptError({ stderr: 'execution error: -1712' })).toBe('app-timeout');
  });

  it('classifies our own kill as client-kill — the app never answered', () => {
    expect(classifyOsascriptError({ killed: true })).toBe('client-kill');
    expect(classifyOsascriptError({ signal: 'SIGTERM' })).toBe('client-kill');
  });

  it('prefers client-kill when a killed process also carries timeout text', () => {
    // execAsync sets killed AND a "timed out" message on a Node-level timeout.
    // Reading that as app-timeout would put us straight back on the retry path
    // this issue exists to close.
    expect(classifyOsascriptError({ killed: true, message: 'Command failed: timed out' })).toBe(
      'client-kill'
    );
  });

  it('leaves genuine script errors unclassified', () => {
    expect(classifyOsascriptError({ message: 'syntax error: Expected end of line' })).toBe('other');
    expect(classifyOsascriptError(undefined)).toBe('other');
  });

  it('isRetryableOsascriptError remains the union of both transient classes', () => {
    expect(isRetryableOsascriptError({ killed: true })).toBe(true);
    expect(isRetryableOsascriptError({ message: '-1712' })).toBe(true);
    expect(isRetryableOsascriptError({ message: 'syntax error' })).toBe(false);
  });
});

describe('retry gating on failure class (#121)', () => {
  const noSleep = () => Promise.resolve();
  const gate = (err: unknown) => classifyOsascriptError(err) === 'app-timeout';

  it('retries an app-reported timeout', async () => {
    const attempt = vi.fn().mockRejectedValueOnce({ message: '-1712' }).mockResolvedValue('ok');
    const out = await withOsascriptRetry(attempt, {
      shouldRetry: gate,
      backoffsMs: [1, 1],
      sleepFn: noSleep,
    });
    expect(out).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('never retries a client-kill — one attempt only', async () => {
    // The property this whole issue turns on: each extra attempt would leave
    // another orphaned AppleEvent queue in the app.
    const attempt = vi.fn().mockRejectedValue({ killed: true, signal: 'SIGTERM' });
    await expect(
      withOsascriptRetry(attempt, { shouldRetry: gate, backoffsMs: [1, 1], sleepFn: noSleep })
    ).rejects.toBeDefined();
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('uses backoffs long enough to let a contended app drain', async () => {
    // [500, 1500] gave an app no room; anything under a second is not a backoff.
    const slept: number[] = [];
    const attempt = vi.fn().mockRejectedValue({ message: '-1712' });
    await expect(
      withOsascriptRetry(attempt, {
        shouldRetry: gate,
        sleepFn: async (ms) => { slept.push(ms); },
      })
    ).rejects.toBeDefined();
    expect(slept.length).toBeGreaterThan(0);
    expect(Math.min(...slept)).toBeGreaterThanOrEqual(1000);
  });
});

describe('app health circuit breaker (#121)', () => {
  beforeEach(() => _resetAppHealth());

  it('starts closed', () => {
    expect(isAppKnownUnresponsive()).toBe(false);
    expect(shouldProbeAppHealth()).toBe(false);
  });

  it('opens on an unresponsive mark and blocks dispatch during cooldown', () => {
    const t = 1_000_000;
    markAppUnresponsive(t);
    expect(isAppKnownUnresponsive(t + 1_000)).toBe(true);
    expect(shouldProbeAppHealth(t + 1_000)).toBe(false);
  });

  it('switches from blocking to probing once the cooldown elapses', () => {
    const t = 1_000_000;
    markAppUnresponsive(t);
    expect(isAppKnownUnresponsive(t + 31_000)).toBe(false);
    expect(shouldProbeAppHealth(t + 31_000)).toBe(true);
  });

  it('closes again when the app is marked responsive', () => {
    markAppUnresponsive(1_000_000);
    markAppResponsive();
    expect(isAppKnownUnresponsive(1_000_001)).toBe(false);
    expect(shouldProbeAppHealth(1_000_001)).toBe(false);
  });

  it('is process-wide, so queued callers see one breaker rather than each probing', () => {
    markAppUnresponsive(1_000_000);
    const observed = [1, 2, 3].map(() => isAppKnownUnresponsive(1_000_500));
    expect(observed).toEqual([true, true, true]);
  });
});

describe('probeOmniFocusAlive (#121)', () => {
  it('reports alive when the cheap AppleEvent answers', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: 'OmniFocus', stderr: '' });
    expect(await probeOmniFocusAlive(exec as any)).toBe(true);
  });

  it('reports dead — not throwing — when it times out', async () => {
    const exec = vi.fn().mockRejectedValue({ killed: true });
    expect(await probeOmniFocusAlive(exec as any)).toBe(false);
  });

  it('uses a short timeout, not the 60s query timeout', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await probeOmniFocusAlive(exec as any);
    expect(exec.mock.calls[0][1].timeout).toBeLessThanOrEqual(10_000);
  });

  it('asks for something cheap rather than running a real query', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
    await probeOmniFocusAlive(exec as any);
    expect(exec.mock.calls[0][0]).toContain('name of default document');
  });
});
