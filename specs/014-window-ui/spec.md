# Feature Specification: Window & UI Control

**Feature Branch**: `014-window-ui`
**Created**: 2026-03-18
**Status**: Draft
**Input**: User description: "Window & UI Control -- UI navigation and control through the MCP server for revealing items, expanding/collapsing nodes and notes, focusing on projects/folders, and selecting items programmatically"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reveal Item in Outline (Priority: P1)

A GTD practitioner is discussing specific tasks or projects with their AI assistant and wants the assistant to navigate the OmniFocus outline directly to those items. The AI reveals the items in the outline, scrolling and expanding the hierarchy as needed so the items are visible on screen. Accepts 1-10 items per operation.

**Why this priority**: Revealing items is the most fundamental UI navigation operation. It enables "show me these items" workflows that connect conversational AI assistance to visual confirmation in the OmniFocus UI. Without this, the AI can describe items but cannot direct the user's attention to them.

**Independent Test**: Can be fully tested by creating a task nested inside a project inside a folder, then revealing it and verifying the outline scrolls to and displays that task. Can also test revealing multiple items (e.g., 3 tasks) in a single operation.

**Acceptance Scenarios**:

1. **Given** a task exists in a collapsed project within a folder, **When** the user asks the AI to reveal it, **Then** the outline expands and scrolls to show the task, making it visible on screen
2. **Given** a project exists at the top level, **When** the user asks the AI to reveal it, **Then** the outline scrolls to show the project
3. **Given** the item is identified by name and multiple matches exist, **When** the user asks to reveal it, **Then** the system returns a disambiguation error listing all matching items
4. **Given** the item ID does not correspond to any existing item, **When** the user asks to reveal it, **Then** the system returns a clear "not found" error
5. **Given** OmniFocus version is older than 4.0, **When** the user asks to reveal an item, **Then** the system returns a version-compatibility error explaining that UI control requires OmniFocus 4+
6. **Given** the content tree is not available (e.g., `document.windows[0].content` is null/undefined due to window not fully loaded or other runtime issue), **When** the user asks to reveal an item, **Then** the system returns a clear error indicating the content tree is not available

---

### User Story 2 - Expand/Collapse Outline Nodes (Priority: P1)

A GTD practitioner conducting a review wants the AI to control the level of detail visible in the outline. The AI can expand nodes to show child tasks or collapse them to provide a higher-level overview, with an option to expand or collapse recursively through the entire hierarchy.

**Why this priority**: Controlling outline disclosure is essential for review workflows. During weekly reviews, users need to expand projects to see all tasks, then collapse them to move on. This pairs naturally with reveal (Story 1) to create complete navigation workflows.

**Independent Test**: Can be tested by creating a project with nested tasks, expanding it to verify children become visible, then collapsing it to verify they are hidden.

**Acceptance Scenarios**:

1. **Given** a collapsed project node in the outline, **When** the user asks the AI to expand it, **Then** the project's immediate children become visible
2. **Given** a collapsed project node with nested sub-tasks, **When** the user asks the AI to expand it recursively (completely), **Then** all descendants at every level become visible
3. **Given** an expanded project node, **When** the user asks the AI to collapse it, **Then** the project's children are hidden from view
4. **Given** an expanded project node with nested children, **When** the user asks the AI to collapse it recursively, **Then** all descendant levels are collapsed
5. **Given** multiple items are provided in a batch (1-50), **When** the user asks to expand or collapse them, **Then** each item is processed individually with per-item success/failure results
6. **Given** an item that is already in the requested state (already expanded or already collapsed), **When** the operation is applied, **Then** it succeeds as a no-op
7. **Given** an item that cannot be found in the current content tree view, **When** the user asks to expand it, **Then** the system returns a clear error indicating the item is not visible in the current perspective

---

### User Story 3 - Expand/Collapse Notes (Priority: P2)

A GTD practitioner wants the AI to show or hide note content attached to tasks and projects in the outline, allowing them to review notes during context-based work or hide them for a cleaner view.

**Why this priority**: Notes contain important context (meeting notes, reference links, decision rationale) but clutter the outline when always visible. Being able to toggle note visibility programmatically supports review workflows where the user wants to inspect specific items' notes without manually clicking through each one.

**Independent Test**: Can be tested by creating a task with a note, expanding its note to verify the note text becomes visible in the outline, then collapsing it to verify it is hidden.

