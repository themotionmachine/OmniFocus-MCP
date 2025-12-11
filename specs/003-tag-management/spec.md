# Feature Specification: Tag Management Tools

**Feature Branch**: `003-tag-management`
**Created**: 2025-12-10
**Status**: Draft
**Input**: Phase 02 Tag Management: Implement 6 tag management tools for OmniFocus

## Clarifications

### Session 2025-12-10

1. Q: When is `relativeTo` required vs optional in the position schema for
   `create_tag`? → A: **Same as folders per Omni Automation API**: `relativeTo`
   is REQUIRED for `before`/`after` (specifies sibling tag ID, maps to
   `siblingTag.before`/`siblingTag.after`), OPTIONAL for `beginning`/`ending`
   (specifies parent tag ID, maps to `parentTag.beginning`/`parentTag.ending`;
   omit for root level which uses `tags.beginning`/`tags.ending`).
2. Q: How should task name disambiguation work for `assign_tags`/`remove_tags`
   when multiple tasks share the same name? → A: **Disambiguation error** -
   fail with structured error listing all matching task IDs (consistent with
   tag/folder patterns in FR-038). Note: Omni Automation's `byName()` returns
   only the first match silently, but MCP layer adds disambiguation to prevent
   accidentally modifying the wrong task.
3. Q: What is the default behavior for `includeChildren` in `list_tags`, and how
   does it interact with `parentId`? → A: **Same pattern as folders per Omni
   Automation API**: use `database.tags` vs `database.flattenedTags` distinction.
   When `parentId` is omitted: `includeChildren: false` returns top-level tags
   only (via `database.tags`), `includeChildren: true` returns all tags
   recursively (via `database.flattenedTags`). When `parentId` is specified:
   `includeChildren: false` returns immediate children only (via `parent.tags`),
   `includeChildren: true` returns all descendants (via `parent.flattenedTags`).
   **Default: `true`** - returns flat list of all tags, the most common use case
   giving a complete picture of the tag taxonomy.
4. Q: How should transport-level failures be handled (e.g., OmniFocus not running,
   osascript timeout, syntax errors)? → A: **Follow existing patterns** in
   `scriptExecution.ts`. The current codebase already handles these failures;
   tag tools should use the same error handling. No new FR needed - this is an
   implementation detail that maintains consistency with existing tools.
5. Q: Should tag tools support all three status values (Active/OnHold/Dropped)?
   → A: **Yes, support all three** per Omni Automation API: `Tag.Status.Active`,
   `Tag.Status.OnHold`, `Tag.Status.Dropped`. This matches the full OmniFocus
   capability and enables users to temporarily pause tags without dropping them.
6. Q: Which metric should `taskCount` represent in the `list_tags` response?
   → A: **`remainingTasks.length`** (incomplete tasks only) per Omni Automation
   API. This excludes completed tasks while including all tasks that still need
   attention, regardless of current availability. The official docs use
   `remainingTasks` as the standard metric for tag usage (e.g., determining
   "assigned" vs "unassigned" tags).

## Overview

This feature adds comprehensive tag management capabilities to the OmniFocus MCP
Server. Tags are the primary mechanism for adding context, categorization, and
workflow metadata to tasks in OmniFocus. They form a hierarchical structure and
control task availability through the "allows next action" setting.

Currently, AI assistants can only view tags through database dumps but cannot
create, modify, or assign them. This severely limits their ability to help users
maintain an effective GTD (Getting Things Done) workflow where tags typically
represent contexts, energy levels, time estimates, or priorities.

### Business Value

- **Context Management**: Enable AI assistants to help users organize tasks by
  context (e.g., @home, @office, @calls, @errands)
- **Workflow Control**: Allow AI to manage tag settings that control task
  availability and sequencing
- **Taxonomy Building**: Support AI-assisted creation and maintenance of tag
  hierarchies that match user workflows
- **Bulk Organization**: Enable efficient tagging of multiple tasks to maintain
  organizational consistency
- **System Hygiene**: Allow cleanup of unused or obsolete tags to keep the
  system manageable

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Tag Structure (Priority: P1)

As an AI assistant user, I want to see my tag hierarchy and usage statistics so
that I can understand my organizational system and make informed suggestions
about which tags to apply to new tasks.

