#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Import tool definitions
import * as dumpDatabaseTool from './tools/definitions/dumpDatabase.js';
import * as addOmniFocusTaskTool from './tools/definitions/addOmniFocusTask.js';
import * as addProjectTool from './tools/definitions/addProject.js';
import * as removeItemTool from './tools/definitions/removeItem.js';
import * as editItemTool from './tools/definitions/editItem.js';
import * as moveTaskTool from './tools/definitions/moveTask.js';
import * as batchAddItemsTool from './tools/definitions/batchAddItems.js';
import * as batchRemoveItemsTool from './tools/definitions/batchRemoveItems.js';
import * as batchMoveTasksTool from './tools/definitions/batchMoveTasks.js';
import * as batchEditItemsTool from './tools/definitions/batchEditItems.js';
import * as queryOmniFocusTool from './tools/definitions/queryOmnifocus.js';
import * as listPerspectivesTool from './tools/definitions/listPerspectives.js';
import * as getPerspectiveViewTool from './tools/definitions/getPerspectiveView.js';
import * as addFolderTool from './tools/definitions/addFolder.js';
import * as editFolderTool from './tools/definitions/editFolder.js';
import * as removeFolderTool from './tools/definitions/removeFolder.js';

// Import resources
import { getLibraryResource } from './resources/library.js';
import { getInboxResource } from './resources/inbox.js';
import { getFolderResource } from './resources/folder.js';
import { getProjectResource } from './resources/project.js';
import { getTaskResource } from './resources/task.js';

// Import primitives for resource listing
import { queryOmnifocus } from './tools/primitives/queryOmnifocus.js';

// Import MCP types
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

// Create an MCP server
const server = new McpServer({
  name: "OmniFocus MCP",
  version: "1.0.0"
});

// Register tools
server.tool(
  "dump_database",
  "Gets the current state of your OmniFocus database. Note: For browsing the folder/project/task hierarchy, prefer using MCP resources (omnifocus://library, omnifocus://folder/{id}, etc.) instead - they provide better navigation and are easier to read.",
  dumpDatabaseTool.schema.shape,
  dumpDatabaseTool.handler
);

server.tool(
  "add_omnifocus_task",
  "Add a new task to OmniFocus",
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
  "PERMANENTLY DELETE a task or project from OmniFocus database. WARNING: This is destructive and cannot be undone. To mark tasks as done, use edit_item with newStatus='completed' instead. Only use this to delete items that were created by mistake or are duplicates.",
  removeItemTool.schema.shape,
  removeItemTool.handler
);

server.tool(
  "edit_item",
  "Edit a task or project in OmniFocus. Use this to mark tasks as completed (done) or dropped (abandoned), change properties, update dates, modify tags, set review intervals, etc. To mark a task as done, set newStatus='completed'. This is the primary tool for task management.",
  editItemTool.schema.shape,
  editItemTool.handler
);

server.tool(
  "move_task",
  "Move a task to a different location in OmniFocus. Supports moving tasks from inbox to projects, between projects, back to inbox, or making tasks subtasks of other tasks. Use this for reorganizing your task hierarchy.",
  moveTaskTool.schema.shape,
  moveTaskTool.handler
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
  "batch_move_tasks",
  "Move multiple tasks to the same destination in a single operation. Much faster than moving tasks one by one (10x speedup). All tasks must go to the same location.",
  batchMoveTasksTool.schema.shape,
  batchMoveTasksTool.handler
);

server.tool(
  "batch_edit_items",
  "Edit multiple tasks or projects in a single operation. Much faster than editing one by one (10x speedup for 10 items, 45x for 50 items). Supports all editing operations: changing properties, updating dates, modifying tags, setting status, etc.",
  batchEditItemsTool.schema.shape,
  batchEditItemsTool.handler
);

