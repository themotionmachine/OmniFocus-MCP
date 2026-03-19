# Feature Specification: Search & Database

**Feature Branch**: `009-search-database`
**Created**: 2026-03-18
**Status**: Draft
**Input**: User description: "Search & Database — smart search across all item types and essential database operations through the MCP server"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search Tasks by Name (Priority: P1)

A GTD practitioner wants to quickly find specific tasks by searching for keywords in task names. They may have hundreds of tasks across multiple projects and need to locate items without manually browsing the hierarchy. The search should default to showing only active tasks but allow filtering by status when needed.

**Why this priority**: Task search is the most frequently needed capability. Tasks are the fundamental unit of work in GTD, and users interact with them more than any other item type. Without task search, users must rely on browsing or exact name lookups, which is impractical for databases with hundreds of items.

**Independent Test**: Can be fully tested by creating several tasks with known names, searching for a keyword, and verifying the correct tasks are returned. Delivers immediate value as a standalone search tool.

**Acceptance Scenarios**:

1. **Given** multiple tasks exist with the word "report" in their names, **When** the user searches for "report", **Then** the system returns all matching tasks with their IDs, names, project associations, and status
2. **Given** a task named "Write quarterly report" exists, **When** the user searches for "QUARTERLY" (different case), **Then** the task is returned (case-insensitive matching)
3. **Given** 200 tasks match the search query, **When** the user searches with no limit specified, **Then** only the first 50 results are returned (default limit) along with a total match count
4. **Given** tasks exist in completed, dropped, and active states, **When** the user searches with the default status filter, **Then** only active tasks are returned
5. **Given** a user wants to find completed tasks, **When** they search with a status filter set to include completed items, **Then** completed tasks matching the query are returned
6. **Given** no tasks match the search query, **When** the user searches, **Then** the system returns an empty result set with zero matches (not an error)

---

### User Story 2 - Search Projects by Name (Priority: P1)

A GTD practitioner wants to find specific projects across all folders by name. They need to quickly locate projects to check their status, add tasks, or review progress.

**Why this priority**: Projects are the second most-accessed item type in GTD workflows. Locating projects by name is essential for delegation, review, and status updates. Native Smart Match provides built-in relevance ranking, making this a high-quality search experience.

**Independent Test**: Can be tested by creating projects with known names in different folders, searching by keyword, and verifying the correct projects are returned with folder context.

**Acceptance Scenarios**:

1. **Given** projects exist across multiple folders, **When** the user searches for a project name keyword, **Then** the system returns matching projects with their IDs, names, folder locations, and status
2. **Given** a user specifies a result limit of 10, **When** matching projects exceed 10, **Then** only 10 results are returned along with a total match count
3. **Given** no projects match the search query, **When** the user searches, **Then** the system returns an empty result set

---

### User Story 3 - Search Folders by Name (Priority: P2)

A GTD practitioner wants to find specific organizational folders by name, particularly useful in large databases with deep folder hierarchies.

**Why this priority**: Folders organize the GTD hierarchy but are searched less frequently than tasks or projects. This is still important for navigation and organizational tasks but can follow after core task/project search.

**Independent Test**: Can be tested by creating folders with known names, searching by keyword, and verifying matching folders are returned.

**Acceptance Scenarios**:

1. **Given** folders exist in the database, **When** the user searches for a folder name keyword, **Then** the system returns matching folders with their IDs, names, and parent folder information
2. **Given** no folders match the search query, **When** the user searches, **Then** the system returns an empty result set

---

### User Story 4 - Search Tags by Name (Priority: P2)

A GTD practitioner wants to find specific tags (contexts/labels) by name to assign them to tasks or review tagged items.

**Why this priority**: Tag search supports the GTD context-based workflow but is typically less frequent than task or project search. Still important for users with many tags representing contexts, energy levels, or locations.

**Independent Test**: Can be tested by creating tags with known names, searching by keyword, and verifying matching tags are returned.

**Acceptance Scenarios**:

1. **Given** tags exist in the database, **When** the user searches for a tag name keyword, **Then** the system returns matching tags with their IDs, names, and parent tag information
2. **Given** no tags match the search query, **When** the user searches, **Then** the system returns an empty result set

---

### User Story 5 - Get Database Statistics (Priority: P2)

A GTD practitioner wants to understand the health of their GTD system by viewing aggregate statistics: how many tasks are active, completed, or overdue; how many projects exist; and how many items are in the inbox.