**Acceptance Scenarios**:

1. **Given** a task with a note exists in the outline, **When** the user asks the AI to expand its note, **Then** the note content becomes visible below the task in the outline
2. **Given** a task with a visible note, **When** the user asks the AI to collapse its note, **Then** the note content is hidden
3. **Given** multiple items are provided in a batch (1-50), **When** the user asks to expand or collapse notes, **Then** each item is processed individually with per-item results
4. **Given** a task with no note, **When** the user asks to expand its note, **Then** the operation succeeds as a no-op (no note to show, no error)
5. **Given** the `completely` option is set, **When** the user asks to expand notes, **Then** notes are expanded on the specified items and all their descendants

---

### User Story 4 - Focus on Project or Folder (Priority: P2)

A GTD practitioner wants the AI to narrow the OmniFocus view to a specific project or folder, filtering out everything else. This supports focused work sessions where the user wants to concentrate on one area of responsibility.

**Why this priority**: Focus is a key OmniFocus concept for reducing visual noise. During context-based work ("let me focus on my Work folder"), narrowing the view eliminates distractions. This is more impactful than expand/collapse for concentrated work sessions.

**Independent Test**: Can be tested by creating a folder with projects, focusing on that folder, and verifying that only its contents are visible in the outline.

**Acceptance Scenarios**:

1. **Given** a folder with projects and tasks exists, **When** the user asks the AI to focus on it, **Then** only that folder's contents are visible in the outline
2. **Given** a project exists, **When** the user asks the AI to focus on it, **Then** only that project's tasks are visible in the outline
3. **Given** multiple projects or folders are specified, **When** the user asks to focus on them, **Then** the view shows only the specified items and their contents
4. **Given** an item is identified by name and multiple matches exist, **When** the user asks to focus on it, **Then** the system returns a disambiguation error
5. **Given** a task (not a project or folder) is specified, **When** the user asks to focus on it, **Then** the system returns an error explaining that focus only works with projects and folders

---

### User Story 5 - Unfocus (Clear Focus) (Priority: P2)

A GTD practitioner has finished working in a focused view and wants the AI to restore the full OmniFocus outline, showing all items again.

**Why this priority**: Unfocus is the counterpart to focus -- without it, users would be stuck in a narrowed view after the AI focuses them on a specific area. This completes the focus/unfocus workflow pair.

**Independent Test**: Can be tested by focusing on a folder, then unfocusing, and verifying that the full outline returns to view.

**Acceptance Scenarios**:

1. **Given** the outline is currently focused on a project or folder, **When** the user asks the AI to unfocus, **Then** the full outline becomes visible showing all items
2. **Given** the outline is not currently focused (already showing everything), **When** the user asks to unfocus, **Then** the operation succeeds as a no-op
3. **Given** no parameters are needed, **When** the user asks to unfocus, **Then** the system clears the focus using an empty array (not null)

---

### User Story 6 - Select Items in Outline (Priority: P3)

A GTD practitioner wants the AI to select specific items in the OmniFocus outline, either to prepare a visual selection for review or to set up items for a subsequent batch operation performed manually in OmniFocus.

**Why this priority**: Selection is useful for visual highlighting and workflow preparation but is less critical than navigation (reveal) and view control (expand/collapse/focus). Users can manually select items, making this a convenience rather than an enabling capability.

**Independent Test**: Can be tested by creating multiple tasks, selecting two of them, and verifying they appear highlighted in the outline.

**Acceptance Scenarios**:

1. **Given** multiple tasks exist in the outline, **When** the user asks the AI to select specific items, **Then** those items become selected (highlighted) in the outline
2. **Given** items are currently selected, **When** the user asks to select different items with `extending` false (default), **Then** the previous selection is replaced with the new selection
2a. **Given** items are currently selected, **When** the user asks to select additional items with `extending` true, **Then** the new items are added to the existing selection
3. **Given** multiple items are provided (1-100), **When** some items exist and some do not, **Then** existing items are selected and non-existent items return individual errors
4. **Given** an item is not currently visible in the outline (collapsed parent, different perspective), **When** the user asks to select it, **Then** the system returns an error indicating the item is not selectable in the current view
5. **Given** items are identified by name with multiple matches, **When** the user asks to select them, **Then** the system returns a disambiguation error for ambiguous entries

