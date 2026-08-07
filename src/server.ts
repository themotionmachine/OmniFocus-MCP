#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveIdleTimeoutMinutes, installIdleTimeout } from './utils/idleTimeout.js';
import { createOmniFocusServer } from './buildServer.js';

// Tool/resource registration lives in buildServer.ts so the daemon can build a
// session per connection (issue #80). This file is the stdio entrypoint only.
const { server } = createOmniFocusServer();

// Start the MCP server
const transport = new StdioServerTransport();

// Use await with server.connect to ensure proper connection
(async function() {
  try {
    await server.connect(transport);
  } catch (err) {
    console.error(`Failed to start MCP server: ${err}`);
  }
})();

// Exit cleanly when the MCP client goes away. Signal propagation through the
// npx/npm wrapper chain is unreliable, so we also watch stdin for EOF — when
// the client closes the transport, stdin ends and we shut down rather than
// lingering as an orphaned process.
function shutdown(): void {
  process.exit(0);
}

process.stdin.on('end', shutdown);
process.stdin.on('close', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);
process.on('SIGINT', shutdown);

// Idle-timeout backstop (issue #80). The stdin-EOF and signal handlers above
// catch the clean-disconnect case; when the wrapper chain holds stdin open after
// a SIGKILL'd client, they don't fire and the server lingers as an orphan. If no
// client traffic arrives within the idle window, exit. Every JSON-RPC request
// reaches us as stdin data (the SDK's stdio transport also listens on 'data', so
// our listener is additive), so an actively-used server keeps resetting the timer
// and never times out. Configure with OMNIFOCUS_MCP_IDLE_TIMEOUT_MINUTES
// (default 30; set 0 to disable). See src/utils/idleTimeout.ts.
const idleTimeoutMinutes = resolveIdleTimeoutMinutes(
  process.env.OMNIFOCUS_MCP_IDLE_TIMEOUT_MINUTES
);
installIdleTimeout(process.stdin, idleTimeoutMinutes, () => {
  console.error(
    `[omnifocus-mcp] no client traffic for ${idleTimeoutMinutes}m; exiting to avoid orphaned-process accumulation (issue #80).`
  );
  process.exit(0);
});
