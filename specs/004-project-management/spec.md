# Feature Specification: Project Management Tools

**Feature Branch**: `004-project-management`
**Created**: 2025-12-12
**Status**: Draft
**Input**: Phase 4 Project Management: Implement 6 dedicated project management
tools for OmniFocus

## Overview

This feature adds comprehensive project management capabilities to the OmniFocus
MCP Server. While the server currently provides basic project operations through
`add_project` (create-only), AI assistants lack the ability to:

- List projects with filtering (by folder, status, review dates)
- Get complete details about a specific project
- Edit existing project properties (name, status, dates, settings)
- Delete projects
- Move projects between folders

Currently, AI assistants must use `dump_database` to discover projects, which
returns the entire database and is inefficient for targeted project queries.
There is also no way to modify project properties after creation or relocate
projects in the organizational hierarchy.

### Business Value

- **Efficient Project Discovery**: Enable AI assistants to find specific projects
  without loading the entire database
- **Complete Project Visibility**: Provide full project details for informed
  decision-making about task organization and prioritization
- **Project Lifecycle Management**: Support the full CRUD lifecycle for projects
  (Create, Read, Update, Delete)
- **Organizational Flexibility**: Allow restructuring project hierarchies by
  moving projects between folders
- **Review Workflow Support**: Surface project review status for GTD review cycles
- **Parity with Task Management**: Match the Phase 3 task tools with equivalent
  project capabilities

## Clarifications

### Session 2025-12-12

- Q: When setting `sequential: true` on a project with `containsSingletonActions: true` (or vice versa), should the system auto-clear the conflicting property or return a validation error? → A: Auto-clear (following official Omni Automation defensive pattern: explicitly clear conflicting property before setting the desired one)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - List Projects with Filtering (Priority: P1)

As an AI assistant user, I want to query my projects with specific filters so
that I can quickly find projects matching certain criteria without loading my
entire database.

**Why this priority**: Project discovery is fundamental to organizing and
prioritizing work. AI assistants need to understand what projects exist, their
status, and their locations before they can help users manage their work. Without
filtering, the only option is `dump_database` which is slow and overwhelming.

**Independent Test**: Can be fully tested by requesting projects with various
filter combinations (e.g., "active projects in Work folder due for review") and
verifying the results match the criteria. Delivers immediate value by enabling
targeted project queries.

**Acceptance Scenarios**:

1. **Given** a user with projects in multiple folders,
   **When** the AI requests projects filtered by a specific folder name or ID,
   **Then** only projects within that folder (including nested subfolders) are
   returned

2. **Given** a user with projects in various states,
   **When** the AI requests projects filtered by status (Active, OnHold, Done,
   Dropped),
   **Then** only projects matching that status are returned

3. **Given** a user with projects having review schedules,
   **When** the AI requests projects with `reviewStatus: 'due'`,
   **Then** only projects with nextReviewDate <= today are returned

4. **Given** a user with flagged projects,
   **When** the AI requests projects filtered by flagged status,
   **Then** only flagged projects are returned

5. **Given** a user with projects having due dates,
   **When** the AI requests projects due within a date range,
   **Then** only projects with due dates in that range are returned

6. **Given** filter criteria that match no projects,
   **When** the AI requests projects with those filters,
   **Then** an empty result set is returned (not an error)

7. **Given** a user with many projects,
   **When** the AI requests projects with a limit parameter,
   **Then** at most that many projects are returned

8. **Given** a user wants to include archived projects,
   **When** the AI requests projects with `includeCompleted: true`,
   **Then** completed and dropped projects are included in results

---

### User Story 2 - Get Complete Project Details (Priority: P2)

As an AI assistant user, I want to retrieve all properties of a specific project
so that I can make informed decisions about project organization, task
prioritization, or modifications.

**Why this priority**: After finding projects via listing (P1), users need to
inspect individual projects in detail. Complete project information enables AI
assistants to provide context-aware suggestions and accurate project management.

