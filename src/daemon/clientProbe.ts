/**
 * Liveness probe for the stdio client (issue #126).
 *
 * The idle backstop from #80 exists because a SIGKILL'd client whose wrapper
 * chain holds stdin open never delivers EOF, and the stranded process pins a
 * daemon session forever. That case is real, so the backstop stays — but it
 * cannot tell a dead client apart from a live one that simply hasn't asked for
 * anything in half an hour, and it resolved that ambiguity by exiting. For a
 * client that treats a stdio server exit as terminal (#123), that costs the
 * user their tools for the rest of the session.
 *
 * So instead of exiting when the idle timer fires, we ask. Server → client
 * `ping` is part of the MCP protocol and every conformant client answers it. An
 * answer means keep the session; silence for `PROBE_TIMEOUT_MS` means the client
 * really is gone and we exit exactly as before. The orphan protection survives:
 * a stranded shim still dies, one idle window plus one probe window after its
 * client vanished.
 *
 * The id is a string, not a number, because this request is injected into a
 * stream the shim otherwise only forwards. Clients number their own requests and
 * the daemon numbers its own; a prefixed string id cannot collide with either.
 *
 * `filter` exists because the response to that request has no business reaching
 * the daemon: the daemon never sent the ping, and a response to a request it did
 * not make is not part of its session. The SDK we pin today happens to discard
 * an unknown-id response quietly — it routes it to an `onerror` callback the
 * daemon leaves unassigned — but that is an unwired hook, not a guarantee, and
 * the shim should not depend on it to keep a session intact. Filtering is the
 * single exception to the shim's byte-for-byte pipe, and it is narrow: no
 * bytes are altered, reordered, or dropped except the one response line the shim
 * itself solicited, and its newline. Everything else is forwarded verbatim on
 * line boundaries, and the filter disengages the moment the probe resolves.
 */

/** How long a live client gets to answer a ping before we call it dead. */
export const PROBE_TIMEOUT_MS = 10_000;

const PROBE_ID_PREFIX = 'omnifocus-mcp-probe-';

/**
 * Upper bound on bytes held back while filtering. A single JSON-RPC line this
 * long is not a real client message, and delaying the client's bytes is worse
 * than forwarding a probe response we then have to live without — so past this
 * point we give up filtering rather than buffer. A client producing a megabyte
 * of unbroken output is self-evidently alive, which is all the probe wanted.
 */
const MAX_BUFFERED_BYTES = 1_000_000;

export interface ClientProbeOptions {
  /** Writes one JSON-RPC line to the client. The newline is the writer's job. */
  write: (line: string) => void;
  /** The client answered, or spoke at all. */
  onAlive: () => void;
  /**
   * The client said nothing for `timeoutMs`. Expected to terminate the process;
   * that is the only caller today. If it returns instead, the probe is simply
   * resolved dead and any bytes buffered mid-line are delivered, unchanged, on
   * the next `filter` call.
   */
  onDead: () => void;
  timeoutMs?: number;
  /** Injectable for tests; defaults to an unref'd setTimeout. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

interface ProbeJsonRpc {
  id?: string | number;
  result?: unknown;
  error?: unknown;
}

export class ClientProbe {
  private readonly write: (line: string) => void;
  private readonly onAlive: () => void;
  private readonly onDead: () => void;
  private readonly timeoutMs: number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  /** Monotonic within this probe, so no two of its ids ever repeat. */
  private probeCounter = 0;
  private probeId: string | null = null;
  private timer: unknown = null;
  /** A probe has been written and has not yet been answered or timed out. */
  private outstandingProbe = false;
  /** Whether `filter` is inspecting the stream rather than passing it through. */
  private filtering = false;
  private lingerChunksLeft = 0;
  private buffer = '';

