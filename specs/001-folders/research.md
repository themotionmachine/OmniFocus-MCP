# Research: Folder Management Tools

**Feature Branch**: `002-folder-tools`
**Research Date**: 2025-12-10
**Sources**: Omni Automation Official Documentation, Existing Codebase Analysis

## Executive Summary

This research validates the Omni Automation JavaScript API for folder operations and confirms the implementation approach. All folder operations are fully supported via the Omni Automation API with clear method mappings.

## Research Questions Resolved

### 1. Omni Automation vs AppleScript

**Decision**: Use Omni Automation JavaScript (OmniJS)

**Rationale**:

- Officially recommended by Omni Group
- Cross-platform (macOS, iOS, iPadOS) - future-proofing
- Better documented with official API reference
- Actively maintained
- Faster execution performance

**Alternatives Considered**:

- **AppleScript**: Legacy approach, macOS-only, verbose syntax
- **Pure JXA**: Limited OmniFocus API access compared to OmniJS

**Evidence**: From omni-automation.com/omnifocus/folder.html - complete Folder class API available

### 2. Script Execution Bridge

**Decision**: Use existing `executeOmniFocusScript` with dynamic OmniJS generation

**Rationale**:

- Bridge already implemented and tested in `scriptExecution.ts`
- Uses `app.evaluateJavascript()` to run OmniJS inside OmniFocus
- Pattern proven by `queryOmnifocus.ts` (dynamic) and `omnifocusDump.js` (pre-built)

**Execution Flow**:

```text
TypeScript Primitive → Generate OmniJS string → JXA wrapper →
osascript -l JavaScript → OmniFocus evaluateJavascript → JSON result
```

**Alternatives Considered**:

- **Pre-built scripts in omnifocusScripts/**: More complex for parameterized operations
- **New execution function**: Unnecessary - existing bridge works

### 3. Folder Class API Completeness

**Decision**: All required operations are supported
**Evidence** (from official docs):

| Operation | API Method | Verified |
|-----------|------------|----------|
| Create | `new Folder(name, position)` | Yes |
| Read by ID | `Folder.byIdentifier(id)` | Yes |
| Read by name | `flattenedFolders.byName(name)` | Yes |
| List all | `flattenedFolders` | Yes |
| List top-level | `database.folders` | Yes |
| List children | `folder.folders` | Yes |
| Update name | `folder.name = "..."` | Yes |
| Update status | `folder.status = Folder.Status.X` | Yes |
| Delete | `deleteObject(folder)` | Yes |
| Move | `moveSections([folder], position)` | Yes |

### 4. Position System

**Decision**: Direct mapping to Omni Automation positions
**API Mapping**:

| MCP Position | Omni Automation |
|--------------|-----------------|
| `{ placement: "beginning" }` | `library.beginning` |
| `{ placement: "ending" }` | `library.ending` |
| `{ placement: "beginning", relativeTo: id }` | `Folder.byIdentifier(id).beginning` |
| `{ placement: "ending", relativeTo: id }` | `Folder.byIdentifier(id).ending` |
| `{ placement: "before", relativeTo: id }` | `Folder.byIdentifier(id).before` |
| `{ placement: "after", relativeTo: id }` | `Folder.byIdentifier(id).after` |

**Note**: Per Omni Automation API, `relativeTo` is required for before/after, optional for beginning/ending.

### 5. Folder Status Values

**Decision**: Two statuses only - `active` and `dropped`

**Evidence**: `Folder.Status` enumeration has only two values:

- `Folder.Status.Active`
- `Folder.Status.Dropped`

**Note**: Unlike `Project.Status` which has 4 values (Active, Done, Dropped, OnHold), folders have only 2.

### 6. Folder Identification

**Decision**: Support both ID and name lookup with disambiguation

**API Methods**:

- `Folder.byIdentifier(id)` - Returns single folder or null
- `flattenedFolders.byName(name)` - Returns first match only

**Disambiguation Strategy**:

Since `byName()` returns only the first match, we must manually search for all matches:

```javascript
const matches = flattenedFolders.filter(f => f.name === targetName);
if (matches.length > 1) {
  return { success: false, code: "DISAMBIGUATION_REQUIRED", matchingIds: [...] };
}
```

### 7. Recursive Folder Operations

**Decision**: Use `flattenedFolders` for recursive, `folders` for immediate

**API Properties**:

- `folder.folders` - Immediate child folders only
- `folder.flattenedFolders` - All descendant folders recursively
- `database.folders` - Top-level folders only
- `database.flattenedFolders` - All folders in database

### 8. Error Response Format

**Decision**: Standard error format + disambiguation code

**Standard Error**:

```json
{ "success": false, "error": "Descriptive message" }
```

**Disambiguation Error**:

```json
{
  "success": false,
  "error": "Ambiguous folder name 'Work'. Found 3 matches.",
  "code": "DISAMBIGUATION_REQUIRED",
  "matchingIds": ["id1", "id2", "id3"]
}
```

### 9. Circular Move Prevention

**Decision**: Check ancestor chain before move

**Implementation**:

```javascript
function isDescendantOf(folder, potentialAncestor) {
  let current = folder.parent;
  while (current) {
    if (current.id.primaryKey === potentialAncestor.id.primaryKey) {
      return true;
    }
    current = current.parent;
  }
  return false;
}
```

### 10. Library Root Handling

**Decision**: Library is not a DatabaseObject - validate before operations
**Evidence**: `Library` class is a container, not a `DatabaseObject`. Cannot be passed to `deleteObject()`.
**Validation**: Check `folder !== null` from `Folder.byIdentifier()` before operations.

## API Reference Summary

### Folder Class Properties

| Property | Type | Read/Write | Description |
|----------|------|------------|-------------|
| `id` | ObjectIdentifier | r/o | Unique identifier |
| `id.primaryKey` | String | r/o | String form of ID |
| `name` | String | r/w | Display name |
| `status` | Folder.Status | r/w | Active or Dropped |
| `parent` | Folder or null | r/o | Parent folder (null for root) |
| `folders` | FolderArray | r/o | Immediate child folders |
| `flattenedFolders` | FolderArray | r/o | All descendant folders |
| `projects` | ProjectArray | r/o | Contained projects |
| `before` | ChildInsertionLocation | r/o | Position before this folder |
| `after` | ChildInsertionLocation | r/o | Position after this folder |
| `beginning` | ChildInsertionLocation | r/o | Position at start of children |
| `ending` | ChildInsertionLocation | r/o | Position at end of children |

### Database Functions for Folders

| Function | Signature | Description |
|----------|-----------|-------------|
| `Folder.byIdentifier` | `(id: String) → Folder or null` | Find folder by ID |
| `deleteObject` | `(object: DatabaseObject) → void` | Delete folder |
| `moveSections` | `(sections: Array, position) → void` | Move folder(s) |
| `foldersMatching` | `(search: String) → Array<Folder>` | Smart search |

### FolderArray Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `byName` | `(name: String) → Folder or null` | First folder by name |

## Codebase Analysis

### Existing Patterns to Follow

1. **OmniJS Script Pattern** (from `omnifocusDump.js`):

```javascript
(() => {
  try {
    // Operations
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})()
```

1. **Dynamic Script Generation** (from `queryOmnifocus.ts`):

   - Build OmniJS as template literal string
   - Escape user inputs properly
   - Execute via `executeOmniFocusScript`

1. **Folder Status Map** (from `omnifocusDump.js`):

```javascript
const folderStatusMap = {
  [Folder.Status.Active]: "Active",
  [Folder.Status.Dropped]: "Dropped"
};
```

### Files to Reference

| File | Pattern |
|------|---------|
| `src/tools/primitives/queryOmnifocus.ts` | Dynamic OmniJS generation |
| `src/tools/definitions/queryOmnifocus.ts` | Zod schema + MCP handler |
| `src/utils/omnifocusScripts/omnifocusDump.js` | OmniJS script structure |
| `src/utils/scriptExecution.ts` | Execution bridge |

## Validation Checklist

- [x] All folder CRUD operations have Omni Automation API support
- [x] Position system maps directly to API
- [x] Status values confirmed (2 only: Active, Dropped)
- [x] Disambiguation approach designed
- [x] Circular move prevention designed
- [x] Error formats align with spec FR-027/FR-028
- [x] Existing codebase patterns identified
- [x] No external dependencies needed
