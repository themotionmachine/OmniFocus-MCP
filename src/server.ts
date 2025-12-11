#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as addFolderTool from './tools/definitions/addFolder.js';
import * as addOmniFocusTaskTool from './tools/definitions/addOmniFocusTask.js';
import * as addProjectTool from './tools/definitions/addProject.js';
import * as assignTagsTool from './tools/definitions/assignTags.js';
import * as batchAddItemsTool from './tools/definitions/batchAddItems.js';
import * as batchRemoveItemsTool from './tools/definitions/batchRemoveItems.js';
import * as createTagTool from './tools/definitions/createTag.js';
import * as deleteTagTool from './tools/definitions/deleteTag.js';
// Import tool definitions
import * as dumpDatabaseTool from './tools/definitions/dumpDatabase.js';
import * as editFolderTool from './tools/definitions/editFolder.js';
import * as editItemTool from './tools/definitions/editItem.js';
import * as editTagTool from './tools/definitions/editTag.js';
import * as getPerspectiveViewTool from './tools/definitions/getPerspectiveView.js';
import * as listFoldersTool from './tools/definitions/listFolders.js';
import * as listPerspectivesTool from './tools/definitions/listPerspectives.js';
import * as listTagsTool from './tools/definitions/listTags.js';
import * as moveFolderTool from './tools/definitions/moveFolder.js';
import * as queryOmniFocusTool from './tools/definitions/queryOmnifocus.js';
import * as removeFolderTool from './tools/definitions/removeFolder.js';
import * as removeItemTool from './tools/definitions/removeItem.js';
import * as removeTagsTool from './tools/definitions/removeTags.js';

// Create an MCP server
const server = new McpServer({
  name: 'OmniFocus MCP',
  version: '1.0.0'
});

// Register tools
server.tool(
  'dump_database',
  'Gets the current state of your OmniFocus database',
  dumpDatabaseTool.schema.shape,
  dumpDatabaseTool.handler
);

server.tool(
  'add_omnifocus_task',
  'Add a new task to OmniFocus',
  addOmniFocusTaskTool.schema.shape,
  addOmniFocusTaskTool.handler
);

server.tool(
  'add_project',
  'Add a new project to OmniFocus',
  addProjectTool.schema.shape,
  addProjectTool.handler
);

server.tool(
  'remove_item',
  'Remove a task or project from OmniFocus',
  removeItemTool.schema.shape,
  removeItemTool.handler
);

server.tool(
  'edit_item',
  'Edit a task or project in OmniFocus',
  editItemTool.schema.shape,
  editItemTool.handler
);

server.tool(
  'batch_add_items',
  'Add multiple tasks or projects to OmniFocus in a single operation',
  batchAddItemsTool.schema.shape,
  batchAddItemsTool.handler
);

server.tool(
  'batch_remove_items',
  'Remove multiple tasks or projects from OmniFocus in a single operation',
  batchRemoveItemsTool.schema.shape,
  batchRemoveItemsTool.handler
);

server.tool(
  'query_omnifocus',
  'Efficiently query OmniFocus database with powerful filters. Get specific tasks, projects, or folders without loading the entire database. Supports filtering by project, tags, status, due dates, and more. Much faster than dump_database for targeted queries.',
  queryOmniFocusTool.schema.shape,
  queryOmniFocusTool.handler
);

server.tool(
  'list_perspectives',
  'List all available perspectives in OmniFocus, including built-in perspectives (Inbox, Projects, Tags, etc.) and custom perspectives (Pro feature)',
  listPerspectivesTool.schema.shape,
  listPerspectivesTool.handler
);

server.tool(
  'get_perspective_view',
  'Get the items visible in a specific OmniFocus perspective. Shows what tasks and projects are displayed when viewing that perspective',
  getPerspectiveViewTool.schema.shape,
  getPerspectiveViewTool.handler
);

server.tool(
  'list_folders',
  'List folders from the OmniFocus database with optional filtering by status, parent folder, and recursive children',
  listFoldersTool.schema.shape,
  listFoldersTool.handler
);

server.tool(
  'add_folder',
  'Create a new folder in the OmniFocus database at a specified position in the hierarchy',
  addFolderTool.schema.shape,
  addFolderTool.handler
);

server.tool(
  'edit_folder',
  'Edit folder properties (name and/or status) in OmniFocus. Supports lookup by ID or name with disambiguation for multiple matches.',
  editFolderTool.schema.shape,
  editFolderTool.handler
);

server.tool(
  'remove_folder',
  'Remove a folder and all its contents from OmniFocus. Supports lookup by ID or name with disambiguation for multiple matches.',
  removeFolderTool.schema.shape,
  removeFolderTool.handler
);

server.tool(
  'move_folder',
  'Move a folder to a new location in the OmniFocus hierarchy. Supports lookup by ID or name with disambiguation, and prevents circular moves.',
  moveFolderTool.schema.shape,
  moveFolderTool.handler
);

server.tool(
  'list_tags',
  'List tags from OmniFocus with optional filtering by status, parent tag, and hierarchy. Returns tag metadata including task counts, hierarchy, and availability settings.',
  listTagsTool.schema.shape,
  listTagsTool.handler
);
server.tool(
  'create_tag',
  'Create a new tag in OmniFocus with optional parent, position, and settings. Supports hierarchical tags and precise placement (before/after siblings, beginning/ending of parent).',
  createTagTool.schema.shape,
  createTagTool.handler
);

server.tool(
  'delete_tag',
  'Delete a tag from OmniFocus by ID or name. Child tags are deleted recursively (OmniFocus native behavior). Tasks with the deleted tag will have the tag reference removed.',
  deleteTagTool.schema.shape,
  deleteTagTool.handler
);

server.tool(
  'assign_tags',
  'Assign one or more tags to one or more tasks in OmniFocus. Supports batch operations with per-task success/failure reporting. Idempotent (assigning an already-assigned tag is safe).',
  assignTagsTool.schema.shape,
  assignTagsTool.handler
);

server.tool(
  'edit_tag',
  'Edit tag properties (name, status, allowsNextAction) in OmniFocus. Supports lookup by ID or name with disambiguation for multiple matches.',
  editTagTool.schema.shape,
  editTagTool.handler
);

server.tool(
  'remove_tags',
  'Remove tags from tasks in OmniFocus. Can remove specific tags or clear all tags from specified tasks. Supports batch operations with per-task success/failure reporting. Idempotent (removing an unassigned tag is safe).',
  removeTagsTool.schema.shape,
  removeTagsTool.handler
);

// Start the MCP server
const transport = new StdioServerTransport();

// Use await with server.connect to ensure proper connection
(async () => {
  try {
    console.error('Starting MCP server...');
    await server.connect(transport);
    console.error('MCP Server connected and ready to accept commands from Claude');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`Failed to start MCP server: ${error.message}`);
    console.error('Stack trace:', error.stack);
    // Exit with error code to signal failure
    process.exit(1);
  }
})();

// For a cleaner shutdown if the process is terminated
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});
