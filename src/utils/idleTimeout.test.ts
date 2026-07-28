import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import type { Readable } from 'stream';
import {
  resolveIdleTimeoutMinutes,
  installIdleTimeout,
  DEFAULT_IDLE_TIMEOUT_MINUTES,
} from './idleTimeout.js';

describe('resolveIdleTimeoutMinutes', () => {
  it('uses the default when unset or empty', () => {
    expect(resolveIdleTimeoutMinutes(undefined)).toBe(DEFAULT_IDLE_TIMEOUT_MINUTES);
    expect(resolveIdleTimeoutMinutes('')).toBe(DEFAULT_IDLE_TIMEOUT_MINUTES);
    expect(resolveIdleTimeoutMinutes('   ')).toBe(DEFAULT_IDLE_TIMEOUT_MINUTES);
  });

  it('parses a valid number', () => {
    expect(resolveIdleTimeoutMinutes('45')).toBe(45);
    expect(resolveIdleTimeoutMinutes('0')).toBe(0);
  });

  it('falls back to the default on invalid or negative input', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(resolveIdleTimeoutMinutes('nope')).toBe(DEFAULT_IDLE_TIMEOUT_MINUTES);
    expect(resolveIdleTimeoutMinutes('-5')).toBe(DEFAULT_IDLE_TIMEOUT_MINUTES);
    spy.mockRestore();
  });

  it('honors an explicit custom default', () => {
    expect(resolveIdleTimeoutMinutes(undefined, 60)).toBe(60);
  });
});

describe('installIdleTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const fakeStream = () => new EventEmitter() as unknown as Readable;

  it('fires onIdle after the window with no traffic', () => {
    const stream = fakeStream();
    const onIdle = vi.fn();
    installIdleTimeout(stream, 1, onIdle);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on each data chunk', () => {
    const stream = fakeStream();
    const onIdle = vi.fn();
    installIdleTimeout(stream, 1, onIdle);
    vi.advanceTimersByTime(50_000);
    stream.emit('data', Buffer.from('{}')); // reset
    vi.advanceTimersByTime(50_000);
    expect(onIdle).not.toHaveBeenCalled(); // 50s < window since last chunk
    vi.advanceTimersByTime(10_000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when disabled (0 or negative)', () => {
    const stream = fakeStream();
    const onIdle = vi.fn();
    const dispose = installIdleTimeout(stream, 0, onIdle);
    vi.advanceTimersByTime(10 * 60_000);
    expect(onIdle).not.toHaveBeenCalled();
    expect(stream.listenerCount('data')).toBe(0);
    dispose(); // safe to call
  });

  it('disposer removes the listener and prevents firing', () => {
    const stream = fakeStream();
    const onIdle = vi.fn();
    const dispose = installIdleTimeout(stream, 1, onIdle);
    expect(stream.listenerCount('data')).toBe(1);
    dispose();
    expect(stream.listenerCount('data')).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
