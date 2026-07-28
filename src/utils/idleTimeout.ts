import type { Readable } from 'stream';

/**
 * Idle-timeout backstop for the stdio server (issue #80).
 *
 * Signal/EOF propagation through the npx → cli.cjs → node wrapper chain is
 * unreliable: an orphaned server whose client was SIGKILL'd — and whose stdin an
 * intermediate wrapper is holding open — can survive for days, accumulating and
 * contending for AppleEvents on the single shared OmniFocus.app (the cause of the
 * -1712 timeout storms). The server's stdin-EOF and signal handlers catch the
 * clean-disconnect case; this is the last-resort catch for the unclean one.
 */

export const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;

/**
 * Resolve the idle timeout (in minutes) from an env value. Empty/undefined uses
 * the default; 0 disables; anything non-numeric or negative falls back to the
 * default with a warning. Pure and side-effect-free except the warning log.
 */
export function resolveIdleTimeoutMinutes(
  raw: string | undefined,
  defaultMinutes: number = DEFAULT_IDLE_TIMEOUT_MINUTES
): number {
  if (raw === undefined || raw.trim() === '') return defaultMinutes;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.error(
      `[omnifocus-mcp] ignoring invalid OMNIFOCUS_MCP_IDLE_TIMEOUT_MINUTES="${raw}"; using default ${defaultMinutes}.`
    );
    return defaultMinutes;
  }
  return parsed;
}

/**
 * Arm an idle timer that fires `onIdle` after `minutes` with no data on `input`.
 * Every chunk resets the timer, so an actively-used server never times out
 * (each JSON-RPC request arrives as stdin data). A non-positive `minutes`
 * disables the backstop entirely. Returns a disposer that removes the listener
 * and clears the timer.
 */
export function installIdleTimeout(
  input: Readable,
  minutes: number,
  onIdle: () => void
): () => void {
  if (!(minutes > 0)) return () => {};

  const idleMs = minutes * 60_000;
  let timer: ReturnType<typeof setTimeout>;

  const reset = (): void => {
    clearTimeout(timer);
    timer = setTimeout(onIdle, idleMs);
    // Don't let this timer alone keep the process alive — stdin already does.
    (timer as { unref?: () => void }).unref?.();
  };

  input.on('data', reset);
  reset();

  return () => {
    clearTimeout(timer);
    input.off('data', reset);
  };
}
