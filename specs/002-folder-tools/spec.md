# Feature Specification: Folder Management Tools

**Feature Branch**: `002-folder-tools`
**Created**: 2025-12-09
**Status**: Ready for Planning
**Input**: Phase 1: Folder Management Tools - Implement 5 tools for OmniFocus
folder operations

## Clarifications

### Session 2025-12-09

1. Q: When a name-based operation matches multiple folders with the same name,
   how should the system behave? → A: Fail with disambiguation error listing
   all matching folder IDs
2. Q: How should position be specified in the tool input schema? → A: Relative
   object structure `{ placement: "before"|"after"|"beginning"|"ending",
   relativeTo?: string }` - maps directly to Omni Automation's
   `Folder.ChildInsertionLocation` API. Note: Updated from `siblingId` to
   `relativeTo` per clarification #26 for consistency with `move_folder`
3. Q: When deleting a folder, what happens to its contents?
   → A: Recursive permanent deletion - folder and ALL contents (subfolders,
   projects, tasks) are permanently removed. This matches OmniFocus native
   behavior. Note: `force` parameter removed per clarification #22 - all
   deletions are immediate and recursive like native OmniFocus.
4. Q: Should folder name matching be case-sensitive? → A: Yes, case-sensitive
   (exact match). This matches Omni Automation's `byName()` behavior where
   "Work" ≠ "work".
5. Q: What information should be returned on successful folder operations?
   → A: Folder details - `{ success: true, id: string, name: string }`.
   Matches Omni Automation's DatabaseObject.id pattern. Note: Updated from
   `folderId` per clarification #24 for API consistency.
6. Q: What exact fields should `list_folders` return for each folder? → A: Full
   schema `{ id: string, name: string, status: 'active'|'dropped', parentId:
   string|null }`. Root folders have `parentId: null`. Verified against
   Omni Automation Folder class properties (omni-automation.com/omnifocus/folder.html).
   Note: Folder class does NOT expose creationDate/modificationDate.
7. Q: When changing folder status to "dropped", should children automatically
   cascade to dropped? → A: No cascade - mirror OmniFocus native behavior. Each
   folder has independent `status` property. OmniFocus uses `effectiveActive`
   (from `ActiveObject` class) to compute inherited status from ancestor chain.
   Setting folder to dropped only affects that folder; children retain their
   own status. UI shows "inherited dropped" visual but data is not modified.
8. Q: How should root level be specified in create/move input schema? → A: Both
   omitting `parentId` and setting `parentId: null` mean root level (equivalent).
   This mirrors Omni Automation's `new Folder(name, position)` where `null` or
   omitting position creates at library root. For explicit positioning at root,
   use position `{ placement: "beginning"|"ending" }` without `parentId`.
9. Q: What is the standard error response format? → A: Use `{ success: false,
   error: string }` matching existing MCP tool patterns (e.g., `query_omnifocus`,
   `edit_item`). Note: Omni Automation internally uses `{ name, message }` for
   thrown errors, but MCP layer converts to simple error string for clients.
10. Q: When moving a folder into a dropped parent, what happens to the moved
    folder's status? → A: Preserve status - moved folder keeps its original
    status. Its `effectiveActive` becomes false (computed from ancestor chain)
    but `status` property remains unchanged. Mirrors OmniFocus native behavior.
11. Q: What happens when position `relativeTo` references a non-existent folder
    or a folder in a different parent? → A: Fail with descriptive error. For
    non-existent: "Invalid relativeTo 'xyz': folder not found". For wrong parent
    (when placement is before/after): "Invalid relativeTo 'xyz': folder is not a
    sibling in target parent". This follows fail-fast principles and provides
    clear debugging information. Note: Updated from `siblingId` per
    clarification #26.
12. Q: Can duplicate folder names be created within the same parent? → A: Yes,
    allow duplicates - mirror OmniFocus native behavior. Omni Automation's
    `new Folder(name, position)` imposes no uniqueness constraint. The
    `byName()` method returns "the first folder identified by name", confirming
    multiple can exist. Disambiguation for lookups is already handled via
    clarification #1 (fail with error listing all matching IDs).
13. Q: Can `edit_folder` change a folder's parent, or is that exclusively
    for `move_folder`? → A: No - parent changes are exclusively handled by
    `move_folder`. Omni Automation's Folder class has `parent` as read-only
    property; changing hierarchy requires `moveSections()` function. Clean
    separation: `edit_folder` handles properties (name, status), `move_folder`
    handles hierarchy (parent, position).
14. Q: What are the input parameter names for `list_folders`? → A: Use
    `{ status?: 'active'|'dropped', parentId?: string,
    includeChildren?: boolean }`.
    Names align with Omni Automation Folder class properties: `status` matches
    `folder.status`, `parentId` references `folder.parent` (using ID for API),
    `includeChildren` controls `folders` (immediate) vs `flattenedFolders`
    (recursive) retrieval.