**Why this priority**: Understanding the existing tag structure is foundational
to all other tag operations. Without visibility into tags, the AI cannot
provide meaningful organizational assistance or suggest appropriate contexts.

**Independent Test**: Can be fully tested by requesting a list of tags and
verifying the hierarchical structure and task counts are returned correctly.
Delivers immediate value by enabling context-aware suggestions.

**Acceptance Scenarios**:

1. **Given** a user with multiple tags including nested tags,
   **When** the AI requests a list of tags,
   **Then** all tags are returned with their names, statuses, parent relationships,
   and task counts
2. **Given** nested tags exist (e.g., "Work" containing "@office" and "@calls"),
   **When** listing tags with hierarchy details,
   **Then** the nesting structure is accurately represented
3. **Given** some tags are marked as dropped,
   **When** filtering by status,
   **Then** only tags matching the status filter are returned
4. **Given** a user wants to understand tag usage,
   **When** listing tags,
   **Then** each tag includes a count of tasks currently assigned to it

---

### User Story 2 - Create Tags (Priority: P2)

As an AI assistant user, I want the AI to create new tags for me so that I can
build and extend my organizational taxonomy without manually switching to
OmniFocus.

**Why this priority**: Creating tags is the primary action for building and
evolving an organizational system. It depends on understanding existing structure
(P1) but is essential for adapting the system to user needs.

**Independent Test**: Can be fully tested by creating a new tag and verifying
it appears in OmniFocus with correct settings. Delivers value by enabling
taxonomy expansion.

**Acceptance Scenarios**:

1. **Given** a user needs a new context tag,
   **When** the AI creates a tag named "@phone",
   **Then** a new tag with that name is created at the root level
2. **Given** an existing tag "Work",
   **When** the AI creates a tag "@meetings" as a child of "Work",
   **Then** the new tag is correctly nested under "Work"
3. **Given** a user wants a waiting-for context,
   **When** the AI creates a tag with "allows next action" disabled,
   **Then** tasks with this tag will not appear as available next actions
4. **Given** a user specifies a position,
   **When** creating a tag,
   **Then** the tag appears at the specified position among siblings

---

### User Story 3 - Edit Tags (Priority: P3)

As an AI assistant user, I want the AI to modify tag properties so that I can
evolve my organizational system without manual intervention.

**Why this priority**: Editing tags is necessary for maintaining an evolving
organizational system. Tags often need renaming as workflows change or settings
adjustment as understanding of GTD deepens.

**Independent Test**: Can be fully tested by modifying a tag's name, status,
or settings and verifying the change persists. Delivers value by enabling
system maintenance.

**Acceptance Scenarios**:

1. **Given** a tag named "Waiting",
   **When** the AI renames it to "Waiting For",
   **Then** the tag name is updated in OmniFocus
2. **Given** an active tag that's no longer needed but has historical data,
   **When** the AI changes its status to dropped,
   **Then** the tag remains but is hidden from active views
3. **Given** a tag with "allows next action" enabled,
   **When** the AI disables this setting,
   **Then** tasks with this tag no longer appear as available next actions
4. **Given** a tag identified by name that matches multiple tags,
   **When** editing its properties,
   **Then** the system fails with a disambiguation error listing all matching IDs

---

### User Story 4 - Delete Tags (Priority: P4)

As an AI assistant user, I want the AI to delete tags I no longer need so that
I can keep my organizational system clean and manageable.

**Why this priority**: Deletion is a destructive operation that removes tags
entirely. It's less common than other operations but necessary for system
hygiene when tags become obsolete.

**Independent Test**: Can be fully tested by deleting a tag and verifying it
no longer exists. Delivers value by enabling system cleanup.

**Acceptance Scenarios**:

1. **Given** a tag with no assigned tasks,
   **When** the AI deletes it,
   **Then** the tag is permanently removed from OmniFocus
2. **Given** a tag with tasks assigned to it,
   **When** the AI deletes it,
   **Then** the tag is removed and tasks are untagged (tag reference removed
   from tasks, tasks are NOT deleted)
3. **Given** a parent tag with child tags,
   **When** the AI deletes the parent,
   **Then** the parent and all child tags are deleted (matching OmniFocus
   native behavior)