**Why this priority**: Database statistics support the GTD weekly review process and system health monitoring. Understanding task distribution by status helps practitioners identify bottlenecks and maintain a trusted system.

**Independent Test**: Can be tested by querying database statistics and verifying the returned counts match the actual database state (sum of tasks by status, project count, inbox count).

**Acceptance Scenarios**:

1. **Given** a database with tasks in various states, **When** the user requests statistics, **Then** the system returns task counts broken down by status (available, blocked, completed, dropped) plus total count
2. **Given** projects exist in the database, **When** the user requests statistics, **Then** the system returns project counts broken down by status (active, completed, dropped, on hold)
3. **Given** items exist in the inbox, **When** the user requests statistics, **Then** the inbox item count is included in the statistics
4. **Given** folders and tags exist, **When** the user requests statistics, **Then** folder and tag totals are included

---

### User Story 6 - Get Inbox Count (Priority: P2)

A GTD practitioner wants a quick, lightweight check of how many items are in their inbox without retrieving full statistics. This enables AI assistants to proactively suggest inbox processing when items accumulate.

**Why this priority**: Inbox count is the most common "pulse check" in GTD. AI assistants can use this to prompt users to process their inbox. It must be lightweight and fast to enable frequent polling.

**Independent Test**: Can be tested by adding items to the inbox, querying the count, and verifying it matches the actual number of inbox items.

**Acceptance Scenarios**:

1. **Given** items exist in the inbox, **When** the user requests the inbox count, **Then** the system returns the exact number of inbox items
2. **Given** the inbox is empty, **When** the user requests the inbox count, **Then** the system returns zero
3. **Given** the inbox count was recently checked, **When** the user requests it again after adding items, **Then** the updated count reflects the new items

---

### User Story 7 - Save Database and Trigger Sync (Priority: P3)

A GTD practitioner wants to explicitly save the database and trigger synchronization so changes made through the MCP server propagate to other devices (iPhone, iPad) promptly.

**Why this priority**: Save and sync is a convenience operation. OmniFocus auto-saves periodically, but explicit save ensures immediate propagation after a batch of AI-assisted changes. Lower priority because the system functions correctly without it.

**Independent Test**: Can be tested by making changes through the MCP server, triggering save, and verifying the operation completes without error.

**Acceptance Scenarios**:

1. **Given** changes have been made to the database, **When** the user triggers save, **Then** the database is saved and sync is triggered (if sync is enabled)
2. **Given** no changes have been made, **When** the user triggers save, **Then** the operation completes successfully (idempotent behavior)

---

### User Story 8 - Clean Up Database (Priority: P3)

A GTD practitioner wants to trigger the OmniFocus "Clean Up" operation, which processes inbox items by moving them to their assigned projects/folders based on configured rules.

**Why this priority**: Clean Up is an organizational maintenance operation. It mirrors the toolbar button in the OmniFocus app. Useful after batch task creation via AI but lower priority because it is not destructive and items function correctly without cleanup.

**Acceptance Scenarios**:

1. **Given** inbox items have been assigned to projects, **When** the user triggers clean up, **Then** items are moved to their assigned locations per OmniFocus rules
2. **Given** no items need cleanup, **When** the user triggers clean up, **Then** the operation completes successfully (idempotent behavior)

**Independent Test**: Can be tested by creating tasks in the inbox with project assignments, triggering cleanup, and verifying items are relocated.

---

### User Story 9 - Undo/Redo Operations (Priority: P3)

A GTD practitioner wants to undo or redo the most recent operation performed through the MCP server (or in OmniFocus itself), providing a safety net for accidental changes made via AI assistants.

**Why this priority**: Undo/redo is a safety mechanism rather than a primary workflow operation. It is critical for trust but used infrequently. Both operations are destructive (they alter database state) and must pre-check availability before attempting execution.

**Independent Test**: Can be tested by performing an operation (e.g., creating a task), triggering undo, verifying the task is removed, then triggering redo, and verifying it reappears.

**Acceptance Scenarios**:

1. **Given** a recent undoable operation exists, **When** the user triggers undo, **Then** the most recent operation is reversed and the system confirms what was undone
2. **Given** an undo has just been performed, **When** the user triggers redo, **Then** the undone operation is reapplied
3. **Given** no undoable operations exist (undo stack is empty), **When** the user triggers undo, **Then** the system returns a clear message that nothing is available to undo (not an error exception)
4. **Given** no redoable operations exist (redo stack is empty), **When** the user triggers redo, **Then** the system returns a clear message that nothing is available to redo (not an error exception)
5. **Given** an AI assistant is about to trigger undo, **When** it reads the tool description, **Then** the description warns that undo is a destructive operation that reverses the most recent change across the entire database (not scoped to MCP operations)

