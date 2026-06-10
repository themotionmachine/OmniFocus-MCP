#!/usr/bin/env node

import { readFileSync } from "fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SetLevelRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from './utils/logger.js';
import { setScriptLogger } from './utils/scriptExecution.js';
import { registerResources } from './resources/index.js';

// Import tool definitions
import * as dumpDatabaseTool from './tools/definitions/dumpDatabase.js';
import * as addOmniFocusTaskTool from './tools/definitions/addOmniFocusTask.js';
import * as addProjectTool from './tools/definitions/addProject.js';
import * as removeItemTool from './tools/definitions/removeItem.js';
import * as editItemTool from './tools/definitions/editItem.js';
import * as batchAddItemsTool from './tools/definitions/batchAddItems.js';
import * as batchRemoveItemsTool from './tools/definitions/batchRemoveItems.js';
import * as queryOmniFocusTool from './tools/definitions/queryOmnifocus.js';
import * as listPerspectivesTool from './tools/definitions/listPerspectives.js';
import * as getPerspectiveViewTool from './tools/definitions/getPerspectiveView.js';
import * as listTagsTool from './tools/definitions/listTags.js';
import * as createTagTool from './tools/definitions/createTag.js';

// Single-source the version from package.json — the hardcoded string here
// drifted out of sync with the published version more than once.
// Works from both src/ (tsx) and dist/ (build): each is one level below the
// package root.
const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8")
);

// Create an MCP server with instructions
const server = new McpServer(
  { name: "OmniFocus MCP", version },
  {
    instructions: `OmniFocus MCP server for macOS task management.

TOOL GUIDANCE:
- Prefer query_omnifocus over dump_database for targeted lookups (85-95% context savings)
- Use the "fields" parameter to request only needed fields
- Use "summary: true" for quick counts without full data
- For batch operations, prefer batch_add_items/batch_remove_items over repeated single calls

RESOURCES:
- omnifocus://inbox — current inbox items
- omnifocus://today — today's agenda (due, planned, overdue)
- omnifocus://flagged — all flagged items
- omnifocus://stats — quick database statistics
- omnifocus://project/{name} — tasks in a specific project
- omnifocus://perspective/{name} — items in a named perspective

QUERY FILTER TIPS:
- Tags filter is case-sensitive and exact match
- projectName filter is case-insensitive partial match
- Status values for tasks: Next, Available, Blocked, DueSoon, Overdue
- Status values for projects: Active, OnHold, Done, Dropped
- Use reviewDue: true filter on projects to find projects needing review
- Use edit_item with markReviewed: true to mark a project as reviewed
- Combine filters with AND logic; within arrays, OR logic applies`
  }
);

// Set up logging
const logger = new Logger(server.server);
setScriptLogger(logger);

server.server.registerCapabilities({ logging: {} });

server.server.setRequestHandler(SetLevelRequestSchema, async (request) => {
  logger.setLevel(request.params.level);
  logger.info("server", `Log level set to ${request.params.level}`);
  return {};
});

// Register resources
registerResources(server, logger);

// Register tools
server.tool(
  "dump_database",
  "Gets the current state of your OmniFocus database",
  dumpDatabaseTool.schema.shape,
  dumpDatabaseTool.handler
);

server.tool(
  "add_omnifocus_task",
  "Create a NEW task in OmniFocus. Use this ONLY when the task does not already exist. If a matching task already exists (e.g. an item already in the Inbox, or one referenced earlier in the conversation) and the goal is to file/place/move it into a project or the inbox, do NOT create a duplicate here — use edit_item with newProjectName to MOVE the existing task instead. When unsure whether a matching task already exists, search with query_omnifocus first and prefer moving over creating.",
  addOmniFocusTaskTool.schema.shape,
  addOmniFocusTaskTool.handler
);

server.tool(
  "add_project",
  "Add a new project to OmniFocus",
  addProjectTool.schema.shape,
  addProjectTool.handler
);

server.tool(
  "remove_item",
  "Remove a task or project from OmniFocus",
  removeItemTool.schema.shape,
  removeItemTool.handler
);

server.tool(
  "edit_item",
  "Edit an existing task or project in OmniFocus. This is also how you MOVE/reassign an existing task: set newProjectName to a project name/path to move it into that project, or to \"\" / \"inbox\" to move it to the inbox. Whenever a task already exists, prefer moving it with this tool over creating a new one via add_omnifocus_task, so you never create duplicates.",
  editItemTool.schema.shape,
  editItemTool.handler
);

server.tool(
  "batch_add_items",
  "Add multiple tasks or projects to OmniFocus in a single operation",
  batchAddItemsTool.schema.shape,
  batchAddItemsTool.handler
);

server.tool(
  "batch_remove_items",
  "Remove multiple tasks or projects from OmniFocus in a single operation",
  batchRemoveItemsTool.schema.shape,
  batchRemoveItemsTool.handler
);

server.tool(
  "query_omnifocus",
  "Efficiently query OmniFocus database with powerful filters. Get specific tasks, projects, or folders without loading the entire database. Supports filtering by project, tags, status, due dates, and more. Much faster than dump_database for targeted queries.",
  queryOmniFocusTool.schema.shape,
  queryOmniFocusTool.handler
);

server.tool(
  "list_perspectives",
  "List all available perspectives in OmniFocus, including built-in perspectives (Inbox, Projects, Tags, etc.) and custom perspectives (Pro feature)",
  listPerspectivesTool.schema.shape,
  listPerspectivesTool.handler
);

server.tool(
  "get_perspective_view",
  "Get the items visible in a specific OmniFocus perspective. Shows what tasks and projects are displayed when viewing that perspective",
  getPerspectiveViewTool.schema.shape,
  getPerspectiveViewTool.handler
);

server.tool(
  "list_tags",
  "List all tags in OmniFocus with their hierarchy. Useful for discovering available tags before creating or editing tasks.",
  listTagsTool.schema.shape,
  listTagsTool.handler
);

server.tool(
  "create_tag",
  "Create a new tag in OmniFocus, optionally nested under an existing parent tag",
  createTagTool.schema.shape,
  createTagTool.handler
);

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
