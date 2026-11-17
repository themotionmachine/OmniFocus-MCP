#!/usr/bin/env node
// cli.cjs — the `omnifocus-mcp` entrypoint.
//
// This used to `spawn()` the server as a child with `stdio: 'inherit'` and then
// fall off the end of the file. That is the orphan factory described in issue
// #80: the wrapper exited immediately, leaving a detached server holding the
// client's pipes, with no signal handlers and no exit relay. Killing the client
// left the server running, and the next launch added another one.
//
// Now we load the entrypoint *into this process* with a dynamic import. No child,
// no relay to get wrong: signals, exit codes, and stdio are the process's own.

const path = require('path');
const { pathToFileURL } = require('url');

const distUrl = (...parts) => pathToFileURL(path.join(__dirname, 'dist', ...parts)).href;

// Escape hatch: OMNIFOCUS_MCP_NO_DAEMON=1 gives the pre-daemon behaviour — one
// dedicated server per client, no socket, no shared state. Keep this working; it
// is the answer for anyone whose environment the daemon can't accommodate, and
// the first debugging step when the daemon is suspected.
//
// A tool allowlist (OMNIFOCUS_MCP_TOOLS) also forces this mode. The shared
// daemon reads the allowlist from its own environment when it starts, and its
// socket name depends only on the version, so a restricted client could
// otherwise attach to an unrestricted daemon and be offered every tool.
const noDaemon =
  /^(1|true|yes)$/i.test(process.env.OMNIFOCUS_MCP_NO_DAEMON || '') ||
  Boolean((process.env.OMNIFOCUS_MCP_TOOLS || '').trim());

async function main() {
  if (noDaemon) {
    await import(distUrl('server.js'));
    return;
  }
  const { runShim } = await import(distUrl('daemon', 'shim.js'));
  await runShim();
}

main().catch((err) => {
  console.error(`[omnifocus-mcp] failed to start: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