---

### Edge Cases

- What happens when searching with an empty query string? The system should return a validation error requiring a non-empty search query
- What happens when the search limit is set to 0 or a negative number? The system should return a validation error requiring a positive limit value
- What happens when undo is triggered immediately after redo? The system should reverse the redo (standard undo stack behavior)
- What happens when save is triggered while OmniFocus is performing a sync? The operation should complete normally (OmniFocus handles concurrent sync internally)
- What happens when statistics are requested on an empty database? The system should return all counts as zero (not an error)
- What happens when search returns tasks from the inbox (tasks not assigned to a project)? The result should indicate the task is in the inbox rather than showing a null project
- What happens when the status filter for task search specifies an invalid status value? The system should return a validation error listing valid status options
- What happens when undo/redo is called and another OmniFocus operation is in progress? OmniFocus serializes operations internally; the undo/redo will execute in sequence

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow searching tasks by name using case-insensitive substring matching, returning matching tasks with ID, name, project, and status
- **FR-002**: System MUST allow searching projects by name using relevance-ranked matching, returning matching projects with ID, name, folder, and status
- **FR-003**: System MUST allow searching folders by name using relevance-ranked matching, returning matching folders with ID, name, and parent folder
- **FR-004**: System MUST allow searching tags by name using relevance-ranked matching, returning matching tags with ID, name, and parent tag
- **FR-005**: All search operations MUST accept a configurable result limit parameter with a default of 50 and a maximum of 1000
- **FR-006**: Task search MUST accept a `status` filter parameter that defaults to "active" (showing only active tasks), with accepted values: "active" (default), "completed", "dropped", or "all"
- **FR-007**: All search operations MUST return an empty result set (not an error) when no items match the query
- **FR-008**: All search operations MUST return the total number of matches alongside the limited result set, so users know if results were truncated
- **FR-009**: System MUST provide a database cleanup operation that triggers OmniFocus's built-in clean up behavior
- **FR-010**: System MUST provide an undo operation that reverses the most recent database change, with a pre-check for undo availability before attempting execution
- **FR-011**: System MUST provide a redo operation that reapplies the most recently undone change, with a pre-check for redo availability before attempting execution
- **FR-012**: Undo and redo operations MUST return a clear, non-error message when nothing is available to undo or redo, rather than throwing an exception
- **FR-013**: System MUST provide a save operation that persists database changes and triggers synchronization if enabled
- **FR-014**: System MUST provide database statistics including task counts by status (available, blocked, completed, dropped), project counts by status, folder count, tag count, and inbox item count
- **FR-015**: System MUST provide a lightweight inbox count operation that returns only the number of inbox items
- **FR-016**: Search queries MUST require a non-empty string (minimum 1 character) and return a validation error for empty queries

### Key Entities

- **Search Result**: A matched item containing: id, name, status, and parent context. Parent context is type-specific: project name for tasks (or "Inbox" if unassigned), folder name for projects, parent folder name for folders, parent tag name for tags (or null if top-level). This "rich result" shape provides enough context for identification without a follow-up detail query.
- **Search Query**: A user-provided text string used for matching, combined with optional filters (status, limit) that constrain results
- **Database Statistics**: An aggregate summary of the OmniFocus database containing counts by item type and status, providing a health overview of the GTD system
- **Inbox Count**: A single numeric value representing the number of unprocessed items in the OmniFocus inbox

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can locate any task, project, folder, or tag by name in a single search operation, with results returned within the same response time as existing item-listing operations
- **SC-002**: Search results include enough context (ID, name, parent/project, status) for users to identify and act on items without follow-up queries
- **SC-003**: Task search defaults to active-only results, reducing noise for GTD practitioners who primarily work with actionable items
- **SC-004**: Database statistics provide a complete GTD system health overview in a single operation, supporting weekly review workflows
- **SC-005**: Inbox count returns in a single lightweight operation, enabling AI assistants to check inbox status without retrieving full statistics
- **SC-006**: Undo and redo operations safely handle empty stacks without raising errors, providing a reliable safety net for AI-assisted changes
- **SC-007**: Save and cleanup operations complete idempotently, with no adverse effects when triggered on an already-saved or already-clean database
- **SC-008**: All 8 tools pass contract validation and unit tests with the same coverage standards as existing tools

