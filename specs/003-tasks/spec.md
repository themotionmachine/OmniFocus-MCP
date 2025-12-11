# Feature Specification: Enhanced Task Management Tools

**Feature Branch**: `003-tasks`
**Created**: 2025-12-11
**Status**: Draft
**Input**: Phase 3 Enhanced Task Management: Implement 4 enhanced task tools for OmniFocus

## Overview

This feature adds enhanced task management capabilities to the OmniFocus MCP
Server. While the server already provides basic task operations through
`add_omnifocus_task`, `edit_item`, and `remove_item`, AI assistants lack the
ability to efficiently query and inspect existing tasks.

Currently, AI assistants must use `dump_database` to see tasks, which returns
the entire database and is inefficient for targeted queries. There is also no
way to:

- List tasks with filtering (by project, folder, tag, status, dates)
- Get complete details about a specific task
- Set the planned date (OmniFocus v4.7+ scheduling feature)
- Append to task notes without overwriting existing content

### Business Value

- **Efficient Task Discovery**: Enable AI assistants to find specific tasks
  without loading the entire database
- **Complete Task Visibility**: Provide full task details for informed
  decision-making
- **Modern Scheduling Support**: Leverage OmniFocus v4.7+ planned date feature
  for scheduling when work will be done
- **Non-Destructive Updates**: Add information to task notes without losing
  existing content

## User Scenarios & Testing *(mandatory)*

### User Story 1 - List Tasks with Filtering (Priority: P1)

As an AI assistant user, I want to query my tasks with specific filters so that
I can quickly find tasks matching certain criteria without loading my entire
database.

**Why this priority**: Task discovery is fundamental to all task management
workflows. AI assistants need to understand what work exists before they can
help users prioritize, schedule, or modify tasks. Without filtering, the only
option is `dump_database` which is slow and overwhelming for large databases.

**Independent Test**: Can be fully tested by requesting tasks with various
filter combinations (e.g., "flagged tasks due this week") and verifying the
results match the criteria. Delivers immediate value by enabling targeted
task queries.

**Acceptance Scenarios**:

1. **Given** a user with tasks across multiple projects,
   **When** the AI requests tasks filtered by a specific project name or ID,
   **Then** only tasks belonging to that project are returned

2. **Given** a user with tasks having various due dates,
   **When** the AI requests tasks due within a date range,
   **Then** only tasks with due dates in that range are returned

3. **Given** a user with tagged tasks,
   **When** the AI requests tasks filtered by specific tag(s) with tagFilterMode,
   **Then** tasks are filtered by OR logic (any tag, default) or AND logic (all tags)

4. **Given** a user with tasks in various states,
   **When** the AI requests tasks filtered by status (available, blocked, completed),
   **Then** only tasks matching that status are returned

5. **Given** a user with deferred tasks,
   **When** the AI requests tasks filtered by defer date range,
   **Then** only tasks deferred within that range are returned

6. **Given** a user with scheduled tasks (v4.7+),
   **When** the AI requests tasks filtered by planned date range,
   **Then** only tasks with planned dates in that range are returned

7. **Given** filter criteria that match no tasks,
   **When** the AI requests tasks with those filters,
   **Then** an empty result set is returned (not an error)

8. **Given** a user wants a flat view of all tasks,
   **When** the AI requests tasks without the nested hierarchy,
   **Then** all matching tasks are returned in a flat list

9. **Given** a user wants to see task relationships,
   **When** the AI requests tasks with hierarchy information,
   **Then** parent-child relationships are included in the response

---

### User Story 2 - Get Complete Task Details (Priority: P2)

As an AI assistant user, I want to retrieve all properties of a specific task
so that I can make informed decisions about prioritization, scheduling, or
modifications.

**Why this priority**: After finding tasks via listing (P1), users need to
inspect individual tasks in detail. Complete task information enables AI
assistants to provide context-aware suggestions and accurate task management.

**Independent Test**: Can be fully tested by requesting a task by ID and
verifying all properties are returned correctly. Delivers value by enabling
comprehensive task inspection.

**Acceptance Scenarios**:

1. **Given** a valid task ID,
   **When** the AI requests task details,
   **Then** all task properties are returned including name, note, dates, tags,
   project, and status

2. **Given** a task with a parent task,
   **When** the AI requests task details,
   **Then** the parent task reference is included in the response

3. **Given** a task belonging to a project,
   **When** the AI requests task details,
   **Then** the containing project reference is included in the response