---

### Edge Cases

- What happens when `document.windows[0]` is not available (no open window)? The system should return a clear error indicating that OmniFocus must have an open window for UI operations
- What happens when the content tree is not available (macOS-only property accessed on non-macOS)? The system should return a platform-compatibility error before attempting any content tree operations
- What happens when expanding a node whose parent is collapsed? The node expands but may not be visible until the parent is also expanded; the operation still succeeds
- What happens when focusing on an empty folder (no projects inside)? The focus succeeds but the outline shows no items -- this is valid OmniFocus behavior
- What happens when a batch expand/collapse request includes items from different hierarchy levels? Each item is processed independently; hierarchy relationships do not affect batch processing
- What happens when the content tree node for a valid database object cannot be found? This occurs when the item exists but is not visible in the current perspective; the system should return a "not visible in current view" error rather than a "not found" error
- What happens when revealing an item that is filtered out by the current perspective? The reveal may not succeed if the item is excluded by perspective rules; the system should handle this gracefully
- What happens when selecting items across different branches of the hierarchy? OmniFocus supports multi-selection across hierarchy levels; the system should pass all TreeNode objects to `tree.select(nodes)` in a single call
- What happens when `tree.select()` is called with `extending=true` but the current selection is empty? The operation succeeds and selects the specified nodes; `extending=true` with no prior selection is equivalent to `extending=false`
- What happens when `window.focus` is set with a mix of valid (projects/folders) and invalid (tasks/tags) items in the OmniJS array? Focus validation happens at the TypeScript layer before script execution: all items are resolved and any tasks or tags produce per-item `INVALID_TYPE` errors. Only valid project/folder targets are passed to the OmniJS script for `window.focus` assignment. If no valid targets remain after filtering, the entire operation fails with an error (no focus change occurs)
- What happens when `node.expandNote()` is called on a folder or tag node (which may not have notes)? The operation is a no-op; `expandNote()` and `collapseNote()` succeed silently on nodes without note content, consistent with the task-with-no-note scenario (User Story 3, Scenario 4)
- What happens when `document.windows` is an empty array vs `document.windows[0]` being null? Both cases are handled by the same window guard: `var win = document.windows[0]; if (!win) { ... }`. Whether the array is empty (returns `undefined`) or the window is null, the guard catches it and returns the "no window open" error
- What happens when `tree.nodeForObject()` is called with an object type the tree does not display (e.g., an internal system object)? The method returns null, following the same behavior as when an item is filtered by the current perspective. The `NODE_NOT_FOUND` error code is returned in per-item results
- What happens when `node.expand(completely)` is called on a leaf node (task with no children)? The operation is a no-op; expanding a node that has no children succeeds without error. The `canExpand` property on TreeNode would be false, but calling `expand()` directly does not throw. Consistent with SC-008 idempotency
- What happens when `tree.reveal()` is called with an empty array? The operation is a no-op; revealing zero nodes has no visible effect and does not throw. The tool's Zod schema enforces a minimum of 1 item, so this case is prevented at the validation layer
- What happens when `tree.select()` is called with an empty nodes array? The operation clears the current selection (equivalent to deselecting all). The tool's Zod schema enforces a minimum of 1 item, so this case is prevented at the validation layer for `select_items`
- What happens when `tree.select()` is called on nodes whose ancestors are collapsed? Per the OmniJS API docs, `tree.select()` only selects nodes "that are visible (nodes with collapsed ancestors cannot be selected)." The `select_items` tool handles this by calling `tree.reveal(nodes)` before `tree.select()` as a pre-flight step (FR-017), ensuring all ancestor nodes are expanded before selection

## Clarifications

### Session 2026-03-18

