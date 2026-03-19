# Research: Window & UI Control

**Feature Branch**: `014-window-ui`
**Date**: 2026-03-18

## Research Tasks

### R1: ContentTree API Access Pattern

**Question**: How to access the content tree and verify availability?

**Decision**: Access via `document.windows[0].content` with guard checks.

**Rationale**: The `content` property on `DocumentWindow` returns a `Tree`
object (referred to as "ContentTree" conceptually). As of OmniFocus 4, the
content tree is available on macOS, iOS, and iPadOS (per omni-automation.com).
The `!tree` guard serves as a defensive runtime check (e.g., window not fully
loaded), not a platform detector. This MCP server is macOS-only regardless.
Version detection uses the established `app.userVersion.atLeast(new Version('4.0'))`.

**Guard Pattern**:
```javascript
(function() {
  try {
    if (!app.userVersion.atLeast(new Version('4.0'))) {
      return JSON.stringify({ success: false, error: '<tool_name> requires OmniFocus 4.0 or later. Current version: ' + app.userVersion.versionString });
    }
    var win = document.windows[0];
    if (!win) {
      return JSON.stringify({ success: false, error: 'No OmniFocus window is open. UI operations require an active window.' });
    }
    var tree = win.content;
    if (!tree) {
      return JSON.stringify({ success: false, error: 'Content tree not available. UI control operations require a fully loaded OmniFocus window.' });
    }
    // ... proceed with tree operations
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})()
```

**Alternatives Considered**:
- Platform detection via `app.platformName` -- rejected because checking
  `win.content` existence is more direct and catches edge cases
- Single shared guard function -- rejected per YAGNI; each script needs the
  full guard inline since scripts execute in isolation

### R2: Item Resolution (ID vs Name with 4 Types)

**Question**: How to resolve items by ID or name across task, project, folder,
and tag types?

**Decision**: Use a multi-type lookup order: ID first (try all 4 `byIdentifier`
methods), then name (search all 4 `flattenedX.byName()` collections).

**Rationale**: The existing `ItemIdentifier` pattern from status-tools supports
tasks and projects. Window UI tools extend this to include folders and tags since
all 4 types can appear in the content tree and have valid `nodeForObject()` results.

**Lookup Order (by ID)**:
1. `Project.byIdentifier(id)` — projects first to avoid root task collision
2. `Folder.byIdentifier(id)`
3. `Task.byIdentifier(id)`
4. `Tag.byIdentifier(id)`

**Note**: Every project has a root task sharing the same `id.primaryKey`.
`Task.byIdentifier()` would match the root task before
`Project.byIdentifier()` runs, causing `tree.nodeForObject()` to fail
with NODE_NOT_FOUND (content tree shows projects, not root tasks).

**Lookup Order (by name)**:
1. Search `flattenedProjects` comparing `item.name === name` (may return multiple)
2. Search `flattenedFolders` comparing `item.name === name` (may return multiple)
3. Search `flattenedTasks` comparing `item.name === name` (may return multiple)
4. Search `flattenedTags` comparing `item.name === name` (may return multiple)

**Disambiguation**: When name lookup returns multiple matches across any types,
return `DISAMBIGUATION_REQUIRED` with candidates array including id, name, and
type for each match.

**Alternatives Considered**:
- Separate lookup functions per type -- rejected; unified lookup is simpler and
  matches user mental model ("find this thing regardless of type")
- Reuse status-tools ItemIdentifier verbatim -- rejected; status-tools only
  covers task/project, window-ui needs all 4 types

### R3: Per-Item Node Resolution with nodeForObject()

**Question**: How to resolve multiple items to tree nodes with per-item error tracking?

**Decision**: Use `tree.nodeForObject(object)` per-item inside the OmniJS script
to resolve each item individually and build per-item results.

**Rationale**: `nodesForObjects(objects)` returns only visible nodes without
indicating *which* inputs were dropped, making per-item NODE_NOT_FOUND reporting
impossible. Per-item `nodeForObject()` enables precise error tracking: each input
is resolved individually, and items returning `null` are reported as
`NODE_NOT_FOUND` in the OmniJS script's result array.

**Pattern**:
```javascript
for (var i = 0; i < resolvedObjects.length; i++) {
  var node = tree.nodeForObject(resolvedObjects[i].object);
  if (!node) {
    // Report NODE_NOT_FOUND for this specific item
    results.push({ ..., success: false, code: 'NODE_NOT_FOUND' });
    continue;
  }
  // Proceed with tree operation on node
}
```

