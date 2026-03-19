# Feature Specification: Bulk Operations

**Feature Branch**: `010-bulk-operations`
**Created**: 2026-03-18
**Status**: Draft
**Input**: User description: "Bulk Operations — moving, duplicating, converting, and batch-updating tasks and sections through the MCP server"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Move Tasks to a New Location (Priority: P1)

A GTD practitioner wants to reorganize their task hierarchy by moving multiple tasks at once. They select a group of tasks (by ID or name) and specify a target location — another project, the inbox, or a parent task — along with optional position control (beginning, ending, before/after a sibling).

**Why this priority**: Moving tasks is the most fundamental reorganization operation. During GTD weekly reviews, users frequently need to reassign tasks between projects, pull items out of inbox into projects, or restructure subtask hierarchies. Without bulk move, every task must be moved individually, making large reorganizations prohibitively slow for AI assistants.

**Independent Test**: Can be fully tested by creating several tasks in one project, moving them to a different project, and verifying they appear in the target location with the correct ordering. Delivers immediate reorganization value as a standalone capability.

**Acceptance Scenarios**:

1. **Given** 5 tasks exist in Project A, **When** the user moves all 5 to Project B at position "ending", **Then** all 5 tasks appear at the end of Project B and are removed from Project A
2. **Given** tasks are specified by ID and name in the same batch, **When** 3 resolve successfully and 1 name matches multiple items, **Then** the 3 tasks are moved and the ambiguous item returns a disambiguation error with matching candidates
3. **Given** tasks exist in a project, **When** the user moves them to "inbox", **Then** the tasks appear in the inbox at the specified position
4. **Given** tasks exist in inbox, **When** the user moves them into a project at position "before" a specific sibling task, **Then** the tasks are inserted immediately before that sibling in the project
5. **Given** a batch of 50 tasks, **When** 48 are valid and 2 have invalid IDs, **Then** the 48 valid tasks are moved and the 2 invalid entries return individual NOT_FOUND errors
6. **Given** a task with subtasks, **When** the user moves the parent task to a new project, **Then** the parent task and all its subtasks move together to the target

---

### User Story 2 - Duplicate Tasks to a New Location (Priority: P2)

A GTD practitioner wants to create copies of existing tasks in a different location — for example, replicating a set of checklist items into a new project as a template, or copying tasks for a recurring workflow.

**Why this priority**: Duplicating tasks preserves the original while creating working copies elsewhere. This is essential for template-based workflows where users maintain a "master checklist" project and duplicate items into active projects. It is slightly lower priority than move because duplication is less frequent than reorganization.

**Independent Test**: Can be tested by duplicating a task into a different project and verifying both the original and the copy exist with matching properties.

**Acceptance Scenarios**:

1. **Given** 3 tasks exist in Project A, **When** the user duplicates them to Project B at position "beginning", **Then** 3 new tasks appear at the beginning of Project B with the same names, notes, tags, dates, and flagged status as the originals, and the originals remain in Project A
2. **Given** a task has subtasks, **When** the user duplicates the parent task, **Then** the duplicate includes copies of all subtasks with their properties preserved
3. **Given** tasks are duplicated to the inbox, **When** the operation completes, **Then** the duplicates appear in the inbox and the response includes the new task IDs
4. **Given** a batch of 10 tasks, **When** 8 are valid and 2 are not found, **Then** 8 tasks are duplicated and the 2 missing entries return individual errors without blocking the successful duplications
5. **Given** a task with a completion status, **When** duplicated, **Then** the copy is created as an active (incomplete) task regardless of the original's completion state

---

### User Story 3 - Batch-Update Task Properties (Priority: P2)

A GTD practitioner wants to update multiple properties across multiple tasks in a single operation — for example, flagging 10 tasks, setting a due date on 5 of them, and adding a tag to all 15 at once.

**Why this priority**: Batch property updates are the highest-throughput operation for AI assistants performing cleanup and triage. During a weekly review, an AI assistant may need to flag dozens of tasks, adjust dates across a project, or tag items for context. Doing this one-at-a-time with existing tools requires N separate API calls. A "wide" batch tool collapses this into a single round-trip, which is a significant efficiency gain.