15. Q: What parameter names should identify folders in edit/delete/move tools?
    → A: Use `{ id?: string, name?: string }` matching existing removeItem/editItem
    patterns. Aligns with Omni Automation's two lookup methods: `Folder.byIdentifier(id)`
    and `flattenedFolders.byName(name)`. Convention: `id` takes precedence when
    both provided; `name` is fallback. If `name` matches multiple folders, fail
    with disambiguation error per clarification #1.
16. Q: What should `list_folders` return when both `parentId` and `includeChildren`
    are omitted? → A: Return flat list of ALL folders using `database.flattenedFolders`,
    sorted by database order. Each folder includes `parentId` field (null for root)
    enabling client-side hierarchy reconstruction. This is the most common use case
    giving a complete organizational picture. Verified against Omni Automation:
    `flattenedFolders` returns "a flat array of all folders in the database".
17. Q: What are the folder name validation rules? → A: Follow existing codebase
    patterns: (1) Trim leading/trailing whitespace before validation, (2) Reject
    if trimmed name is empty, (3) No artificial length limit - OmniFocus imposes
    no documented limit and supports emoji/special characters via Character Viewer,
    (4) No character restrictions beyond non-empty. This matches `addProject.ts`
    and `addOmniFocusTask.ts` validation: `name.trim().length === 0` check with
    error "Folder name is required and must be a non-empty string".
18. Q: What response schema should edit/delete/move folder operations return?
    → A: All mutable operations return consistent `{ success: true, id: string,
    name: string }` on success. This aligns with FR-011a and Omni Automation's
    DatabaseObject.id pattern. For delete: capture ID/name before calling
    `delete`. For edit/move: folder object remains accessible after operation,
    read `folder.id.primaryKey` and `folder.name`. Note: Updated from `folderId`
    per clarification #24 for API consistency.
19. Q: What happens when `parentId` references a non-existent folder? → A: Fail
    with error "Invalid parentId 'xyz': folder not found". Applies to add_folder
    (when specifying parent) and list_folders (when filtering by parent). Verified
    against Omni Automation: `Folder.byIdentifier(id)` returns `null` if no such
    folder exists - MCP layer converts null to actionable error. Matches relativeTo
    error pattern from clarification #11 and fail-fast principles.
20. Q: What naming convention should the folder tools use? → A: Match existing
    codebase patterns: `list_folders`, `add_folder`, `edit_folder`, `remove_folder`,
    `move_folder`. This aligns with `add_omnifocus_task`, `add_project`, `remove_item`,
    `edit_item` conventions. Ensures consistent API surface and reduces cognitive
    load for users familiar with existing tools.
21. Q: Should folder tools use JXA/Omni Automation or AppleScript for OmniFocus
    interaction? → A: Use **Omni Automation JavaScript** - the officially recommended
    approach per Omni Group documentation. AppleScript and JXA are listed as
    "Extended Automation" (legacy/supplementary). Omni Automation offers:
    - Cross-platform support (iOS, iPadOS, macOS) vs macOS-only for AppleScript
    - Faster execution performance
    - Better documentation with official API reference
    - Active maintenance and enhancement by Omni Group

    **Execution pattern**: Call Omni Automation from Node.js using AppleScript's
    `evaluate javascript` command:

    ```bash
    osascript -e 'tell application "OmniFocus" to evaluate javascript "..."'
    ```

    This maintains the existing Node.js → osascript bridge while accessing the
    full Omni Automation API. The spec's Omni Automation API references now describe
    the *actual* implementation methods (e.g., `new Folder()`, `deleteObject()`,
    `moveSections()`).

    **Migration note**: The codebase has a mixed implementation - some tools use
    pure AppleScript (e.g., `addProject.ts`) while others already use Omni
    Automation JavaScript (e.g., `queryOmnifocus.ts`, pre-built dump scripts).
    User Story 0 (P0) defines the refactoring task to migrate AppleScript-based
    tools to Omni Automation for consistency before implementing new folder tools.
22. Q: Should `remove_folder` prevent deletion of non-empty folders by default?
    → A: No - match OmniFocus native behavior. OmniFocus allows deletion of folders
    with contents (recursively deletes everything). The `force` parameter is
    removed; all deletions are immediate and recursive like native OmniFocus.
    The UI warning for hidden items is a UI-only feature not applicable to MCP.
    This simplifies the API and matches user expectations from native OmniFocus.
23. Q: Should `edit_folder` use partial or full update semantics? → A: Partial
    updates - only provided fields are modified; omitted fields remain unchanged.
    At least one of `name` or `status` must be provided. Verified against
    Omni Automation: Folder properties (`name`, `status`) support individual
    assignment (e.g., `folder.status = Folder.Status.Dropped` without touching
    `folder.name`). Also matches existing `editItem.ts` pattern where all update
    fields are optional (`newName?`, `newStatus?`, etc.).
