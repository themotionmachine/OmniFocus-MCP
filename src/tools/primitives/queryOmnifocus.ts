import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

export interface QueryOmnifocusParams {
  entity: 'tasks' | 'projects' | 'folders';
  filters?: {
    projectId?: string;
    projectName?: string;
    folderId?: string;
    tags?: string[];
    status?: string[];
    flagged?: boolean;
    dueWithin?: number;
    deferredUntil?: number;
    hasNote?: boolean;
  };
  fields?: string[];
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeCompleted?: boolean;
  summary?: boolean;
}

interface QueryResult {
  success: boolean;
  items?: unknown[] | undefined;
  count?: number | undefined;
  error?: string | undefined;
}

export async function queryOmnifocus(params: QueryOmnifocusParams): Promise<QueryResult> {
  const jxaScript = generateQueryScript(params);
  const tempFile = writeSecureTempFile(jxaScript, 'omnifocus_query', '.js');

  try {
    const result = (await executeOmniFocusScript(tempFile.path)) as {
      error?: string;
      items?: unknown[];
      count?: number;
    };

    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }

    return {
      success: true,
      items: params.summary ? undefined : result.items,
      count: result.count
    };
  } catch (error) {
    console.error('Error querying OmniFocus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  } finally {
    tempFile.cleanup();
  }
}

function generateQueryScript(params: QueryOmnifocusParams): string {
  const {
    entity,
    filters = {},
    fields,
    limit,
    sortBy,
    sortOrder,
    includeCompleted = false,
    summary = false
  } = params;

  // Build the JXA script based on the entity type and filters
  return `(() => {
    try {
      const startTime = new Date();

      // Helper function to format dates
      function formatDate(date) {
        if (!date) return null;
        return date.toISOString();
      }

      // Helper to check date filters
      function checkDateFilter(itemDate, daysFromNow) {
        if (!itemDate) return false;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysFromNow);
        return itemDate <= futureDate;
      }

      // Status mappings
      const taskStatusMap = {
        [Task.Status.Available]: "Available",
        [Task.Status.Blocked]: "Blocked",
        [Task.Status.Completed]: "Completed",
        [Task.Status.Dropped]: "Dropped",
        [Task.Status.DueSoon]: "DueSoon",
        [Task.Status.Next]: "Next",
        [Task.Status.Overdue]: "Overdue"
      };

      const projectStatusMap = {
        [Project.Status.Active]: "Active",
        [Project.Status.Done]: "Done",
        [Project.Status.Dropped]: "Dropped",
        [Project.Status.OnHold]: "OnHold"
      };

      // Get the appropriate collection based on entity type
      let items = [];
      const entityType = "${entity}";

      if (entityType === "tasks") {
        items = flattenedTasks;
      } else if (entityType === "projects") {
        items = flattenedProjects;
      } else if (entityType === "folders") {
        items = flattenedFolders;
      }

      // Apply filters
      let filtered = items.filter(item => {
        // Skip completed/dropped unless explicitly requested
        if (!${includeCompleted}) {
          if (entityType === "tasks") {
            if (item.taskStatus === Task.Status.Completed ||
                item.taskStatus === Task.Status.Dropped) {
              return false;
            }
          } else if (entityType === "projects") {
            if (item.status === Project.Status.Done ||
                item.status === Project.Status.Dropped) {
              return false;
            }
          }
        }

        // Apply specific filters
        ${generateFilterConditions(entity, filters)}

        return true;
      });

      // Apply sorting if specified
      ${sortBy ? generateSortLogic(sortBy, sortOrder) : ''}

      // Apply limit if specified
      ${limit ? `filtered = filtered.slice(0, ${limit});` : ''}

      // If summary mode, just return count
      if (${summary}) {
        return JSON.stringify({
          count: filtered.length,
          error: null
        });
      }

      // Transform items to return only requested fields
      const results = filtered.map(item => {
        ${generateFieldMapping(entity, fields)}
      });

      return JSON.stringify({
        items: results,
        count: results.length,
        error: null
      });

    } catch (error) {
      return JSON.stringify({
        error: "Script execution error: " + error.toString(),
        items: [],
        count: 0
      });
    }
  })();`;
}