- Q: Should the select tool use `window.selectObjects(objects)` or `tree.select(nodes, extending)` for selecting items? → A: Use `tree.select(nodes)` for consistency with content tree paradigm. All other tools use tree nodes, so select should too. The `extending` parameter is a bonus.
- Q: Should the spec use `ContentNode` or `TreeNode` for the node entity? → A: Use `TreeNode` in implementation code and OmniJS scripts to match the actual API. The spec uses `TreeNode` as the canonical term; `ContentTree` remains as the conceptual name for `document.windows[0].content` (OmniJS class name is `Tree`).
- Q: Should the select tool expose the `extending` parameter from `tree.select(nodes, extending)`? → A: Yes, expose `extending` as an optional boolean parameter on `select_items`. Default to `false` (replace selection). Low-cost addition with clear value for additive selection workflows.
- Q: Should batch tools use `tree.nodesForObjects()` (plural) instead of iterating `nodeForObject()` individually? → A: Yes, use `tree.nodesForObjects(objects)` for tools that accept multiple items (expand_items, collapse_items, select_items). More efficient than iterating individually; note that the returned array may be smaller than the input array (items not visible are omitted).
- Q: Should tags be supported in UI operations (reveal, expand, select) alongside tasks, projects, and folders? → A: Yes, include tags. The OmniJS API confirms `nodeForObject()` works for tasks, projects, folders, AND tags. All 4 types should be supported since they can all appear in the outline.
- Q: What is the default/unfocused state of `window.focus` — `null` or `[]`? → A: Unfocused state is `null` when read; set `[]` to unfocus. The API type signature is `Array of Project or Folder or null`, with `null` as the read value when no focus is active. Asymmetric read/write: read returns `null`, write `[]` to clear.
- Q: How does `tree.select()` handle non-visible nodes in its input array? → A: Silently skip non-visible nodes, report per-item. Use `tree.nodesForObjects()` which only returns visible nodes. Items that do not map to a node are reported as NODE_NOT_FOUND in per-item results at the TypeScript layer, not silently dropped.
- Q: How does focus interact with perspectives — override or work within? → A: Do not document focus-perspective interaction in the spec. Focus persisting across perspective switches is OmniFocus behavior, not something our tools control. Our tools just set/clear focus. Noted in Assumptions.
- Q: Does `tree.select()` return a value, and how is success determined? → A: `tree.select()` returns void. Success is inferred from no exception being thrown. Per-item result reporting happens at the TypeScript layer based on `nodesForObjects()` results before calling `tree.select()`.
- Q: Should `reveal_item` accept multiple items since the API accepts `Array of TreeNode`? → A: Accept array but limit to 1-10 items. Since the API accepts `Array of TreeNode`, reveal should accept multiple items (useful for "show me these 3 tasks"). Limit to 1-10 items since revealing too many at once defeats the purpose.

### Session 2026-03-18 (API Gap Resolution)