24. Q: Should folder tool responses use `folderId` or `id` for the identifier
    field? → A: Use `id` to match Omni Automation's DatabaseObject class where all
    objects (folders, projects, tasks, tags) share a common `id` property
    (specifically `object.id.primaryKey`). Response schema: `{ success: true,
    id: string, name: string }`. Note: Existing files needing refactoring for API
    consistency: `addProject.ts` uses `projectId`, `addOmniFocusTask.ts` uses
    `taskId`. Files already correct: `removeItem.ts` and `editItem.ts` use `id`.
25. Q: What is the complete input schema for `move_folder`? → A: Use a unified
    position system matching Omni Automation's `moveSections(sections, position)`
    API where position is `Folder | Folder.ChildInsertionLocation`. Schema:
    `{ id?: string, name?: string, position: { placement: "before" | "after" |
    "beginning" | "ending", relativeTo?: string } }`. The `relativeTo` field
    holds a folder ID: for "beginning"/"ending" it's the parent folder; for
    "before"/"after" it's the sibling folder. Omitting `relativeTo` means
    library root (e.g., `{ placement: "ending" }` → `library.ending`). This
    maps directly to: `library.beginning`, `folder.ending`, `sibling.after`, etc.
    Note: `position` is required for move operations (no sensible default).
26. Q: What naming convention should be used for ID fields (primary vs foreign
    keys)? → A: Follow Omni Automation patterns: use `id` for primary keys (the
    object's own identifier, from `DatabaseObject.id.primaryKey`) and descriptive
    names with `Id` suffix (lowercase d) for foreign keys that reference other
    objects. Foreign key naming: `parentId` (references parent folder), `relativeTo`
    (references related folder in position operations - parent for
    beginning/ending, sibling for before/after). Note: Both `add_folder` and
    `move_folder` position schemas should use `relativeTo` for consistency
    (see FR-010 and FR-023). This aligns with Omni Automation where relationships
    are object references (e.g., `folder.parent` returns Folder object) but MCP
    serializes these as ID strings. Codebase note: `types.ts` has inconsistent
    casing - some use `Id` (e.g., `parentId`, `projectId`, `folderId`) while
    others use `ID` (e.g., `folderID`, `parentFolderID`, `parentTagID`). New folder
    tools should use `Id` (lowercase d) for consistency with query filters.
27. Q: Should the "long folder names" edge case be kept given clarification #17
    states no limit exists? → A: Remove the edge case. OmniFocus has no documented
    length limit per clarification #17, making this edge case obsolete. The
    contradiction is resolved by removing the edge case from the spec.
28. Q: What does "implied root container" mean and what error should be returned
    when attempting to delete/move it? → A: The "implied root container" refers to
    the `Library` object (`database.library`). Per Omni Automation API,
    `Library` is a special container class (like `Inbox` and `Tags`) - NOT a
    `DatabaseObject`.
    The `deleteObject()` function requires a `DatabaseObject` parameter; `Library`
    cannot be passed to it. MCP layer should validate inputs and return error:
    "Cannot delete/move library: not a valid folder target". This is a type
    validation error, not a semantic operation error. The edge case text should
    be updated to use this specific error message.
29. Q: Why is `position` optional for `add_folder` but required for `move_folder`?
    → A: This asymmetry is intentional and mirrors the native Omni Automation API.
    Per official docs: `new Folder(name, position)` accepts `position: Folder |
    Folder.ChildInsertionLocation | null` - null/omitted means default placement.
    However, `moveSections(sections, position)` requires `position: Folder |
    Folder.ChildInsertionLocation` with NO null option - position must be explicit.
    The spec correctly reflects this API design: FR-010 (add_folder) defaults to
    "ending", FR-023 (move_folder) requires position with no default.
30. Q: How should `includeChildren` behave when `parentId` is omitted? → A: Per
    Omni Automation API, use `database.folders` vs `database.flattenedFolders`
    distinction. When `parentId` is omitted: `includeChildren: false` returns
    top-level folders only (via `database.folders`), `includeChildren: true`
    returns all folders recursively (via `database.flattenedFolders`). This makes
    the parameter meaningful at all levels and mirrors the native API pattern
    where both Database and Folder classes expose `folders` (immediate) vs
    `flattenedFolders` (recursive) properties. FR-006 should be updated to
    reflect this behavior.
31. Q: What field names should `edit_folder` use to distinguish identification
    from update values? → A: Follow existing `editItem.ts` pattern: use `id` and
    `name` for identification (to find the folder), use `newName` and `newStatus`
    for update values (to modify). This matches Omni Automation where `folder.name`
    and `folder.status` are the writable properties, while MCP layer uses `new*`
    prefix to avoid ambiguity. Input schema: `{ id?: string, name?: string,
    newName?: string, newStatus?: 'active'|'dropped' }`. At least one identifier
    (id or name) required; at least one update field (newName or newStatus)
    required. FR-015a updated to reflect this pattern.
32. Q: What are the complete Omni Automation JavaScript methods for folder operations?
    → A: Based on the official Omni Automation API documentation
    (omni-automation.com/omnifocus/), the complete mapping is:

    | Operation | Omni Automation JavaScript |
    |-----------|----------------------------|
    | Create folder at root | `new Folder("X", library.ending)` |
    | Create folder in parent | `new Folder("X", parentFolder.ending)` |
    | Create at beginning | `new Folder("X", parentFolder.beginning)` |
    | Create before sibling | `new Folder("X", siblingFolder.before)` |
    | Create after sibling | `new Folder("X", siblingFolder.after)` |
    | Find by ID | `Folder.byIdentifier("xyz")` |
    | Find by name | `flattenedFolders.byName("X")` |
    | Set name | `folder.name = "newName"` |
    | Set status (dropped) | `folder.status = Folder.Status.Dropped` |
    | Set status (active) | `folder.status = Folder.Status.Active` |
    | Delete | `deleteObject(folder)` |
    | Move to folder end | `moveSections([folder], destFolder.ending)` |
    | Move to root | `moveSections([folder], library.ending)` |
    | Move before sibling | `moveSections([folder], siblingFolder.before)` |
    | Move after sibling | `moveSections([folder], siblingFolder.after)` |

    Status values: `Folder.Status.Active`, `Folder.Status.Dropped` (folders only
    have 2 states, unlike projects which also have `OnHold` and `Done`).

    **Execution wrapper** (from Node.js):

    ```javascript
    const script = `
      const folder = new Folder("Test", library.ending);
      JSON.stringify({ success: true, id: folder.id.primaryKey, name: folder.name });
    `;
    // Escape quotes for AppleScript string embedding
    const escaped = script.replace(/["\\]/g, '\\$&');
    execFile('osascript', ['-e', `tell application "OmniFocus" to evaluate javascript "${escaped}"`]);
    ```

33. Q: When is `relativeTo` required vs optional in the position schema? → A: Per
    official Omni Automation API documentation: `relativeTo` is **REQUIRED** for
    `placement: "before"|"after"` (specifies sibling folder ID), and **OPTIONAL**
    for `placement: "beginning"|"ending"` (specifies parent folder ID; omit for
    library root). This maps directly to Omni Automation's `Folder.ChildInsertionLocation`
    properties: `sibling.before`, `sibling.after`, `parent.beginning`, `parent.ending`,
    `library.beginning`, `library.ending`. FR-010 and FR-023 updated to explicitly
    capture these requirement rules.
34. Q: What error response format should disambiguation errors use? → A: Use
    **structured response** to enable AI agents to present users with choices:
    `{ success: false, error: string, code: "DISAMBIGUATION_REQUIRED",
    matchingIds: string[] }`. This allows agents to: (1) detect disambiguation via
    `code` field, (2) extract IDs programmatically, (3) query folder details,
    (4) present user with contextual choices, (5) retry with selected ID. Note:
    Omni Automation's `byName()` simply returns "the first folder" with no
    disambiguation - this is an MCP layer design decision. FR-027 added.
35. Q: Should User Story 0 enumerate specific files to refactor, or should the
    planner discover them? → A: **Planner discovers** - US0 scope clause stays
    as-is; the planning phase identifies which files contain AppleScript that
    needs refactoring. This is standard practice for refactoring tasks where the
    spec defines *what* to change (AppleScript → Omni Automation JavaScript) and
    the plan defines *where* (specific files). No spec changes needed.
36. Q: How should transport-level failures be handled (e.g., OmniFocus not
    running, osascript timeout, syntax errors)? → A: **Follow existing patterns**
    in `scriptExecution.ts`. The current codebase already handles these failures;
    folder tools should use the same error handling. No new FR needed - this is
    an implementation detail that maintains consistency with existing tools.

## Overview

This feature adds comprehensive folder management capabilities to the OmniFocus
MCP Server. Folders are the top-level organizational units in OmniFocus that
contain projects and other folders, forming a hierarchical structure.
Currently, AI assistants cannot interact with this organizational layer,
limiting their ability to help users maintain a well-structured task
management system.

### Business Value

- **Organization**: Enable AI assistants to help users organize projects
  logically within folders
- **Discovery**: Allow AI assistants to understand how a user's projects
  are organized
- **Maintenance**: Support restructuring and cleanup of folder hierarchies
- **Completeness**: Provide parity with OmniFocus's native folder capabilities

## User Scenarios & Testing *(mandatory)*

### User Story 0 - Refactor to Omni Automation JavaScript (Priority: P0)

As a developer maintaining this MCP server, I need to refactor the codebase from
AppleScript to Omni Automation JavaScript so that we use Omni's recommended
automation approach, enabling future cross-platform compatibility and better
API alignment.

**Why this priority**: Omni Automation JavaScript is the **officially recommended**
approach per Omni Group documentation. AppleScript/JXA are listed as "Extended
Automation" (legacy/supplementary). Omni Automation is:

- Cross-platform (iOS, iPadOS, macOS) vs macOS-only for AppleScript
- Faster execution
- Better documented with official API reference
- Actively maintained and enhanced

This foundational refactor must happen before implementing new folder tools to
ensure consistency and avoid technical debt.

**Technical Approach**:
The refactor changes the execution pattern from pure AppleScript:

```applescript
tell application "OmniFocus"
  tell front document
    make new folder with properties {name:"Test"}
  end tell
end tell
```

To Omni Automation JavaScript via AppleScript's `evaluate javascript` command:

```applescript
tell application "OmniFocus"
  evaluate javascript "
    const folder = new Folder('Test', library.ending);
    JSON.stringify({ success: true, id: folder.id.primaryKey, name: folder.name });
  "
end tell
```

This approach:

1. Uses `osascript -e 'tell application "OmniFocus" to evaluate javascript "..."'`
2. Allows full Omni Automation API access
3. Maintains Node.js → osascript bridge (no new dependencies)
4. Returns JSON for structured responses

**Acceptance Scenarios**:

1. **Given** an existing AppleScript-based tool (e.g., `addProject.ts`),
   **When** refactored to Omni Automation JavaScript,
   **Then** the tool produces identical functional behavior with same inputs/outputs
2. **Given** the codebase has mixed implementations (some AppleScript, some
   Omni Automation JavaScript),
   **When** all AppleScript code is migrated to Omni Automation JavaScript,
   **Then** all tools consistently use `evaluate javascript` with Omni Automation
   JavaScript (zero remaining AppleScript implementations)
3. **Given** the Omni Automation API,
   **When** implementing folder operations,
   **Then** code maps directly to documented methods (`new Folder()`, `deleteObject()`,
   `moveSections()`) without translation to AppleScript equivalents
4. **Given** the refactored codebase,
   **When** running the test suite,
   **Then** all existing tests pass with no regressions
5. **Given** the refactored codebase,
   **When** building and type-checking,
   **Then** no TypeScript errors are introduced

**Scope** (Migration: AppleScript → Omni Automation JavaScript):

- **Migrate** `src/tools/primitives/*.ts` files FROM AppleScript TO Omni
  Automation JavaScript (e.g., `addProject.ts`, `addOmniFocusTask.ts`)
- **Use as reference**: `src/utils/omnifocusScripts/*.js` pre-built scripts -
  `omnifocusDump.js`, `listPerspectives.js`, and `getPerspectiveView.js`
  already use Omni Automation JavaScript and serve as target patterns
- **Verify** `src/utils/scriptExecution.ts` already supports `evaluate javascript`
  pattern via `app.evaluateJavascript()` (line 109) - no changes needed
- Update tests to validate Omni Automation JavaScript output
- Update CLAUDE.md to document the Omni Automation JavaScript approach

**Out of Scope for this story** (addressed by subsequent user stories):

- New folder tools (P1-P5 user stories)
- iOS/iPadOS support (requires different transport, future enhancement)

---

### User Story 1 - View Folder Structure (Priority: P1)

As an AI assistant user, I want to see my folder hierarchy so that I can
understand how my projects are organized and make informed suggestions
about where to place new projects.

**Why this priority**: Understanding the existing structure is fundamental
to all other folder operations. Without visibility into folders, the AI
cannot provide meaningful organizational assistance.

**Independent Test**: Can be fully tested by requesting a list of folders
and verifying the hierarchical structure is returned correctly. Delivers
immediate value by enabling organizational awareness.

**Acceptance Scenarios**:

1. **Given** a user with multiple folders containing projects,
   **When** the AI requests a list of folders,
   **Then** all folders are returned with their names, statuses,
   and parent-child relationships
2. **Given** nested folders exist (folders within folders),
   **When** listing folders with hierarchy details,
   **Then** the nesting structure is accurately represented
3. **Given** some folders are marked as dropped,
   **When** filtering by status,
   **Then** only folders matching the status filter are returned
4. **Given** a specific parent folder is specified,
   **When** listing its children,
   **Then** only immediate children of that folder are returned

---

### User Story 2 - Create New Folders (Priority: P2)

As an AI assistant user, I want the AI to create folders for me so that I
can organize my projects into logical groupings without manually switching
to OmniFocus.

**Why this priority**: Creating folders is the primary action for building
organizational structure. It depends on understanding existing structure (P1)
but is essential for actively organizing projects.

**Independent Test**: Can be fully tested by creating a new folder and
verifying it appears in OmniFocus. Delivers value by enabling project
organization.

**Acceptance Scenarios**:

1. **Given** a user wants to organize work projects,
   **When** the AI creates a folder named "Work Projects",
   **Then** a new folder with that name is created in OmniFocus at the
   root level
2. **Given** an existing folder "Personal",
   **When** the AI creates a subfolder "Health" inside it,
   **Then** the new folder is correctly nested under "Personal"
3. **Given** the user specifies a position,
   **When** creating a folder,
   **Then** the folder appears at the specified position among siblings

---

### User Story 3 - Edit Folder Properties (Priority: P3)

As an AI assistant user, I want the AI to rename or update folder properties
so that I can keep my organization system current without manual intervention.

**Why this priority**: Editing is less frequent than viewing or creating but
necessary for maintaining an evolving organizational system.

**Independent Test**: Can be fully tested by modifying a folder's name or
status and verifying the change persists. Delivers value by enabling
organizational maintenance.

**Acceptance Scenarios**:

1. **Given** a folder named "Old Projects",
   **When** the AI renames it to "Archive",
   **Then** the folder name is updated in OmniFocus
2. **Given** an active folder,
   **When** the AI changes its status to dropped,
   **Then** the folder's status is set to dropped (children retain their
   own status per OmniFocus native behavior)
