import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StringDecoder } from 'string_decoder';
import { ClientProbe, PROBE_TIMEOUT_MS } from './clientProbe.js';

describe('ClientProbe', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const makeProbe = () => {
    const written: string[] = [];
    const onAlive = vi.fn();
    const onDead = vi.fn();
    const probe = new ClientProbe({
      write: (line) => written.push(line),
      onAlive,
      onDead,
    });
    return { probe, written, onAlive, onDead };
  };

  /** A client's answer to the outstanding ping. */
  const answer = (probe: ClientProbe, body: Record<string, unknown> = { result: {} }) =>
    JSON.stringify({ jsonrpc: '2.0', id: probe.lastId, ...body });

  it('passes chunks through untouched when no probe is outstanding', () => {
    const { probe } = makeProbe();
    expect(probe.filter('{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n')).toBe(
      '{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n'
    );
    expect(probe.filter('{"partial')).toBe('{"partial');
    expect(probe.filter('not json at all\n')).toBe('not json at all\n');
    expect(probe.outstanding).toBe(false);
  });

  it('writes exactly one well-formed ping request', () => {
    const { probe, written } = makeProbe();
    probe.start();
    expect(written).toHaveLength(1);
    const msg = JSON.parse(written[0]);
    expect(msg).toMatchObject({ jsonrpc: '2.0', method: 'ping' });
    expect(typeof msg.id).toBe('string');
    expect(msg.id).toMatch(/^omnifocus-mcp-probe-\d+$/);
    expect(msg.id).toBe(probe.lastId);
    expect(probe.outstanding).toBe(true);
  });

  it('treats a result response as alive and removes only that line', () => {
    const { probe, onAlive, onDead } = makeProbe();
    probe.start();
    const before = '{"jsonrpc":"2.0","id":7,"method":"tools/list"}\n';
    const after = '{"jsonrpc":"2.0","id":8,"method":"ping"}\n';
    const out = probe.filter(before + answer(probe) + '\n' + after);
    expect(out).toBe(before + after);
    expect(onAlive).toHaveBeenCalledTimes(1);
    expect(onDead).not.toHaveBeenCalled();
    expect(probe.outstanding).toBe(false);
  });

  it('treats an error response as alive (a client answering at all is alive)', () => {
    const { probe, onAlive } = makeProbe();
    probe.start();
    const out = probe.filter(
      answer(probe, { error: { code: -32601, message: 'Method not found' } }) + '\n'
    );
    expect(out).toBe('');
    expect(onAlive).toHaveBeenCalledTimes(1);
  });

  it('detects a response split across chunks, preserving surrounding bytes', () => {
    const { probe, onAlive } = makeProbe();
    probe.start();
    const response = answer(probe);
    const head = response.slice(0, 12);
    const tail = response.slice(12);
    expect(probe.filter(head)).toBe('');
    expect(onAlive).not.toHaveBeenCalled();
    const out = probe.filter(tail + '\n{"jsonrpc":"2.0","id":9,"method":"tools/list"}\n');
    expect(out).toBe('{"jsonrpc":"2.0","id":9,"method":"tools/list"}\n');
    expect(onAlive).toHaveBeenCalledTimes(1);
  });

  it('reports the client dead when nothing answers within the timeout', () => {
    const { probe, onAlive, onDead } = makeProbe();
    probe.start();
    vi.advanceTimersByTime(PROBE_TIMEOUT_MS - 1);
    expect(onDead).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDead).toHaveBeenCalledTimes(1);
    expect(onAlive).not.toHaveBeenCalled();
    expect(probe.outstanding).toBe(false);
  });

  it('accepts unrelated client traffic as proof of life, forwarding it unchanged', () => {
    const { probe, onAlive, onDead } = makeProbe();
    probe.start();
    const request = '{"jsonrpc":"2.0","id":3,"method":"tools/call"}\n';
    expect(probe.filter(request)).toBe(request);
    expect(onAlive).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(PROBE_TIMEOUT_MS * 2);
    expect(onDead).not.toHaveBeenCalled();
  });

  it('still swallows a ping response arriving just behind other traffic', () => {
    const { probe } = makeProbe();
    probe.start();
    probe.filter('{"jsonrpc":"2.0","id":3,"method":"tools/call"}\n');
    expect(probe.filter(answer(probe) + '\n')).toBe('');
  });

  it('ignores a second start() while outstanding and uses a fresh id after', () => {
    const { probe, written } = makeProbe();
    probe.start();
    const firstId = probe.lastId;
    probe.start();
    expect(written).toHaveLength(1);
    expect(probe.lastId).toBe(firstId);

    probe.filter(answer(probe) + '\n');
    probe.start();
    expect(written).toHaveLength(2);
    expect(probe.lastId).not.toBe(firstId);
  });

  it('returns to passthrough after resolution, flushing the remainder once', () => {
    const { probe } = makeProbe();
    probe.start();
    const out = probe.filter(answer(probe) + '\n{"partial');
    expect(out).toBe('{"partial');
    expect(probe.filter(':true}\n')).toBe(':true}\n');
    expect(probe.filter('plain\n')).toBe('plain\n');
  });

  it('flushes bytes buffered when the probe timed out mid-line', () => {
    const { probe, onDead } = makeProbe();
    probe.start();
    probe.filter('{"half');
    vi.advanceTimersByTime(PROBE_TIMEOUT_MS);
    expect(onDead).toHaveBeenCalledTimes(1);
    expect(probe.filter('-line"}\n')).toBe('{"half-line"}\n');
  });
  it('resolves alive and flushes verbatim rather than buffering without bound', () => {
    const { probe, onAlive, onDead } = makeProbe();
    probe.start();
    const huge = 'x'.repeat(1_000_001); // no newline anywhere
    expect(probe.filter(huge)).toBe(huge);
    expect(onAlive).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(PROBE_TIMEOUT_MS * 2);
    expect(onDead).not.toHaveBeenCalled();
    expect(probe.filter('more\n')).toBe('more\n'); // passthrough again
  });

  it('handles CRLF: keeps the carriage return, still spots the response', () => {
    const { probe, onAlive } = makeProbe();
    probe.start();
    const request = '{"jsonrpc":"2.0","id":4,"method":"tools/list"}\r\n';
    const out = probe.filter(answer(probe) + '\r\n' + request);
    expect(out).toBe(request);
    expect(onAlive).toHaveBeenCalledTimes(1);
  });

  it('forwards a blank line without taking it for proof of life', () => {
    const { probe, onAlive, onDead } = makeProbe();
    probe.start();
    expect(probe.filter('\n')).toBe('\n');
    expect(onAlive).not.toHaveBeenCalled();
    expect(probe.outstanding).toBe(true);
    vi.advanceTimersByTime(PROBE_TIMEOUT_MS);
    expect(onDead).toHaveBeenCalledTimes(1);
  });

  it('forwards a response arriving beyond the one-chunk linger bound', () => {
    // The documented limit of resolving alive on other traffic: the filter stays
    // engaged for one further chunk, not indefinitely. Two chunks later the
    // response is ordinary stream content again.
    const { probe } = makeProbe();
    probe.start();
    const late = answer(probe) + '\n';
    probe.filter('{"jsonrpc":"2.0","id":3,"method":"tools/call"}\n');
    expect(probe.filter('{"jsonrpc":"2.0","id":4,"method":"tools/call"}\n')).toContain('id":4');
    expect(probe.filter(late)).toBe(late);
  });

  it('forwards a response to some other id and counts it as liveness', () => {
    const { probe, onAlive } = makeProbe();
    probe.start();
    const other = '{"jsonrpc":"2.0","id":"not-our-probe","result":{}}\n';
    expect(probe.filter(other)).toBe(other);
    expect(onAlive).toHaveBeenCalledTimes(1);
  });

  it('uses the injected timer hooks for both arming and cancelling', () => {
    const setTimer = vi.fn(() => 'handle');
    const clearTimer = vi.fn();
    const onAlive = vi.fn();
    const probe = new ClientProbe({
      write: () => {},
      onAlive,
      onDead: () => {},
      timeoutMs: 1234,
      setTimer,
      clearTimer,
    });
    probe.start();
    expect(setTimer).toHaveBeenCalledTimes(1);
    expect(setTimer.mock.calls[0][1]).toBe(1234);
    probe.filter(answer(probe) + '\n');
    expect(clearTimer).toHaveBeenCalledWith('handle');
    expect(onAlive).toHaveBeenCalledTimes(1);
  });

  describe('multi-byte characters split across chunks', () => {
    // The shim decodes stdin statefully and forwards what `filter` returns, so
    // the pair has to be byte-exact even when a read boundary lands inside a
    // UTF-8 sequence. `Buffer.toString('utf8')` per chunk does not survive this.
    const pipe = (probe: ClientProbe, chunks: Buffer[]): Buffer => {
      const decoder = new StringDecoder('utf8');
      const parts = chunks.map((chunk) => Buffer.from(probe.filter(decoder.write(chunk)), 'utf8'));
      return Buffer.concat(parts);
    };

    const payload = Buffer.from('{"text":"é🎯x"}\n', 'utf8');
    // Land the split inside the four-byte emoji.
    const cut = payload.indexOf(Buffer.from('🎯', 'utf8')) + 2;

    it('forwards the original bytes when no probe is outstanding', () => {
      const { probe } = makeProbe();
      const forwarded = pipe(probe, [payload.subarray(0, cut), payload.subarray(cut)]);
      expect(forwarded.equals(payload)).toBe(true);
    });

    it('forwards the original bytes while a probe is outstanding', () => {
      const { probe, onAlive } = makeProbe();
      probe.start();
      const forwarded = pipe(probe, [payload.subarray(0, cut), payload.subarray(cut)]);
      expect(forwarded.equals(payload)).toBe(true);
      expect(onAlive).toHaveBeenCalledTimes(1);
    });
  });
});