- Q: Does the `(macOS)` annotation on the `DocumentWindow.content` property limit platform scope, given that the OF4 documentation states node trees are now implemented on iOS/iPadOS as well? → A: The OmniJS API docs at omni-automation.com/omnifocus/outline.html confirm that "as of OmniFocus 4, these node trees are implemented macOS, as well as iOS and iPadOS." The `(macOS)` annotation on the `content` property appears to be a legacy artifact. However, since the MCP server itself is strictly macOS-only (per SPEC-003 Platform Detection), the spec's platform gate (FR-011) refers to the server's runtime constraint, not an OmniJS API limitation. The `!tree` guard remains as a defensive check for edge cases (e.g., window not fully loaded), not as a platform detector
- Q: Does `select_items` need a pre-flight reveal to handle the `tree.select()` collapsed-ancestor constraint? → A: Yes. The OmniJS API docs state that `tree.select()` "selects the specified TreeNodes that are visible (nodes with collapsed ancestors cannot be selected)." The `select_items` tool MUST call `tree.reveal(nodes)` before `tree.select(nodes, extending)` to ensure all targeted nodes are visible in the outline. Without this pre-flight step, nodes with collapsed ancestors would silently fail to be selected. This is documented as FR-017
- Q: Which reveal method should tools use: `tree.reveal(nodes)` (Tree-level, array param) or `node.reveal()` (TreeNode instance, no params)? → A: Both exist in the OmniJS API. `tree.reveal(nodes)` accepts `Array of TreeNode` and is appropriate for batch operations. `node.reveal()` is an instance method on TreeNode that expands all ancestors of that specific node. For `reveal_items`, use `tree.reveal(nodes)` since it natively accepts the batch array. For the `select_items` pre-flight, `tree.reveal(nodes)` is also appropriate. The TreeNode instance method `node.reveal()` is noted in Key Entities for completeness but is not the primary method used by these tools
- Q: Should the spec use `Device.current.mac` for explicit platform detection instead of checking `win.content` existence? → A: No. Since the MCP server is macOS-only, explicit runtime platform detection is unnecessary. The `!tree` guard on `win.content` serves as a defensive runtime check (window state), not a platform detector. The version check (`app.userVersion.atLeast(new Version('4.0'))`) is the primary gate. If `win.content` is null on a macOS machine, it indicates a runtime state issue, not a platform mismatch
- Q: Where should per-item result tracking for batch operations happen: TypeScript layer or inside the OmniJS script? → A: Inside the OmniJS script. Following established patterns from SPEC-007 (`set_advanced_repetition`), SPEC-013 (`drop_items`, `mark_complete`), and `setPlannedDate.ts`, all item resolution, operation execution, and per-item result tracking MUST happen within the OmniJS closure. The script returns a consolidated `JSON.stringify({results: [...]})` payload. The earlier clarification mentioning "TypeScript layer" for `select_items` is superseded by this decision for consistency with established patterns

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow revealing one or more items (1-10 tasks, projects, folders, or tags) in the OmniFocus outline, navigating the view to make them visible on screen. The OmniJS API `tree.reveal(nodes)` accepts an `Array of TreeNode`; the batch limit of 10 prevents revealing too many items at once, which would defeat the navigation purpose
- **FR-002**: System MUST allow expanding outline nodes to show their children, with an optional `completely` parameter to expand all descendants recursively
- **FR-003**: System MUST allow collapsing outline nodes to hide their children, with an optional `completely` parameter to collapse all descendants recursively
- **FR-004**: System MUST allow expanding notes on outline nodes to show note content inline, with an optional `completely` parameter to expand notes on all descendants
- **FR-005**: System MUST allow collapsing notes on outline nodes to hide note content, with an optional `completely` parameter to collapse notes on all descendants
- **FR-006**: System MUST allow focusing the window on one or more projects or folders (1-50 targets per operation), narrowing the outline to show only those items and their contents
- **FR-007**: System MUST allow clearing the current focus (unfocusing), restoring the full outline view by setting focus to an empty array
- **FR-008**: System MUST allow selecting one or more items in the outline via `tree.select(nodes, extending)`, with an optional `extending` parameter (default false) that when true adds to the existing selection instead of replacing it
- **FR-009**: System MUST support item identification by either ID (preferred) or name for all tools, with disambiguation when multiple items share a name. Supported item types: tasks, projects, folders, and tags
- **FR-010**: System MUST detect OmniFocus version and return a clear version-compatibility error when the version is older than 4.0 (content tree API not available). The error message MUST follow the pattern: `"<tool_name> requires OmniFocus 4.0 or later. Current version: " + app.userVersion.versionString` to be consistent with the established guard pattern from SPEC-007/SPEC-013
- **FR-011**: System MUST include a defensive `!tree` guard on `document.windows[0].content` that returns an error when the content tree is not available (e.g., window not fully loaded). While the ContentTree API is available on all platforms in OF4, this guard serves as runtime protection for edge cases. The error message MUST be: `"Content tree not available. UI control operations require a fully loaded OmniFocus window."`
- **FR-012**: Batch operations (reveal, expand, collapse, expand_notes, collapse_notes, select) MUST return per-item success/failure results, allowing partial failures without failing the entire batch
- **FR-013**: All tool descriptions MUST include a warning that the operation changes the user's visible UI state, so AI assistants can inform users before executing
- **FR-014**: System MUST return a clear error when no OmniFocus window is open (document.windows[0] is not available). The error message MUST be: `"No OmniFocus window is open. UI operations require an active window."`
- **FR-015**: System MUST return a distinct "not visible in current view" error when a valid database object has no corresponding node in the content tree (item exists but is filtered by the current perspective)
- **FR-016**: Focus operations MUST reject tasks and tags as invalid targets, accepting only projects and folders as valid focus targets
- **FR-017**: The `select_items` tool MUST call `tree.reveal(nodes)` before `tree.select(nodes, extending)` to ensure all targeted nodes are visible. The OmniJS API specifies that `tree.select()` only selects TreeNodes "that are visible (nodes with collapsed ancestors cannot be selected)". Without this pre-flight reveal, nodes with collapsed ancestors would silently fail to be selected
- **FR-018**: Guard applicability per tool MUST follow this matrix:

| Tool | Version Guard (OF4+) | Window Guard | Content Tree Guard |
|------|---------------------|--------------|-------------------|
| `reveal_items` | Yes | Yes | Yes |
| `expand_items` | Yes | Yes | Yes |
| `collapse_items` | Yes | Yes | Yes |
| `expand_notes` | Yes | Yes | Yes |
| `collapse_notes` | Yes | Yes | Yes |
| `focus_items` | Yes | Yes | No (uses `window.focus` directly) |
| `unfocus` | Yes | Yes | No (uses `window.focus` directly) |
| `select_items` | Yes | Yes | Yes |

All 8 tools require version and window guards. Only `focus_items` and `unfocus` skip the content tree guard because they operate on `window.focus` directly without accessing `document.windows[0].content`.

- **FR-019**: Per-item batch result `itemType` field for failed lookups (NOT_FOUND, DISAMBIGUATION_REQUIRED) MUST use the input's context when the actual type cannot be determined. When the item cannot be resolved to any database object: the `itemType` field MUST default to `'task'` as a sentinel value, `itemId` MUST be the input id (or empty string if lookup was by name), and `itemName` MUST be the input name (or empty string if lookup was by id). This is consistent with the quickstart.md batch result tracking pattern
- **FR-020**: No-op success codes MUST be used as follows to indicate idempotent operations that succeeded without state change:

| Code | Meaning | Applicable Tools |
|------|---------|-----------------|
| `ALREADY_EXPANDED` | Node was already expanded | `expand_items` |
| `ALREADY_COLLAPSED` | Node was already collapsed | `collapse_items` |
| `NO_NOTE` | Item has no note content to expand/collapse | `expand_notes`, `collapse_notes` |

These codes are returned with `success: true` in per-item results to distinguish actual state changes from no-ops.

- **FR-021**: Error responses follow a two-tier hierarchy:

  **Tier 1 -- Guard errors (top-level, catastrophic)**: Guard failures (version, window, content tree) return a flat `{ success: false, error: string }` response and abort the entire operation. No per-item processing occurs. These errors use human-readable error message strings without a machine-parseable `code` field, consistent with the established codebase pattern from SPEC-007 (`set_advanced_repetition`) and SPEC-013 (`drop_items`, `mark_complete`). Top-level error codes are deliberately omitted because AI clients parse the natural-language error message for user presentation, and the existing flat pattern has proven sufficient across all prior specs.

  **Tier 2 -- Per-item errors (inside batch results)**: Item-level failures are returned inside a `{ success: true, results: [...], summary: {...} }` response, allowing partial success. Each failed item includes an `error` message string and a machine-parseable `code` field (e.g., `NOT_FOUND`, `NODE_NOT_FOUND`). Per-item codes enable programmatic handling because the AI client may need to take different actions depending on the failure type (e.g., retry with ID for disambiguation, inform user about perspective filtering for NODE_NOT_FOUND).

  Guard errors take priority: if a guard check fails, the response is always Tier 1 and no Tier 2 per-item processing occurs.

- **FR-022**: Per-item error and no-op code applicability per tool MUST follow this matrix:

| Code | Type | `reveal_items` | `expand_items` | `collapse_items` | `expand_notes` | `collapse_notes` | `focus_items` | `unfocus` | `select_items` |
|------|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `NOT_FOUND` | error | Yes | Yes | Yes | Yes | Yes | Yes | -- | Yes |
| `NODE_NOT_FOUND` | error | Yes | Yes | Yes | Yes | Yes | -- | -- | Yes |
| `DISAMBIGUATION_REQUIRED` | error | Yes | Yes | Yes | Yes | Yes | Yes | -- | Yes |
| `INVALID_TYPE` | error | -- | -- | -- | -- | -- | Yes | -- | -- |
| `ALREADY_EXPANDED` | no-op | -- | Yes | -- | -- | -- | -- | -- | -- |
| `ALREADY_COLLAPSED` | no-op | -- | -- | Yes | -- | -- | -- | -- | -- |
| `NO_NOTE` | no-op | -- | -- | -- | Yes | Yes | -- | -- | -- |

Notes: `unfocus` has no items parameter and therefore produces no per-item results. `focus_items` does not use the content tree (no `NODE_NOT_FOUND`) but does resolve items by ID/name (produces `NOT_FOUND` and `DISAMBIGUATION_REQUIRED`) and rejects tasks/tags (`INVALID_TYPE`). `reveal_items` and `select_items` have no meaningful "already in state" concept and therefore produce no no-op codes.