4. **Given** a tag identified by ID or name,
   **When** deleting,
   **Then** the correct tag is removed

---

### User Story 5 - Assign Tags to Tasks (Priority: P5)

As an AI assistant user, I want the AI to add tags to my tasks so that I can
organize my work by context, energy, or other criteria without manual tagging.

**Why this priority**: Assigning tags to tasks is the core utility of the tag
system. This enables AI assistants to help maintain organizational consistency
across tasks.

**Independent Test**: Can be fully tested by assigning tags to tasks and
verifying the tags appear on those tasks. Delivers value by enabling bulk
organization.

**Acceptance Scenarios**:

1. **Given** a task without tags,
   **When** the AI assigns the "@office" tag,
   **Then** the task has the "@office" tag
2. **Given** multiple tasks that should share a context,
   **When** the AI assigns a tag to all of them,
   **Then** all specified tasks have the tag added
3. **Given** a task that already has some tags,
   **When** the AI assigns additional tags,
   **Then** the new tags are added while preserving existing tags
4. **Given** a non-existent tag name is specified,
   **When** attempting to assign it,
   **Then** the operation fails with a clear error (tag must exist first)

---

### User Story 6 - Remove Tags from Tasks (Priority: P6)

As an AI assistant user, I want the AI to remove tags from my tasks so that
I can clean up organizational metadata as task contexts change.

**Why this priority**: Removing tags is necessary for maintaining accurate
organization as tasks evolve or are re-categorized. This complements tag
assignment.

**Independent Test**: Can be fully tested by removing tags from tasks and
verifying the tags no longer appear on those tasks. Delivers value by enabling
organizational maintenance.

**Acceptance Scenarios**:

1. **Given** a task with multiple tags,
   **When** the AI removes a specific tag,
   **Then** only that tag is removed while others remain
2. **Given** a task with multiple tags,
   **When** the AI removes all tags,
   **Then** the task has no tags assigned
3. **Given** multiple tasks with a shared tag,
   **When** the AI removes that tag from all of them,
   **Then** none of the specified tasks have that tag
4. **Given** a task without a specified tag,
   **When** attempting to remove that tag,
   **Then** the operation succeeds silently (idempotent)

---

### Edge Cases