4. **Given** a task with assigned tags,
   **When** the AI requests task details,
   **Then** all tag references are included in the response

5. **Given** a task with a planned date (v4.7+),
   **When** the AI requests task details,
   **Then** the planned date and effective planned date are included

6. **Given** a task ID that does not exist,
   **When** the AI requests task details,
   **Then** a clear "not found" error is returned with the searched ID

7. **Given** a task identified by name that matches multiple tasks,
   **When** the AI requests task details,
   **Then** a disambiguation error is returned listing all matching task IDs

---

### User Story 3 - Set Planned Date for Scheduling (Priority: P3)

As an AI assistant user, I want to set a planned date on tasks so that I can
schedule when I intend to work on tasks, separate from when they are due or
available.

**Why this priority**: Planned dates (introduced in OmniFocus v4.7) represent
when a user plans to work on a task. This is distinct from defer dates (when
tasks become available) and due dates (deadlines). Scheduling support enables
more sophisticated task planning.

**Independent Test**: Can be fully tested by setting a planned date on a task
and verifying it appears in OmniFocus. Delivers value by enabling AI-assisted
scheduling.

**Acceptance Scenarios**:

1. **Given** a task without a planned date,
   **When** the AI sets a planned date,
   **Then** the task's planned date is set to the specified value

2. **Given** a task with an existing planned date,
   **When** the AI sets a new planned date,
   **Then** the task's planned date is updated to the new value

3. **Given** a task with a planned date,
   **When** the AI clears the planned date (sets to null),
   **Then** the task no longer has a planned date

4. **Given** a task identified by ID,
   **When** the AI sets the planned date,
   **Then** the correct task is updated

5. **Given** a task identified by name that is unique,
   **When** the AI sets the planned date,
   **Then** the correct task is updated

6. **Given** a task identified by name that matches multiple tasks,
   **When** the AI attempts to set the planned date,
   **Then** a disambiguation error is returned listing all matching task IDs

7. **Given** a task ID that does not exist,
   **When** the AI attempts to set the planned date,
   **Then** a clear "not found" error is returned

---

### User Story 4 - Append Text to Task Note (Priority: P4)

As an AI assistant user, I want to append text to a task's note without
overwriting existing content so that I can add timestamps, progress updates,
or additional context to tasks.

**Why this priority**: Task notes often contain important information that
should be preserved. The existing `edit_item` tool overwrites the entire note.
Append functionality enables incremental updates without data loss.

**Independent Test**: Can be fully tested by appending text to a task note and
verifying both the original and new content are present. Delivers value by
enabling non-destructive note updates.

**Acceptance Scenarios**:

1. **Given** a task with existing note content,
   **When** the AI appends new text,
   **Then** the new text is added after the existing content (with a newline separator)

2. **Given** a task with an empty note,
   **When** the AI appends text,
   **Then** the note contains only the appended text (no leading newline)

3. **Given** a task identified by ID,
   **When** the AI appends to the note,
   **Then** the correct task is updated

4. **Given** a task identified by name that is unique,
   **When** the AI appends to the note,
   **Then** the correct task is updated

5. **Given** a task identified by name that matches multiple tasks,
   **When** the AI attempts to append to the note,
   **Then** a disambiguation error is returned listing all matching task IDs

6. **Given** a task ID that does not exist,
   **When** the AI attempts to append to the note,
   **Then** a clear "not found" error is returned

7. **Given** text containing special characters or formatting,
   **When** the AI appends to the note,
   **Then** the text is appended exactly as provided (no escaping or modification)

---

### Edge Cases

- **Empty filter results**: When no tasks match filter criteria, return an
  empty array (not an error)
- **Task not found**: When a task ID does not exist, return error
  "Task '{id}' not found"
- **Disambiguation required**: When a task name matches multiple tasks, return
  structured error with code "DISAMBIGUATION_REQUIRED" and all matching IDs
- **Invalid date formats**: When date filters use invalid ISO 8601 format,
  return error "Invalid date format for '{field}'. Expected ISO 8601 format."
- **OmniFocus version mismatch**: When setting planned date on OmniFocus < v4.7,
  the operation may fail gracefully with error explaining version requirement
- **Planned date with completed task**: Setting planned date on a completed
  task succeeds (OmniFocus allows this)
- **Empty append text**: Appending empty string to note succeeds silently
  (no-op behavior)
- **Very long notes**: Appending to notes with extensive content succeeds
  (OmniFocus handles note length)