function generateFilterConditions(
  entity: string,
  filters: QueryOmnifocusParams['filters']
): string {
  const conditions: string[] = [];

  if (entity === 'tasks') {
    if (filters?.projectName) {
      conditions.push(`
        if (item.containingProject) {
          const projectName = item.containingProject.name.toLowerCase();
          if (!projectName.includes("${filters.projectName.toLowerCase()}")) return false;
        } else if ("${filters.projectName.toLowerCase()}" !== "inbox") {
          return false;
        }
      `);
    }

    if (filters?.projectId) {
      conditions.push(`
        if (!item.containingProject ||
            item.containingProject.id.primaryKey !== "${filters.projectId}") {
          return false;
        }
      `);
    }

    if (filters?.tags && filters.tags.length > 0) {
      const tagCondition = filters.tags
        .map((tag: string) => `item.tags.some(t => t.name === "${tag}")`)
        .join(' || ');
      conditions.push(`if (!(${tagCondition})) return false;`);
    }

    if (filters?.status && filters.status.length > 0) {
      const statusCondition = filters.status
        .map((status: string) => `taskStatusMap[item.taskStatus] === "${status}"`)
        .join(' || ');
      conditions.push(`if (!(${statusCondition})) return false;`);
    }

    if (filters?.flagged !== undefined) {
      conditions.push(`if (item.flagged !== ${filters.flagged}) return false;`);
    }

    if (filters?.dueWithin !== undefined) {
      conditions.push(`
        if (!item.dueDate || !checkDateFilter(item.dueDate, ${filters.dueWithin})) {
          return false;
        }
      `);
    }

    if (filters?.hasNote !== undefined) {
      conditions.push(`
        const hasNote = item.note && item.note.trim().length > 0;
        if (hasNote !== ${filters.hasNote}) return false;
      `);
    }
  }

  if (entity === 'projects') {
    if (filters?.folderId) {
      conditions.push(`
        if (!item.parentFolder ||
            item.parentFolder.id.primaryKey !== "${filters.folderId}") {
          return false;
        }
      `);
    }

    if (filters?.status && filters.status.length > 0) {
      const statusCondition = filters.status
        .map((status: string) => `projectStatusMap[item.status] === "${status}"`)
        .join(' || ');
      conditions.push(`if (!(${statusCondition})) return false;`);
    }
  }

  return conditions.join('\n');
}

function generateSortLogic(sortBy: string, sortOrder?: string): string {
  const order = sortOrder === 'desc' ? -1 : 1;

  return `
    filtered.sort((a, b) => {
      let aVal = a.${sortBy};
      let bVal = b.${sortBy};

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare based on type
      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * ${order};
      } else if (aVal instanceof Date) {
        return (aVal.getTime() - bVal.getTime()) * ${order};
      } else {
        return (aVal - bVal) * ${order};
      }
    });
  `;
}