3. **Given** a folder identified by name,
   **When** editing its properties,
   **Then** the correct folder is modified (handling duplicate names
   appropriately)

---

### User Story 4 - Delete Folders (Priority: P4)

As an AI assistant user, I want the AI to delete folders I no longer need
so that I can clean up my organizational structure.

**Why this priority**: Deletion is a destructive operation that should be
used carefully. It's less common than other operations but necessary
for cleanup.

**Independent Test**: Can be fully tested by deleting a folder and
verifying it no longer exists. Delivers value by enabling organizational
cleanup.

**Acceptance Scenarios**:

1. **Given** an empty folder,
   **When** the AI deletes it,
   **Then** the folder is permanently removed from OmniFocus
2. **Given** a folder containing projects or subfolders,
   **When** the AI deletes it,
   **Then** the folder and all its contents are permanently removed
   (matches OmniFocus native behavior - recursive deletion)
3. **Given** a folder identified by ID or name,
   **When** deleting,
   **Then** the correct folder is removed

---

### User Story 5 - Move Folders (Priority: P5)

As an AI assistant user, I want the AI to reorganize my folder hierarchy
so that I can restructure my project organization as my needs evolve.

**Why this priority**: Moving folders is an advanced reorganization task.
It's valuable but least common among folder operations.