**Independent Test**: Can be fully tested by requesting a project by ID and
verifying all properties are returned correctly. Delivers value by enabling
comprehensive project inspection.

**Acceptance Scenarios**:

1. **Given** a valid project ID,
   **When** the AI requests project details,
   **Then** all project properties are returned including name, note, status,
   dates, folder, review settings, and task counts

2. **Given** a project with child tasks,
   **When** the AI requests project details,
   **Then** the task count and next available task are included

3. **Given** a project with a parent folder,
   **When** the AI requests project details,
   **Then** the parent folder reference (id, name) is included

4. **Given** a project with assigned tags,
   **When** the AI requests project details,
   **Then** all tag references are included in the response

5. **Given** a project with review interval configured,
   **When** the AI requests project details,
   **Then** the reviewInterval, lastReviewDate, and nextReviewDate are included

6. **Given** a project ID that does not exist,
   **When** the AI requests project details,
   **Then** a clear "not found" error is returned with the searched ID

7. **Given** a project identified by name that matches multiple projects,
   **When** the AI requests project details,
   **Then** a disambiguation error is returned listing all matching project IDs

---

### User Story 3 - Create New Project (Priority: P3)

As an AI assistant user, I want to create new projects with configurable
settings so that I can help users organize new initiatives and workflows.

**Why this priority**: Creating projects enables AI assistants to help users
structure their work. This builds on the existing `add_project` tool but
provides enhanced capabilities including folder placement and project type
configuration.

**Independent Test**: Can be fully tested by creating a project with various
settings and verifying it appears in OmniFocus with correct properties. Delivers
value by enabling AI-assisted project creation.

**Acceptance Scenarios**:

1. **Given** a valid project name,
   **When** the AI creates a project with default settings,
   **Then** the project is created at the top level with default properties

2. **Given** a project name and target folder,
   **When** the AI creates a project in that folder,
   **Then** the project is created within the specified folder

3. **Given** project settings specifying sequential type,
   **When** the AI creates the project,
   **Then** the project is created with sequential task ordering

4. **Given** project settings specifying single-actions type,
   **When** the AI creates the project,
   **Then** the project is created as a single-actions list

5. **Given** project settings with defer and due dates,
   **When** the AI creates the project,
   **Then** the project has the specified dates

6. **Given** project settings with review interval,
   **When** the AI creates the project,
   **Then** the project has the specified review schedule

7. **Given** a project name that already exists,
   **When** the AI creates a project with that name,
   **Then** a new project is created (OmniFocus allows duplicate names)

8. **Given** a target folder that does not exist,
   **When** the AI attempts to create a project in that folder,
   **Then** an error is returned indicating the folder was not found

---

### User Story 4 - Edit Project Properties (Priority: P4)

As an AI assistant user, I want to modify existing project properties so that
I can help users update project settings, change status, or correct information.

**Why this priority**: Projects evolve over time. Users need to change project
status, update due dates, modify review schedules, or rename projects. This
capability is essential for ongoing project lifecycle management.

**Independent Test**: Can be fully tested by modifying a project property and
verifying the change in OmniFocus. Delivers value by enabling project updates.

**Acceptance Scenarios**:

1. **Given** a valid project ID and new name,
   **When** the AI edits the project name,
   **Then** the project name is updated

2. **Given** a valid project ID and new status,
   **When** the AI changes the project status to OnHold,
   **Then** the project status is updated and it no longer appears in available
   views

3. **Given** a valid project ID and project type change,
   **When** the AI changes from sequential to parallel,
   **Then** all tasks become available simultaneously

4. **Given** a valid project ID and date changes,
   **When** the AI updates defer date or due date,
   **Then** the project dates are updated

5. **Given** a valid project ID and review interval change,
   **When** the AI modifies the review interval,
   **Then** the project's review schedule is updated

6. **Given** a project ID that does not exist,
   **When** the AI attempts to edit properties,
   **Then** a clear "not found" error is returned

7. **Given** a project identified by name that matches multiple projects,
   **When** the AI attempts to edit properties,
   **Then** a disambiguation error is returned listing all matching project IDs