**Alternatives Considered**:
- `nodesForObjects()` batch resolution -- rejected; silently drops non-visible
  items without indicating which ones, making per-item error tracking impossible

### R4: TreeNode Expand/Collapse Methods

**Question**: What are the exact method signatures for expand/collapse operations?

**Decision**: Use `node.expand(completely)`, `node.collapse(completely)`,
`node.expandNote(completely)`, `node.collapseNote(completely)`.

**Rationale**: All four methods accept a single parameter `completely` typed as
`Boolean or null`. When `true`, the operation applies recursively to all
descendants. When `false`, `null`, or omitted, only the immediate level is
affected. The `isExpanded` property is readable but the API design suggests
using the methods rather than direct property setting.

**Idempotency**: Expanding an already-expanded node is a no-op (no exception).
Collapsing an already-collapsed node is a no-op. This aligns with SC-008.

**Alternatives Considered**: None -- the OmniJS API is definitive.

### R5: Focus/Unfocus API Asymmetry

**Question**: How does the `window.focus` property behave for reading vs writing?

**Decision**: Read `window.focus` to detect current state (returns `null` when
unfocused). Write `window.focus = []` to clear focus. Write
`window.focus = [project, folder, ...]` to set focus.

**Rationale**: The `focus` property has asymmetric read/write behavior:
- Read returns `null` when no focus is active (type: `Array of Project or Folder or null`)
- Write `[]` (empty array) to unfocus -- do NOT write `null`
- Write an array of Project/Folder objects to focus

**Focus Target Validation**: Only `Project` and `Folder` objects are valid.
The TypeScript `FocusTargetSchema` validates identifier shape (presence of
`id`/`name`); actual type checking and `INVALID_TYPE` rejection for tasks/tags
is performed in the OmniJS layer after resolution.

**Alternatives Considered**:
- `window.focus = null` to unfocus -- rejected; the API requires `[]`
- Checking `window.focus === []` for unfocused state -- rejected; read returns
  `null`, not an empty array

### R6: tree.select() and tree.reveal() Return Behavior

**Question**: What do `tree.select()` and `tree.reveal()` return?

**Decision**: Both return `void`. Success is inferred from no exception.

**Rationale**: Per clarification in the spec, `tree.select(nodes, extending)`
and `tree.reveal(nodes)` both return void. Node resolution and per-item result
reporting are handled inside the OmniJS script: each input object is mapped
to a tree node via `tree.nodeForObject()`, and the script builds a result
payload indicating which inputs resolved and whether `select`/`reveal` was
invoked. The TypeScript layer validates inputs, forwards them to the OmniJS
primitive, and surfaces the structured result.

**Alternatives Considered**: None -- the OmniJS API is definitive.

### R7: Shared vs Per-Tool ItemIdentifier Schema

**Question**: Should window-tools reuse the status-tools ItemIdentifier or
create a new one?

**Decision**: Create a new `WindowItemIdentifierSchema` in
`src/contracts/window-tools/shared/` that supports all 4 types (task, project,
folder, tag).

**Rationale**: The status-tools `ItemIdentifierSchema` only covers tasks and
projects. Window-UI tools need all 4 types. Creating a new schema avoids
modifying the existing contract (which would affect status-tools tests) and
follows the established pattern of domain-specific shared schemas.

**Alternatives Considered**:
- Modify existing ItemIdentifier to add folder/tag -- rejected; would be a
  breaking change to status-tools contracts
- Import and extend -- rejected; Zod `extend()` on refined schemas is fragile

### R8: UI Side-Effect Warning Pattern

**Question**: How to implement the FR-013 requirement for UI warnings in tool
descriptions?

**Decision**: Include a standardized warning string in every tool's description
field: "WARNING: This operation changes the visible OmniFocus UI state."

**Rationale**: MCP tool descriptions are visible to AI assistants, which can
use them to inform users before executing. A consistent prefix makes the
warning scannable and predictable.

**Alternatives Considered**:
- Separate `sideEffects` metadata field -- rejected per YAGNI; MCP SDK doesn't
  have a standard field for this
- Warning only in documentation -- rejected; AI assistants read tool descriptions,
  not external docs
