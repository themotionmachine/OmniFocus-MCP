import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SetLevelRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from './utils/logger.js';
import { setScriptLogger } from './utils/scriptExecution.js';
import { registerResources } from './resources/index.js';
import { withUpgradeNudge } from './daemon/upgradeNudge.js';

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

/**
 * Server construction, factored out of `server.ts` (issue #80).
 *
 * The stdio entrypoint needs exactly one server for the life of the process, but
 * the daemon needs a fresh one **per client connection**: an MCP session is
 * stateful (initialize handshake, negotiated capabilities, per-client log level),
 * so two clients cannot share one `McpServer`. What they *do* share — and the
 * reason the daemon is worth having — is the module-level osascript semaphore in
 * `scriptExecution.ts`. That bound is per-process, so N stdio servers allow N×4
 * concurrent osascript children against the single-threaded OmniFocus.app; one
 * daemon hosting N sessions holds it to 4 globally.
 */

// Single-source the version from package.json — the hardcoded string here
// drifted out of sync with the published version more than once. Re-exported
// from version.ts, which the daemon socket path also depends on (#99).
export { SERVER_VERSION } from "./version.js";
import { SERVER_VERSION } from "./version.js";

const INSTRUCTIONS = `OmniFocus MCP server for macOS task management.

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
- Combine filters with AND logic; within arrays, OR logic applies`;

export interface BuiltServer {
  server: McpServer;
  logger: Logger;
}

/**
 * Build a fully-registered OmniFocus MCP server (tools + resources + logging).
 *
 * Caller owns the transport. Note the logger side-effect below.
 */
export function createOmniFocusServer(): BuiltServer {
  const server = new McpServer(
    { name: "OmniFocus MCP", version: SERVER_VERSION },
    { instructions: INSTRUCTIONS }
  );

  const logger = new Logger(server.server);

  // `setScriptLogger` is process-global, so with multiple concurrent daemon
  // sessions the last connection wins and script-level logs are routed to that
  // client. Acceptable: these are debug/error traces, not protocol data, and the
  // alternative (threading a logger through every script call) is a large change
  // for little gain. Per-session tool output is unaffected — it flows back
  // through each session's own transport.
  setScriptLogger(logger);

  server.server.registerCapabilities({ logging: {} });

  server.server.setRequestHandler(SetLevelRequestSchema, async (request) => {
    logger.setLevel(request.params.level);
    logger.info("server", `Log level set to ${request.params.level}`);
    return {};
  });

  registerResources(server, logger);

  for (const tool of selectTools(process.env.OMNIFOCUS_MCP_TOOLS)) {
    // Every tool's arguments are strict at every depth (see deepStrict).
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: deepStrict(tool.module.schema) },
      withUpgradeNudge(tool.module.handler) as never
    );
  }

  return { server, logger };
}

/**
 * Every tool the server can offer, in registration order.
 *
 * Unknown argument keys must be rejected, not silently stripped. A plain
 * `z.object` strips them before the handler runs. That is how `edit_item`
 * called with `note` instead of `newNote` reported "updated successfully" for
 * a write that never happened. So each schema is passed through `deepStrict`
 * at registration. `buildServer.test.ts` drives a real client through the
 * result.
 */
interface ToolModule {
  schema: z.ZodObject;
  handler: (...args: any[]) => any;
}