8. **Given** multiple property changes in one request,
   **When** the AI edits the project,
   **Then** all specified properties are updated atomically

---

### User Story 5 - Delete Project (Priority: P5)

As an AI assistant user, I want to delete projects that are no longer needed so
that I can help users clean up their OmniFocus database.

**Why this priority**: Completed or abandoned projects should be removable to
maintain a clean, focused workspace. This is essential for database hygiene
and reduces cognitive load.

**Independent Test**: Can be fully tested by deleting a project and verifying
it no longer appears in OmniFocus. Delivers value by enabling cleanup workflows.

**Acceptance Scenarios**:

1. **Given** a valid project ID,
   **When** the AI deletes the project,
   **Then** the project and all its tasks are removed from OmniFocus

2. **Given** a project identified by unique name,
   **When** the AI deletes the project,
   **Then** the correct project is removed

3. **Given** a project ID that does not exist,
   **When** the AI attempts to delete the project,
   **Then** a clear "not found" error is returned

4. **Given** a project identified by name that matches multiple projects,
   **When** the AI attempts to delete the project,
   **Then** a disambiguation error is returned listing all matching project IDs

5. **Given** a project with child tasks,
   **When** the AI deletes the project,
   **Then** all child tasks are also deleted (cascade delete)

---

### User Story 6 - Move Project to Different Folder (Priority: P6)

As an AI assistant user, I want to move projects between folders so that I can
help users reorganize their project hierarchy as priorities and responsibilities
change.

**Why this priority**: Organizational needs evolve. Projects may need to move
from "Work" to "Personal", from "Active" to "Archive", or into new categorical
structures. This enables flexible organization.

**Independent Test**: Can be fully tested by moving a project to a different
folder and verifying its new location. Delivers value by enabling reorganization.

**Acceptance Scenarios**:

1. **Given** a valid project ID and target folder,
   **When** the AI moves the project,
   **Then** the project appears in the new folder

2. **Given** a project and "root" as target,
   **When** the AI moves the project to root,
   **Then** the project becomes a top-level project with no parent folder

3. **Given** a project and a nested subfolder as target,
   **When** the AI moves the project,
   **Then** the project appears in the nested subfolder

4. **Given** a project ID that does not exist,
   **When** the AI attempts to move the project,
   **Then** a clear "not found" error is returned

5. **Given** a target folder that does not exist,
   **When** the AI attempts to move the project,
   **Then** an error indicates the target folder was not found

6. **Given** a project identified by name that matches multiple projects,
   **When** the AI attempts to move the project,
   **Then** a disambiguation error is returned listing all matching project IDs

7. **Given** a project already in the target folder,
   **When** the AI moves the project to the same folder,
   **Then** the operation succeeds as a no-op (project remains in place)

---

### Edge Cases

- **Empty filter results**: When no projects match filter criteria, return an
  empty array (not an error)
- **Project not found**: When a project ID does not exist, return error
  "Project '{id}' not found"
- **Folder not found**: When a folder ID/name does not exist, return error
  "Folder '{identifier}' not found"
- **Disambiguation required**: When a project name matches multiple projects,
  return structured error with code "DISAMBIGUATION_REQUIRED" and all matching IDs
- **Creating project in non-existent folder**: Return error before attempting
  creation
- **Moving to same folder**: Succeed silently (no-op behavior)
- **Review interval on single-actions project**: Review intervals are valid on
  single-actions projects (they group loose tasks that still need review)
- **Deleting project with nested subtasks**: All tasks and subtasks are deleted
  together (cascade)
- **Top-level projects**: Projects without parent folders have `parentFolder: null`
- **Project type combinations**: `sequential` and `containsSingletonActions` are
  mutually exclusive; setting one should clear the other

## Requirements *(mandatory)*

### Functional Requirements

#### list_projects

- **FR-001**: System MUST return projects matching the specified filter criteria
- **FR-002**: System MUST support filtering by folder (ID or name), including
  projects in nested subfolders
