import { describe, it, expect, vi } from 'vitest';
import {
  Semaphore,
  isRetryableOsascriptError,
  withOsascriptRetry,
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