function generateFieldMapping(entity: string, fields?: string[]): string {
  // If no specific fields requested, return common fields based on entity
  if (!fields || fields.length === 0) {
    if (entity === 'tasks') {
      return `
        const obj = {
          id: item.id.primaryKey,
          name: item.name || "",
          flagged: item.flagged || false,
          taskStatus: taskStatusMap[item.taskStatus] || "Unknown",
          dueDate: formatDate(item.dueDate),
          deferDate: formatDate(item.deferDate),
          tagNames: item.tags ? item.tags.map(t => t.name) : [],
          projectName: item.containingProject ? item.containingProject.name : (item.inInbox ? "Inbox" : null),
          estimatedMinutes: item.estimatedMinutes || null
        };
        if (item.note && item.note.trim()) obj.note = item.note;
        return obj;
      `;
    } else if (entity === 'projects') {
      return `
        const taskArray = item.tasks || [];
        return {
          id: item.id.primaryKey,
          name: item.name || "",
          status: projectStatusMap[item.status] || "Unknown",
          folderName: item.parentFolder ? item.parentFolder.name : null,
          taskCount: taskArray.length,
          flagged: item.flagged || false,
          dueDate: formatDate(item.dueDate),
          deferDate: formatDate(item.deferDate)
        };
      `;
    } else if (entity === 'folders') {
      return `
        const projectArray = item.projects || [];
        return {
          id: item.id.primaryKey,
          name: item.name || "",
          projectCount: projectArray.length,
          path: item.container ? item.container.name + "/" + item.name : item.name
        };
      `;
    }
  }

  // Generate mapping for specific fields
  const mappings = fields
    ?.map((field) => {
      // Handle special field mappings based on entity type
      if (field === 'id') {
        return `id: item.id.primaryKey`;
      } else if (field === 'taskStatus') {
        return `taskStatus: taskStatusMap[item.taskStatus]`;
      } else if (field === 'status') {
        return `status: projectStatusMap[item.status]`;
      } else if (field === 'modificationDate' || field === 'modified') {
        return `modificationDate: formatDate(item.modified)`;
      } else if (field === 'creationDate' || field === 'added') {
        return `creationDate: formatDate(item.added)`;
      } else if (field === 'completionDate') {
        return `completionDate: item.completionDate ? formatDate(item.completionDate) : null`;
      } else if (field === 'dueDate') {
        return `dueDate: formatDate(item.dueDate)`;
      } else if (field === 'deferDate') {
        return `deferDate: formatDate(item.deferDate)`;
      } else if (field === 'effectiveDueDate') {
        return `effectiveDueDate: formatDate(item.effectiveDueDate)`;
      } else if (field === 'effectiveDeferDate') {
        return `effectiveDeferDate: formatDate(item.effectiveDeferDate)`;
      } else if (field === 'tagNames') {
        return `tagNames: item.tags ? item.tags.map(t => t.name) : []`;
      } else if (field === 'tags') {
        return `tags: item.tags ? item.tags.map(t => t.id.primaryKey) : []`;
      } else if (field === 'projectName') {
        return `projectName: item.containingProject ? item.containingProject.name : (item.inInbox ? "Inbox" : null)`;
      } else if (field === 'projectId') {
        return `projectId: item.containingProject ? item.containingProject.id.primaryKey : null`;
      } else if (field === 'parentId') {
        return `parentId: item.parent ? item.parent.id.primaryKey : null`;
      } else if (field === 'childIds') {
        return `childIds: item.children ? item.children.map(c => c.id.primaryKey) : []`;
      } else if (field === 'hasChildren') {
        return `hasChildren: item.children ? item.children.length > 0 : false`;
      } else if (field === 'folderName') {
        return `folderName: item.parentFolder ? item.parentFolder.name : null`;
      } else if (field === 'folderID') {
        return `folderID: item.parentFolder ? item.parentFolder.id.primaryKey : null`;
      } else if (field === 'taskCount') {
        return `taskCount: item.tasks ? item.tasks.length : 0`;
      } else if (field === 'tasks') {
        return `tasks: item.tasks ? item.tasks.map(t => t.id.primaryKey) : []`;
      } else if (field === 'projectCount') {
        return `projectCount: item.projects ? item.projects.length : 0`;
      } else if (field === 'projects') {
        return `projects: item.projects ? item.projects.map(p => p.id.primaryKey) : []`;
      } else if (field === 'subfolders') {
        return `subfolders: item.folders ? item.folders.map(f => f.id.primaryKey) : []`;
      } else if (field === 'path') {
        return `path: item.container ? item.container.name + "/" + item.name : item.name`;
      } else if (field === 'estimatedMinutes') {
        return `estimatedMinutes: item.estimatedMinutes || null`;
      } else {
        // Default: try to access the field directly
        return `${field}: item.${field} !== undefined ? item.${field} : null`;
      }
    })
    .join(',\n          ');

  return `
    return {
      ${mappings}
    };
  `;
}
