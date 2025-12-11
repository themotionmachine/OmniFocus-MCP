# Data Model: Folder Management Tools

**Feature Branch**: `002-folder-tools`
**Date**: 2025-12-10

## Entity Definitions

### Folder

Represents a folder in the OmniFocus database hierarchy.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | `string` | `folder.id.primaryKey` | Unique identifier (Omni Automation ObjectIdentifier) |
| `name` | `string` | `folder.name` | Display name (1+ chars after trim) |
| `status` | `'active' \| 'dropped'` | `folder.status` | Folder state |
| `parentId` | `string \| null` | `folder.parent?.id.primaryKey` | Parent folder ID (null for root) |

**Excluded Properties**:

The following Omni Automation properties are intentionally NOT included in the Folder entity:

- `effectiveActive`: Computed from ancestor chain, not a stored property
- `creationDate`/`modificationDate`: Not exposed by Folder class (per spec clarification #6)
- `children`/`sections`: Use list_folders with parentId filter instead
- `projects`: Out of scope for folder tools

### Folder.Status (Enum)

Maps to Omni Automation `Folder.Status` enumeration.

| MCP Value | Omni Automation | Description |
|-----------|-----------------|-------------|
| `'active'` | `Folder.Status.Active` | Folder is active and visible |
| `'dropped'` | `Folder.Status.Dropped` | Folder is archived/hidden |

**Implementation Pattern**:

OmniJS scripts MUST use ternary comparison for status mapping:

```javascript
status: folder.status === Folder.Status.Active ? 'active' : 'dropped'
```

This explicit ternary (rather than string coercion or direct property access) ensures:

1. Type safety - Folder.Status is an enum, not a string
2. Consistency - Same pattern across all tools
3. Clarity - Explicit mapping prevents silent failures

### Position

Specifies insertion location for create/move operations. Maps directly to Omni Automation `Folder.ChildInsertionLocation`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `placement` | `'before' \| 'after' \| 'beginning' \| 'ending'` | Yes | Position type |
| `relativeTo` | `string` | Conditional | Folder ID reference |

**Requirement Rules**:

- `placement: 'before'` or `'after'`: `relativeTo` is **REQUIRED** (sibling folder ID)
- `placement: 'beginning'` or `'ending'`: `relativeTo` is **OPTIONAL** (parent folder ID; omit for library root)

**Null vs Undefined Semantics**:

The `relativeTo` field accepts `string | undefined`, NOT `string | null`:

- **Omit `relativeTo`** (undefined): Maps to library root for beginning/ending
- **Pass `null`**: Causes Zod validation error (null is not a valid string)

**Empty String Handling**:

An empty string for `relativeTo` is treated as missing:

- For `before`/`after`: Triggers error `"relativeTo is required when placement is 'before' or 'after'"`
- For `beginning`/`ending`: Would cause "folder not found" error at OmniJS layer

### Position Mapping

| MCP Position | Omni Automation Expression |
|--------------|---------------------------|
| `{ placement: "beginning" }` | `library.beginning` |
| `{ placement: "ending" }` | `library.ending` |
| `{ placement: "beginning", relativeTo: "folderId" }` | `Folder.byIdentifier("folderId").beginning` |
| `{ placement: "ending", relativeTo: "folderId" }` | `Folder.byIdentifier("folderId").ending` |
| `{ placement: "before", relativeTo: "folderId" }` | `Folder.byIdentifier("folderId").before` |
| `{ placement: "after", relativeTo: "folderId" }` | `Folder.byIdentifier("folderId").after` |

## Response Schemas

### Success Response

All mutable operations return consistent success structure:

```typescript
interface SuccessResponse {
  success: true;
  id: string;      // Folder's primaryKey
  name: string;    // Folder's current name
}
```

### List Response

```typescript
interface ListFoldersResponse {
  success: true;
  folders: Folder[];
}
```

### Error Response (Standard)

```typescript
interface ErrorResponse {
  success: false;
  error: string;   // Human-readable error message
}
```

### Error Response (Disambiguation)

```typescript
interface DisambiguationErrorResponse {
  success: false;
  error: string;
  code: 'DISAMBIGUATION_REQUIRED';
  matchingIds: string[];
}
```

## Input Schemas by Tool

### list_folders

```typescript
interface ListFoldersInput {
  status?: 'active' | 'dropped';    // Filter by status
  parentId?: string;                 // Filter by parent (null = root)
  includeChildren?: boolean;         // Recursive (default: true)
}
```

**Behavior Matrix**:

| parentId | includeChildren | Result |
|----------|-----------------|--------|
| omitted | omitted/true | All folders via `flattenedFolders` |
| omitted | false | Top-level only via `database.folders` |
| specified | omitted/true | Recursive children via `folder.flattenedFolders` |
| specified | false | Immediate children via `folder.folders` |

### add_folder

```typescript
interface AddFolderInput {
  name: string;                      // Required, non-empty after trim
  position?: Position;               // Default: { placement: "ending" }
}
```

### edit_folder

```typescript
interface EditFolderInput {
  id?: string;                       // Folder identifier (precedence)
  name?: string;                     // Folder name lookup (fallback)
  newName?: string;                  // New name to set
  newStatus?: 'active' | 'dropped';  // New status to set
}
```

**Validation Rules**:

- At least one of `id` or `name` required for identification
- At least one of `newName` or `newStatus` required for update
- If `name` matches multiple, return disambiguation error

### remove_folder

```typescript
interface RemoveFolderInput {
  id?: string;                       // Folder identifier (precedence)
  name?: string;                     // Folder name lookup (fallback)
}
```

**Behavior**:

- Recursive deletion (folder + all contents)
- Returns ID/name captured before deletion

### move_folder

```typescript
interface MoveFolderInput {
  id?: string;                       // Folder identifier (precedence)
  name?: string;                     // Folder name lookup (fallback)
  position: Position;                // Required - no default
}
```

**Validation Rules**:

- Position is required (unlike add_folder)
- Circular move detection: cannot move folder into its own descendants

## Validation Rules

### Folder Name (Creation/Update)

1. Trim leading/trailing whitespace
2. Reject if trimmed length is 0
3. No character restrictions (emoji, unicode supported)
4. No length limit

**Note**: Trimming applies to `name` in `add_folder` and `newName` in `edit_folder`.

### Folder Name (Identification/Lookup)

The `name` field used for folder lookup in `edit_folder`, `remove_folder`, and `move_folder`
does NOT trim whitespace. This is intentional:

- Lookups use **exact matching** per spec clarification #4
- If folder was created as "  Work  " (with spaces), lookup must use "  Work  "
- This matches Omni Automation's `byName()` behavior

### Folder Identification

1. If `id` provided: use `Folder.byIdentifier(id)`
2. If only `name` provided: search `flattenedFolders.filter(f => f.name === name)`
3. If multiple matches: return disambiguation error with all IDs
4. If no matches: return "folder not found" error

### Position Validation

1. For `before`/`after`: `relativeTo` must be provided
2. For `beginning`/`ending`: `relativeTo` optional (defaults to library)
3. Validate `relativeTo` folder exists before operation
4. For move: validate not moving into descendant (circular)

## State Transitions

### Folder Status

```text
┌──────────┐                      ┌──────────┐
│  Active  │ ←──edit_folder────→  │ Dropped  │
└──────────┘   (newStatus)        └──────────┘
```

- No cascade: Setting folder to dropped does NOT affect children's status
- `effectiveActive` (computed by OmniFocus) considers ancestor chain
- Only `status` property is modified by edit_folder

### Folder Hierarchy

```text
Library (root)
├── Folder A
│   ├── Folder A1
│   └── Folder A2
└── Folder B

Operations:
- add_folder: Insert at any position
- move_folder: Relocate maintaining subtree
- remove_folder: Delete with entire subtree
```

## Error Handling

### Disambiguation Support by Tool

Not all tools support disambiguation. The following table clarifies which tools
return disambiguation errors and why:

| Tool | Disambiguation | Reason |
|------|----------------|--------|
| `list_folders` | ❌ No | Filters by `parentId` (an ID), not by name lookup |
| `add_folder` | ❌ No | Creates new folders; does not look up existing by name |
| `edit_folder` | ✅ Yes | Supports `name` parameter for folder identification |
| `remove_folder` | ✅ Yes | Supports `name` parameter for folder identification |
| `move_folder` | ✅ Yes | Supports `name` parameter for folder identification |

**Disambiguation Threshold**: Disambiguation errors are triggered when a name-based
lookup matches **more than one folder** (count > 1). A single match proceeds normally;
zero matches returns a "folder not found" error.

### Error Codes

| Code | Trigger | Response Field |
|------|---------|----------------|
| `DISAMBIGUATION_REQUIRED` | Name matches multiple folders (count > 1) | `matchingIds` array |
| (none) | Folder not found | `error` message |
| (none) | Invalid parentId | `error` message |
| (none) | Invalid relativeTo | `error` message |
| (none) | Wrong-parent relativeTo | `error` message |
| (none) | Circular move | `error` message |
| (none) | Empty name | `error` message |
| (none) | Library operation | `error` message |
| (none) | Zod validation failure | `error` message |

### Error Message Format Standards

All error messages MUST follow these formatting rules per spec clarifications #11 and #19:

**Pattern**: `"Invalid [field] '[value]': [reason]"` or `"[Action] failed: [reason]"`

**Requirements**:

1. **Quote problematic values**: Include the actual value in single quotes (e.g., `'xyz'`)
2. **Explain the failure**: Append reason after colon (e.g., `: folder not found`)
3. **Be actionable**: Message should indicate what went wrong and implicitly how to fix it

**Prohibitions** (per Constitution Principle V):

- ❌ Silent failures are prohibited - all errors must surface
- ❌ Generic messages like "Operation failed" are prohibited
- ❌ Swallowing exceptions without logging/re-throwing is prohibited

### Standard Error Messages by Scenario

| Scenario | Error Message Format |
|----------|---------------------|
| Folder not found (by ID) | `"Invalid id '[id]': folder not found"` |
| Folder not found (by name) | `"Invalid name '[name]': folder not found"` |
| Invalid parentId | `"Invalid parentId '[id]': folder not found"` |
| Invalid relativeTo (not found) | `"Invalid relativeTo '[id]': folder not found"` |
| Invalid relativeTo (wrong parent) | `"Invalid relativeTo '[id]': folder is not a sibling in target parent"` |
| Circular move | `"Cannot move folder '[id]': target is a descendant of source"` |
| Empty name | `"Folder name is required and must be a non-empty string"` |
| Library deletion | `"Cannot delete library: not a valid folder target"` |
| Library move | `"Cannot move library: not a valid folder target"` |
| Missing relativeTo | `"relativeTo is required when placement is 'before' or 'after'"` |
| Missing identifier | `"Either id or name must be provided to identify the folder"` |
| Missing update field | `"At least one of newName or newStatus must be provided"` |
| Disambiguation | `"Ambiguous name '[name]': found [count] matches"` with `matchingIds` array |

### Disambiguation Error Message Quality

When returning disambiguation errors, the `error` field MUST include:

1. The ambiguous name that was searched
2. The count of matches found

**Example**: `"Ambiguous name 'Archive': found 3 matches"`

The `matchingIds` array provides the IDs for retry. AI agents should:

1. Detect via `code: 'DISAMBIGUATION_REQUIRED'`
2. Query folder details using the IDs
3. Present user with contextual choices
4. Retry with selected ID

### Error Handling Layers Architecture

Errors flow through four layers, each with specific responsibilities:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Zod Validation (Input Validation)                      │
│ - Validates input schema before any processing                  │
│ - Produces field-specific validation errors                     │
│ - Format: Zod's default error structure, wrapped in standard    │
│   error response: { success: false, error: "[field]: [message]" }│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: OmniJS Script Execution                                │
│ - Runs Omni Automation JavaScript inside OmniFocus              │
│ - All scripts wrapped in try-catch returning JSON               │
│ - Format: { success: false, error: "[message]" }                │
│ - Transport errors (timeout, OmniFocus not running) handled     │
│   by scriptExecution.ts using existing patterns                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Primitive Function                                     │
│ - Parses OmniJS JSON response                                   │
│ - Adds context to errors (operation type, identifiers)          │
│ - Handles disambiguation logic for name lookups                 │
│ - Returns typed response or throws with context                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Definition Handler (MCP Interface)                     │
│ - Transforms response to MCP format                             │
│ - Success: { content: [{ type: 'text', text: JSON.stringify(...) }] }
│ - Error: { content: [{ type: 'text', text: JSON.stringify({ success: false, error: ... }) }] }
│ - Never lets exceptions bubble to MCP client unhandled          │
└─────────────────────────────────────────────────────────────────┘
```

**Transformation Rules**:

- Zod errors → Extract message, wrap in standard error format
- OmniJS errors → Parse JSON, propagate error field
- Primitive errors → Add context, format message per standards
- Definition errors → Serialize to MCP text content

### Zod Validation Error Handling

Zod validation errors are caught at the definition layer and transformed to
standard error format. The transformation extracts the first error message
and includes field path:

```typescript
// Zod error transformation pattern
try {
  const input = InputSchema.parse(rawInput);
} catch (e) {
  if (e instanceof z.ZodError) {
    const firstError = e.errors[0];
    const field = firstError.path.join('.');
    const message = firstError.message;
    return {
      success: false,
      error: field ? `${field}: ${message}` : message
    };
  }
  throw e; // Re-throw non-Zod errors
}
```

### Edge Case Error Handling

| Edge Case | Error Handling Approach |
|-----------|------------------------|
| **Concurrent modification** | Operations reflect state at execution time. If folder is deleted during operation, OmniJS returns null which surfaces as "folder not found" error. No special handling required. |
| **Database inconsistency** | Assumed not to occur (spec assumption). If encountered, OmniJS errors propagate with original message. |
| **Error message length** | No truncation policy. Error messages should be concise by design (< 200 characters). Long messages indicate implementation issue. |
| **Permission denial** | Handled by existing scriptExecution.ts patterns. Surfaces as transport-level error with OmniFocus/osascript error message. |

### Corrective Action Guidance

Error messages should be self-explanatory. When additional guidance is helpful:

| Error Type | Implicit Corrective Action |
|------------|---------------------------|
| Folder not found | Verify ID/name is correct; use `list_folders` to find valid IDs |
| Disambiguation | Use one of the IDs from `matchingIds` array |
| Invalid relativeTo | Verify the referenced folder exists and is in correct parent |
| Circular move | Choose a different destination that is not a descendant |
| Empty name | Provide a non-empty, non-whitespace folder name |

## OmniJS Implementation Patterns

### Null Handling for Parent Reference

OmniJS scripts MUST use explicit ternary for `parentId` extraction:

```javascript
parentId: folder.parent ? folder.parent.id.primaryKey : null
```

This explicit ternary (rather than optional chaining `folder.parent?.id.primaryKey`) is preferred
because:

1. **Explicit null return**: Ensures `null` (not `undefined`) for root folders
2. **Consistency with Zod schema**: FolderSchema uses `.nullable()` which expects `null`
3. **Readability**: Clear intent that root folders get explicit `null`

### Folder Lookup Validation

When looking up folders by ID, validate the result before use:

```javascript
const folder = Folder.byIdentifier(id);
if (!folder) {
  return JSON.stringify({
    success: false,
    error: `Invalid id '${id}': folder not found`
  });
}
```

When looking up by name with potential disambiguation:

```javascript
const matches = flattenedFolders.filter(f => f.name === name);
if (matches.length === 0) {
  return JSON.stringify({
    success: false,
    error: `Invalid name '${name}': folder not found`
  });
}
if (matches.length > 1) {
  return JSON.stringify({
    success: false,
    error: `Ambiguous name '${name}': found ${matches.length} matches`,
    code: 'DISAMBIGUATION_REQUIRED',
    matchingIds: matches.map(f => f.id.primaryKey)
  });
}
const folder = matches[0];
```

### Position Resolution

When resolving position for folder operations:

```javascript
function resolvePosition(position) {
  if (!position.relativeTo) {
    // Library root
    return library[position.placement];
  }
  // Relative to specific folder
  const refFolder = Folder.byIdentifier(position.relativeTo);
  if (!refFolder) {
    throw new Error(`Invalid relativeTo '${position.relativeTo}': folder not found`);
  }
  return refFolder[position.placement];
}
```
