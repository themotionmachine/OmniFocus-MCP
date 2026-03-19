#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as addAttachmentTool from './tools/definitions/addAttachment.js';
import * as addFolderTool from './tools/definitions/addFolder.js';
import * as addLinkedFileTool from './tools/definitions/addLinkedFile.js';
import * as addNotificationTool from './tools/definitions/addNotification.js';
import * as addOmniFocusTaskTool from './tools/definitions/addOmniFocusTask.js';
import * as addProjectTool from './tools/definitions/addProject.js';
import * as addStandardNotificationsTool from './tools/definitions/addStandardNotifications.js';
import * as appendNoteTool from './tools/definitions/appendNote.js';
import * as assignTagsTool from './tools/definitions/assignTags.js';
import * as batchAddItemsTool from './tools/definitions/batchAddItems.js';
import * as batchRemoveItemsTool from './tools/definitions/batchRemoveItems.js';
import * as batchUpdateTasksTool from './tools/definitions/batchUpdateTasks.js';
import * as clearRepetitionTool from './tools/definitions/clearRepetition.js';
import * as collapseItemsTool from './tools/definitions/collapseItems.js';
import * as collapseNotesTool from './tools/definitions/collapseNotes.js';
import * as convertTasksToProjectsTool from './tools/definitions/convertTasksToProjects.js';
import * as createProjectTool from './tools/definitions/createProject.js';
import * as createTagTool from './tools/definitions/createTag.js';
import * as deleteProjectTool from './tools/definitions/deleteProject.js';
import * as deleteTagTool from './tools/definitions/deleteTag.js';
// Import tool definitions
import * as dropItemsTool from './tools/definitions/dropItems.js';
import * as dumpDatabaseTool from './tools/definitions/dumpDatabase.js';
import * as duplicateSectionsTool from './tools/definitions/duplicateSections.js';
import * as duplicateTasksTool from './tools/definitions/duplicateTasks.js';
import * as editFolderTool from './tools/definitions/editFolder.js';
import * as editItemTool from './tools/definitions/editItem.js';
import * as editProjectTool from './tools/definitions/editProject.js';
import * as editTagTool from './tools/definitions/editTag.js';
import * as expandItemsTool from './tools/definitions/expandItems.js';
import * as expandNotesTool from './tools/definitions/expandNotes.js';
import * as focusItemsTool from './tools/definitions/focusItems.js';
import * as getForecastDayTool from './tools/definitions/getForecastDay.js';
import * as getForecastRangeTool from './tools/definitions/getForecastRange.js';
import * as getNextTaskTool from './tools/definitions/getNextTask.js';
import * as getPerspectiveViewTool from './tools/definitions/getPerspectiveView.js';
import * as getProjectTool from './tools/definitions/getProject.js';
import * as getProjectsForReviewTool from './tools/definitions/getProjectsForReview.js';
import * as getRepetitionTool from './tools/definitions/getRepetition.js';
import * as getTaskTool from './tools/definitions/getTask.js';
import * as listAttachmentsTool from './tools/definitions/listAttachments.js';
import * as listFoldersTool from './tools/definitions/listFolders.js';
import * as listLinkedFilesTool from './tools/definitions/listLinkedFiles.js';
import * as listNotificationsTool from './tools/definitions/listNotifications.js';
import * as listPerspectivesTool from './tools/definitions/listPerspectives.js';
import * as listProjectsTool from './tools/definitions/listProjects.js';
import * as listTagsTool from './tools/definitions/listTags.js';
import * as listTasksTool from './tools/definitions/listTasks.js';
import * as markCompleteTool from './tools/definitions/markComplete.js';
import * as markIncompleteTool from './tools/definitions/markIncomplete.js';
import * as markReviewedTool from './tools/definitions/markReviewed.js';
import * as moveFolderTool from './tools/definitions/moveFolder.js';
import * as moveProjectTool from './tools/definitions/moveProject.js';
import * as moveSectionsTool from './tools/definitions/moveSections.js';
import * as moveTasksTool from './tools/definitions/moveTasks.js';
import * as queryOmniFocusTool from './tools/definitions/queryOmnifocus.js';
import * as removeAttachmentTool from './tools/definitions/removeAttachment.js';
import * as removeFolderTool from './tools/definitions/removeFolder.js';
import * as removeItemTool from './tools/definitions/removeItem.js';
import * as removeNotificationTool from './tools/definitions/removeNotification.js';
import * as removeTagsTool from './tools/definitions/removeTags.js';
import * as revealItemsTool from './tools/definitions/revealItems.js';
import * as selectForecastDaysTool from './tools/definitions/selectForecastDays.js';
import * as selectItemsTool from './tools/definitions/selectItems.js';
import * as setAdvancedRepetitionTool from './tools/definitions/setAdvancedRepetition.js';
import * as setCommonRepetitionTool from './tools/definitions/setCommonRepetition.js';
import * as setFloatingTimezoneTool from './tools/definitions/setFloatingTimezone.js';
import * as setPlannedDateTool from './tools/definitions/setPlannedDate.js';
import * as setProjectTypeTool from './tools/definitions/setProjectType.js';
import * as setRepetitionTool from './tools/definitions/setRepetition.js';
import * as setReviewIntervalTool from './tools/definitions/setReviewInterval.js';
import * as snoozeNotificationTool from './tools/definitions/snoozeNotification.js';
import * as unfocusTool from './tools/definitions/unfocus.js';
import { logger } from './utils/logger.js';

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