**Independent Test**: Can be tested by creating several tasks and batch-updating their flagged status and due dates, then verifying each task reflects the changes.

**Acceptance Scenarios**:

1. **Given** 10 tasks exist, **When** the user batch-updates all 10 with `flagged: true` and `dueDate: "2026-04-01"`, **Then** all 10 tasks have flagged=true and the specified due date
2. **Given** a batch of 5 tasks, **When** the user sets `addTags: ["urgent"]` and `deferDate: "2026-03-25"`, **Then** each task gains the "urgent" tag and the specified defer date
3. **Given** a task has existing tags, **When** the user batch-updates with `removeTags: ["old-context"]`, **Then** the specified tag is removed while other tags are preserved
4. **Given** a batch includes both `addTags` and `removeTags`, **When** applied to a task, **Then** removals are processed first, then additions (deterministic order)
5. **Given** a batch of 20 tasks, **When** 18 succeed and 2 fail (invalid IDs), **Then** per-item results show 18 successes and 2 failures with specific error details
6. **Given** a task is updated with only `flagged: true` (no other properties), **When** the operation completes, **Then** only the flagged property changes; all other properties remain untouched
7. **Given** a batch-update includes `note: "Additional context"`, **When** applied, **Then** the note text is appended to the existing note (not overwritten), consistent with the `append_note` tool behavior
8. **Given** a batch-update with `clearDueDate: true`, **When** applied, **Then** the due date is removed from the task

---

### User Story 4 - Convert Tasks to Projects (Priority: P3)

A GTD practitioner discovers during a review that several inbox items or tasks are actually multi-step endeavors that deserve their own projects. They want to promote these tasks to full projects, preserving any existing subtasks as project tasks.

**Why this priority**: Task-to-project conversion is a core GTD workflow ("Is this a project or a single action?"), but it happens less frequently than moving or batch-updating. It is a power-user operation typically triggered during weekly reviews.

**Independent Test**: Can be tested by creating a task with subtasks, converting it to a project, and verifying a new project exists with the task's subtasks as its children.

**Acceptance Scenarios**:

1. **Given** a task in the inbox with 3 subtasks, **When** the user converts it to a project in Folder X, **Then** a new project is created in Folder X with the task's name, and the 3 subtasks become the project's tasks
2. **Given** a task with notes, tags, and a due date, **When** converted to a project, **Then** the project inherits the task's name and note; tags and dates transfer where applicable
3. **Given** multiple tasks are converted in a batch, **When** 4 out of 5 succeed and 1 cannot be found, **Then** 4 projects are created and the 1 failure returns a per-item error
4. **Given** a task has no subtasks, **When** converted to a project, **Then** an empty project is created with the task's name
5. **Given** no target folder is specified, **When** the task is converted, **Then** the project is created at the top level of the library (root folder)
6. **Given** a task that is already a project's root task, **When** the user attempts to convert it, **Then** the system returns an error indicating the item is already a project

---

### User Story 5 - Move Sections in the Hierarchy (Priority: P3)

A GTD practitioner wants to reorganize their Areas of Responsibility by moving folders and projects within the hierarchy — for example, moving a project from one folder to another, or reordering folders at the top level.

**Why this priority**: Section reorganization is important for maintaining a clean GTD structure but happens infrequently (monthly or quarterly). The existing `move_project` and `move_folder` tools already handle individual moves; this adds batch capability for bulk restructuring.

**Independent Test**: Can be tested by creating a project in Folder A, moving it to Folder B via the bulk tool, and verifying it appears in Folder B.

**Acceptance Scenarios**:

1. **Given** 3 projects exist in Folder A, **When** the user moves all 3 to Folder B at position "ending", **Then** all 3 projects appear at the end of Folder B
2. **Given** a folder with subfolders, **When** the user moves the folder to a new parent, **Then** the folder and all its contents (subfolders, projects, tasks) move together
3. **Given** a mix of folders and projects in the batch, **When** moved to a target folder, **Then** all items are placed in the target at the specified position
4. **Given** 5 sections are specified, **When** 4 are valid and 1 has an invalid ID, **Then** the 4 valid sections are moved and the 1 invalid returns a per-item error
5. **Given** a project is moved to the root level (no folder), **When** the operation completes, **Then** the project appears at the top level of the library

