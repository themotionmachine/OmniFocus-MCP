# Feature Specification: Task Status & Completion

**Feature Branch**: `013-task-status`
**Created**: 2026-03-17
**Status**: Draft
**Input**: User description: "Task Status & Completion — explicit task/project lifecycle operations through the MCP server"

## Clarifications

### Session 2026-03-17 (OmniJS API Research)

- Q: How does `task.drop(allOccurrences)` work for repeating tasks? → A: `drop(true)` permanently stops the task from repeating; `drop(false)` drops the current occurrence but the task repeats normally. The `drop_items` tool exposes `allOccurrences` as an optional boolean parameter, defaulting to `true` (permanent drop — aligns with GTD "abandon" semantics).
- Q: What is the `markComplete(date)` parameter format? → A: `markComplete(date: Date or null)` — accepts a `Date` object or `null` (uses current date). For repeating tasks, it clones the task and marks the clone as completed; the original continues repeating. Returns the completed `Task`.
- Q: Does `markIncomplete()` work on dropped items? → A: No — the API explicitly states "If the task is **completed**, marks it as incomplete." For dropped items, the correct mechanism is `task.active = true`. The `mark_incomplete` tool must internally detect the item's state and use the appropriate mechanism (markIncomplete for completed, active=true for dropped).
- Q: What does `project.nextTask` return when no tasks are available? → A: Returns `null` in two cases: (1) no available tasks, (2) project contains singleton actions. The `get_next_task` tool must distinguish these cases in its response message.
- Q: How to detect OmniFocus version for v3.8+ drop API? → A: Use `app.userVersion.atLeast(new Version("3.8"))` — the `Version` class provides `atLeast()`, `isAfter()`, and `equals()` comparison methods. `app.version` is deprecated.
- Q: Do projects have a `drop()` method? → A: No — projects use `project.status = Project.Status.Dropped` (or equivalently `project.task.active = false`). Only `Task` has the `drop(allOccurrences)` method. The `allOccurrences` parameter is therefore irrelevant for project drops and should be ignored when processing projects in a batch.
- Q: Which tools require OmniFocus v3.8+? → A: Only `drop_items` — specifically `task.drop(allOccurrences)`. All other APIs used by the remaining 5 tools (`markComplete`, `markIncomplete`, `project.nextTask`, `shouldUseFloatingTimeZone`, `sequential`/`containsSingletonActions`) are standard OmniJS APIs with no version constraints.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mark Items Complete (Priority: P1)

A GTD practitioner finishes a task or completes all work in a project and wants to mark it done through their AI assistant. They may optionally specify a completion date (e.g., backdating a task they finished yesterday).

**Why this priority**: Marking items complete is the single most frequent lifecycle operation in GTD. Without it, users cannot close the loop on any work item via the MCP server, forcing them to switch to the OmniFocus app for the most basic workflow step.

**Independent Test**: Can be fully tested by creating a task, marking it complete, and verifying its status changes to "Completed". Delivers immediate value as a standalone capability.

**Acceptance Scenarios**:

1. **Given** an active task exists, **When** the user marks it complete with no date, **Then** the task status becomes "Completed" with the current date/time as the completion date
2. **Given** an active task exists, **When** the user marks it complete with a specific date, **Then** the task status becomes "Completed" with that date as the completion date
3. **Given** an active project exists, **When** the user marks the project complete, **Then** the project and all remaining active tasks within it become "Completed"
4. **Given** multiple items are provided in a batch (1-100), **When** some items are valid and some are not found, **Then** valid items are completed and invalid items return individual errors, without failing the entire batch
5. **Given** items are identified by name and multiple matches exist, **When** the user marks them complete, **Then** the system returns a disambiguation error listing all matching items for that entry

---

### User Story 2 - Reopen Completed/Dropped Items (Priority: P2)

A GTD practitioner realizes they prematurely completed or dropped a task/project and needs to reopen it for continued work.

**Why this priority**: Mistakes happen — marking something complete accidentally is common. Without reopen capability, users are stuck (delete + recreate loses metadata, tags, notes). This is the essential "undo" for completion.

**Independent Test**: Can be tested by completing a task, then marking it incomplete, and verifying it returns to "Available" status.

**Acceptance Scenarios**:

1. **Given** a completed task exists, **When** the user marks it incomplete, **Then** the task returns to an active, available state
2. **Given** a dropped task exists, **When** the user marks it incomplete, **Then** the task returns to an active, available state
3. **Given** a completed project exists, **When** the user marks it incomplete, **Then** the project returns to active status (child tasks retain their individual status)
4. **Given** multiple items are provided in a batch, **When** some are already active, **Then** already-active items succeed as no-ops and other items are reopened, with per-item results

---

### User Story 3 - Drop Items (Priority: P2)

A GTD practitioner decides not to pursue a task or project but wants to preserve it in the system (not delete it). Dropping removes items from active views while keeping them searchable for reference.