// Phase 3 Enhanced Task Management Tools
server.tool(
  'list_tasks',
  'List tasks from OmniFocus with comprehensive filtering. Supports filtering by project/folder, tags (AND/OR logic), status, flagged state, and date ranges (due, defer, planned, completed). Returns TaskSummary objects with essential task metadata.',
  listTasksTool.schema.shape,
  listTasksTool.handler
);

server.tool(
  'get_task',
  'Get detailed information about a single task by ID or name. Returns complete TaskFull object with all properties including notes, dates, flags, hierarchy info, and relationships.',
  getTaskTool.schema.shape,
  getTaskTool.handler
);

server.tool(
  'get_next_task',
  'Get the next available task in a sequential or parallel project. Returns full task details or a reason code when no task is available (completed or single-actions project).',
  getNextTaskTool.schema.shape,
  getNextTaskTool.handler
);

server.tool(
  'set_planned_date',
  'Set or clear the planned date for a task (OmniFocus v4.7+ feature). Pass an ISO 8601 date string to set, or null to clear. Supports lookup by ID or name.',
  setPlannedDateTool.schema.shape,
  setPlannedDateTool.handler
);

server.tool(
  'append_note',
  "Append text to a task's existing note. Preserves existing note content and adds new text with proper line separation. Supports lookup by ID or name.",
  appendNoteTool.schema.shape,
  appendNoteTool.handler
);

// Phase 4 Project Management Tools
server.tool(
  'list_projects',
  'List projects from OmniFocus with comprehensive filtering. Supports filtering by folder, status (Active/OnHold/Done/Dropped), review status (due/upcoming), flagged state, and date ranges (due, defer). Returns ProjectSummary objects with essential project metadata.',
  listProjectsTool.schema.shape,
  listProjectsTool.handler
);

server.tool(
  'get_project',
  'Get detailed information about a single project by ID or name. Returns complete ProjectFull object with all properties including notes, status, dates, review settings, hierarchy info, and relationships.',
  getProjectTool.schema.shape,
  getProjectTool.handler
);

server.tool(
  'create_project',
  'Create new projects with configurable settings. Supports folder placement, project type (sequential/single-actions), dates, review intervals, and all project properties. Auto-clears conflicting type flags.',
  createProjectTool.schema.shape,
  createProjectTool.handler
);

server.tool(
  'edit_project',
  'Modify existing project properties including status, type, dates, and review settings. Supports lookup by ID or name with disambiguation. Auto-clears conflicting type properties.',
  editProjectTool.schema.shape,
  editProjectTool.handler
);