- **Duplicate tag names**: When a name-based operation matches multiple tags
  with the same name, the system MUST fail with a disambiguation error that
  lists all matching tag IDs (e.g., "Ambiguous tag name 'Urgent'. Found 2
  matches: tag_id_1, tag_id_2. Please specify by ID.")
- **Circular references**: Moving a tag inside its own descendant is rejected
  with a clear error message
- **Empty tag names**: Creating or renaming a tag with an empty or
  whitespace-only name is rejected with error "Tag name is required and must
  be a non-empty string" (name is trimmed before validation)
- **Root-level restrictions**: Attempting to delete or manipulate the implicit
  Tags container returns an appropriate error
- **Task references**: When assigning/removing tags using task identifiers,
  non-existent task IDs fail with descriptive error "Task 'xyz' not found"
- **Tag references**: When assigning/removing tags using tag identifiers,
  non-existent tag IDs fail with descriptive error "Tag 'xyz' not found"
- **Deleting tag with children**: When deleting a parent tag, all child tags
  are also deleted recursively (matches OmniFocus native behavior)
- **Orphaned tag references**: When a tag is deleted, tasks that had it
  assigned automatically lose that tag reference (handled by OmniFocus)
- **Invalid parentId**: When `create_tag` specifies a `parentId` that doesn't
  exist, the operation fails with error "Parent tag 'xyz' not found"
- **Invalid relativeTo**: When `create_tag` specifies a `relativeTo` ID that
  doesn't exist, the operation fails with error "Reference tag 'xyz' not found
  for position placement"
- **Invalid status enum**: When an invalid status value is provided (not one
  of 'active', 'onHold', 'dropped'), the operation fails with error
  "Invalid status 'xyz'. Expected 'active', 'onHold', or 'dropped'"
  (status values are case-sensitive)
- **clearAll with tagIds conflict**: When `remove_tags` is called with both
  `clearAll: true` AND non-empty `tagIds`, the operation fails with error
  "Cannot specify both clearAll and tagIds. Use clearAll=true alone to remove
  all tags, or provide tagIds to remove specific tags"
- **Batch operation tag not found**: When `assign_tags` references a non-existent
  tag, the per-item result includes error "Tag 'xyz' not found". For `remove_tags`,
  a non-existent tag reference is silently ignored (idempotent behavior) unless
  the tag doesn't exist at all in OmniFocus, in which case error "Tag 'xyz' not
  found" is returned
- **Per-item disambiguation**: When batch operations (`assign_tags`, `remove_tags`)
  encounter an ambiguous name (tag or task), the per-item result includes the full
  disambiguation error structure in the `error` field as a JSON-encoded string:
  `"Ambiguous tag name 'X'. Found N matches: id1, id2. Please specify by ID."`

## Requirements *(mandatory)*

### Functional Requirements

#### List Tags

- **FR-001**: System MUST return all tags accessible in the user's OmniFocus
  database
- **FR-002**: System MUST return each tag with schema: `{ id: string,
  name: string, status: 'active'|'onHold'|'dropped', parentId: string|null,
  allowsNextAction: boolean, taskCount: number }` where root-level tags have
  `parentId: null`
- **FR-003**: System MUST represent parent-child relationships in the returned
  data
- **FR-004**: System MUST support filtering tags by status (active, onHold,
  dropped) via optional `status` parameter
- **FR-005**: System MUST support filtering to show only children of a specified
  parent tag via optional `parentId` parameter
- **FR-006**: System MUST support an option to include or exclude nested tag
  details via optional `includeChildren` parameter (default: `true`). When
  `parentId` is omitted: `false` returns top-level tags only (via `database.tags`),
  `true` returns all tags recursively (via `database.flattenedTags`). When
  `parentId` is specified: `false` returns immediate children only (via
  `parent.tags`), `true` returns all descendants (via `parent.flattenedTags`).

#### Create Tag

- **FR-007**: System MUST allow creating a tag with a specified name
- **FR-008**: System MUST support creating tags at the root level (no parent)
- **FR-009**: System MUST support creating tags as children of existing tags
- **FR-010**: System MUST support specifying position via object structure:
  `{ placement: "before"|"after"|"beginning"|"ending", relativeTo?: string }`.
  Requirement rules per Omni Automation API:
  - For `placement: "before"` or `"after"`: `relativeTo` is **REQUIRED** and
    specifies the sibling tag ID (maps to `siblingTag.before`/`siblingTag.after`)
  - For `placement: "beginning"` or `"ending"`: `relativeTo` is **OPTIONAL**
    and specifies the parent tag ID (maps to `parentTag.beginning`/
    `parentTag.ending`); when omitted, defaults to root level
    (`tags.beginning`/`tags.ending`)
  Default position when entire `position` object is omitted:
  `{ placement: "ending" }` (i.e., `tags.ending` at root level)
- **FR-011**: System MUST support setting the "allows next action" property at
  creation time (default: true)
- **FR-012**: System MUST return the identifier of the newly created tag
- **FR-013**: All successful operations MUST return response structure:
  `{ success: true, id: string, name: string }`

#### Edit Tag

- **FR-014**: System MUST support identifying tags by unique identifier
- **FR-015**: System MUST support identifying tags by name using case-sensitive
  exact matching; if multiple tags match, operation MUST fail with error
  listing all matching IDs
- **FR-016**: System MUST allow renaming tags
- **FR-017**: System MUST allow changing tag status (active/onHold/dropped)
- **FR-018**: System MUST allow changing the "allows next action" setting
- **FR-019**: System MUST use partial update semantics - only provided fields
  are modified; omitted fields remain unchanged. At least one update field
  must be provided.
- **FR-020**: System MUST return confirmation of successful modification with
  response `{ success: true, id: string, name: string }`

#### Delete Tag

- **FR-021**: System MUST support deleting tags by identifier or name
- **FR-022**: System MUST delete the tag and all its child tags recursively,
  matching OmniFocus native behavior
- **FR-023**: System MUST NOT delete tasks that had the deleted tag; only the
  tag reference is removed from those tasks
- **FR-024**: System MUST return confirmation of successful deletion with
  response `{ success: true, id: string, name: string }` (ID and name captured
  before deletion)
- **FR-025**: System MUST provide clear error messages when deletion fails

#### Assign Tags

- **FR-026**: System MUST support assigning one or more tags to one or more
  tasks in a single operation
- **FR-027**: System MUST support identifying tasks by ID or name
- **FR-028**: System MUST support identifying tags by ID or name
- **FR-029**: System MUST preserve existing tags on tasks (additive operation)
- **FR-030**: System MUST be idempotent - assigning a tag that's already
  present has no effect (no error, no duplicate)
- **FR-031**: System MUST return results for each task indicating success or
  failure with details

#### Remove Tags

- **FR-032**: System MUST support removing specific tags from one or more tasks
- **FR-033**: System MUST support removing ALL tags from one or more tasks
  (clear operation)
- **FR-034**: System MUST support identifying tasks by ID or name
- **FR-035**: System MUST support identifying tags by ID or name (when removing
  specific tags)
- **FR-036**: System MUST be idempotent - removing a tag that isn't present
  has no effect (no error)
- **FR-037**: System MUST return results for each task indicating success or
  failure with details

#### Error Handling

- **FR-038**: System MUST return structured disambiguation errors when a
  name-based lookup matches multiple items: `{ success: false, error: string,
  code: "DISAMBIGUATION_REQUIRED", matchingIds: string[] }`
- **FR-039**: System MUST return standard error responses for all other
  failures: `{ success: false, error: string }` with descriptive error messages
- **FR-040**: Error messages MUST be **actionable**: they MUST (1) quote the
  problematic input value, (2) explain WHY the operation failed, and (3)
  suggest corrective action when applicable. Generic messages like "An error
  occurred" are prohibited.
- **FR-041**: For batch operations (`assign_tags`, `remove_tags`), the top-level
  `success: true` indicates the operation completed execution (not that all
  items succeeded). Consumers MUST check individual per-item results to
  determine which items succeeded or failed.
- **FR-042**: Batch operations MUST continue processing remaining items after
  encountering a per-item failure. One failed item does NOT halt the entire
  batch.
- **FR-043**: Per-item results MUST be returned at the same array index as the
  corresponding input, enabling correlation. Every input item produces exactly
  one result entry.
- **FR-044**: Per-item results use `success: boolean` to indicate individual
  outcome. When `success: false`, the `error` field MUST be present with a
  descriptive message. When `success: true`, the `error` field MUST be absent.

### Error Message Standards

Error messages follow these patterns (per Constitution Principle V):

| Error Type | Message Format | Example |
|------------|----------------|---------|
| Not found | "{Type} '{id}' not found" | "Tag 'abc123' not found" |
| Disambiguation | "Ambiguous {type} name '{name}'. Found N matches: {ids}. Please specify by ID." | "Ambiguous tag name 'Urgent'. Found 2 matches: id1, id2. Please specify by ID." |
| Invalid parent | "Parent tag '{id}' not found" | "Parent tag 'xyz' not found" |
| Invalid reference | "Reference tag '{id}' not found for position placement" | "Reference tag 'xyz' not found for position placement" |
| Invalid status | "Invalid status '{value}'. Expected 'active', 'onHold', or 'dropped'" | "Invalid status 'Active'. Expected 'active', 'onHold', or 'dropped'" |
| Empty name | "Tag name is required and must be a non-empty string" | (static message) |
| Missing relativeTo | "relativeTo is required for 'before' and 'after' placements" | (static message) |
| No updates | "At least one update field (newName, status, allowsNextAction) must be provided" | (static message) |
| clearAll conflict | "Cannot specify both clearAll and tagIds. Use clearAll=true alone to remove all tags, or provide tagIds to remove specific tags" | (static message) |
| Root-level restriction | "Cannot delete or modify the root Tags container" | (static message) |

### Key Entities

- **Tag**: A contextual label that can be assigned to tasks for categorization
  and workflow control
  - Name: Display name of the tag (string, required)
  - Identifier: Unique ID (primaryKey) for unambiguous reference
  - Status: Active or Dropped
  - Parent: Reference to containing tag (null for root-level tags)
  - AllowsNextAction: Boolean controlling whether tasks with this tag appear
    as available actions (impacts GTD workflow)
  - TaskCount: Number of incomplete tasks assigned this tag (via `remainingTasks.length`)
  - Children: Nested tags within this tag

- **Tag.Status**: Enumeration of valid tag states
  - Active: Tag is active and visible in normal views
  - OnHold: Tag is temporarily paused (tasks may be hidden from available views)
  - Dropped: Tag is archived/dropped (hidden from active views)

- **Task-Tag Assignment**: The many-to-many relationship between tasks and tags
  - A task can have zero or more tags
  - A tag can be assigned to zero or more tasks
  - Assignment is additive; removal is explicit

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI assistants can successfully list all tags in a user's
  OmniFocus database within 2 seconds
- **SC-002**: AI assistants can create, edit, and delete tags with a success
  rate of 99% for valid requests
- **SC-003**: AI assistants can assign and remove tags from tasks with a
  success rate of 99% for valid requests
- **SC-004**: All tag operations provide descriptive error messages when
  operations fail due to validation or constraints
- **SC-005**: Tag operations complete within 3 seconds (measured with ≤500 tags
  and ≤50 tasks per batch operation)
- **SC-006**: The six tag tools collectively enable complete tag management
  without requiring manual OmniFocus interaction
- **SC-007**: Tag hierarchy changes and task assignments made through the tools
  are immediately reflected in the OmniFocus application

## Assumptions

- Users have OmniFocus installed and running on macOS
- The MCP server has appropriate permissions to interact with OmniFocus
- Tag operations follow OmniFocus's native behavior and constraints
- The OmniFocus database is in a consistent state when operations are performed
- Users understand that "dropped" tags are effectively archived but not deleted
- Users understand that tags control task availability through the "allows
  next action" setting
- The codebase uses Omni Automation JavaScript (per Phase 1 refactoring) for
  all OmniFocus interactions

## Out of Scope

- Tag synchronization across devices (handled by OmniFocus)
- Undo/redo functionality for tag operations (covered in Phase 7)
- Location-based tags / geofencing (OmniFocus Pro feature, complex setup)
- Custom tag colors or icons (not exposed via Omni Automation)
- Batch tag creation (users can call create_tag multiple times)
- Moving tags to different parents (can be achieved via delete + create;
  future enhancement)

## API Reference Documentation

### Primary Sources

<!-- markdownlint-disable MD034 -->

| Resource | URL | Description |
|----------|-----|-------------|
| Tag Class | <https://omni-automation.com/omnifocus/tag.html> | Tag class documentation |
| API Reference | <https://omni-automation.com/omnifocus/OF-API.html> | Full OmniFocus API |
| Finding Items | <https://omni-automation.com/omnifocus/finding-items.html> | Search methods |
| Task Class | <https://omni-automation.com/omnifocus/task.html> | Task-tag operations |

<!-- markdownlint-enable MD034 -->

### Confirmed Tag Capabilities

| Operation | API Method | Reference |
|-----------|------------|-----------|
| Create | `new Tag(name, position)` | Tag |
| Find by ID | `Tag.byIdentifier(id)` | Tag |
| Find by name | `flattenedTags.byName(name)` | Tag |
| Update name | `tag.name = "newName"` | Tag |
| Update status | `tag.status = Tag.Status.Dropped` | Tag |
| Update allows next | `tag.allowsNextAction = false` | Tag |
| Delete | `deleteObject(tag)` | Database |
| Add to task | `task.addTag(tag)` | Task |
| Remove from task | `task.removeTag(tag)` | Task |
| Clear all tags | `task.clearTags()` | Task |
| Task count | `tag.remainingTasks.length` | Tag |

### Tag Position System

Tags support four insertion locations: `before`, `after`, `beginning`, `ending`.

- Root-level tags use `tags.beginning` or `tags.ending`
- Nested tags use parent tag's position properties

### Status Values

Three valid states exist:

- `Tag.Status.Active` - The tag is active
- `Tag.Status.OnHold` - The tag has been put on-hold
- `Tag.Status.Dropped` - The tag has been dropped

### Hierarchy Access

| Property | Returns | Description |
|----------|---------|-------------|
| `tags` | TagArray | Immediate child tags only |
| `flattenedTags` | TagArray | All descendant tags recursively |
| `parent` | Tag or null | Parent tag reference (null for root) |
| `tasks` | TaskArray | Tasks assigned this tag |