## Assumptions

- OmniFocus is running on the same machine and accessible via Omni Automation
- Task search uses `flattenedTasks.filter()` with case-insensitive substring matching on the `name` property, as no native `tasksMatching()` API exists
- Project, folder, and tag search use native Smart Match methods (`projectsMatching()`, `foldersMatching()`, `tagsMatching()`) which provide Quick Open-style relevance ranking — this means the ranking behavior differs between task search (order of iteration) and project/folder/tag search (relevance-ranked)
- The tool descriptions for project, folder, and tag search will note that results use relevance ranking (matching Quick Open behavior), while task search uses substring matching (matching order of iteration)
- `cleanUp()`, `save()`, `undo()`, and `redo()` are top-level Database functions in OmniJS context (not `document.*` methods)
- `canUndo` and `canRedo` are read-only Boolean properties (not method calls) — accessed as `canUndo` not `canUndo()`
- `save()` is synchronous and triggers sync if sync is configured in OmniFocus preferences
- `undo()` and `redo()` throw errors when the respective stack is empty — the pre-check via `canUndo`/`canRedo` is mandatory before calling these methods
- `flattenedTasks` includes ALL tasks (completed, dropped, inbox items) — filtering by status must be applied within the OmniJS script for performance
- The `inbox` collection provides `.length` for counting inbox items without iterating
- Task status values for filtering align with OmniFocus `Task.Status` enum values (Available, Blocked, Completed, Dropped, etc.)
- Database statistics are computed by iterating flattened collections with status-based filtering — this is acceptable performance for typical OmniFocus databases (under 10,000 items)
- No sort parameter is provided for search results — `*Matching()` methods return relevance-ordered results (Quick Open semantics) and `flattenedTasks.filter()` returns database order; both are acceptable without user-configurable sorting

## Clarifications

### Session 2026-03-18

- Q: What properties should search match against for each item type? → A: Name only — search matches exclusively against the `name` property. Note search is explicitly out of scope, deferred to SPEC-020 for performance reasons (iterating large note text blobs degrades search speed in databases with thousands of items).
- Q: What should `search_tasks` default status filter be and what values should the `status` parameter accept? → A: Defaults to active tasks only. The `status` filter parameter accepts "active" (default), "completed", "dropped", or "all".
- Q: What fields should each search result include? → A: Rich results — id, name, status, and parent context (project name for tasks, folder name for projects, parent tag name for tags). This gives AI assistants enough context to identify and act on items without a follow-up lookup call.
- Q: Should search results include a sort parameter or rely on natural ordering? → A: No sort parameter. `*Matching()` returns relevance-ordered results naturally (Quick Open semantics); `flattenedTasks.filter()` returns in database order, which is acceptable for substring matches with a limit parameter.
- Q: Should search support matching against multiple fields (name AND note) or single field only? → A: Single field only (name). Consistent with the out-of-scope decision on note search; multi-field matching is deferred to SPEC-020.

### Session 2026-03-18 (Database Operations)

- Q: What should `cleanup_database` return? → A: Success/failure only (boolean). `cleanUp()` is void in OmniJS and returns no information about processed items. The tool cannot report counts of items moved.
- Q: What should `undo`/`redo` return after the operation? → A: Success boolean + post-operation `canUndo`/`canRedo` state. This gives AI assistants enough info to know if they can continue undoing/redoing.
- Q: Should `get_database_stats` break down by status? → A: Yes. Tasks by status (active, completed, dropped counts), projects by status (active, completed, dropped, on-hold counts), plus folder count, tag count, and inbox count.
- Q: Should `get_inbox_count` return just the count or also sample items? → A: Just the count (number). This is meant to be lightweight. AI assistants can use `search_tasks` or `list_tasks` for item details.
- Q: Does `cleanUp()` return any information about processed items? → A: No, it is void. It triggers OmniFocus's built-in cleanup behavior (archiving completed items, etc.) and returns nothing.

## Out of Scope

- **Full-text search in task notes** — deferred due to performance concerns for large databases; planned for SPEC-020 optimization phase
- **Semantic/vector search** — no embedding infrastructure exists; out of scope for this project
- **Transaction grouping for undo** — OmniJS treats each operation as a separate undo step; grouping multiple MCP operations into a single undo step is not possible
- **Cross-field search** (matching across name + note + tag names simultaneously) — search targets item names only in this phase
- **Search history or saved searches** — no persistence layer for search preferences
