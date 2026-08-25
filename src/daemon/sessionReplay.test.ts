import { describe, it, expect } from 'vitest';
import { SessionTracker } from './sessionReplay.js';

const init = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'c', version: '1' } },
});
const initialized = JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' });
const call = (id: number) => JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: {} });
const reply = (id: number) => JSON.stringify({ jsonrpc: '2.0', id, result: { ok: true } });

describe('SessionTracker (#123)', () => {
  it('cannot replay before a handshake', () => {
    const s = new SessionTracker();
    expect(s.canReplay).toBe(false);
    s.observeOutbound(call(1) + '\n');
    expect(s.canReplay).toBe(false);
  });

  it('captures the handshake verbatim for replay', () => {
    const s = new SessionTracker();
    s.observeOutbound(init + '\n' + initialized + '\n');
    expect(s.canReplay).toBe(true);
    expect(s.replayLines()).toEqual([init, initialized]);
  });

  it('reassembles messages split across chunk boundaries', () => {
    // A socket gives no framing guarantees; a naive per-chunk parse would miss
    // the handshake entirely and silently lose the ability to recover.
    const s = new SessionTracker();
    const whole = init + '\n';
    s.observeOutbound(whole.slice(0, 20));
    s.observeOutbound(whole.slice(20));
    expect(s.canReplay).toBe(true);
    expect(s.replayLines()[0]).toBe(init);
  });

  it('tracks in-flight requests and retires them on response', () => {
    const s = new SessionTracker();
    s.observeOutbound(init + '\n' + call(2) + '\n' + call(3) + '\n');
    expect(s.pendingIds.sort()).toEqual(['1', '2', '3']);
    s.observeInbound(reply(2) + '\n');
    expect(s.pendingIds.sort()).toEqual(['1', '3']);
  });

  it('does not treat notifications as pending — they get no response', () => {
    const s = new SessionTracker();
    s.observeOutbound(initialized + '\n');
    expect(s.pendingIds).toEqual([]);
  });

  it('synthesizes a retryable error for each orphaned request', () => {
    // Without this the client waits forever on a response that died with the
    // daemon — an invisible hang instead of a normal failure.
    const s = new SessionTracker();
    s.observeOutbound(init + '\n' + call(7) + '\n');
    s.observeInbound(reply(1) + '\n');
    const errs = s.orphanedResponses().map(l => JSON.parse(l));
    expect(errs).toHaveLength(1);
    expect(errs[0].id).toBe(7);
    expect(errs[0].error.code).toBe(-32000);
    expect(errs[0].error.message).toMatch(/retry/i);
  });

  it('preserves id type — a string id must not come back as a number', () => {
    const s = new SessionTracker();
    s.observeOutbound(JSON.stringify({ jsonrpc: '2.0', id: 'abc', method: 'tools/call' }) + '\n');
    expect(JSON.parse(s.orphanedResponses()[0]).id).toBe('abc');
  });

  it('clearPending stops the same ids being reported twice', () => {
    const s = new SessionTracker();
    s.observeOutbound(init + '\n' + call(9) + '\n');
    s.clearPending();
    expect(s.orphanedResponses()).toEqual([]);
  });

  it('ignores malformed lines rather than throwing', () => {
    const s = new SessionTracker();
    expect(() => s.observeOutbound('not json\n' + init + '\n')).not.toThrow();
    expect(s.canReplay).toBe(true);
  });

  it('bounds the buffer so a newline-free stream cannot grow without limit', () => {
    const s = new SessionTracker();
    expect(() => s.observeOutbound('x'.repeat(1_200_000))).not.toThrow();
    s.observeOutbound(init + '\n');
    expect(s.canReplay).toBe(true);
  });
});