const TOOLS: ReadonlyArray<{ name: string; description: string; module: ToolModule }> = [
  { name: "dump_database", module: dumpDatabaseTool,
    description: "Gets the current state of your OmniFocus database" },
  { name: "add_omnifocus_task", module: addOmniFocusTaskTool,
    description: "Create a NEW task. If a matching task already exists (e.g. in the Inbox), do NOT create a duplicate — MOVE it with edit_item + newProjectName. When unsure, check with query_omnifocus first." },
  { name: "add_project", module: addProjectTool,
    description: "Add a new project to OmniFocus" },
  { name: "remove_item", module: removeItemTool,
    description: "Remove a task or project from OmniFocus" },
  { name: "edit_item", module: editItemTool,
    description: "Edit an existing task or project. Also how you MOVE a task: set newProjectName (or \"\" / \"inbox\"). Prefer moving an existing task over re-creating it — never make duplicates." },
  { name: "batch_add_items", module: batchAddItemsTool,
    description: "Add multiple tasks or projects to OmniFocus in a single operation" },
  { name: "batch_remove_items", module: batchRemoveItemsTool,
    description: "Remove multiple tasks or projects from OmniFocus in a single operation" },
  { name: "query_omnifocus", module: queryOmniFocusTool,
    description: "Query tasks, projects, or folders with filters (project, folder, tags, status, dates). Much faster and lighter than dump_database for targeted lookups." },
  { name: "list_perspectives", module: listPerspectivesTool,
    description: "List built-in and custom perspectives (custom is a Pro feature)" },
  { name: "get_perspective_view", module: getPerspectiveViewTool,
    description: "Get the items visible in a named OmniFocus perspective" },
  { name: "list_tags", module: listTagsTool,
    description: "List all tags with their hierarchy" },
  { name: "create_tag", module: createTagTool,
    description: "Create a new tag in OmniFocus, optionally nested under an existing parent tag" },
];

/**
 * Pick which tools to register from an allowlist, as in
 * `OMNIFOCUS_MCP_TOOLS=query_omnifocus,edit_item`.
 *
 * Unset or blank means every tool. The allowlist exists for exposing the
 * server remotely (for example to a cloud agent over HTTP) without the
 * destructive tools. It is an allowlist rather than a denylist, so a tool
 * added upstream stays hidden until someone opts in. An unknown name is an
 * error: a typo should stop the server, not quietly change what it offers.
 */
export function selectTools(allowlist: string | undefined): typeof TOOLS {
  if (!allowlist || !allowlist.trim()) return TOOLS;
  const wanted = allowlist.split(',').map(n => n.trim()).filter(Boolean);
  const known = new Set(TOOLS.map(t => t.name));
  const unknown = wanted.filter(n => !known.has(n));
  if (unknown.length) {
    throw new Error(
      `OMNIFOCUS_MCP_TOOLS names unknown tool(s): ${unknown.join(', ')}. ` +
      `Known tools: ${[...known].join(', ')}`
    );
  }
  const keep = new Set(wanted);
  return TOOLS.filter(t => keep.has(t.name));
}

/**
 * `.strict()` does not recurse. A typo inside a nested object — `filters:
 * {inInbox: true}` where the filter is named `inbox` — was still stripped
 * after the top-level patch, and the query ran unfiltered and reported the
 * whole database as the answer. Rebuild the schema so every object at any
 * depth (through optional/nullable/default wrappers, arrays, and unions) is
 * strict.
 */
export function deepStrict<T extends z.ZodType>(schema: T): T {
  // zod 4 keeps `.describe()` text in a registry keyed by schema instance, so
  // a clone starts without it. Copy it across.
  const out = rebuildStrict(schema);
  const meta = z.globalRegistry.get(schema);
  if (out !== schema && meta) z.globalRegistry.add(out, meta);
  return out;
}

function rebuildStrict<T extends z.ZodType>(schema: T): T {
  // Each branch clones the existing def so descriptions, defaults and
  // constraints (array min/max, etc.) ride along unchanged; only the shape or
  // inner type is replaced. In zod 4 "strict" is an object whose catchall is
  // `z.never()`.
  if (schema instanceof z.ZodObject) {
    const shape: Record<string, z.ZodType> = {};
    for (const [key, value] of Object.entries(schema.shape as Record<string, z.ZodType>)) {
      shape[key] = deepStrict(value);
    }
    return schema.clone({ ...schema.def, shape, catchall: z.never() }) as unknown as T;
  }
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable || schema instanceof z.ZodDefault) {
    const def = schema.def as unknown as { innerType: z.ZodType };
    return schema.clone({ ...schema.def, innerType: deepStrict(def.innerType) } as never) as unknown as T;
  }
  if (schema instanceof z.ZodArray) {
    return schema.clone({ ...schema.def, element: deepStrict(schema.def.element as z.ZodType) }) as unknown as T;
  }
  if (schema instanceof z.ZodUnion) {
    const options = (schema.def.options as readonly z.ZodType[]).map(deepStrict);
    return schema.clone({ ...schema.def, options } as never) as unknown as T;
  }
  return schema;
}