- **FR-003**: System MUST support filtering by project status using values:
  'active', 'onHold', 'done', 'dropped'
- **FR-004**: System MUST support filtering by review status: 'due' (nextReviewDate
  <= today), 'upcoming' (nextReviewDate within 7 days), 'any'
- **FR-005**: System MUST support filtering by flagged status via `flagged`
  boolean parameter
- **FR-006**: System MUST support filtering by due date range using `dueBefore`
  and `dueAfter` parameters (ISO 8601 format)
- **FR-007**: System MUST support filtering by defer date range using
  `deferBefore` and `deferAfter` parameters (ISO 8601 format)
- **FR-008**: System MUST support `includeCompleted` parameter (default: false)
  to include/exclude completed and dropped projects
- **FR-009**: System MUST return project summary data including: id, name,
  status, flagged, dueDate, deferDate, parentFolderId, parentFolderName,
  taskCount, nextReviewDate
- **FR-010**: System MUST return empty array when no projects match filters
  (not error)
- **FR-011**: System MUST support `limit` parameter to restrict result count
  (default: 100, max: 1000)

#### get_project

- **FR-012**: System MUST return complete project details when given a valid
  project identifier
- **FR-013**: System MUST support identifying projects by unique ID
- **FR-014**: System MUST support identifying projects by name with disambiguation
  (error if multiple matches)
- **FR-015**: System MUST return all writable properties: name, note, status,
  sequential, containsSingletonActions, completedByChildren, defaultSingletonActionHolder,
  deferDate, dueDate, flagged, estimatedMinutes, shouldUseFloatingTimeZone
- **FR-016**: System MUST return all read-only properties: id, completed,
  completionDate, dropDate, taskStatus, effectiveDeferDate, effectiveDueDate,
  effectiveFlagged, hasChildren, taskCount
- **FR-017**: System MUST return review properties: reviewInterval (steps, unit),
  lastReviewDate, nextReviewDate
- **FR-018**: System MUST return relationship references: parentFolder (id, name),
  tags (array of {id, name}), nextTask (id, name if available)
- **FR-019**: System MUST return error "Project '{id}' not found" when project
  does not exist
- **FR-020**: System MUST return disambiguation error when name matches multiple
  projects: `{ success: false, error: string, code: "DISAMBIGUATION_REQUIRED",
  matchingIds: string[] }`

#### create_project

- **FR-021**: System MUST create a new project with the specified name
- **FR-022**: System MUST support optional target folder (ID or name) for placement
- **FR-023**: System MUST support optional position within folder: 'beginning',
  'ending' (default), or relative to another project (beforeProject, afterProject)
- **FR-024**: System MUST support setting initial properties: note, status,
  sequential, containsSingletonActions, deferDate, dueDate, flagged,
  estimatedMinutes, shouldUseFloatingTimeZone
- **FR-025**: System MUST support setting review interval on creation
- **FR-026**: System MUST return success response with created project id and
  name: `{ success: true, id: string, name: string }`
- **FR-027**: System MUST return error when target folder not found
- **FR-028**: System MUST auto-clear the conflicting property when setting
  sequential or containsSingletonActions (e.g., setting sequential=true clears
  containsSingletonActions=false first, per official Omni Automation pattern)

#### edit_project

- **FR-029**: System MUST allow modifying project properties by ID or name
- **FR-030**: System MUST support updating: name, note, status, sequential,
  containsSingletonActions, completedByChildren, defaultSingletonActionHolder,
  deferDate, dueDate, flagged, estimatedMinutes, shouldUseFloatingTimeZone
- **FR-031**: System MUST support updating review interval
- **FR-032**: System MUST support clearing nullable properties by passing null
- **FR-033**: System MUST return success response with project id and name:
  `{ success: true, id: string, name: string }`
- **FR-034**: System MUST return error when project not found
- **FR-035**: System MUST return disambiguation error when name matches multiple
  projects
- **FR-036**: System MUST auto-clear the conflicting property when updating
  sequential or containsSingletonActions (same pattern as FR-028)

#### delete_project

