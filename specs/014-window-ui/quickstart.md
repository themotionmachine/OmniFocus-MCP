# Quickstart: Window & UI Control OmniJS Patterns

**Feature Branch**: `014-window-ui`
**Date**: 2026-03-18

## Common Guard Pattern (All 8 Tools)

Every OmniJS script for window UI tools MUST start with this guard:

```javascript
(function() {
  try {
    // Version check (OF4+ required for content tree)
    if (!app.userVersion.atLeast(new Version('4.0'))) {
      return JSON.stringify({
        success: false,
        error: '<tool_name> requires OmniFocus 4.0 or later. Current version: ' + app.userVersion.versionString
      });
    }

    // Window check
    var win = document.windows[0];
    if (!win) {
      return JSON.stringify({
        success: false,
        error: 'No OmniFocus window is open. UI operations require an active window.'
      });
    }

    // Content tree guard (defensive runtime check -- e.g., window not fully loaded)
    // NOTE: focus/unfocus do NOT need this check — they use window.focus, not content tree
    var tree = win.content;
    if (!tree) {
      return JSON.stringify({
        success: false,
        error: 'Content tree not available. UI control operations require a fully loaded OmniFocus window.'
      });
    }

    // ... tool-specific logic here

  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})()
```

**Note**: `focus_items` and `unfocus` skip the `tree` check since they operate
on `window.focus` directly.

## Item Resolution Pattern (4-Type Lookup)

```javascript
function resolveItem(identifier) {
  // By ID: try Project/Folder BEFORE Task to avoid root-task ID collision
  // (every project has a root task sharing the same id.primaryKey)
  if (identifier.id) {
    var project = Project.byIdentifier(identifier.id);
    if (project) return { object: project, type: 'project', id: project.id.primaryKey, name: project.name };

    var folder = Folder.byIdentifier(identifier.id);
    if (folder) return { object: folder, type: 'folder', id: folder.id.primaryKey, name: folder.name };

    var task = Task.byIdentifier(identifier.id);
    if (task) return { object: task, type: 'task', id: task.id.primaryKey, name: task.name };

    var tag = Tag.byIdentifier(identifier.id);
    if (tag) return { object: tag, type: 'tag', id: tag.id.primaryKey, name: tag.name };

    return null; // NOT_FOUND
  }

  // By name: iterate all 4 collections (projects/folders first for consistency)
  if (identifier.name) {
    var matches = [];

    flattenedProjects.forEach(function(p) { if (p.name === identifier.name) matches.push({ object: p, type: 'project', id: p.id.primaryKey, name: p.name }); });
    flattenedFolders.forEach(function(f) { if (f.name === identifier.name) matches.push({ object: f, type: 'folder', id: f.id.primaryKey, name: f.name }); });
    flattenedTasks.forEach(function(t) { if (t.name === identifier.name) matches.push({ object: t, type: 'task', id: t.id.primaryKey, name: t.name }); });
    flattenedTags.forEach(function(t) { if (t.name === identifier.name) matches.push({ object: t, type: 'tag', id: t.id.primaryKey, name: t.name }); });

    if (matches.length === 0) return null; // NOT_FOUND
    if (matches.length === 1) return matches[0];
    return { disambiguation: true, candidates: matches }; // DISAMBIGUATION_REQUIRED
  }

  return null;
}
```

## Reveal Pattern

```javascript
// Reveal items in outline (scrolls and expands hierarchy)
// Per-item resolution for precise NODE_NOT_FOUND error tracking
var nodesToReveal = [];
for (var i = 0; i < resolvedObjects.length; i++) {
  var node = tree.nodeForObject(resolvedObjects[i].object);
  if (node) nodesToReveal.push(node);
  // else: report NODE_NOT_FOUND for this item
}
if (nodesToReveal.length > 0) {
  tree.reveal(nodesToReveal); // returns void; success = no exception
}
```

## Expand/Collapse Pattern

```javascript
// Expand nodes (with optional recursive)
var node = tree.nodeForObject(resolvedObject);
if (node) {
  node.expand(completely || false); // completely: Boolean or null
}

// Collapse nodes
var node = tree.nodeForObject(resolvedObject);
if (node) {
  node.collapse(completely || false);
}
```

## Expand/Collapse Notes Pattern

```javascript
// Expand notes on nodes
var node = tree.nodeForObject(resolvedObject);
if (node) {
  node.expandNote(completely || false); // No-op if no note exists
}

// Collapse notes
var node = tree.nodeForObject(resolvedObject);
if (node) {
  node.collapseNote(completely || false);
}
```

## Focus Pattern

```javascript
// Focus on projects/folders (NO content tree needed)
var win = document.windows[0];

// Resolve to Project/Folder objects only
var focusTargets = []; // Array of Project or Folder

// Set focus
win.focus = focusTargets;

// Check if task or tag — reject
// Task.byIdentifier returns Task, Project.byIdentifier returns Project, etc.
// Must check object type and reject tasks/tags
```

## Unfocus Pattern

```javascript
// Clear focus (NO content tree needed)
var win = document.windows[0];

// Read: returns null when unfocused
var currentFocus = win.focus; // null or [Project, Folder, ...]

// Write: set empty array to unfocus
win.focus = []; // NOT null — API requires empty array
```

## Select Pattern

```javascript
// Select items in outline — per-item nodeForObject for precise error tracking
var nodesToSelect = [];
for (var i = 0; i < resolvedObjects.length; i++) {
  var node = tree.nodeForObject(resolvedObjects[i].object);
  if (node) nodesToSelect.push(node);
  // else: report NODE_NOT_FOUND for this item
}

// CRITICAL: Pre-flight reveal required (FR-017)
// tree.select() only selects nodes "that are visible (nodes with collapsed
// ancestors cannot be selected)" — reveal ensures ancestors are expanded
if (nodesToSelect.length > 0) {
  tree.reveal(nodesToSelect); // expand ancestors so nodes become visible
}

tree.select(nodesToSelect, extending || false);
// extending=false: replace current selection
// extending=true: add to existing selection
// returns void; success = no exception
```

## Batch Result Tracking Pattern

```javascript
// Track per-item results for batch operations
var results = [];
var succeeded = 0;
var failed = 0;

for (var i = 0; i < items.length; i++) {
  var resolved = resolveItem(items[i]);

  if (!resolved) {
    results.push({
      itemId: items[i].id || '',
      itemName: items[i].name || '',
      itemType: 'task', // default when unknown
      success: false,
      error: 'Item not found',
      code: 'NOT_FOUND'
    });
    failed++;
    continue;
  }

  if (resolved.disambiguation) {
    results.push({
      itemId: '',
      itemName: items[i].name || '',
      itemType: 'task',
      success: false,
      error: 'Multiple items match this name',
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: resolved.candidates.map(function(c) {
        return { id: c.id, name: c.name, type: c.type };
      })
    });
    failed++;
    continue;
  }

  var node = tree.nodeForObject(resolved.object);
  if (!node) {
    results.push({
      itemId: resolved.id,
      itemName: resolved.name,
      itemType: resolved.type,
      success: false,
      error: 'Item exists but is not visible in the current perspective',
      code: 'NODE_NOT_FOUND'
    });
    failed++;
    continue;
  }

  // Perform operation (expand, collapse, etc.)
  node.expand(completely || false);

  results.push({
    itemId: resolved.id,
    itemName: resolved.name,
    itemType: resolved.type,
    success: true
  });
  succeeded++;
}

return JSON.stringify({
  success: true,
  results: results,
  summary: { total: items.length, succeeded: succeeded, failed: failed }
});
```
