/**
 * Session state needed to survive a daemon restart (issue #123).
 *
 * The shim is a byte pipe, which is a complete implementation right up until the
 * daemon dies underneath it. Then the shim exits, and the client — which treats a
 * stdio server exit as terminal — loses the tools for the rest of its life. One
 * agent session lost OmniFocus for a week that way and silently fell back to raw
 * AppleScript, which is how the data-loss incident in #124 became reachable.
 *
 * Reconnecting the socket is easy. Resuming the *session* is not: MCP sessions
 * are stateful, and the daemon builds a fresh `McpServer` per connection, so a
 * new socket is a session that has never seen `initialize`. This tracks the
 * minimum needed to rebuild that state on a new connection:
 *
 *   - the `initialize` request and the `notifications/initialized` that follows
 *   - the ids of requests still awaiting a response
 *
 * The second matters as much as the first. A request whose response died with
 * the old daemon never completes, and an MCP client will wait on it forever.
 * Synthesising an error for each orphaned id turns an invisible hang into a
 * normal, retryable failure.
 *
 * This only observes; it never rewrites the stream. The pipe stays byte-for-byte.
 *
 * LIMIT worth knowing before extending the daemon: replay is transparent only
 * while a session carries no state beyond the handshake. Today the daemon's
 * per-connection state is the initialize exchange, negotiated capabilities and a
 * log level, all of which the replay restores. If anything stateful is added
 * later — a subscription, a cursor, server-side pagination — replay would
 * silently restore a *partial* session, and the failure would be subtle rather
 * than loud. Extend this tracker at the same time, or make the shim exit instead.
 *
 * LIMIT on the orphan errors: they tell the caller to retry, which is right for
 * reads and idempotent writes. A write killed mid-flight may have partially
 * applied, so a retried batch create could duplicate — the same hazard #121
 * addressed by never retrying writes. Re-query before retrying a write.
 */

export interface JsonRpcLike {
  jsonrpc?: string;
  id?: string | number;
  method?: string;
  result?: unknown;
  error?: unknown;
}

export class SessionTracker {
  /** Raw `initialize` line, replayed verbatim on a new connection. */
  private initializeLine: string | null = null;
  /** Raw `notifications/initialized` line, if the client sent one. */
  private initializedLine: string | null = null;
  private readonly pending = new Set<string>();
  private buffer = '';

  /** Observe bytes travelling client → daemon. */
  observeOutbound(chunk: string): void {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      this.noteOutboundLine(line);
    }
    // Guard against a pathological line with no newline growing without bound.
    if (this.buffer.length > 1_000_000) this.buffer = '';
  }

  private noteOutboundLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg: JsonRpcLike;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return;
    }
    if (msg.method === 'initialize') {
      this.initializeLine = trimmed;
    } else if (msg.method === 'notifications/initialized') {
      this.initializedLine = trimmed;
    }
    // A message with an id and a method is a request awaiting a response.
    if (msg.id !== undefined && msg.method !== undefined) {
      this.pending.add(String(msg.id));
    }
  }

  /** Observe bytes travelling daemon → client, to retire answered requests. */
  observeInbound(chunk: string): void {
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg: JsonRpcLike = JSON.parse(trimmed);
        if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
          this.pending.delete(String(msg.id));
        }
      } catch {
        // Partial or non-JSON frame; a later chunk completes it. Leaving the id
        // pending is the safe direction — a spurious error beats a silent hang.
      }
    }
  }

  /** True once the client has completed a handshake worth replaying. */
  get canReplay(): boolean {
    return this.initializeLine !== null;
  }

  /** Lines to send on a fresh connection, in order. */
  replayLines(): string[] {
    const lines: string[] = [];
    if (this.initializeLine) lines.push(this.initializeLine);
    if (this.initializedLine) lines.push(this.initializedLine);
    return lines;
  }

  /**
   * JSON-RPC error responses for requests orphaned by the disconnect.
   *
   * -32000 is the server-error range. The message names the cause, because a
   * caller seeing this should retry rather than conclude the tool is broken.
   */
  orphanedResponses(): string[] {
    return [...this.pending].map(id => {
      const numeric = /^-?\d+$/.test(id);
      return JSON.stringify({
        jsonrpc: '2.0',
        id: numeric ? Number(id) : id,
        error: {
          code: -32000,
          message:
            'The OmniFocus MCP daemon restarted while this request was in flight. The session has been re-established; retry the request.',
        },
      });
    });
  }

  /** Called after replay so the ids are not reported twice. */
  clearPending(): void {
    this.pending.clear();
  }

  /** Test/inspection helper. */
  get pendingIds(): string[] {
    return [...this.pending];
  }
}