---

### User Story 6 - Duplicate Sections with Contents (Priority: P4)

A GTD practitioner wants to create a copy of a project or folder structure to use as a template — for example, duplicating a "Client Onboarding" project template to create a new instance for a new client.

**Why this priority**: Section duplication is a powerful template feature but is the least frequently used operation in the set. Most users create templates infrequently. This is a convenience feature that saves manual recreation of complex project structures.

**Independent Test**: Can be tested by duplicating a project with tasks into a folder and verifying the copy exists with all tasks preserved.

**Acceptance Scenarios**:

1. **Given** a project with 5 tasks, **When** the user duplicates it to Folder X, **Then** a new project appears in Folder X with identical name, settings, and 5 copied tasks
2. **Given** a folder with 2 projects and 10 total tasks, **When** the user duplicates the folder, **Then** a new folder appears with copies of both projects and all their tasks
3. **Given** a batch of 3 sections, **When** all are duplicated successfully, **Then** 3 new sections exist with the response including their new IDs
4. **Given** a section is duplicated to the root level, **When** the operation completes, **Then** the copy appears at the top level of the library
5. **Given** a project with review settings and repetition rules, **When** duplicated, **Then** the copy preserves review interval and repetition configuration

---

### Edge Cases

- What happens when the target location for a move or duplicate does not exist (invalid project/folder ID)? The entire batch should not fail; the operation returns a TARGET_NOT_FOUND error, and no items are moved (since the target is shared, this is a pre-validation failure before processing individual items)
- What happens when a task is moved to a project that is completed or dropped? The system should allow the move (OmniFocus permits this) and return a warning in the response indicating the target's inactive status
- What happens when duplicate identifiers appear in the same batch? Each occurrence is processed independently; the second may be a no-op if the first already moved it
- What happens when a user tries to move a task to its current location? The operation succeeds as a no-op
- What happens when `batch_update_tasks` receives an empty properties object (no fields to update)? The system should return a validation error requiring at least one property to be specified
- What happens when `convert_tasks_to_projects` is given a task that is itself a subtask of another task? The task is extracted from its parent and converted to a project; the parent task loses the subtask
- What happens when the `relativeTo` task/section in a position parameter does not exist? The item returns a RELATIVE_TARGET_NOT_FOUND error for that specific item
- What happens when batch size exceeds 100? The system returns a validation error before processing any items
- What happens when `batch_update_tasks` specifies a tag name for `addTags` that does not exist? The system returns a per-item TAG_NOT_FOUND error for tasks referencing that tag, without creating the tag
- What happens when moving a section would create a circular hierarchy (folder inside itself)? OmniFocus prevents this internally and throws an exception; the server catches it and returns OPERATION_FAILED with the native error message (no pre-validation needed)
- What happens when `moveTasks()` or `duplicateTasks()` is called with an invalid position (e.g., moving a task into itself as a subtask)? OmniFocus throws an exception; the server catches it per-item and returns OPERATION_FAILED with the native error message

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow moving 1 to 100 tasks to a target location (project, inbox, or parent task) with optional position control (beginning, ending, before, after a sibling)
- **FR-002**: System MUST allow duplicating 1 to 100 tasks to a target location, creating copies that preserve all task properties (name, note, tags, dates, flagged status, subtasks)
- **FR-003**: System MUST allow converting 1 to 100 tasks to projects, placing the new projects in an optionally specified folder (defaulting to the library root), preserving subtasks as project tasks
- **FR-004**: System MUST allow moving 1 to 100 sections (folders and/or projects) to a target location with optional position control
- **FR-005**: System MUST allow duplicating 1 to 100 sections (folders and/or projects) to a target location, creating copies that preserve all contents (child projects, tasks, settings)
- **FR-006**: System MUST allow batch-updating properties on 1 to 100 tasks in a single operation, supporting any combination of: flagged, dueDate, deferDate, addTags, removeTags, note (append), clearDueDate, clearDeferDate, estimatedMinutes, clearEstimatedMinutes, plannedDate, and clearPlannedDate. All specified properties are applied uniformly to all tasks in the batch. Property updates are atomic per-task (all-or-nothing within a single try-catch); no rollback on partial property failure within a task. `plannedDate` and `clearPlannedDate` require OmniFocus v4.7+ (version-gated)
- **FR-007**: All 6 tools MUST return per-item success/failure results, allowing partial failures without failing the entire batch
- **FR-008**: All 6 tools MUST support item identification by either unique ID (preferred) or display name, with disambiguation when multiple items share a name
- **FR-009**: All batch operations MUST reject requests exceeding 100 items with a validation error before processing begins
- **FR-010**: Position parameters MUST be consistent with existing `move_project` and `move_folder` tools, supporting placements: beginning, ending, before, after (with before/after requiring a `relativeTo` identifier)
- **FR-011**: Duplicated tasks MUST be created as active (incomplete) items regardless of the original's completion or dropped status
- **FR-012**: Task-to-project conversion MUST be one-way; no project-to-task conversion is supported, and attempting to convert a project's root task MUST return an error
- **FR-013**: The `batch_update_tasks` tool MUST require at least one property to be specified; an empty update MUST return a validation error
- **FR-014**: The `batch_update_tasks` tool MUST process tag removals before tag additions when both are specified in the same operation
- **FR-015**: Move operations MUST preserve all task/section properties, subtask hierarchies, and relationships (tags, notes, dates) during relocation
- **FR-016**: All operations MUST validate the target location exists before processing individual items; an invalid target returns a single TARGET_NOT_FOUND error for the entire operation
- **FR-017**: Duplicate operations MUST return the new IDs of created items in the response, enabling follow-up operations on the copies