- **FR-037**: System MUST delete a project when given a valid identifier
- **FR-038**: System MUST support identifying projects by unique ID
- **FR-039**: System MUST support identifying projects by name with disambiguation
- **FR-040**: System MUST delete all child tasks when deleting a project
  (cascade delete)
- **FR-041**: System MUST return success response with deleted project id and
  name: `{ success: true, id: string, name: string }`
- **FR-042**: System MUST return error when project not found
- **FR-043**: System MUST return disambiguation error when name matches multiple
  projects

#### move_project

- **FR-044**: System MUST move a project to a different folder
- **FR-045**: System MUST support identifying the project by ID or name
- **FR-046**: System MUST support identifying the target folder by ID, name,
  or 'root' for top-level
- **FR-047**: System MUST support optional position within target folder:
  'beginning', 'ending' (default), beforeProject, afterProject
- **FR-048**: System MUST return success response with project id, name, and
  new parent folder: `{ success: true, id: string, name: string,
  parentFolderId: string | null, parentFolderName: string | null }`
- **FR-049**: System MUST return error when project not found
- **FR-050**: System MUST return error when target folder not found
- **FR-051**: System MUST return disambiguation error when project name matches
  multiple projects
- **FR-052**: System MUST succeed as no-op when moving to current folder

#### Error Handling

- **FR-053**: System MUST return structured disambiguation errors when a
  name-based lookup matches multiple items: `{ success: false, error: string,
  code: "DISAMBIGUATION_REQUIRED", matchingIds: string[] }`
- **FR-054**: System MUST return standard error responses for all other
  failures: `{ success: false, error: string }` with descriptive error messages
- **FR-055**: Error messages MUST be **actionable**: they MUST (1) quote the
  problematic input value, (2) explain WHY the operation failed, and (3)
  suggest corrective action when applicable

### Filter Behavior Specification

#### Filter Combination Logic

All filters combine using **AND logic** (intersection). A project must satisfy
ALL provided filters to be included in results:

- **No filters provided**: Returns all active projects (subject to
  `includeCompleted` default)
- **Single filter**: Returns projects matching that filter
- **Multiple filters**: Returns projects matching ALL filters (intersection)

#### Folder Filter Behavior

- If both `folderId` AND `folderName` provided: `folderId` takes precedence
- Folder filter includes all projects recursively within nested subfolders
- Top-level projects (no parent folder) are excluded by folder filters

#### Status Filter Behavior

- Multiple status values use OR logic: project matches if it has ANY of the statuses
- Empty `status: []` array: Treated as "no filter" (returns all statuses)
- `includeCompleted: false` (default) excludes both `Done` AND `Dropped` projects

#### Review Status Filter Behavior

- `reviewStatus: 'due'`: nextReviewDate <= current date
- `reviewStatus: 'upcoming'`: nextReviewDate within next 7 days (but not past due)
- `reviewStatus: 'any'`: All projects regardless of review status
- Projects without review intervals are excluded by review status filters

#### Date Filter Behavior

- Date filters use **inclusive** boundaries (`>=` for After, `<=` for Before)
- Inverted range (`dueAfter` > `dueBefore`): Returns empty result (no error)
- **Null date handling**: Projects with `null` dates are EXCLUDED by date filters

#### Limit Behavior

- `limit: 0`: Invalid - Zod validation error (minimum is 1)
- `limit > 1000`: Clamped to 1000 (no error, silently capped)
- Limit applied AFTER all filters (post-filter limit)

### Error Message Standards

Error messages follow these patterns (consistent with existing tools):

| Error Type       | Message Format                                                             | Example                                                                       |
|------------------|----------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| Not found        | "{Type} '{id}' not found"                                                  | "Project 'abc123' not found"                                                  |
| Disambiguation   | "Ambiguous {type} name '{name}'. Found N matches: {ids}. Use ID."          | "Ambiguous project name 'Work'. Found 2 matches: proj1, proj2. Use ID."       |
| Invalid status   | "Invalid status '{value}'. Expected one of: active, onHold, done, dropped" | "Invalid status 'paused'. Expected one of: active, onHold, done, dropped"     |
| Invalid folder   | "Folder '{identifier}' not found"                                          | "Folder 'Archive' not found"                                                  |

