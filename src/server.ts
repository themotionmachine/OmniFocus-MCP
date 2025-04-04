import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';


import { dumpDatabase } from './tools/dumpDatabase.js';
import { addOmniFocusTask, AddOmniFocusTaskParams } from './tools/primitives/addOmniFocusTask.js';
import { addProject, AddProjectParams } from './tools/primitives/addProject.js';
const execAsync = promisify(exec);

// Define a type for OmniFocus data
interface OmniFocusData {
  exportDate: string;
  tasks: any[];
  projects?: Record<string, any>;
  folders?: Record<string, any>;
  tags?: Record<string, any>;
}

// Create an MCP server
const server = new McpServer({
  name: "OmniFocus MCP",
  version: "1.0.0"
});


server.tool(
  "dump_database",
  {}, // No parameters needed
  async () => {
    try {
      const database = await dumpDatabase();
      
      // Option to return a human-readable summary instead of raw JSON
      const exampleTask = database.tasks[0];
      let summary = '';
      
      if (exampleTask) {
        summary = `Database contains ${database.tasks.length} tasks, ${Object.keys(database.projects).length} projects, ` +
                  `${Object.keys(database.folders).length} folders, and ${Object.keys(database.tags).length} tags.\n\n` +
                  `Example task "${exampleTask.name}" has tags: ${exampleTask.tagNames.join(', ')}`;
      } else {
        summary = "Database is empty or OmniFocus is not running.";
      }
      
      // Return the complete database as JSON
      return {
        content: [{
          type: "text",
          text: JSON.stringify(database, null, 2) + "\n\n" + summary
        }]
      };
    } catch (err: unknown) {
      return {
        content: [{
          type: "text",
          text: `Error dumping database. Please ensure OmniFocus is running and try again.`
        }],
        isError: true
      };
    }
  }
);

// Define Zod schema for add_omnifocus_task parameters
const AddOmniFocusTaskSchema = z.object({
  name: z.string().describe("The name of the task"),
  note: z.string().optional().describe("Additional notes for the task"),
  dueDate: z.string().optional().describe("The due date of the task in ISO format (YYYY-MM-DD or full ISO date)"),
  deferDate: z.string().optional().describe("The defer date of the task in ISO format (YYYY-MM-DD or full ISO date)"),
  flagged: z.boolean().optional().describe("Whether the task is flagged or not"),
  estimatedMinutes: z.number().optional().describe("Estimated time to complete the task, in minutes"),
  tags: z.array(z.string()).optional().describe("Tags to assign to the task"),
  projectName: z.string().optional().describe("The name of the project to add the task to (will add to inbox if not specified)")
});

server.tool(
  "add_omnifocus_task",
  AddOmniFocusTaskSchema.shape,
  async (params, extra) => {
    try {
      // Call the addOmniFocusTask function 
      const result = await addOmniFocusTask(params as AddOmniFocusTaskParams);
      
      if (result.success) {
        // Task was added successfully
        let locationText = params.projectName 
          ? `in project "${params.projectName}"` 
          : "in your inbox";
          
        let tagText = params.tags && params.tags.length > 0
          ? ` with tags: ${params.tags.join(', ')}`
          : "";
          
        let dueDateText = params.dueDate
          ? ` due on ${new Date(params.dueDate).toLocaleDateString()}`
          : "";
          
        return {
          content: [{
            type: "text",
            text: `✅ Task "${params.name}" created successfully ${locationText}${dueDateText}${tagText}.`
          }]
        };
      } else {
        // Task creation failed
        return {
          content: [{
            type: "text",
            text: `Failed to create task: ${result.error}`
          }],
          isError: true
        };
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Tool execution error: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error creating task: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Define Zod schema for add_project parameters
const AddProjectSchema = z.object({
  name: z.string().describe("The name of the project"),
  note: z.string().optional().describe("Additional notes for the project"),
  dueDate: z.string().optional().describe("The due date of the project in ISO format (YYYY-MM-DD or full ISO date)"),
  deferDate: z.string().optional().describe("The defer date of the project in ISO format (YYYY-MM-DD or full ISO date)"),
  flagged: z.boolean().optional().describe("Whether the project is flagged or not"),
  estimatedMinutes: z.number().optional().describe("Estimated time to complete the project, in minutes"),
  tags: z.array(z.string()).optional().describe("Tags to assign to the project"),
  folderName: z.string().optional().describe("The name of the folder to add the project to (will add to root if not specified)"),
  sequential: z.boolean().optional().describe("Whether tasks in the project should be sequential (default: false)")
});

server.tool(
  "add_project",
  AddProjectSchema.shape,
  async (params, extra) => {
    try {
      // Call the addProject function 
      const result = await addProject(params as AddProjectParams);
      
      if (result.success) {
        // Project was added successfully
        let locationText = params.folderName 
          ? `in folder "${params.folderName}"` 
          : "at the root level";
          
        let tagText = params.tags && params.tags.length > 0
          ? ` with tags: ${params.tags.join(', ')}`
          : "";
          
        let dueDateText = params.dueDate
          ? ` due on ${new Date(params.dueDate).toLocaleDateString()}`
          : "";
          
        let sequentialText = params.sequential
          ? " (sequential)"
          : " (parallel)";
          
        return {
          content: [{
            type: "text",
            text: `✅ Project "${params.name}" created successfully ${locationText}${dueDateText}${tagText}${sequentialText}.`
          }]
        };
      } else {
        // Project creation failed
        return {
          content: [{
            type: "text",
            text: `Failed to create project: ${result.error}`
          }],
          isError: true
        };
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Tool execution error: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error creating project: ${error.message}`
        }],
        isError: true
      };
    }
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