**Why this priority**: "Drop" is a core GTD concept distinct from "delete" — dropped items can be reviewed and reopened later. This is essential for the GTD "someday/maybe" review pattern and for preserving decision history.

**Independent Test**: Can be tested by dropping a task and verifying it no longer appears in active task lists but still exists in the database.

**Acceptance Scenarios**:

1. **Given** an active task exists, **When** the user drops it, **Then** the task status becomes "Dropped" and it no longer appears in active task views
2. **Given** an active project exists, **When** the user drops it, **Then** the project and its remaining tasks become "Dropped"
3. **Given** multiple items are provided in a batch, **When** some are valid and some are not found, **Then** valid items are dropped and invalid items return individual errors
4. **Given** a repeating task exists, **When** the user drops it with `allOccurrences=true` (default), **Then** the task is dropped and will not repeat again
5. **Given** a repeating task exists, **When** the user drops it with `allOccurrences=false`, **Then** the current occurrence is dropped but the task repeats normally at its next interval
6. **Given** a task is already dropped, **When** the user drops it again, **Then** the operation succeeds as a no-op (idempotent behavior)
7. **Given** the user's OmniFocus version does not support the drop operation, **When** they attempt to drop an item, **Then** the system returns a clear version-compatibility error

---

### User Story 4 - Set Project Type (Priority: P3)

A GTD practitioner wants to change how tasks within a project are presented — as a sequential checklist (one at a time), parallel tasks (all available), or a single-actions list (unordered bucket).

**Why this priority**: Project type determines task visibility and ordering, which is important for focused execution. However, project type is typically set at creation and changed infrequently, making this lower priority than completion operations.

**Independent Test**: Can be tested by creating a project, setting it to sequential, and verifying that only the first task appears as "Next" in task listings.

**Acceptance Scenarios**:

1. **Given** a parallel project with multiple tasks, **When** the user sets it to sequential, **Then** only the first incomplete task is marked as "Next" and the rest become "Blocked"
2. **Given** a sequential project, **When** the user sets it to single-actions, **Then** all tasks become independently available (no ordering)
3. **Given** a project, **When** the user sets both sequential and single-actions simultaneously, **Then** single-actions wins (consistent with established precedence rules) and the project becomes a single-actions list
4. **Given** a project that is already the requested type, **When** the user sets the same type again, **Then** the operation succeeds as a no-op

---

### User Story 5 - Get Next Task (Priority: P3)

A GTD practitioner working through a sequential project wants to know which task to work on next without browsing the full project.

**Why this priority**: Useful for focused execution workflows, but depends on projects being set to sequential type. Most users can achieve this by listing tasks with status filters, making this a convenience feature.

**Independent Test**: Can be tested by creating a sequential project with 3 tasks and verifying the system returns only the first incomplete task.

**Acceptance Scenarios**:

1. **Given** a sequential project with incomplete tasks, **When** the user requests the next task, **Then** the system returns the first available (non-blocked, non-completed) task with full task details
2. **Given** a parallel project, **When** the user requests the next task, **Then** the system returns the first available task (since all are available in parallel projects)
3. **Given** a project where all tasks are completed, **When** the user requests the next task, **Then** the system indicates no tasks are available with a message distinguishing "all tasks completed" from other reasons
4. **Given** a single-actions list project, **When** the user requests the next task, **Then** the system indicates that single-actions projects do not have a sequential next task (distinct from "no tasks available")
5. **Given** a project identified by name with multiple matches, **When** the user requests the next task, **Then** the system returns a disambiguation error

---

### User Story 6 - Set Floating Timezone (Priority: P4)

A GTD practitioner who travels across time zones wants task due dates and defer dates to follow their device's current timezone rather than being pinned to a specific timezone.

**Why this priority**: This is an edge case affecting only users who travel frequently. Most users never need to change this setting. However, when needed, incorrect timezone behavior can cause tasks to appear due at wrong times.

**Independent Test**: Can be tested by setting floating timezone on a task with a due date and verifying the timezone behavior changes.

**Acceptance Scenarios**:

1. **Given** a task with a due date, **When** the user enables floating timezone, **Then** the due date adjusts to the device's current timezone when viewed from different time zones
2. **Given** a project with defer/due dates, **When** the user enables floating timezone, **Then** all date-related fields on the project follow the device timezone
3. **Given** a task or project, **When** the user disables floating timezone, **Then** dates are pinned to the timezone in which they were originally set
4. **Given** a task with no dates set, **When** the user sets floating timezone, **Then** the setting is applied and will take effect when dates are later assigned

---

### Edge Cases

