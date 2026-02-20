import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Logger } from '../utils/logger.js';
import { readInbox } from './inbox.js';
import { readToday } from './today.js';
import { readFlagged } from './flagged.js';
import { readStats } from './stats.js';
import { readProject, listProjects, completeProjectName } from './project.js';
import { readPerspective, listAllPerspectives, completePerspectiveName } from './perspective.js';

export function registerResources(server: McpServer, logger: Logger): void {
  // Fixed resources
  server.resource(
    "inbox",
    "omnifocus://inbox",
    { description: "Current OmniFocus inbox items", mimeType: "application/json" },
    async (uri) => readInbox(logger)
  );

  server.resource(
    "today",
    "omnifocus://today",
    { description: "Today's agenda — tasks due today, planned for today, and overdue items", mimeType: "application/json" },
    async (uri) => readToday(logger)
  );

  server.resource(
    "flagged",
    "omnifocus://flagged",
    { description: "All flagged OmniFocus items", mimeType: "application/json" },
    async (uri) => readFlagged(logger)
  );

  server.resource(
    "stats",
    "omnifocus://stats",
    { description: "Quick OmniFocus database statistics overview", mimeType: "application/json" },
    async (uri) => readStats(logger)
  );

  // Template resources
  server.resource(
    "project",
    new ResourceTemplate("omnifocus://project/{name}", {
      list: async () => {
        const projects = await listProjects();
        return { resources: projects };
      },
      complete: {
        name: async (value) => completeProjectName(value)
      }
    }),
    { description: "Tasks in a specific OmniFocus project", mimeType: "application/json" },
    async (uri, variables) => readProject(uri, variables, logger)
  );

  server.resource(
    "perspective",
    new ResourceTemplate("omnifocus://perspective/{name}", {
      list: async () => {
        const perspectives = await listAllPerspectives();
        return { resources: perspectives };
      },
      complete: {
        name: async (value) => completePerspectiveName(value)
      }
    }),
    { description: "Items visible in a named OmniFocus perspective", mimeType: "application/json" },
    async (uri, variables) => readPerspective(uri, variables, logger)
  );

  logger.info("resources", "Registered 4 fixed resources and 2 resource templates");
}