server.tool(
  'delete_project',
  'Delete a project from OmniFocus by ID or name. Automatically removes all child tasks (cascade delete). Returns confirmation message with task count.',
  deleteProjectTool.schema.shape,
  deleteProjectTool.handler
);

server.tool(
  'move_project',
  'Move a project to a different folder or to the library root. Supports ID or name lookup with disambiguation, and precise positioning (beginning/ending or before/after a sibling project).',
  moveProjectTool.schema.shape,
  moveProjectTool.handler
);

// Phase 5 Review System Tools
server.tool(
  'get_projects_for_review',
  'Query projects due for GTD periodic review with filtering by date, folder, and status. Returns projects sorted by review urgency (most overdue first).',
  getProjectsForReviewTool.schema.shape,
  getProjectsForReviewTool.handler
);

server.tool(
  'get_repetition',
  'Get the repetition rule for a task or project, including ICS rule string, schedule type (v4.7+), anchor date (v4.7+), and catch-up setting (v4.7+)',
  getRepetitionTool.schema.shape,
  getRepetitionTool.handler
);

server.tool(
  'set_common_repetition',
  'Set a repetition rule using named presets (daily, weekdays, weekly, biweekly, monthly, monthly_last_day, quarterly, yearly)',
  setCommonRepetitionTool.schema.shape,
  setCommonRepetitionTool.handler
);

server.tool(
  'set_repetition',
  'Set a repetition rule on a task or project using an ICS recurrence string',
  setRepetitionTool.schema.shape,
  setRepetitionTool.handler
);

server.tool(
  'clear_repetition',
  'Remove the repetition rule from a task or project, making it non-recurring',
  clearRepetitionTool.schema.shape,
  clearRepetitionTool.handler
);

server.tool(
  'set_advanced_repetition',
  'Configure advanced v4.7+ repetition parameters (schedule type, anchor date, catch-up behavior) with read-then-merge',
  setAdvancedRepetitionTool.schema.shape,
  setAdvancedRepetitionTool.handler
);

server.tool(
  'mark_reviewed',
  'Mark one or more projects as reviewed, advancing nextReviewDate by the configured review interval. Supports batch operations with per-item success/failure reporting.',
  markReviewedTool.schema.shape,
  markReviewedTool.handler
);

server.tool(
  'set_project_type',
  'Set a project type to sequential, parallel, or single-actions. Handles mutual exclusion automatically (setting one type clears conflicting flags).',
  setProjectTypeTool.schema.shape,
  setProjectTypeTool.handler
);

server.tool(
  'mark_incomplete',
  'Reopen one or more completed or dropped tasks/projects. Auto-detects item state and uses the appropriate mechanism. Supports batch operations (1-100 items).',
  markIncompleteTool.schema.shape,
  markIncompleteTool.handler
);

server.tool(
  'set_review_interval',
  'Configure the review frequency for one or more projects, or disable reviews by setting interval to null. Supports batch operations with per-item results.',
  setReviewIntervalTool.schema.shape,
  setReviewIntervalTool.handler
);

// Phase 13 Status Tools
server.tool(
  'mark_complete',
  'Mark one or more tasks or projects as complete. Supports batch operations (1-100 items) with optional completion date for backdating. Returns per-item results with success/failure details.',
  markCompleteTool.schema.shape,
  markCompleteTool.handler
);

// Phase 6 Task Status Tools
server.tool(
  'drop_items',
  'Drop one or more tasks or projects (preserve in database, remove from active views). Requires OmniFocus 3.8+. For repeating tasks, controls whether all occurrences are stopped. Supports batch operations (1-100 items).',
  dropItemsTool.schema.shape,
  dropItemsTool.handler
);

server.tool(
  'set_floating_timezone',
  'Enable or disable floating timezone for a task or project. When enabled, dates follow the device timezone when traveling instead of being fixed to a specific timezone.',
  setFloatingTimezoneTool.schema.shape,
  setFloatingTimezoneTool.handler
);

// Notification tools
server.tool(
  'list_notifications',
  'List all notifications (reminders) on an OmniFocus task with kind-conditional fields (absoluteFireDate for Absolute, relativeFireOffset for DueRelative/DeferRelative)',
  listNotificationsTool.schema.shape,
  listNotificationsTool.handler
);