- **Inbox tasks**: Tasks in the inbox have no containing project; this is
  represented as `containingProject: null`
- **Root tasks vs subtasks**: Root tasks of projects have `parent: null`;
  subtasks have parent task references

## Requirements *(mandatory)*

### Functional Requirements

#### list_tasks

- **FR-001**: System MUST return tasks matching the specified filter criteria
- **FR-002**: System MUST support filtering by project (ID or name)
- **FR-003**: System MUST support filtering by folder (ID or name) to include
  all tasks in projects within that folder
- **FR-004**: System MUST support filtering by tag(s) (ID or name) with
  `tagFilterMode` parameter: `"any"` (default, OR logic - tasks with ANY of
  the specified tags) or `"all"` (AND logic - tasks with ALL specified tags).
  See "Tag Filter Behavior" section below for detailed semantics.
- **FR-005**: System MUST support filtering by task status using values:
  'available', 'blocked', 'completed', 'dropped', 'dueSoon', 'next', 'overdue'
- **FR-006**: System MUST support filtering by due date range using
  `dueBefore` and `dueAfter` parameters (ISO 8601 format)
- **FR-007**: System MUST support filtering by defer date range using
  `deferBefore` and `deferAfter` parameters (ISO 8601 format)
- **FR-008**: System MUST support filtering by planned date range using
  `plannedBefore` and `plannedAfter` parameters (ISO 8601 format, v4.7+)
- **FR-009**: System MUST support filtering by completion date range using
  `completedBefore` and `completedAfter` parameters (ISO 8601 format)
- **FR-010**: System MUST support filtering by flagged status via `flagged`
  boolean parameter
- **FR-011**: System MUST support `includeCompleted` parameter (default: false)
  to include/exclude completed tasks
- **FR-012**: System MUST support `flatten` parameter (default: true) to
  return flat list vs nested hierarchy
- **FR-013**: System MUST return task summary data including: id, name,
  taskStatus, flagged, dueDate, deferDate, plannedDate (v4.7+), projectId,
  projectName, tagIds, tagNames
- **FR-014**: System MUST return empty array when no tasks match filters (not error)
- **FR-015**: System MUST support `limit` parameter to restrict result count
  (default: 100, max: 1000)

#### get_task

- **FR-016**: System MUST return complete task details when given a valid task
  identifier
- **FR-017**: System MUST support identifying tasks by unique ID
- **FR-018**: System MUST support identifying tasks by name with disambiguation
  (error if multiple matches)
- **FR-019**: System MUST return all writable properties: name, note, flagged,
  deferDate, dueDate, estimatedMinutes, sequential, completedByChildren,
  shouldUseFloatingTimeZone
- **FR-020**: System MUST return all read-only properties: id, added, modified,
  completed, completionDate, dropDate, taskStatus, effectiveDeferDate,
  effectiveDueDate, effectiveFlagged, effectivePlannedDate (v4.7.1+),
  plannedDate (v4.7+), inInbox, hasChildren
- **FR-021**: System MUST return relationship references: containingProject
  (id, name), parent (id, name), tags (array of {id, name})
- **FR-022**: System MUST return error "Task '{id}' not found" when task does
  not exist
- **FR-023**: System MUST return disambiguation error when name matches
  multiple tasks: `{ success: false, error: string, code:
  "DISAMBIGUATION_REQUIRED", matchingIds: string[] }`

#### set_planned_date

- **FR-024**: System MUST allow setting a planned date on a task (v4.7+ feature)
- **FR-025**: System MUST support identifying tasks by unique ID
- **FR-026**: System MUST support identifying tasks by name with disambiguation
- **FR-027**: System MUST accept planned date as ISO 8601 string or null to clear
- **FR-028**: System MUST return success response with task id and name on
  completion: `{ success: true, id: string, name: string }`
- **FR-029**: System MUST return error when task not found
- **FR-030**: System MUST return disambiguation error when name matches
  multiple tasks

#### append_note

- **FR-031**: System MUST append text to existing task note content
- **FR-032**: System MUST preserve all existing note content when appending
- **FR-033**: System MUST add a newline separator between existing content and
  appended text (unless note is empty)
- **FR-034**: System MUST support identifying tasks by unique ID
- **FR-035**: System MUST support identifying tasks by name with disambiguation
- **FR-036**: System MUST preserve special characters and formatting in
  appended text
- **FR-037**: System MUST return success response with task id and name on
  completion: `{ success: true, id: string, name: string }`