### Key Entities

- **Task**: A work item that can be moved, duplicated, converted to a project, or batch-updated with new property values
- **Section**: A folder or project in the OmniFocus hierarchy that can be moved or duplicated with all its contents
- **Position**: A placement specification consisting of a placement type (beginning, ending, before, after) and an optional relative-to identifier for before/after placements. Task operations accept positions targeting projects, tasks (as subtask), or the inbox. Section operations accept positions targeting folders or the library root only (not inbox or tasks).
- **Target Location**: The destination for move/duplicate operations — for tasks: a project (by ID or name), the inbox, or a parent task (by ID or name); for sections: a folder (by ID or name) or the library root
- **Batch Result**: A per-item outcome containing success/failure status, the item's ID, any error code and message, and disambiguation candidates when applicable
- **Property Update Set**: The collection of property changes to apply uniformly to all tasks in a batch-update operation. Each property is optional; only specified properties are modified. Supported properties: `flagged` (boolean), `dueDate` (ISO 8601 string), `deferDate` (ISO 8601 string), `addTags` (array of tag names/IDs), `removeTags` (array of tag names/IDs), `note` (string, appended), `estimatedMinutes` (number), `plannedDate` (ISO 8601 string, v4.7+). Clear flags: `clearDueDate`, `clearDeferDate`, `clearEstimatedMinutes`, `clearPlannedDate` (all boolean). Tag removals are processed before additions (FR-014)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can reorganize up to 100 tasks across projects in a single operation, with all valid items relocated and individual failures reported
- **SC-002**: Users can create template copies of tasks or project structures in a single operation, with all properties and hierarchies preserved in the duplicates
- **SC-003**: Users can promote inbox items to projects in a single batch operation, reducing the review workflow from N individual operations to one
- **SC-004**: Users can update multiple properties (flag, date, tag) across multiple tasks in one operation, reducing batch property changes from N*M individual calls to one
- **SC-005**: Partial failures in any batch operation do not block successful items; users receive clear per-item results showing which items succeeded and which failed with specific reasons
- **SC-006**: All position and hierarchy operations produce results consistent with the existing `move_project` and `move_folder` tools, preserving user expectations
- **SC-007**: All 6 tools pass contract validation and unit tests with the same coverage standards as existing tools (Phase 5/13 pattern)
- **SC-008**: Batch operations on the maximum allowed size (100 items) complete within a reasonable time consistent with existing batch tools