**Independent Test**: Can be fully tested by moving a folder to a new parent
and verifying the hierarchy change. Delivers value by enabling organizational
restructuring.

**Acceptance Scenarios**:

1. **Given** a folder at the root level,
   **When** the AI moves it inside another folder,
   **Then** the folder becomes a child of the target folder
2. **Given** a nested folder,
   **When** the AI moves it to the root level,
   **Then** the folder becomes a top-level folder
3. **Given** a folder,
   **When** moving it to a position within its new parent's children,
   **Then** the folder appears at the specified position
4. **Given** a folder with nested subfolders,
   **When** moving the parent folder,
   **Then** the entire subtree moves with it

---

### Edge Cases

- **Duplicate folder names**: When a name-based operation matches multiple
  folders, the system MUST fail with a disambiguation error that lists all
  matching folder IDs (e.g., "Ambiguous folder name 'Archive'. Found 3
  matches: id1, id2, id3. Please specify by ID.")
- **Circular references**: Moving a folder inside its own descendant is
  rejected with a clear error message
- **Empty folder operations**: Creating a folder with an empty or
  whitespace-only name is rejected with error "Folder name is required
  and must be a non-empty string" (name is trimmed before validation)
- **Root-level restrictions**: Attempting to delete or move the library root
  returns error "Cannot delete/move library: not a valid folder target" (the
  `Library` is a container class, not a `DatabaseObject`)
- **Concurrent modifications**: Operations reflect the current state of
  OmniFocus at execution time. No locking or conflict resolution is needed
  since OmniFocus is a single-user application; if the database changes
  between request and execution, the operation uses the current state
- **Special characters in names**: Folder names with special characters
  (quotes, slashes, etc.) are properly escaped and preserved
- **Invalid relativeTo in position**: When `relativeTo` references a non-existent
  folder or (for before/after placement) a folder in a different parent than
  the target, operation fails with descriptive error message
- **Invalid parentId**: When `parentId` references a non-existent folder in
  add_folder or list_folders, operation fails with error "Invalid parentId
  'xyz': folder not found"

## Requirements *(mandatory)*

### Functional Requirements

#### List Folders

- **FR-001**: System MUST return all folders accessible in the user's
  OmniFocus database
- **FR-002**: System MUST return each folder with schema: `{ id: string,
  name: string, status: 'active'|'dropped', parentId: string|null }` where
  root-level folders have `parentId: null`
- **FR-003**: System MUST represent parent-child relationships in the
  returned data
- **FR-004**: System MUST support filtering folders by status
  (active, dropped) via optional `status` parameter
- **FR-005**: System MUST support filtering to show only children of a
  specified parent folder via optional `parentId` parameter
- **FR-006**: System MUST support an option to include or exclude nested
  folder details via optional `includeChildren` parameter. When `parentId`
  is specified: `includeChildren: true` returns recursive descendants (via
  `folder.flattenedFolders`), `includeChildren: false` returns immediate
  children only (via `folder.folders`). When `parentId` is omitted:
  `includeChildren: false` returns top-level folders only (via
  `database.folders`), `includeChildren: true` returns all folders
  recursively (via `database.flattenedFolders`). Default is `true` to
  align with clarification #16 which established returning all folders as the
  common use case. Note: Updated per clarification #30 to align with
  Omni Automation API patterns.

#### Add Folder

- **FR-007**: System MUST allow creating a folder with a specified name
- **FR-008**: System MUST support creating folders at the root level
  (no parent)
- **FR-009**: System MUST support creating folders as children of
  existing folders
- **FR-010**: System MUST support specifying position via object structure:
  `{ placement: "before"|"after"|"beginning"|"ending", relativeTo?: string }`.
  Requirement rules per official Omni Automation API:
  - For `placement: "before"` or `"after"`: `relativeTo` is **REQUIRED** and
    specifies the sibling folder ID (maps to `sibling.before`/`sibling.after`)
  - For `placement: "beginning"` or `"ending"`: `relativeTo` is **OPTIONAL**
    and specifies the parent folder ID (maps to `parent.beginning`/
    `parent.ending`); when omitted, defaults to library root
    (`library.beginning`/`library.ending`)
  Default position when entire `position` object is omitted:
  `{ placement: "ending" }` (i.e., `library.ending`). Note: Uses `relativeTo`
  for consistency with `move_folder` (FR-023) per clarification #26
- **FR-011**: System MUST return the identifier of the newly created folder
- **FR-011a**: All successful operations MUST return response structure:
  `{ success: true, id: string, name: string }` (matches Omni Automation's
  DatabaseObject.id property pattern)

#### Edit Folder

- **FR-012**: System MUST support identifying folders by unique identifier
- **FR-013**: System MUST support identifying folders by name using
  case-sensitive exact matching; if multiple folders match, operation MUST
  fail with error listing all matching IDs
- **FR-014**: System MUST allow renaming folders
- **FR-015**: System MUST allow changing folder status (active/dropped)
- **FR-015a**: System MUST use partial update semantics - only provided fields
  are modified; omitted fields remain unchanged. At least one of `newName` or
  `newStatus` must be provided. Note: Uses `new*` prefix per clarification #31
  to distinguish update fields from identification fields (`id`, `name`).
- **FR-016**: System MUST return confirmation of successful modification with
  response `{ success: true, id: string, name: string }`

#### Remove Folder

- **FR-017**: System MUST support deleting folders by identifier or name
- **FR-018**: System MUST delete folders and ALL contents recursively
  (subfolders, projects, and their tasks) matching OmniFocus native behavior.
  No `force` parameter - all deletions are immediate and recursive.
- **FR-019**: System MUST return confirmation of successful deletion with
  response `{ success: true, id: string, name: string }` (ID and name
  captured before deletion)
- **FR-020**: System MUST provide clear error messages when deletion fails

#### Move Folder

- **FR-021**: System MUST support moving folders to a different parent folder
- **FR-022**: System MUST support moving folders to the root level (no parent)
- **FR-023**: System MUST use unified position schema matching Omni Automation's
  `moveSections(sections, position)` API: `{ placement: "before" | "after" |
  "beginning" | "ending", relativeTo?: string }`.
  Requirement rules per official Omni Automation API:
  - For `placement: "before"` or `"after"`: `relativeTo` is **REQUIRED** and
    specifies the sibling folder ID (maps to `sibling.before`/`sibling.after`)
  - For `placement: "beginning"` or `"ending"`: `relativeTo` is **OPTIONAL**
    and specifies the parent folder ID (maps to `parent.beginning`/
    `parent.ending`); when omitted, defaults to library root
    (`library.beginning`/`library.ending`)
  **Position is required** for move operations (no default) per Omni Automation's
  `moveSections()` signature which does not accept null.
- **FR-024**: System MUST preserve folder contents (projects and subfolders)
  during move
- **FR-025**: System MUST prevent circular hierarchy (folder cannot be moved
  inside itself or its descendants)
- **FR-026**: System MUST return confirmation of successful move with response
  `{ success: true, id: string, name: string }`

#### Error Handling

- **FR-027**: System MUST return structured disambiguation errors when a
  name-based lookup matches multiple folders: `{ success: false, error: string,
  code: "DISAMBIGUATION_REQUIRED", matchingIds: string[] }`. This enables AI
  agents to programmatically present users with folder choices and retry with
  the selected ID.
- **FR-028**: System MUST return standard error responses for all other failures:
  `{ success: false, error: string }` with descriptive error messages.

### Key Entities

- **Folder**: A container for organizing projects and other folders
  within OmniFocus
  - Name: Display name of the folder (string, required)
  - Identifier: Unique ID (primaryKey) for unambiguous reference
  - Status: Active or Dropped (only two valid states)
  - Parent: Reference to containing folder (null for root-level folders)
  - Children/Sections: Nested folders and projects within this folder
  - Folders: Child folders only (excluding projects)
  - Projects: Projects contained directly in this folder
  - Position markers: Locations for insertion (before, after, beginning,
    ending)

- **Folder.Status**: Enumeration of valid folder states
  - Active: Folder is active and visible in normal views
  - Dropped: Folder is archived/dropped (hidden from active views)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI assistants can successfully list all folders in a user's
  OmniFocus database within 2 seconds
- **SC-002**: AI assistants can create, edit, and delete folders with a
  success rate of 99% for valid requests
- **SC-003**: All folder operations provide descriptive error messages when
  operations fail due to validation or constraints
- **SC-004**: Folder operations complete within 3 seconds under normal
  conditions
- **SC-005**: The five folder tools collectively enable complete folder
  management without requiring manual OmniFocus interaction
- **SC-006**: Folder hierarchy changes made through the tools are immediately
  reflected in the OmniFocus application

## Assumptions

- Users have OmniFocus installed and running on macOS
- The MCP server has appropriate permissions to interact with OmniFocus
- Folder operations follow OmniFocus's native behavior and constraints
- The OmniFocus database is in a consistent state when operations are
  performed
- Users understand that "dropped" folders are effectively archived but
  not deleted
- Implementation uses Omni Automation JavaScript (the officially recommended
  approach) via AppleScript's `evaluate javascript` command; AppleScript-based
  tools in the existing codebase will be refactored per User Story 0 before
  new folder tools are implemented (some tools already use Omni Automation
  and serve as reference patterns)

## Out of Scope

- Folder synchronization across devices (handled by OmniFocus)
- Undo/redo functionality for folder operations (covered in a separate phase)
- Bulk folder operations (covered in Phase 8: Bulk Operations)
- Folder-level permissions or sharing (not supported by OmniFocus)
- Custom folder metadata or attributes beyond name and status

## API Reference Documentation

### Primary Sources

<!-- markdownlint-disable MD034 -->

| Resource | URL | Description |
|----------|-----|-------------|
| Folder Class | <https://omni-automation.com/omnifocus/folder.html> | Folder class docs |
| API Reference | <https://omni-automation.com/omnifocus/OF-API.html> | Full API 3.13.1 |
| Database Class | <https://omni-automation.com/omnifocus/database.html> | Delete and move ops |
| Finding Items | <https://omni-automation.com/omnifocus/finding-items.html> | Search methods |
| Tutorial | <https://omni-automation.com/omnifocus/tutorial/class.html> | Getting started |

<!-- markdownlint-enable MD034 -->

### Confirmed Folder Capabilities

| Operation | API Method | Reference |
|-----------|------------|-----------|
| Create | `new Folder(name, position)` | [Folder][1] |
| Find by ID | `Folder.byIdentifier(id)` | [Folder][1] |
| Find by name | `flattenedFolders.byName(name)` | [Folder][1] |
| Search | `foldersMatching(search)` | [Database][2] |
| Update | `folder.name`, `folder.status` | [Folder][1] |
| Delete | `deleteObject(folder)` | [Database][2] |
| Move | `moveSections([folder], position)` | [Database][2] |

[1]: https://omni-automation.com/omnifocus/folder.html
[2]: https://omni-automation.com/omnifocus/OF-API.html#Database

### Position System

Folders support four insertion locations: `before`, `after`, `beginning`,
`ending`.

- Root-level folders use `library.beginning` or `library.ending`
- Nested folders use parent folder's position properties
- See: [Folder.ChildInsertionLocation][3]

[3]: https://omni-automation.com/omnifocus/OF-API.html#Folder.ChildInsertionLocation

### Status Values

Only two valid states exist (see [Folder.Status][4]):

- `Folder.Status.Active` - The folder is active
- `Folder.Status.Dropped` - The folder has been dropped

[4]: https://omni-automation.com/omnifocus/OF-API.html#Folder.Status

### Hierarchy Access

| Property | Returns | Description |
|----------|---------|-------------|
| `folders` | FolderArray | Immediate child folders only |
| `flattenedFolders` | FolderArray | All descendant folders recursively |
| `children`/`sections` | SectionArray | Folders and projects combined |
| `projects` | ProjectArray | Projects directly in this folder |
| `parent` | Folder or null | Parent folder reference (null for root) |
