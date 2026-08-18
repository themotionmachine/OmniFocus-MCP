import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { JXA_FORMAT_DATE_SOURCE } from '../../utils/dateSerialization.js';

// Escape user-provided strings before embedding in JXA script template literals.
// Prevents syntax errors and code injection from characters like " \ newlines.
function escapeJXA(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

// OmniJS `Project` forwards most of its root task's properties (name, note,
// flagged, dueDate, deferDate, tags, completionDate, dropDate...) but NOT
// `added`/`modified` — reading those off a Project yields `undefined`, which
// silently matched nothing. Route them through the root task instead. Verified
// against the live OmniFocus 4.x database: 0/43 projects had `.added`, 43/43 had
// `.task.added`.
const PROJECT_ADDED_EXPR = 'item.task ? item.task.added : null';
const PROJECT_MODIFIED_EXPR = 'item.task ? item.task.modified : null';

// An empty note makes `item.note && ...` evaluate to "" rather than false, so the
// strict `hasNote !== false` comparison below rejected every item and
// `hasNote: false` returned nothing. Coerce before comparing.
const HAS_NOTE_EXPR = 'Boolean(item.note && item.note.trim().length > 0)';

// OmniJS has no `container` property at all — the containing folder is `parent`.
// Both the `path` field and `parentFolderID` read `container`, so `path` fell
// through to the bare name for every folder and `parentFolderID` (which had no
// branch of its own) defaulted to null. Neither errored; both just quietly
// described a flat database. Verified live against OmniFocus 4.x: 0/17 folders,
// 0/970 tasks and 0/81 projects had `.container`, while 9/17 folders had a
// `.parent` (issue #95).
//
// Walk the chain rather than reading one level up: nesting deeper than one folder
// is real (`PhD/Dissertation/Project 3` in the database this was verified
// against), and `container.name + "/" + item.name` could not have produced a
// depth-2 path even if `container` had existed. `parent` is null at the top
// level, which terminates the loop.
const FOLDER_PATH_EXPR =
  '(() => { const segments = []; let node = item; while (node) { segments.unshift(node.name); node = node.parent; } return segments.join("/"); })()';

// Matches omnifocusDump.js, which has read folder parentage correctly all along —
// dump_database reported the hierarchy while query_omnifocus flattened it.
const FOLDER_PARENT_ID_EXPR = 'item.parent ? item.parent.id.primaryKey : null';

/**
 * Repetition rule readback (issue #115).
 *
 * `Task.RepetitionRule` has no useful `toString()` — it renders as the literal
 * "[object Task.RepetitionRule]", which is what this field emitted before,
 * telling the caller nothing about the rule. The real data is on two
 * properties: the ICS recurrence string, and a method constant that
 * stringifies as "[object Task.RepetitionMethod: DeferUntilDate]". Strip the
 * wrapper so callers get a bare name they can compare and round-trip.
 */
const REPETITION_RULE_EXPR = 'item.repetitionRule ? item.repetitionRule.ruleString : null';
const REPETITION_METHOD_EXPR =
  'item.repetitionRule ? String(item.repetitionRule.method).replace(/^\\[object Task\\.RepetitionMethod: |\\]$/g, "") : null';

export interface QueryOmnifocusParams {
  entity: 'tasks' | 'projects' | 'folders';
  filters?: {
    projectId?: string;
    projectName?: string;
    taskName?: string;
    folderId?: string;
    folderName?: string;
    tags?: string[];
    status?: string[];
    flagged?: boolean;
    dueWithin?: number;
    deferredUntil?: number;
    plannedWithin?: number;
    hasNote?: boolean;
    inbox?: boolean;
    dueOn?: number;
    deferOn?: number;
    plannedOn?: number;
    addedWithin?: number;
    addedOn?: number;
    isRepeating?: boolean;
    completedWithin?: number;
    completedOn?: number;
    droppedWithin?: number;
    droppedOn?: number;
    reviewDue?: boolean;
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
  items?: any[];
  count?: number;
  error?: string;
}

export async function queryOmnifocus(params: QueryOmnifocusParams): Promise<QueryResult> {
  try {
    // Create JXA script for the query
    const jxaScript = generateQueryScript(params);
    
    // randomUUID, not Date.now(): parallel queries (e.g. the today resource)
    // land in the same millisecond and would clobber each other's temp file
    const tempFile = `/tmp/omnifocus_query_${crypto.randomUUID()}.js`;
    const fs = await import('fs');
    fs.writeFileSync(tempFile, jxaScript);
    
    // Execute the script
    const result = await executeOmniFocusScript(tempFile);
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
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
  }
}

function generateQueryScript(params: QueryOmnifocusParams): string {
  const { entity, filters = {}, fields, limit, sortBy, sortOrder, includeCompleted = false, summary = false } = params;

  // Build the JXA script based on the entity type and filters
  return `(() => {
    try {
      const startTime = new Date();
      
      // Helper function to format dates — injected from src/utils/dateSerialization.ts
      // so this and the human-readable formatter cannot disagree (#91).
      ${JXA_FORMAT_DATE_SOURCE}
      
      // Helper to check date filters
      function checkDateFilter(itemDate, daysFromNow) {
        if (!itemDate) return false;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysFromNow);
        return itemDate <= futureDate;
      }

      // Helper to check if date is within last N days (backward-looking)
      function checkDateWithinPast(itemDate, daysAgo) {
        if (!itemDate) return false;
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - daysAgo);
        pastDate.setHours(0, 0, 0, 0);
        return itemDate >= pastDate;
      }

      // Helper to check exact day match
      function checkSameDay(itemDate, daysFromNow) {
        if (!itemDate) return false;
        const target = new Date();
        target.setDate(target.getDate() + daysFromNow);
        return itemDate.getFullYear() === target.getFullYear() &&
               itemDate.getMonth() === target.getMonth() &&
               itemDate.getDate() === target.getDate();
      }
      
      function formatReviewInterval(ri) {
        if (!ri) return null;
        const parts = [];
        if (ri.years && ri.years > 0) parts.push(ri.years === 1 ? "1 year" : ri.years + " years");
        if (ri.months && ri.months > 0) parts.push(ri.months === 1 ? "1 month" : ri.months + " months");
        if (ri.weeks && ri.weeks > 0) parts.push(ri.weeks === 1 ? "1 week" : ri.weeks + " weeks");
        if (ri.days && ri.days > 0) parts.push(ri.days === 1 ? "1 day" : ri.days + " days");
        return parts.length > 0 ? parts.join(", ") : null;
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
      
      // Helper to collect all descendant folder IDs by walking down from a folder.
      // parentFolder is unreliable on flattenedFolders, so we walk children instead.
      function collectDescendantFolderIds(folder, idSet) {
        idSet.add(folder.id.primaryKey);
        var children = folder.folders;
        for (var i = 0; i < children.length; i++) {
          collectDescendantFolderIds(children[i], idSet);
        }
      }

      // Check if any ancestor folder is dropped.
      // OmniJS doesn't expose effectivelyDropped on projects, so we walk up manually.
      function isAncestorFolderDropped(project) {
        var folder = project.parentFolder;
        while (folder) {
          if (folder.status === Folder.Status.Dropped) return true;
          folder = folder.parentFolder;
        }
        return false;
      }

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

      ${filters.folderId || filters.folderName ? `
      // Pre-compute the set of folder IDs that are the target(s) or their
      // descendants. _folderIdSet is referenced by the filter conditions emitted
      // from generateFilterConditions(). folderId (exact) takes precedence over
      // folderName (case-insensitive partial, may match several folders — #107).
      const _folderIdSet = new Set();
      ${filters.folderId ? `
      const _targetFolderId = "${escapeJXA(filters.folderId)}";
      for (var _fi = 0; _fi < flattenedFolders.length; _fi++) {
        if (flattenedFolders[_fi].id.primaryKey === _targetFolderId) {
          collectDescendantFolderIds(flattenedFolders[_fi], _folderIdSet);
          break;
        }
      }` : `
      const _targetFolderName = "${escapeJXA(filters.folderName!.toLowerCase())}";
      for (var _fi = 0; _fi < flattenedFolders.length; _fi++) {
        if (flattenedFolders[_fi].name.toLowerCase().includes(_targetFolderName)) {
          collectDescendantFolderIds(flattenedFolders[_fi], _folderIdSet);
        }
      }`}
      ` : ''}
      
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
                item.status === Project.Status.Dropped ||
                isAncestorFolderDropped(item)) {
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

function generateFilterConditions(entity: string, filters: any): string {
  const conditions: string[] = [];
  
  if (entity === 'tasks') {
    if (filters.projectName) {
      const safeName = escapeJXA(filters.projectName.toLowerCase());
      conditions.push(`
        if (item.containingProject) {
          const projectName = item.containingProject.name.toLowerCase();
          if (!projectName.includes("${safeName}")) return false;
        } else if ("${safeName}" !== "inbox") {
          return false;
        }
      `);
    }

    if (filters.taskName) {
      const safeName = escapeJXA(filters.taskName.toLowerCase());
      conditions.push(`
        const taskName = (item.name || "").toLowerCase();
        if (!taskName.includes("${safeName}")) return false;
      `);
    }

    if (filters.projectId) {
      const safeId = escapeJXA(filters.projectId);
      // Match either the AppleScript-namespace id (project's root task id) or
      // the OmniJS Project id — the two namespaces differ for projects.
      conditions.push(`
        if (!item.containingProject ||
            (item.containingProject.task.id.primaryKey !== "${safeId}" &&
             item.containingProject.id.primaryKey !== "${safeId}")) {
          return false;
        }
      `);
    }

    if (filters.folderId || filters.folderName) {
      // Both resolve to the pre-computed _folderIdSet; folderName differs only
      // in how the set is seeded (name match, possibly several folders — #107).
      conditions.push(`
        {
          let matchesFolder = false;
          if (item.containingProject && item.containingProject.parentFolder) {
            matchesFolder = _folderIdSet.has(item.containingProject.parentFolder.id.primaryKey);
          }
          if (!matchesFolder) return false;
        }
      `);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagCondition = filters.tags.map((tag: string) =>
        `item.tags.some(t => t.name === "${escapeJXA(tag)}")`
      ).join(' || ');
      conditions.push(`if (!(${tagCondition})) return false;`);
    }

    if (filters.status && filters.status.length > 0) {
      const statusCondition = filters.status.map((status: string) =>
        `taskStatusMap[item.taskStatus] === "${escapeJXA(status)}"`
      ).join(' || ');
      conditions.push(`if (!(${statusCondition})) return false;`);
    }
    
    if (filters.flagged !== undefined) {
      conditions.push(`if (item.flagged !== ${filters.flagged}) return false;`);
    }
    
    if (filters.dueWithin !== undefined) {
      conditions.push(`
        if (!item.dueDate || !checkDateFilter(item.dueDate, ${filters.dueWithin})) {
          return false;
        }
      `);
    }

    if (filters.plannedWithin !== undefined) {
      conditions.push(`
        if (!item.plannedDate || !checkDateFilter(item.plannedDate, ${filters.plannedWithin})) {
          return false;
        }
      `);
    }

    if (filters.deferredUntil !== undefined) {
      conditions.push(`
        if (!item.deferDate || !checkDateFilter(item.deferDate, ${filters.deferredUntil})) {
          return false;
        }
      `);
    }

    if (filters.dueOn !== undefined) {
      conditions.push(`if (!checkSameDay(item.dueDate, ${filters.dueOn})) return false;`);
    }

    if (filters.deferOn !== undefined) {
      conditions.push(`if (!checkSameDay(item.deferDate, ${filters.deferOn})) return false;`);
    }

    if (filters.plannedOn !== undefined) {
      conditions.push(`if (!checkSameDay(item.plannedDate, ${filters.plannedOn})) return false;`);
    }

    if (filters.addedWithin !== undefined) {
      conditions.push(`
        if (!item.added || !checkDateWithinPast(item.added, ${filters.addedWithin})) {
          return false;
        }
      `);
    }

    if (filters.addedOn !== undefined) {
      conditions.push(`if (!checkSameDay(item.added, ${filters.addedOn})) return false;`);
    }

    if (filters.isRepeating !== undefined) {
      if (filters.isRepeating) {
        conditions.push(`if (item.repetitionRule === null) return false;`);
      } else {
        conditions.push(`if (item.repetitionRule !== null) return false;`);
      }
    }

    if (filters.completedWithin !== undefined) {
      conditions.push(`
        if (!item.completionDate || !checkDateWithinPast(item.completionDate, ${filters.completedWithin})) {
          return false;
        }
      `);
    }

    if (filters.completedOn !== undefined) {
      conditions.push(`if (!checkSameDay(item.completionDate, ${filters.completedOn})) return false;`);
    }

    if (filters.droppedWithin !== undefined) {
      conditions.push(`
        if (!item.dropDate || !checkDateWithinPast(item.dropDate, ${filters.droppedWithin})) {
          return false;
        }
      `);
    }

    if (filters.droppedOn !== undefined) {
      conditions.push(`if (!checkSameDay(item.dropDate, ${filters.droppedOn})) return false;`);
    }

    if (filters.hasNote !== undefined) {
      conditions.push(`
        const hasNote = ${HAS_NOTE_EXPR};
        if (hasNote !== ${filters.hasNote}) return false;
      `);
    }

    if (filters.inbox !== undefined) {
      if (filters.inbox) {
        conditions.push(`if (!item.inInbox) return false;`);
      } else {
        conditions.push(`if (item.inInbox) return false;`);
      }
    }
  }
  
  if (entity === 'projects') {
    if (filters.projectId) {
      const safeId = escapeJXA(filters.projectId);
      // Match either the AppleScript-namespace id (project's root task id) or
      // the OmniJS Project id — the two namespaces differ for projects.
      conditions.push(`
        if (item.task.id.primaryKey !== "${safeId}" &&
            item.id.primaryKey !== "${safeId}") {
          return false;
        }
      `);
    }

    if (filters.projectName) {
      const safeName = escapeJXA(filters.projectName.toLowerCase());
      conditions.push(`
        if (!item.name.toLowerCase().includes("${safeName}")) {
          return false;
        }
      `);
    }

    if (filters.folderId || filters.folderName) {
      conditions.push(`
        {
          let matchesFolder = false;
          if (item.parentFolder) {
            matchesFolder = _folderIdSet.has(item.parentFolder.id.primaryKey);
          }
          if (!matchesFolder) return false;
        }
      `);
    }

    if (filters.status && filters.status.length > 0) {
      const statusCondition = filters.status.map((status: string) =>
        `projectStatusMap[item.status] === "${escapeJXA(status)}"`
      ).join(' || ');
      conditions.push(`if (!(${statusCondition})) return false;`);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagCondition = filters.tags.map((tag: string) =>
        `_projectTags.some(t => t.name === "${escapeJXA(tag)}")`
      ).join(' || ');
      conditions.push(`
        {
          const _projectTags = item.tags || [];
          if (!(${tagCondition})) return false;
        }
      `);
    }

    if (filters.flagged !== undefined) {
      conditions.push(`if (item.flagged !== ${filters.flagged}) return false;`);
    }

    if (filters.dueWithin !== undefined) {
      conditions.push(`
        if (!item.dueDate || !checkDateFilter(item.dueDate, ${filters.dueWithin})) {
          return false;
        }
      `);
    }

    if (filters.deferredUntil !== undefined) {
      conditions.push(`
        if (!item.deferDate || !checkDateFilter(item.deferDate, ${filters.deferredUntil})) {
          return false;
        }
      `);
    }

    if (filters.dueOn !== undefined) {
      conditions.push(`if (!checkSameDay(item.dueDate, ${filters.dueOn})) return false;`);
    }

    if (filters.deferOn !== undefined) {
      conditions.push(`if (!checkSameDay(item.deferDate, ${filters.deferOn})) return false;`);
    }

    if (filters.hasNote !== undefined) {
      conditions.push(`
        {
          const hasNote = ${HAS_NOTE_EXPR};
          if (hasNote !== ${filters.hasNote}) return false;
        }
      `);
    }

    if (filters.addedWithin !== undefined) {
      conditions.push(`
        {
          const addedDate = ${PROJECT_ADDED_EXPR};
          if (!addedDate || !checkDateWithinPast(addedDate, ${filters.addedWithin})) {
            return false;
          }
        }
      `);
    }

    if (filters.addedOn !== undefined) {
      conditions.push(`
        {
          const addedDate = ${PROJECT_ADDED_EXPR};
          if (!checkSameDay(addedDate, ${filters.addedOn})) return false;
        }
      `);
    }

    if (filters.completedWithin !== undefined) {
      conditions.push(`
        if (!item.completionDate || !checkDateWithinPast(item.completionDate, ${filters.completedWithin})) {
          return false;
        }
      `);
    }

    if (filters.completedOn !== undefined) {
      conditions.push(`if (!checkSameDay(item.completionDate, ${filters.completedOn})) return false;`);
    }

    if (filters.droppedWithin !== undefined) {
      conditions.push(`
        if (!item.dropDate || !checkDateWithinPast(item.dropDate, ${filters.droppedWithin})) {
          return false;
        }
      `);
    }

    if (filters.droppedOn !== undefined) {
      conditions.push(`if (!checkSameDay(item.dropDate, ${filters.droppedOn})) return false;`);
    }

    if (filters.reviewDue !== undefined) {
      if (filters.reviewDue) {
        conditions.push(`
          {
            const reviewDate = item.nextReviewDate;
            if (!reviewDate) return false;
            const now = new Date();
            now.setHours(23, 59, 59, 999);
            if (reviewDate > now) return false;
          }
        `);
      } else {
        conditions.push(`
          {
            const reviewDate = item.nextReviewDate;
            if (reviewDate) {
              const now = new Date();
              now.setHours(23, 59, 59, 999);
              if (reviewDate <= now) return false;
            }
          }
        `);
      }
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
          plannedDate: formatDate(item.plannedDate),
          tagNames: item.tags ? item.tags.map(t => t.name) : [],
          projectName: item.containingProject ? item.containingProject.name : (item.inInbox ? "Inbox" : null),
          estimatedMinutes: item.estimatedMinutes || null,
          note: item.note || ""
        };
        return obj;
      `;
    } else if (entity === 'projects') {
      return `
        const taskArray = item.tasks || [];
        return {
          id: item.task.id.primaryKey,
          name: item.name || "",
          status: projectStatusMap[item.status] || "Unknown",
          folderName: item.parentFolder ? item.parentFolder.name : null,
          taskCount: taskArray.length,
          tagNames: item.tags ? item.tags.map(t => t.name) : [],
          flagged: item.flagged || false,
          dueDate: formatDate(item.dueDate),
          deferDate: formatDate(item.deferDate),
          note: item.note || "",
          nextReviewDate: formatDate(item.nextReviewDate),
          reviewInterval: formatReviewInterval(item.reviewInterval)
        };
      `;
    } else if (entity === 'folders') {
      return `
        const projectArray = item.projects || [];
        return {
          id: item.id.primaryKey,
          name: item.name || "",
          projectCount: projectArray.length,
          path: ${FOLDER_PATH_EXPR},
          parentFolderID: ${FOLDER_PARENT_ID_EXPR}
        };
      `;
    }
  }
  
  // Generate mapping for specific fields
  const mappings = fields!.map(field => {
    // Handle special field mappings based on entity type
    if (field === 'id') {
      // For projects, emit the root task id: it matches the AppleScript project id,
      // which edit_item/remove_item need (OmniJS Project ids live in a different
      // namespace — issue #77).
      return entity === 'projects'
        ? `id: item.task.id.primaryKey`
        : `id: item.id.primaryKey`;
    } else if (field === 'taskStatus') {
      return `taskStatus: taskStatusMap[item.taskStatus]`;
    } else if (field === 'status') {
      return `status: projectStatusMap[item.status]`;
    } else if (field === 'modificationDate' || field === 'modified') {
      return entity === 'projects'
        ? `modificationDate: formatDate(${PROJECT_MODIFIED_EXPR})`
        : `modificationDate: formatDate(item.modified)`;
    } else if (field === 'creationDate' || field === 'added') {
      return entity === 'projects'
        ? `creationDate: formatDate(${PROJECT_ADDED_EXPR})`
        : `creationDate: formatDate(item.added)`;
    } else if (field === 'completionDate') {
      return `completionDate: item.completionDate ? formatDate(item.completionDate) : null`;
    } else if (field === 'dropDate') {
      return `dropDate: item.dropDate ? formatDate(item.dropDate) : null`;
    } else if (field === 'effectiveDropDate') {
      return `effectiveDropDate: item.effectiveDropDate ? formatDate(item.effectiveDropDate) : null`;
    } else if (field === 'dueDate') {
      return `dueDate: formatDate(item.dueDate)`;
    } else if (field === 'deferDate') {
      return `deferDate: formatDate(item.deferDate)`;
    } else if (field === 'plannedDate') {
      return `plannedDate: formatDate(item.plannedDate)`;
    } else if (field === 'effectiveDueDate') {
      return `effectiveDueDate: formatDate(item.effectiveDueDate)`;
    } else if (field === 'effectiveDeferDate') {
      return `effectiveDeferDate: formatDate(item.effectiveDeferDate)`;
    } else if (field === 'effectivePlannedDate') {
      return `effectivePlannedDate: formatDate(item.effectivePlannedDate)`;
    } else if (field === 'tagNames') {
      return `tagNames: item.tags ? item.tags.map(t => t.name) : []`;
    } else if (field === 'tags') {
      return `tags: item.tags ? item.tags.map(t => t.id.primaryKey) : []`;
    } else if (field === 'projectName') {
      return `projectName: item.containingProject ? item.containingProject.name : (item.inInbox ? "Inbox" : null)`;
    } else if (field === 'projectId') {
      return `projectId: item.containingProject ? item.containingProject.task.id.primaryKey : null`;
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
      return `projects: item.projects ? item.projects.map(p => p.task.id.primaryKey) : []`;
    } else if (field === 'subfolders') {
      return `subfolders: item.folders ? item.folders.map(f => f.id.primaryKey) : []`;
    } else if (field === 'parentFolderID') {
      return `parentFolderID: ${FOLDER_PARENT_ID_EXPR}`;
    } else if (field === 'path') {
      // `path` is documented as a folder field. Tasks and projects have a
      // `parent`/`parentFolder` chain too, but walking it would invent an
      // undocumented meaning for them, so they keep returning the bare name —
      // which is what the broken `container` expression already gave them.
      return entity === 'folders'
        ? `path: ${FOLDER_PATH_EXPR}`
        : `path: item.name`;
    } else if (field === 'isRepeating') {
      return `isRepeating: item.repetitionRule !== null`;
    } else if (field === 'repetitionRule') {
      return `repetitionRule: ${REPETITION_RULE_EXPR}`;
    } else if (field === 'repetitionMethod') {
      return `repetitionMethod: ${REPETITION_METHOD_EXPR}`;
    } else if (field === 'sequential') {
      // Both Task and Project expose a `sequential` Boolean in OmniJS. Coerce so an
      // unexpected null/undefined surfaces as false rather than leaking through.
      return `sequential: Boolean(item.sequential)`;
    } else if (field === 'estimatedMinutes') {
      return `estimatedMinutes: item.estimatedMinutes || null`;
    } else if (field === 'nextReviewDate') {
      return `nextReviewDate: formatDate(item.nextReviewDate)`;
    } else if (field === 'reviewInterval') {
      return `reviewInterval: formatReviewInterval(item.reviewInterval)`;
    } else if (field === 'note') {
      return `note: item.note || ""`;
    } else {
      // Default: try to access the field directly
      return `${field}: item.${field} !== undefined ? item.${field} : null`;
    }
  }).join(',\n          ');
  
  return `
    return {
      ${mappings}
    };
  `;
}

// Exported for testing only - not part of the public API
export const _testExports = {
  escapeJXA,
  generateFilterConditions,
  generateFieldMapping,
  generateQueryScript,
};