server.tool(
  'add_notification',
  'Add a notification to an OmniFocus task. Supports absolute (specific datetime) and relative (seconds offset from due date) types',
  addNotificationTool.schema.shape,
  addNotificationTool.handler
);

server.tool(
  'remove_notification',
  'Remove a notification from an OmniFocus task by its 0-based index. Call list_notifications first to get current indices',
  removeNotificationTool.schema.shape,
  removeNotificationTool.handler
);

server.tool(
  'add_standard_notifications',
  'Add preset notification patterns to an OmniFocus task (day_before, hour_before, 15_minutes, week_before, standard). Requires task to have an effective due date',
  addStandardNotificationsTool.schema.shape,
  addStandardNotificationsTool.handler
);

server.tool(
  'snooze_notification',
  'Postpone an Absolute notification on an OmniFocus task by setting a new fire datetime. Only works on Absolute kind notifications',
  snoozeNotificationTool.schema.shape,
  snoozeNotificationTool.handler
);

// Phase 15 Forecast Tools
server.tool(
  'get_forecast_range',
  'Get forecast data for a date range. Returns per-day summaries with badge counts, deferred counts, and day classifications. Default range: today + 7 days. Maximum 90 days.',
  getForecastRangeTool.schema.shape,
  getForecastRangeTool.handler
);

server.tool(
  'get_forecast_day',
  'Get detailed forecast data for a single date. Returns badge count, deferred count, badge status, and day classification. Default: today.',
  getForecastDayTool.schema.shape,
  getForecastDayTool.handler
);

server.tool(
  'select_forecast_days',
  'Navigate the Forecast perspective to show specific dates. WARNING: This changes the visible UI state in OmniFocus. The response includes a warning field to inform the user.',
  selectForecastDaysTool.schema.shape,
  selectForecastDaysTool.handler
);

// Phase 14 Window & UI Control Tools
server.tool(
  'reveal_items',
  'Reveal one or more items in the OmniFocus outline, scrolling and expanding the hierarchy so they become visible on screen. WARNING: This operation changes the visible OmniFocus UI state.',
  revealItemsTool.schema.shape,
  revealItemsTool.handler
);

server.tool(
  'expand_items',
  'Expand outline nodes to show their children, with optional recursive expansion of all descendants. WARNING: This operation changes the visible OmniFocus UI state.',
  expandItemsTool.schema.shape,
  expandItemsTool.handler
);

server.tool(
  'collapse_items',
  'Collapse outline nodes to hide their children, with optional recursive collapse of all descendants. WARNING: This operation changes the visible OmniFocus UI state.',
  collapseItemsTool.schema.shape,
  collapseItemsTool.handler
);

server.tool(
  'expand_notes',
  'Expand notes on outline nodes to show note content inline, with optional recursive expansion on all descendants. WARNING: This operation changes the visible OmniFocus UI state.',
  expandNotesTool.schema.shape,
  expandNotesTool.handler
);

server.tool(
  'collapse_notes',
  'Collapse notes on outline nodes to hide note content, with optional recursive collapse on all descendants. WARNING: This operation changes the visible OmniFocus UI state.',
  collapseNotesTool.schema.shape,
  collapseNotesTool.handler
);

server.tool(
  'focus_items',
  'Focus the OmniFocus window on one or more projects or folders, narrowing the view to show only those items and their contents. Only projects and folders are valid — tasks and tags are rejected. WARNING: This operation changes the visible OmniFocus UI state.',
  focusItemsTool.schema.shape,
  focusItemsTool.handler
);

server.tool(
  'unfocus',
  'Clear focus from the OmniFocus window, restoring the full outline view. Idempotent — calling when already unfocused succeeds as a no-op. WARNING: This operation changes the visible OmniFocus UI state.',
  unfocusTool.schema.shape,
  unfocusTool.handler
);