### Key Entities

- **Project**: A container for related tasks in OmniFocus
  - Identifier: Unique ID (primaryKey) for unambiguous reference
  - Name: Display name of the project (string)
  - Note: Additional text content (string, may be empty)
  - Status: Current state (Active, OnHold, Done, Dropped)
  - Type: Task ordering mode (sequential, parallel, single-actions)
  - Dates: deferDate, dueDate
  - Effective Dates: Computed dates considering inheritance
  - Flagged: Boolean priority indicator
  - ReviewInterval: Scheduled review frequency (steps, unit)
  - ReviewDates: lastReviewDate, nextReviewDate
  - ParentFolder: Container folder reference (nullable for top-level)
  - RootTask: Internal task object that holds project properties
  - Tasks: Array of child tasks
  - NextTask: Next available task in sequential projects

- **Project.Status**: Enumeration of project states
  - Active: Project is being worked on
  - OnHold: Project is paused (tasks not available)
  - Done: Project is completed
  - Dropped: Project is abandoned/cancelled

- **Project.ReviewInterval**: Review scheduling configuration
  - steps: Number of time units (integer)
  - unit: Time unit ('days', 'weeks', 'months', 'years')

- **ProjectType**: Logical categorization (derived from properties)
  - Parallel: sequential=false, containsSingletonActions=false (default)
  - Sequential: sequential=true, containsSingletonActions=false
  - SingleActions: sequential=false, containsSingletonActions=true

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI assistants can list projects with filter criteria and receive
  results within 2 seconds for databases with up to 1,000 projects
- **SC-002**: AI assistants can retrieve complete project details by ID with
  99% success rate for valid requests
- **SC-003**: AI assistants can create projects with configured settings and
  folder placement with 99% success rate for valid inputs
- **SC-004**: AI assistants can modify project properties without unintended
  side effects with 100% property preservation for unmodified fields
- **SC-005**: AI assistants can delete projects with cascade deletion of all
  child tasks
- **SC-006**: AI assistants can move projects between folders with immediate
  reflection in OmniFocus hierarchy
- **SC-007**: All project operations provide descriptive error messages when
  operations fail due to validation or not-found conditions
- **SC-008**: The six project tools reduce the need for `dump_database` for
  common project queries (finding projects by filter, inspecting project details,
  CRUD operations, and reorganization) by providing targeted alternatives
- **SC-009**: Project modifications made through the tools are reflected in the
  OmniFocus application within 1 second (verified by manual inspection)

## Assumptions

- Users have OmniFocus installed and running on macOS
- The MCP server has appropriate permissions to interact with OmniFocus
- Project operations follow OmniFocus's native behavior and constraints
- The OmniFocus database is in a consistent state when operations are performed
- The codebase uses Omni Automation JavaScript (per Phase 1 architecture) for
  all OmniFocus interactions
- Review intervals follow the standard OmniFocus units (days, weeks, months, years)
- Cascade delete behavior mirrors OmniFocus's native behavior when deleting
  projects

## Out of Scope

- **Batch project operations**: Creating, editing, or deleting multiple projects
  in one call (Phase 10 bulk operations)
- **Project review workflow**: Marking projects as reviewed (Phase 5 Review System)
- **Project duplication**: Duplicating projects with their tasks (Phase 10)
- **Task operations within projects**: Managing tasks is handled by existing and
  Phase 3 task tools
- **Folder operations**: Creating, editing, deleting folders (Phase 1 complete)
- **Tag assignment to projects**: Modifying project tags (Phase 2 tag tools)
- **Project templates**: Creating projects from templates (future phase)
- **Sort order customization**: Custom sorting of list results (returns in
  OmniFocus document storage order)
- **Pagination**: Offset-based pagination for large result sets (use limit
  parameter instead)

## API Reference Documentation