## Clarifications

### Session 2026-03-18

- Q: What are the exact return types of the OmniJS bulk API functions? → A: Per the official OmniFocus API (OF-API.html): `moveTasks()` returns void; `duplicateTasks()` returns `TaskArray` (new copies in library order); `convertTasksToProjects()` returns `Array of Project`; `moveSections()` returns void; `duplicateSections()` returns `SectionArray` (new copies in library order). Move functions have no return value; duplicate/convert functions return the newly created objects.
- Q: How do position parameter types differ between task operations and section operations? → A: Per the OmniFocus API: task operations (`moveTasks`, `duplicateTasks`) accept `Project, Task, or Task.ChildInsertionLocation` as position (projects, tasks, inbox); section operations (`moveSections`, `duplicateSections`) accept only `Folder or Folder.ChildInsertionLocation` as position (folder hierarchy only, no inbox or task targets). The MCP tool schemas must reflect this distinction.
- Q: How should the server handle OmniJS exceptions from invalid move/duplicate operations? → A: Catch OmniJS exceptions per-item and return the native error message with a generic OPERATION_FAILED error code. No pre-validation of circular moves or invalid targets; rely on OmniJS internal validation and surface its exceptions. Consistent with constitution Section III (Script Execution Safety) and existing patterns in moveFolder.ts/moveProject.ts.
- Q: How should duplicate/convert tools correlate input items with output items given OmniJS returns copies in library order (not input order)? → A: Call `duplicateTasks()`/`duplicateSections()`/`convertTasksToProjects()` one item at a time within the OmniJS script loop, not as a single batch call. This maintains 1:1 input-output correlation for per-item results (FR-007). Consistent with existing batch patterns (assignTags.ts, removeTags.ts) that iterate items individually within a single OmniJS execution.
- Q: Does `moveTasks()` preserve input array order when placing tasks at the target? → A: Yes. The API docs show sort-then-move patterns (Alpha-Sort Project Tasks plugin) that only work if `moveTasks()` preserves array order. Since the server processes items one at a time for per-item error handling, order is naturally preserved regardless.
- Q: Should `batch_update_tasks` support tag operations (addTags, removeTags, clearTags), or only simple property assignments? → A: Include `addTags` and `removeTags` only (no `clearTags`). FR-006 already commits to these in acceptance scenarios 2-4. Adding `clearTags` would create ambiguity with `replaceTags: []` and exceed the YAGNI principle (Constitution VIII) since users can achieve the same result with `removeTags` listing specific tags. Dedicated `assign_tags`/`remove_tags` tools cover complex tag workflows.
- Q: What properties should `batch_update_tasks` support? → A: The property set in FR-006 is correct and complete: `flagged`, `dueDate`, `deferDate`, `addTags`, `removeTags`, `note` (append), `clearDueDate`, `clearDeferDate`, `estimatedMinutes`, and `plannedDate`. Additionally, `clearEstimatedMinutes` and `clearPlannedDate` are added for consistency (see Q5). Properties excluded: `newName` (renaming all tasks to the same value is rarely useful in batch), status changes (dedicated `mark_complete`/`mark_incomplete`/`drop_items` tools exist), `replaceTags` (see Q1). `plannedDate` requires v4.7+ version gating consistent with the existing `set_planned_date` tool.
- Q: Should `batch_update_tasks` apply ALL properties to ALL tasks (uniform), or support per-task property overrides? → A: Uniform properties applied to all tasks in the batch. Consistent with every existing batch tool in the codebase (`markComplete`, `assignTags`, `removeTags`, etc.), aligns with Constitution VII (KISS) and VIII (YAGNI). Per-task overrides would effectively duplicate `editItem` functionality. Users needing different properties per task can make multiple `batch_update_tasks` calls (each with a different property set and task list) or use `editItem` individually.
- Q: How should partial failures work when multiple properties are updated on a single task and one property fails? → A: Atomic per-task: all property updates for a single task are applied within one try-catch block. If any property update throws (e.g., addTag fails after dueDate succeeded), the task is reported as `success: false` with the error message. No rollback is attempted (OmniJS has no transaction support), so earlier properties may have been applied. The per-item result includes the error details. This matches the existing `editItem` pattern and Constitution III (Script Execution Safety). The response documentation will note that partial property application may occur on failed items.
- Q: Should `batch_update_tasks` support clearing properties (setting to null) in addition to setting values? → A: Yes, using explicit `clearX` boolean flags. FR-006 already specifies `clearDueDate` and `clearDeferDate`. Add `clearEstimatedMinutes` and `clearPlannedDate` for consistency. `flagged: false` handles unflagging (no separate clear needed). `note` is append-only (no clear — that would be destructive). This explicit-flag pattern avoids ambiguity between "not specified" (do not touch the property) and "set to null" (clear the property value).