server.tool(
  "query_omnifocus",
  "Efficiently query OmniFocus database with powerful filters. Returns only active items by default (excludes completed/dropped tasks, done/dropped projects, and dropped folders). Get specific tasks, projects, or folders without loading the entire database. Supports filtering by project, tags, status, due dates, and more. Much faster than dump_database for targeted queries. Note: For browsing hierarchy (folders→projects→tasks), prefer MCP resources (omnifocus://library, omnifocus://folder/{id}, omnifocus://project/{id}) for better navigation.",
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
  "add_folder",
  "Create a new folder in OmniFocus. Folders help organize projects. Supports nested folders by specifying a parent folder.",
  addFolderTool.schema.shape,
  addFolderTool.handler
);

server.tool(
  "edit_folder",
  "Edit a folder in OmniFocus. Rename folders or move them to different parent folders (or to root level).",
  editFolderTool.schema.shape,
  editFolderTool.handler
);

server.tool(
  "remove_folder",
  "PERMANENTLY DELETE a folder from OmniFocus. WARNING: This is destructive and cannot be undone. Any projects in the folder will be moved to the root level.",
  removeFolderTool.schema.shape,
  removeFolderTool.handler
);

// Register resources
server.resource(
  "OmniFocus Library",
  "omnifocus://library",
  { description: "Root folders and projects" },
  async (uri) => {
    const content = await getLibraryResource();
    return {
      contents: [{
        uri: uri.href,
        text: content
      }]
    };
  }
);

server.resource(
  "Inbox",
  "omnifocus://inbox",
  { description: "Unsorted tasks" },
  async (uri) => {
    const content = await getInboxResource();
    return {
      contents: [{
        uri: uri.href,
        text: content
      }]
    };
  }
);

// Register resource templates
server.resource(
  "Folder Contents",
  new ResourceTemplate("omnifocus://folder/{folderId}", {
    list: async () => {
      // List all folders
      const result = await queryOmnifocus({
        entity: "folders",
        fields: ["id", "name"]
      });
      return {
        resources: (result.items || []).map((folder: any) => ({
          uri: `omnifocus://folder/${folder.id}`,
          name: folder.name,
          description: `Folder: ${folder.name}`
        }))
      };
    },
    complete: undefined
  }),
  { description: "View folder hierarchy and projects" },
  async (uri: any, variables: any) => {
    const folderId = variables.folderId as string;
    const content = await getFolderResource(folderId);
    return {
      contents: [{
        uri: uri.href,
        text: content
      }]
    };
  }
);

server.resource(
  "Project Details",
  new ResourceTemplate("omnifocus://project/{projectId}", {
    list: async () => {
      // List all projects
      const result = await queryOmnifocus({
        entity: "projects",
        fields: ["id", "name"]
      });
      return {
        resources: (result.items || []).map((project: any) => ({
          uri: `omnifocus://project/${project.id}`,
          name: project.name,
          description: `Project: ${project.name}`
        }))
      };
    },
    complete: undefined
  }),
  { description: "View project with all tasks" },
  async (uri: any, variables: any) => {
    const projectId = variables.projectId as string;
    const content = await getProjectResource(projectId);
    return {
      contents: [{
        uri: uri.href,
        text: content
      }]
    };
  }
);

server.resource(
  "Task Details",
  new ResourceTemplate("omnifocus://task/{taskId}", {
    list: async () => {
      // List all incomplete tasks
      const result = await queryOmnifocus({
        entity: "tasks",
        fields: ["id", "name"],
        filters: { status: ["available", "blocked"] }
      });
      return {
        resources: (result.items || []).map((task: any) => ({
          uri: `omnifocus://task/${task.id}`,
          name: task.name,
          description: `Task: ${task.name}`
        }))
      };
    },
    complete: undefined
  }),
  { description: "View task with subtasks and context" },
  async (uri: any, variables: any) => {
    const taskId = variables.taskId as string;
    const content = await getTaskResource(taskId);
    return {
      contents: [{
        uri: uri.href,
        text: content
      }]
    };
  }
);

// Start the MCP server
const transport = new StdioServerTransport();

// Use await with server.connect to ensure proper connection
(async function() {
  try {
    console.error("Starting MCP server...");
    await server.connect(transport);
    console.error("MCP Server connected and ready to accept commands from Claude");
  } catch (err) {
    console.error(`Failed to start MCP server: ${err}`);
  }
})();

// For a cleaner shutdown if the process is terminated