### Primary Sources

<!-- markdownlint-disable MD034 -->

| Resource         | URL                                                | Description               |
|------------------|----------------------------------------------------|---------------------------|
| Project Class    | https://omni-automation.com/omnifocus/project.html | Project class documentation |
| API Reference    | https://omni-automation.com/omnifocus/OF-API.html  | Full OmniFocus API        |
| Database Methods | https://omni-automation.com/omnifocus/database.html | Database operations       |
| Folder Class     | https://omni-automation.com/omnifocus/folder.html  | Folder relationships      |

<!-- markdownlint-enable MD034 -->

### Confirmed Project Capabilities

| Operation        | API Method                              | Reference       |
|------------------|-----------------------------------------|-----------------|
| Find by ID       | `Project.byIdentifier(id)`              | Project Class   |
| Find by name     | `flattenedProjects.byName(name)`        | Database        |
| Get all projects | `flattenedProjects`                     | Database        |
| Create project   | `new Project(name, folder)`             | Project Class   |
| Delete project   | `deleteObject(project)`                 | Database        |
| Move project     | `moveSections([project], targetFolder)` | Database        |
| Set status       | `project.status = Project.Status.OnHold`| Project Class   |
| Set review       | `project.reviewInterval = {...}`        | Project Class   |
| Get tasks        | `project.flattenedTasks`, `project.tasks` | Project Class |
| Get next task    | `project.nextTask`                      | Project Class   |

### Project Properties Summary

**Writable Properties:**

- `name` (String) - Project title
- `note` (String) - Note content
- `status` (Project.Status) - Active, OnHold, Done, Dropped
- `sequential` (Boolean) - Tasks form dependency chain
- `containsSingletonActions` (Boolean) - Single-actions list type
- `completedByChildren` (Boolean) - Auto-complete when tasks done
- `defaultSingletonActionHolder` (Boolean) - Receives inbox items on cleanup
- `deferDate` (Date|null) - Defer until date
- `dueDate` (Date|null) - Due date
- `flagged` (Boolean) - Flagged status
- `estimatedMinutes` (Number|null) - Time estimate
- `shouldUseFloatingTimeZone` (Boolean) - Floating timezone
- `reviewInterval` (Object) - Review schedule {steps, unit}
- `lastReviewDate` (Date|null) - When last reviewed
- `nextReviewDate` (Date|null) - When next review due

**Read-Only Properties:**

- `id` (ObjectIdentifier) - Unique identifier
- `task` (Task) - Root task containing project data
- `parentFolder` (Folder|null) - Container folder
- `tasks` / `children` (TaskArray) - Direct child tasks
- `flattenedTasks` (TaskArray) - All tasks recursively
- `hasChildren` (Boolean) - Has child tasks
- `nextTask` (Task|null) - Next available task
- `completed` (Boolean) - Completion status
- `completionDate` (Date|null) - When completed
- `dropDate` (Date|null) - When dropped
- `taskStatus` (Task.Status) - Current status enum
- `effectiveDeferDate` (Date|null) - Computed defer date
- `effectiveDueDate` (Date|null) - Computed due date
- `effectiveFlagged` (Boolean) - Computed flagged status
- `tags` (TagArray) - Associated tags

### Version Requirements

| Feature                    | Minimum Version | Platform | Notes                          |
|----------------------------|-----------------|----------|--------------------------------|
| Project class              | v3.0+           | All      | Core functionality             |
| Project.Status enum        | v3.0+           | All      | Active, OnHold, Done, Dropped  |
| reviewInterval             | v3.0+           | All      | Review scheduling              |
| moveSections               | v3.0+           | All      | Move projects/folders          |
| estimatedMinutes           | v3.5+           | macOS    | Not available on iOS           |
| shouldUseFloatingTimeZone  | v3.6+           | All      |                                |
| deleteObject               | v3.0+           | All      | Cascade deletes tasks          |

---

## Metadata

- Created: 2025-12-12
- Status: Draft
- Clarifications: 1
- Next Step: /speckit.plan