- What happens when completing a repeating task? The system should complete the current occurrence and generate the next repetition per OmniFocus repeat rules
- What happens when completing a task that is a dependency for other tasks in a sequential project? The next task in sequence should become available
- What happens when dropping a project that contains tasks with tags? Tags should be preserved on the dropped tasks for future reference if reopened
- What happens when marking incomplete a project whose parent folder is dropped? The project should be reopened regardless of folder status
- What happens when batch operations include duplicate identifiers? Each occurrence should be processed independently (the second may be a no-op if already changed by the first)
- What happens when the drop operation is requested on an OmniFocus version that does not support it? The system should return a clear version-compatibility error rather than failing silently
- What happens when `get_next_task` is called on a single-actions project? The system should return a distinct message indicating that single-actions projects do not have a sequential ordering (the API returns null in this case, same as empty project)
- What happens when `mark_incomplete` is called on a dropped item vs. a completed item? The tool should detect the item's current state and use the correct internal mechanism — these are different operations that produce the same user-visible result (item becomes active)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow marking individual tasks and projects as complete, with an optional completion date parameter
- **FR-002**: System MUST allow marking individual tasks and projects as incomplete, restoring them to an active state regardless of whether they were completed or dropped (internally using the appropriate mechanism for each state)
- **FR-003**: System MUST allow dropping tasks and projects, setting them to "Dropped" status while preserving all data (distinct from deletion), with an optional parameter to control whether repeating items stop repeating (default: stop all future occurrences)
- **FR-004**: System MUST support batch operations for mark-complete, mark-incomplete, and drop, accepting 1 to 100 items per request
- **FR-005**: Batch operations MUST return per-item success/failure results, allowing partial failures without failing the entire batch
- **FR-006**: System MUST support item identification by either ID (preferred) or name, with disambiguation when multiple items share a name
- **FR-007**: System MUST allow setting project type to sequential, parallel, or single-actions, with single-actions taking precedence when conflicting options are provided
- **FR-008**: System MUST allow querying the next available task in a project, returning full task details or an appropriate message when no tasks are available
- **FR-009**: System MUST allow enabling or disabling floating timezone on tasks and projects, controlling whether dates follow the device's current timezone
- **FR-010**: System MUST return a clear, actionable error when the drop operation is attempted on an unsupported OmniFocus version
- **FR-011**: Completing a repeating task MUST trigger the creation of the next occurrence according to OmniFocus repeat rules
- **FR-012**: All operations MUST be idempotent — completing an already-completed item or dropping an already-dropped item should succeed without error

### Key Entities

- **Task**: A work item with a lifecycle state (available, blocked, completed, dropped) that can be individually completed, reopened, or dropped
- **Project**: A container for tasks with a lifecycle state and a type (sequential, parallel, single-actions) that determines task ordering and visibility
- **Item Identifier**: A reference to a task or project by either unique ID or display name, with disambiguation when names are ambiguous
- **Batch Result**: A per-item outcome within a batch operation, containing success/failure status, error details, and disambiguation candidates when applicable

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a task or project in a single operation, with the status change reflected immediately in OmniFocus
- **SC-002**: Users can reopen any completed or dropped item in a single operation, restoring it to an active workflow
- **SC-003**: Batch operations process up to 100 items per request, with individual failures not blocking successful items
- **SC-004**: All lifecycle operations (complete, incomplete, drop) are idempotent — repeated operations on the same item produce consistent results without errors
- **SC-005**: Project type changes take effect immediately, with task availability updating to reflect the new ordering mode
- **SC-006**: Next-task queries return results within the same response time as existing single-item lookups
- **SC-007**: Version-incompatible operations return clear, actionable error messages rather than silent failures
- **SC-008**: All 6 tools pass contract validation and unit tests with the same coverage standards as existing tools

## Assumptions

- OmniFocus is running on the same machine and accessible via Omni Automation
- The OmniFocus version supports all referenced APIs; the `task.drop()` method specifically requires v3.8+ and version detection via `app.userVersion.atLeast()` is provided. All other APIs (`markComplete`, `markIncomplete`, `nextTask`, `shouldUseFloatingTimeZone`, `sequential`, `containsSingletonActions`) are standard and have no version constraints — only `drop_items` requires the version check
- Completing a project implicitly completes all remaining active child tasks (standard OmniFocus behavior via `project.markComplete()`)
- Marking a project incomplete does NOT automatically reopen its child tasks — child tasks retain their individual status
- The completion date parameter for mark-complete accepts ISO 8601 date strings (converted to OmniJS `Date` objects internally)
- Completing a repeating task/project clones it — the clone is marked completed, the original continues repeating (confirmed OmniJS behavior)
- Floating timezone is a per-item boolean property (`shouldUseFloatingTimeZone`), not a global setting; reverts to database default if no dates are assigned
- Project type mutual exclusion follows the same precedence as existing project editing: single-actions wins over sequential when both are requested
- Projects do not have a `drop()` method — dropping a project uses `project.status = Project.Status.Dropped`; the `allOccurrences` parameter from `drop_items` is ignored for projects (it only applies to `task.drop()`)
- The `markIncomplete()` method only works on completed items; dropped items require `active = true` to restore — the `mark_incomplete` tool handles both cases transparently

## Out of Scope

- **Task status querying** — already handled by `list_tasks` with status filter (Phase 3)
- **Project status changes via edit** — already handled by `edit_project` (Phase 4); this spec adds dedicated lifecycle operations (complete, drop, reopen) that are distinct from property editing