- **FR-038**: System MUST return error when task not found
- **FR-039**: System MUST return disambiguation error when name matches
  multiple tasks
- **FR-040**: System MUST treat empty string append as no-op (succeed silently)

#### Error Handling

- **FR-041**: System MUST return structured disambiguation errors when a
  name-based lookup matches multiple items: `{ success: false, error: string,
  code: "DISAMBIGUATION_REQUIRED", matchingIds: string[] }`. This is the
  canonical pattern referenced by FR-023, FR-030, and FR-039.
- **FR-042**: System MUST return standard error responses for all other
  failures: `{ success: false, error: string }` with descriptive error messages
- **FR-043**: Error messages MUST be **actionable**: they MUST (1) quote the
  problematic input value, (2) explain WHY the operation failed, and (3)
  suggest corrective action when applicable

### Filter Behavior Specification

#### Filter Combination Logic

All filters combine using **AND logic** (intersection). A task must satisfy ALL
provided filters to be included in results:

- **No filters provided**: Returns all tasks (subject to `includeCompleted` default)
- **Single filter**: Returns tasks matching that filter
- **Multiple filters**: Returns tasks matching ALL filters (intersection)

#### Container Filter Precedence

When multiple container filters are provided:

- If both `projectId` AND `projectName` provided: `projectId` takes precedence
- If both `folderId` AND `folderName` provided: `folderId` takes precedence
- If both `projectId/Name` AND `folderId/Name` provided: Both filters apply (AND
  logic - task must be in specified project AND that project must be in specified
  folder)
- Folder filters include all projects recursively within the folder hierarchy

#### Tag Filter Behavior