### Key Entities

- **ContentTree**: The hierarchical representation of the OmniFocus outline in the primary window, accessed via `document.windows[0].content` (OmniJS class: `Tree`). Provides node-based access to items for UI operations (OF4+ required; available on macOS, iOS, and iPadOS per omni-automation.com/omnifocus/outline.html, though this MCP server targets macOS only). Key properties: `rootNode` (TreeNode, read-only), `selectedNodes` (Array of TreeNode, read-only). Key methods: `nodeForObject()`, `nodesForObjects()`, `reveal(nodes: Array of TreeNode) -> void`, `select(nodes: Array of TreeNode, extending: Boolean or null) -> void` (both return void; success inferred from no exception). Note: `tree.select()` only selects nodes that are visible -- nodes with collapsed ancestors cannot be selected (see FR-017)
- **TreeNode**: A node in the content tree representing a visible item (task, project, folder, or tag) with operations for expand, collapse, note visibility, and reveal. OmniJS class name is `TreeNode`. Key properties: `object` (the wrapped database object), `children`, `parent`, `isExpanded`, `isSelected`, `isSelectable`, `canExpand` (read-only Boolean), `canCollapse` (read-only Boolean), `isRootNode`, `level`. Key methods: `expand(completely)`, `collapse(completely)`, `expandNote(completely)`, `collapseNote(completely)`, `reveal()` (instance method, no params -- expands all ancestor nodes to make this node visible; distinct from `tree.reveal(nodes)` which is the Tree-level batch method)
- **DocumentWindow**: The primary OmniFocus application window providing access to the content tree via `content` property, focus state via `focus` property (read returns `null` when unfocused, write `[]` to unfocus -- asymmetric), and selection via `selectObjects()` (though `tree.select()` is preferred for content tree operations)
- **Item Identifier**: A reference to a task, project, folder, or tag by either unique ID or display name, with disambiguation when names are ambiguous
- **Focus Target**: A project or folder that can be used to narrow the window's visible outline (tasks and tags are not valid focus targets)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to any item(s) in the OmniFocus outline through a single reveal operation (1-10 items), with all specified items becoming visible on screen immediately
- **SC-002**: Users can control outline detail level (expand/collapse) for up to 50 items in a single batch operation with per-item results
- **SC-003**: Users can toggle note visibility for up to 50 items in a single batch operation with per-item results
- **SC-004**: Users can focus the view on a specific project or folder in a single operation, with only the focused items visible afterward
- **SC-005**: Users can restore the full outline view (unfocus) in a single operation
- **SC-006**: Users can select specific items in the outline for visual review or preparation for manual batch operations
- **SC-007**: All 8 tools return clear, actionable error messages when encountering version incompatibility (OF3), platform incompatibility (non-macOS), missing windows, or items not visible in the current perspective
- **SC-008**: All operations are idempotent -- expanding an already-expanded node, collapsing an already-collapsed node, or unfocusing when not focused succeeds without error
- **SC-009**: All 8 tools pass contract validation and unit tests with the same coverage standards as existing tools in the codebase

## Assumptions