  constructor(options: ClientProbeOptions) {
    this.write = options.write;
    this.onAlive = options.onAlive;
    this.onDead = options.onDead;
    this.timeoutMs = options.timeoutMs ?? PROBE_TIMEOUT_MS;
    this.setTimer =
      options.setTimer ??
      ((fn, ms) => {
        const handle = setTimeout(fn, ms);
        // Don't let the probe alone hold the process open; stdin already does.
        (handle as { unref?: () => void }).unref?.();
        return handle;
      });
    this.clearTimer =
      options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  }

  /** True while a ping is awaiting an answer. */
  get outstanding(): boolean {
    return this.outstandingProbe;
  }

  /** The id of the most recent ping, for tests and diagnostics. */
  get lastId(): string | null {
    return this.probeId;
  }

  /**
   * Ping the client. A no-op while a probe is already outstanding, so a repeated
   * idle trigger cannot stack pings on a client that is merely slow.
   */
  start(): void {
    if (this.outstandingProbe) return;
    this.probeId = `${PROBE_ID_PREFIX}${++this.probeCounter}`;
    this.outstandingProbe = true;
    this.filtering = true;
    this.lingerChunksLeft = 0;
    this.write(JSON.stringify({ jsonrpc: '2.0', id: this.probeId, method: 'ping' }));
    this.timer = this.setTimer(() => {
      this.timer = null;
      this.outstandingProbe = false;
      // Stop filtering; whatever is buffered is flushed by the next `filter`
      // call, which is only reachable if `onDead` chose not to exit.
      this.filtering = false;
      this.lingerChunksLeft = 0;
      this.onDead();
    }, this.timeoutMs);
  }

  /**
   * Pass client → daemon bytes through, dropping the probe response if it is in
   * there. Returns exactly what should be forwarded.
   *
   * Any complete line proves the client is alive, not just the ping response —
   * a client that is issuing requests is obviously there. When liveness is
   * settled that way, the filter stays engaged for one more chunk boundary so a
   * ping response arriving just behind that traffic is still swallowed rather
   * than forwarded to a daemon that has no business seeing it. One chunk is
   * enough in practice (a client writes its ping response in the same or the
   * next write) and bounds how long any bytes can be held.
   */
  filter(chunk: string): string {
    if (!this.filtering) {
      // A remainder can only be left here by a probe that timed out mid-line.
      const held = this.buffer;
      this.buffer = '';
      return held + chunk;
    }

    // This chunk spends the linger allowance granted by earlier traffic.
    if (!this.outstandingProbe) this.lingerChunksLeft--;

    this.buffer += chunk;
    let out = '';
    let idx: number;
    while (this.filtering && (idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      if (this.isProbeResponse(line)) {
        // Drop the line and its newline — the one exception to the byte pipe.
        this.resolveAlive();
        this.filtering = false;
        break;
      }
      out += line + '\n';
      if (this.outstandingProbe && line.trim() !== '') {
        this.resolveAlive();
        this.lingerChunksLeft = 1;
      }
    }

    if (this.filtering && !this.outstandingProbe && this.lingerChunksLeft <= 0) {
      this.filtering = false;
    }
    if (this.filtering && this.buffer.length > MAX_BUFFERED_BYTES) {
      if (this.outstandingProbe) this.resolveAlive();
      this.filtering = false;
    }
    if (!this.filtering) {
      // Back to passthrough: the partial line goes out unchanged, exactly once.
      out += this.buffer;
      this.buffer = '';
      this.lingerChunksLeft = 0;
    }
    return out;
  }

  /** A response carrying either `result` or `error` answers the ping — a client
   * replying "method not found" is still a client that is running. */
  private isProbeResponse(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    let msg: ProbeJsonRpc;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return false;
    }
    return (
      msg.id === this.probeId && (msg.result !== undefined || msg.error !== undefined)
    );
  }

  private resolveAlive(): void {
    if (!this.outstandingProbe) return;
    this.outstandingProbe = false;
    if (this.timer !== null) {
      this.clearTimer(this.timer);
      this.timer = null;
    }
    this.onAlive();
  }
}