- `tagIds` and `tagNames` are combined into a single tag filter set
- Empty array (`[]`) for `tagIds` or `tagNames`: Treated as "no filter" (NOT "no
  tags required")
- `tagFilterMode` applies to the combined tag set:
  - `'any'` (default): Task has ANY of the specified tags (OR logic within tags)
  - `'all'`: Task has ALL of the specified tags (AND logic within tags)

#### Status Filter Behavior

- Multiple status values use OR logic: task matches if it has ANY of the statuses
- Empty `status: []` array: Treated as "no filter" (returns all statuses)
- `includeCompleted: false` (default) excludes both `Completed` AND `Dropped` tasks
- **Interaction rule**: `includeCompleted` is applied AFTER status filter. If
  `status: ['Completed']` but `includeCompleted: false`, result is empty (the
  status filter matches completed tasks, but includeCompleted excludes them)

#### Date Filter Behavior

- Date filters use **inclusive** boundaries (`>=` for After, `<=` for Before)
- `dueBefore` + `dueAfter` creates a date range (AND logic)
- Inverted range (`dueAfter` > `dueBefore`): Returns empty result (no error)
- **Null date handling**: Tasks with `null` dates are EXCLUDED by date filters
  (e.g., `dueBefore` excludes tasks with no due date)
- `completedBefore`/`completedAfter` implicitly require `includeCompleted: true`
  to return results (completed tasks have completion dates)

#### Limit Behavior

- `limit: 0`: Invalid - Zod validation error (minimum is 1)
- `limit > 1000`: Clamped to 1000 (no error, silently capped)
- Limit applied AFTER all filters (post-filter limit)
- When `flatten: false`, limit applies to total tasks returned (not just roots)

#### Version-Conditional Filter Behavior

- `plannedBefore`/`plannedAfter` on OmniFocus < v4.7: Filter is ignored silently
  (no error, filter has no effect)
- Tasks with `null` plannedDate are EXCLUDED by planned date filters

### Error Message Standards

Error messages follow these patterns (consistent with existing tools):

| Error Type | Message Format | Example |
|------------|----------------|---------|
| Not found | "{Type} '{id}' not found" | "Task 'abc123' not found" |
| Disambiguation | "Ambiguous {type} name '{name}'. Found N matches: {ids}. Please specify by ID." | "Ambiguous task name 'Call Mom'. Found 2 matches: task1, task2. Please specify by ID." |
| Invalid date | "Invalid date format for '{field}'. Expected ISO 8601 format." | "Invalid date format for 'dueAfter'. Expected ISO 8601 format." |
| Invalid status | "Invalid status '{value}'. Expected one of: available, blocked, completed, dropped, dueSoon, next, overdue" | "Invalid status 'done'. Expected one of: available, blocked, completed, dropped, dueSoon, next, overdue" |
| Version mismatch | "Planned date requires OmniFocus v4.7 or later" | (static message) |
| Migration required | "Planned date requires database migration. Please open OmniFocus preferences to migrate." | (v4.7+ but unmigrated) |

### Database Migration Handling (set_planned_date)

OmniFocus v4.7+ introduced `plannedDate`, but it requires a one-time database
migration. The tool handles this as follows:

1. **Version check first**: Return "Planned date requires OmniFocus v4.7 or later"
   if version < 4.7

2. **Migration check**: If version >= 4.7 but database not migrated, the operation
   may throw an error. The try-catch wrapper converts this to:
   "Planned date requires database migration. Please open OmniFocus preferences
   to migrate."

3. **User guidance**: If migration error occurs, users should:
   - Open OmniFocus → Preferences → Database
   - Click "Migrate to Support Planned Dates"
   - Retry the `set_planned_date` operation

### Key Entities

- **Task**: A unit of work in OmniFocus
  - Identifier: Unique ID (primaryKey) for unambiguous reference
  - Name: Display name of the task (string)
  - Note: Additional text content (string, may be empty)
  - Status: Current state (Available, Blocked, Completed, Dropped, DueSoon,
    Next, Overdue)
  - Dates: deferDate, dueDate, plannedDate (v4.7+), completionDate
  - Effective Dates: Computed dates considering inheritance
  - Flagged: Boolean priority indicator
  - EstimatedMinutes: Time estimate (nullable)
  - Tags: Many-to-many relationship with Tag entities
  - ContainingProject: Parent project reference (nullable for inbox tasks)
  - Parent: Parent task reference (nullable for root tasks)
  - Children: Array of subtasks

- **Task.Status**: Enumeration of task states
  - Available: Ready to work on
  - Blocked: Waiting on something (deferred, sequential, or blocked tag)
  - Completed: Finished
  - Dropped: Abandoned/cancelled
  - DueSoon: Due within configured threshold
  - Next: First available task in sequential project
  - Overdue: Past due date

- **PlannedDate**: When user plans to work on task (v4.7+)
  - Distinct from deferDate (when available) and dueDate (deadline)
  - Used for scheduling and forecast view
  - effectivePlannedDate computed considering inheritance (v4.7.1+)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI assistants can list tasks with filter criteria and receive
  results within 2 seconds for databases with up to 10,000 tasks
- **SC-002**: AI assistants can retrieve complete task details by ID with
  99% success rate for valid requests
- **SC-003**: AI assistants can set planned dates on tasks in OmniFocus v4.7+
  with 99% success rate for valid requests
- **SC-004**: AI assistants can append to task notes without losing existing
  content with 100% data preservation
- **SC-005**: All task operations provide descriptive error messages when
  operations fail due to validation or not-found conditions
- **SC-006**: The four enhanced task tools reduce the need for `dump_database`
  for common task queries (finding tasks by filter, inspecting task details,
  scheduling, and note updates) by providing targeted alternatives
- **SC-007**: Task modifications made through the tools are reflected in the
  OmniFocus application within 1 second (verified by manual inspection after
  each write operation)

## Assumptions

- Users have OmniFocus installed and running on macOS
- The MCP server has appropriate permissions to interact with OmniFocus
- Task operations follow OmniFocus's native behavior and constraints
- The OmniFocus database is in a consistent state when operations are performed
- For `set_planned_date`, users understand this requires OmniFocus v4.7+
- The codebase uses Omni Automation JavaScript (per Phase 1 refactoring) for
  all OmniFocus interactions

## Out of Scope

- **Batch task operations**: Creating, editing, or deleting multiple tasks
  (existing tools handle this)
- **Task completion/dropping**: Changing task status (handled by `edit_item`)
- **Task creation**: Adding new tasks (handled by `add_omnifocus_task`)
- **Subtask management**: Creating task hierarchies (handled by `batch_add_items`)
- **Tag assignment**: Assigning/removing tags (handled by Phase 2 tag tools)
- **Repetition rules**: Setting up repeating tasks (future phase)
- **Notifications**: Managing task notifications (future phase)
- **Sort order customization**: Custom sorting of list results (returns in
  OmniFocus document storage order)
- **Pagination**: Offset-based pagination for large result sets (use limit
  parameter instead)

## API Reference Documentation

### Primary Sources

<!-- markdownlint-disable MD034 -->

| Resource | URL | Description |
|----------|-----|-------------|
| Task Class | <https://omni-automation.com/omnifocus/task.html> | Task class documentation |
| API Reference | <https://omni-automation.com/omnifocus/OF-API.html> | Full OmniFocus API |
| Finding Items | <https://omni-automation.com/omnifocus/finding-items.html> | Search methods |

<!-- markdownlint-enable MD034 -->

### Confirmed Task Capabilities

| Operation | API Method | Reference |
|-----------|------------|-----------|
| Find by ID | `Task.byIdentifier(id)` | Task |
| Find by name | `flattenedTasks.byName(name)` | Database |
| Get all tasks | `flattenedTasks` | Database |
| Filter tasks | Iterate `flattenedTasks` with conditions | Custom |
| Set planned date | `task.plannedDate = date` | Task (v4.7+) |
| Append to note | `task.appendStringToNote(string)` | Task |
| Get status | `task.taskStatus` | Task |
| Get relationships | `task.containingProject`, `task.parent`, `task.tags` | Task |

### Task Properties Summary

**Writable Properties:**
- `name` (String) - Task title
- `note` (String) - Note content
- `flagged` (Boolean) - Flagged status
- `deferDate` (Date|null) - Defer until date
- `dueDate` (Date|null) - Due date
- `estimatedMinutes` (Number|null) - Time estimate
- `sequential` (Boolean) - Children form dependency chain
- `completedByChildren` (Boolean) - Auto-complete when children done
- `shouldUseFloatingTimeZone` (Boolean) - Floating timezone
- `plannedDate` (Date|null) - Planned date (v4.7+, writable)

**Read-Only Properties:**
- `id` (ObjectIdentifier) - Unique identifier
- `added` (Date|null) - Creation date
- `modified` (Date|null) - Last modified date
- `completed` (Boolean) - Completion status
- `completionDate` (Date|null) - When completed
- `dropDate` (Date|null) - When dropped
- `taskStatus` (Task.Status) - Current status enum
- `effectiveDeferDate` (Date|null) - Computed defer date
- `effectiveDueDate` (Date|null) - Computed due date
- `effectiveFlagged` (Boolean) - Computed flagged status
- `effectivePlannedDate` (Date|null) - Computed planned (v4.7.1+)
- `containingProject` (Project|null) - Parent project
- `parent` (Task|null) - Parent task
- `inInbox` (Boolean) - Is direct child of inbox
- `hasChildren` (Boolean) - Has child tasks
- `tags` (TagArray) - Associated tags

### Version Requirements

Source: [research.md](./research.md) OmniJS Task API documentation

| Feature | Minimum Version | Platform | Notes |
|---------|-----------------|----------|-------|
| plannedDate (write) | v4.7 | All | Requires database migration |
| effectivePlannedDate | v4.7.1 | All | Read-only, computed |
| effectiveCompletedDate | v3.8+ | All | Read-only, computed |
| effectiveDropDate | v3.8+ | All | Read-only, computed |
| estimatedMinutes | v3.5+ | macOS only | Not available on iOS |
| shouldUseFloatingTimeZone | v3.6+ | All | |
| appendStringToNote | v3.0+ | All | |
| taskStatus | v3.0+ | All | |

---

## Clarifications

### Session 2025-12-11

1. Q: Should `list_tasks` support OR logic for tag filtering in addition to
   AND logic? → A: **Support both via `tagFilterMode` parameter**. Default to
   OR logic (`tagFilterMode: "any"`) for consistency with existing
   `queryOmnifocus` tool. Add `tagFilterMode: "all"` option for AND logic
   when precise filtering is needed. This matches the codebase pattern
   (queryOmnifocus uses OR) while adding flexibility.

2. Q: When `includeCompleted: false`, should completed subtasks within
   incomplete parent tasks be included? → A: **Exclude all completed tasks**
   regardless of parent state. This is the simplest, most consistent behavior.
   If a task's `taskStatus` is `Completed` or `Dropped`, exclude it when
   `includeCompleted: false`.

3. Q: Should `set_planned_date` be standalone or integrated into `edit_item`?
   → A: **Standalone tool** per Phase 3 plan. Reasons: (1) requires v4.7+
   version checking that would complicate `edit_item`, (2) `plannedDate` is
   a distinct scheduling feature worth highlighting for AI discoverability,
   (3) matches "Phase 3: 4 tools" design from roadmap.

---

## Metadata

- Created: 2025-12-11
- Status: Approved
- Clarifications: 3 (all resolved)
- Next Step: /speckit.plan