server.tool(
  'select_items',
  'Select one or more items in the OmniFocus outline for visual review. Supports extending the existing selection or replacing it. Performs pre-flight reveal to ensure items are visible. WARNING: This operation changes the visible OmniFocus UI state.',
  selectItemsTool.schema.shape,
  selectItemsTool.handler
);

// Attachment tools
server.tool(
  'list_attachments',
  'List all embedded file attachments on an OmniFocus task or project. Returns filename, type, size, and zero-based index for each attachment. Use the index with remove_attachment to remove a specific attachment',
  listAttachmentsTool.schema.shape,
  listAttachmentsTool.handler
);

server.tool(
  'add_attachment',
  'Add a base64-encoded file as an embedded attachment to an OmniFocus task or project. Files over 10 MB return a sync performance warning; files over 50 MB are rejected',
  addAttachmentTool.schema.shape,
  addAttachmentTool.handler
);

server.tool(
  'remove_attachment',
  'Remove a specific embedded attachment from an OmniFocus task or project by its zero-based index. Call list_attachments first to get current indices. Remaining attachments are re-indexed',
  removeAttachmentTool.schema.shape,
  removeAttachmentTool.handler
);

server.tool(
  'list_linked_files',
  'List all linked file URL references on an OmniFocus task or project. Returns url, filename, and extension for each linked file',
  listLinkedFilesTool.schema.shape,
  listLinkedFilesTool.handler
);

server.tool(
  'add_linked_file',
  'Add a linked file reference (file:// URL) to an OmniFocus task or project. The file is not embedded; only a reference to the filesystem path is stored',
  addLinkedFileTool.schema.shape,
  addLinkedFileTool.handler
);

// Phase 10 Bulk Operations Tools
server.tool(
  'move_tasks',
  'Move 1-100 tasks to a target location (project, inbox, or parent task) with position control. Supports placement at beginning/ending of target or before/after a sibling task. Per-item results for partial failures.',
  moveTasksTool.schema.shape,
  moveTasksTool.handler
);

server.tool(
  'duplicate_tasks',
  'Duplicate 1-100 tasks to a target location. Copies preserve all properties (name, note, tags, dates, subtasks) and are always active/incomplete. Returns new task IDs and names. Per-item results for partial failures.',
  duplicateTasksTool.schema.shape,
  duplicateTasksTool.handler
);

server.tool(
  'batch_update_tasks',
  'Apply property updates uniformly to 1-100 tasks in one operation. Supports flagged status, due/defer/planned dates (with clear flags), estimated minutes, tag add/remove, and note append. Tag removals processed before additions.',
  batchUpdateTasksTool.schema.shape,
  batchUpdateTasksTool.handler
);

server.tool(
  'convert_tasks_to_projects',
  'Convert 1-100 tasks to projects. Subtasks become child project tasks. New projects are placed in an optional target folder or at library root. Returns new project IDs and names. Irreversible operation.',
  convertTasksToProjectsTool.schema.shape,
  convertTasksToProjectsTool.handler
);

server.tool(
  'move_sections',
  'Move 1-100 sections (folders and/or projects) to a new location in the folder hierarchy. Supports placement within folders or at library root, and before/after sibling sections. Per-item results for partial failures.',
  moveSectionsTool.schema.shape,
  moveSectionsTool.handler
);

server.tool(
  'duplicate_sections',
  'Duplicate 1-100 sections (folders and/or projects) to a new location. Copies preserve all contents including child projects, tasks, and settings. Returns new section IDs and names. Per-item results for partial failures.',
  duplicateSectionsTool.schema.shape,
  duplicateSectionsTool.handler
);

// Start the MCP server
const transport = new StdioServerTransport();

// Use await with server.connect to ensure proper connection
(async () => {
  try {
    logger.info('Starting MCP server...', 'server');
    await server.connect(transport);
    logger.info('MCP Server connected and ready to accept commands from Claude', 'server');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to start MCP server', 'server', {
      message: error.message,
      stack: error.stack
    });
    // Exit with error code to signal failure
    process.exit(1);
  }
})();

// For a cleaner shutdown if the process is terminated
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...', 'server');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...', 'server');
  process.exit(0);
});