## Assumptions

- OmniFocus is running on the same machine and accessible via Omni Automation
- The OmniJS `moveTasks()`, `duplicateTasks()`, `convertTasksToProjects()`, `moveSections()`, and `duplicateSections()` functions are available in all supported OmniFocus versions (no version gating required)
- `moveTasks()` and `moveSections()` return void; the server re-reads task/section properties from the original objects after the move completes
- `duplicateTasks()` returns a `TaskArray` of the new copies in library order of the originals; `duplicateSections()` returns a `SectionArray` of the new copies in library order. However, the server calls these functions one item at a time (not as a batch) to maintain per-item correlation for FR-007 results
- `convertTasksToProjects()` returns an `Array of Project` containing the newly created projects; example: `const newProjects = convertTasksToProjects(inbox, library.ending)`
- `moveSections()` and `duplicateSections()` accept arrays of Section objects (folders and/or projects) and a Position object
- Position objects are constructed from container properties: `project.ending`, `folder.beginning`, `inbox.ending`, `task.before`, etc.
- Duplicated items are distinct objects with new IDs; changes to duplicates do not affect originals
- Moving a task with subtasks moves the entire subtask tree (standard OmniFocus behavior)
- The `batch_update_tasks` tool iterates over tasks and applies property changes individually (no OmniJS batch-update API exists; this is a server-side batching pattern)
- Tag references in `batch_update_tasks` (`addTags`/`removeTags`) accept tag names or IDs, consistent with existing `assign_tags`/`remove_tags` tools
- Note updates in `batch_update_tasks` append to existing notes (consistent with `append_note` tool behavior), not overwrite
- OmniFocus internally prevents circular hierarchy moves (folder into itself); the system surfaces these as errors rather than silently failing

## Out of Scope

- **Cross-database operations** — single OmniFocus database only
- **Undo grouping for bulk operations** — OmniJS limitation; each modification is a separate undo step
- **Project-to-task conversion** — not supported by OmniJS; conversion is one-way (task to project only)
- **Batch operations exceeding 100 items** — performance safeguard; larger batches should be split by the caller
- **Creating new tags during batch-update** — `addTags` references existing tags only; tag creation uses the dedicated `create_tag` tool
- **Batch-update on projects** — `batch_update_tasks` operates on tasks only; project property changes use the existing `edit_project` tool
- **Ordering control within a moved batch** — items within a batch are processed in array order (one at a time per item for per-item error handling); custom reordering within the batch is not supported
- **clearTags in batch-update** — users can achieve tag clearing via `removeTags` with specific tag names; `clearTags` is excluded per YAGNI (Constitution VIII)
- **Per-task property overrides in batch-update** — all properties are applied uniformly to all tasks; per-task overrides would duplicate `editItem` functionality; users should call `editItem` individually or make multiple `batch_update_tasks` calls with different property sets
- **Rollback on partial property failure** — OmniJS has no transaction support; if a property update fails mid-task, earlier properties on that task may have been applied; this is documented, not mitigated