- OmniFocus is running on macOS and accessible via Omni Automation
- OmniFocus version 4.0 or later is installed -- the content tree API (`document.windows[0].content`) does not exist in earlier versions. **Validated**: omni-automation.com/omnifocus/automation-new.html lists "Window Outlines (Node Trees)" as a new feature in OmniFocus 4, and the outline page confirms the content tree API is an OmniFocus 4 addition. The SPEC-007 pattern `app.userVersion.atLeast(new Version('4.0'))` is the established version gate
- The primary window (`document.windows[0]`) is open and accessible; these tools do not create windows
- The OmniJS ContentTree API (`document.windows[0].content`) is available on macOS, iOS, and iPadOS as of OmniFocus 4 (per omni-automation.com/omnifocus/outline.html: "as of OmniFocus 4, these node trees are implemented macOS, as well as iOS and iPadOS"). However, this MCP server is strictly macOS-only, so the `!tree` guard in OmniJS scripts serves as a defensive runtime check (e.g., window not fully loaded) rather than a platform detector
- `tree.nodeForObject(item)` returns null (does not throw) when an item exists in the database but is not visible in the current perspective (e.g., filtered out by perspective rules). Works for tasks, projects, folders, and tags. **Validated**: OmniJS API reference at omni-automation.com/omnifocus/outline.html documents the return type as `(TreeNode or null)` with description "Returns the TreeNode that represents the object in this Tree, or null if it cannot be found (possibly filtered out)"
- `tree.nodesForObjects(objects)` returns an array of TreeNodes for objects currently visible in the tree; the returned array may be smaller (even empty) than the input array. Batch tools SHOULD use this for efficiency instead of iterating `nodeForObject()` individually. **Validated**: OmniJS API reference at omni-automation.com/omnifocus/outline.html documents this as "Returns an array of TreeNodes for the objects that are currently in the Tree, according to the same filters as nodeForObject(). The size of the resulting node array may be smaller (even empty) than the passed in objects array"
- `window.focus` has asymmetric read/write behavior: reading returns `null` when no focus is active (the API type is `Array of Project or Folder or null`); writing an empty array `[]` clears the focus and restores the full view. Implementers should not compare against `[]` to detect unfocused state -- check for `null` instead
- `tree.select(nodes, extending)` is the content tree selection API; it returns void (success is inferred from no exception being thrown). When `extending` is false or omitted, the existing selection is replaced; when `extending` is true, the specified nodes are added to the existing selection. **Critical constraint**: the API only selects nodes "that are visible (nodes with collapsed ancestors cannot be selected)" -- `select_items` MUST call `tree.reveal(nodes)` before `tree.select()` as a pre-flight step (see FR-017). Per-item result tracking happens inside the OmniJS script (consistent with SPEC-007 and SPEC-013 patterns): resolve items, check node visibility via `nodeForObject()`, and report items with no corresponding node as NODE_NOT_FOUND in per-item results. The script returns a consolidated JSON payload with all results
- The `completely` parameter on expand/collapse operations is typed `Boolean or null` in OmniJS; when true, all descendants are affected recursively; when false, null, or omitted, only the immediate level is affected. The same type applies to `expandNote(completely)` and `collapseNote(completely)`. **Validated**: OmniJS API reference at omni-automation.com/omnifocus/outline.html documents all four methods on TreeNode: `expand(completely: Boolean or null)`, `collapse(completely: Boolean or null)`, `expandNote(completely: Boolean or null)`, `collapseNote(completely: Boolean or null)` with descriptions confirming recursive descendant behavior when `completely` is true. **Type mapping**: The OmniJS `Boolean or null` maps to Zod `z.boolean().optional()` in the contract schemas. When the Zod-validated value is `undefined` (parameter omitted), the OmniJS script passes `false` as the default: `node.expand(completely || false)`. This ensures the OmniJS function never receives `undefined` (which would be coerced to `null` in OmniJS, producing equivalent non-recursive behavior, but `false` is preferred for explicitness)
- `tree.reveal(nodes)` accepts an `Array of TreeNode` and returns void; it ensures all ancestor nodes of the specified nodes are expanded so they become visible in the outline
- Version detection uses `app.userVersion.atLeast(new Version('4.0'))` following the pattern established by SPEC-007
- Expand/collapse operations on nodes that are already in the requested state are no-ops and do not produce errors
- Batch sizes are limited: expand/collapse/notes/focus operations accept 1-50 items; select accepts 1-100 items; reveal accepts 1-10 items
- Focus targets are restricted to projects and folders; attempting to focus on a task or tag returns a validation error
- Focus persists across perspective switches (this is OmniFocus behavior, not controlled by our tools). Our tools only set/clear focus; the interaction between focus and perspective filtering is managed by OmniFocus itself

## Out of Scope

- **Sidebar/inspector visibility toggling** -- low value with high risk of confusing the user's layout preferences
- **Multi-window management** -- complexity with minimal benefit; all tools operate on the primary window only
- **Reading current selection state** -- may be added in a future spec if demand warrants it
- **Reading current focus state** -- may be added in a future spec alongside reading selection
- **OmniFocus 3 fallback** -- tools return a version error on OF3; no alternative implementation is provided
- **iOS/iPadOS support** -- while the ContentTree API is available on iOS/iPadOS in OmniFocus 4, this MCP server is macOS-only; no cross-platform implementation is provided
- **Perspective switching** -- changing the active perspective is a separate concern from UI navigation within a perspective
- **Creating or managing windows** -- tools operate on the existing primary window; window lifecycle management is excluded
