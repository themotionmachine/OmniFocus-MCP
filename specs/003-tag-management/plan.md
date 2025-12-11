# Implementation Plan: Tag Management Tools

**Branch**: `003-tag-management` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-tag-management/spec.md`

## Summary

Implement 6 tag management tools for OmniFocus MCP Server using pure Omni Automation
JavaScript (OmniJS). Tags are hierarchical context labels that control task availability
through the "allows next action" setting. This phase follows the established patterns
from Phase 1 (Folders) with Tag-specific adaptations for the three-state status model
(Active/OnHold/Dropped) and task assignment operations.

**Tools**: `list_tags`, `create_tag`, `edit_tag`, `delete_tag`, `assign_tags`, `remove_tags`

## Technical Context

**Language/Version**: TypeScript 5.9+ with strict mode enabled
**Primary Dependencies**:

- `@modelcontextprotocol/sdk@1.24.3` - MCP server framework
- `zod@4.1.x` - Runtime schema validation
- `tsup@8.5+` - Build tool with esbuild
- `vitest@4.0+` - Test runner
- `biome@2.3+` - Linting and formatting

**Storage**: OmniFocus database (accessed via Omni Automation JavaScript)
**Testing**: Vitest with mocked `executeOmniFocusScript()`, TDD Red-Green-Refactor cycle
**Target Platform**: macOS (OmniFocus 4+ via Omni Automation)
**Project Type**: Single MCP server project
**Performance Goals**: <2s for list operations (SC-001), <3s for mutations (SC-005)
**Constraints**: 99% success rate for valid requests (SC-002, SC-003)
**Scale/Scope**: 6 tools, ~39 functional requirements, follows Phase 1 patterns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First Development | ✅ PASS | Zod schemas for all inputs; strict TypeScript; Tag.Status enum |
| II. Separation of Concerns | ✅ PASS | definitions/ + primitives/ pattern; contracts/ for schemas |
| III. Script Execution Safety | ✅ PASS | Pure OmniJS with try-catch JSON returns; tested in Script Editor |
| IV. Structured Data Contracts | ✅ PASS | JSON responses; ISO 8601 dates; per-item batch results |
| V. Defensive Error Handling | ✅ PASS | Disambiguation errors (FR-038); structured error codes |
| VI. Build Discipline | ✅ PASS | `pnpm build` required; OmniJS copied to dist/ |
| VII. KISS | ✅ PASS | Follows folder patterns; no unnecessary abstractions |
| VIII. YAGNI | ✅ PASS | Only 6 specified tools; no extras |
| IX. SOLID | ✅ PASS | Single responsibility per tool; open-closed via new files |
| X. TDD | ✅ PASS | Contract tests → Unit tests → Implementation → Manual verify |

**Gate Status**: PASS - All principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/003-tag-management/
├── plan.md              # This file
├── research.md          # Phase 0 - OmniAutomation research findings
├── data-model.md        # Phase 1 - Entity definitions
├── quickstart.md        # Phase 1 - Developer quick reference
├── contracts/           # Phase 1 - Zod schema contracts (for reference)
│   └── [schemas documented in data-model.md]
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── contracts/
│   └── tag-tools/           # NEW: Zod schemas for tag operations
│       ├── index.ts         # Re-exports all contracts
│       ├── shared/
│       │   ├── index.ts     # Re-exports shared types
│       │   ├── tag.ts       # Tag entity schema
│       │   ├── position.ts  # Tag position schema (reuse pattern)
│       │   └── disambiguation.ts  # Disambiguation error schema
│       ├── list-tags.ts
│       ├── create-tag.ts
│       ├── edit-tag.ts
│       ├── delete-tag.ts
│       ├── assign-tags.ts
│       └── remove-tags.ts
├── tools/
│   ├── definitions/         # MCP tool registrations
│   │   ├── listTags.ts      # NEW
│   │   ├── createTag.ts     # NEW
│   │   ├── editTag.ts       # NEW
│   │   ├── deleteTag.ts     # NEW
│   │   ├── assignTags.ts    # NEW
│   │   └── removeTags.ts    # NEW
│   └── primitives/          # Business logic + OmniJS generation
│       ├── listTags.ts      # NEW
│       ├── createTag.ts     # NEW
│       ├── editTag.ts       # NEW
│       ├── deleteTag.ts     # NEW
│       ├── assignTags.ts    # NEW
│       └── removeTags.ts    # NEW
└── server.ts                # Tool registration (add 6 new tools)

tests/
├── contract/
│   └── tag-tools/           # NEW: Contract validation tests
│       ├── list-tags.test.ts
│       ├── create-tag.test.ts
│       ├── edit-tag.test.ts
│       ├── delete-tag.test.ts
│       ├── assign-tags.test.ts
│       └── remove-tags.test.ts
└── unit/
    └── tag-tools/           # NEW: Primitive unit tests
        ├── listTags.test.ts
        ├── createTag.test.ts
        ├── editTag.test.ts
        ├── deleteTag.test.ts
        ├── assignTags.test.ts
        └── removeTags.test.ts
```

**Structure Decision**: Single project structure following established folder-tools pattern.
Tag tools mirror folder tools architecture with Tag-specific adaptations.

## Complexity Tracking

> No violations identified. Design follows existing patterns.

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Tag.Status 3-state | Enum mapping in OmniJS | Matches official API (Active/OnHold/Dropped) |
| Task assignment | Bulk operations with per-item results | FR-031, FR-037 batch semantics |
| Disambiguation | Structured error with matchingIds | Consistent with folder pattern (FR-038) |

## Key Differences from Folder Tools

| Aspect | Folders | Tags |
|--------|---------|------|
| Status values | 2 (active, dropped) | 3 (active, onHold, dropped) |
| Entity property | N/A | `allowsNextAction: boolean` |
| Entity property | N/A | `taskCount: number` |
| Move operation | `move_folder` tool | Out of scope (delete + create) |
| Assignment ops | N/A | `assign_tags`, `remove_tags` (task relationship) |
| Root collection | `library.folders` | `tags` (database root) |
| Flattened access | `flattenedFolders` | `flattenedTags` |

## OmniJS API Reference (from research)

### Tag Class Properties

| Property | Type | Description |
|----------|------|-------------|
| `id.primaryKey` | String | Unique identifier |
| `name` | String | Tag name (read/write) |
| `status` | Tag.Status | Active/OnHold/Dropped |
| `allowsNextAction` | Boolean | Controls task availability |
| `parent` | Tag or null | Parent tag reference |
| `tags` | TagArray | Immediate children |
| `flattenedTags` | TagArray | All descendants |
| `remainingTasks` | TaskArray | Incomplete tasks (for taskCount) |

### Tag Creation

```javascript
// Basic
new Tag("name")

// With position
new Tag("name", tags.beginning)           // First at root
new Tag("name", tags.ending)              // Last at root
new Tag("name", parentTag.beginning)      // First in parent
new Tag("name", parentTag.ending)         // Last in parent
new Tag("name", siblingTag.before)        // Before sibling
new Tag("name", siblingTag.after)         // After sibling
```

### Task-Tag Operations

```javascript
task.addTag(tagObj)       // Add single tag
task.addTags(tagArray)    // Add multiple tags
task.removeTag(tagObj)    // Remove single tag
task.removeTags(tagArray) // Remove multiple tags
task.clearTags()          // Remove all tags
```

### Finding Tags

```javascript
Tag.byIdentifier(id)         // By unique ID
flattenedTags.byName(name)   // First match by name
tagNamed(name)               // Top-level by name
parentTag.tagNamed(name)     // Within parent by name
```

## Implementation Sequence

Following TDD Red-Green-Refactor per Constitution Principle X:

1. **P1: list_tags** - Foundation for all other tools
2. **P2: create_tag** - Required before edit/delete testing
3. **P3: edit_tag** - Depends on list/create for verification
4. **P4: delete_tag** - Depends on create for test setup
5. **P5: assign_tags** - Depends on list for verification
6. **P6: remove_tags** - Depends on assign for test setup

Each tool follows: Contract tests (RED) → Unit tests (RED) → Implement → GREEN → Refactor

## Error Handling Architecture

Per Constitution Principle V and spec.md FR-040 through FR-044, error handling follows
a four-layer architecture with specific responsibilities at each level:

### Layer 1: Zod Validation (Definition Layer)

- Input validation via `safeParse()` before business logic
- Error format: `"path.field: message"` from Zod issues
- Returns MCP response with `isError: true`

### Layer 2: OmniJS Script Layer

- **REQUIRED**: All scripts wrapped in try-catch returning JSON
- Pattern: `return JSON.stringify({ success: false, error: e.message || String(e) })`
- Silent failures (empty results) indicate syntax errors - use Script Editor to diagnose

### Layer 3: Primitive Function Layer

- **NEVER** throws exceptions - always returns structured responses
- Preserves original error messages from OmniJS layer
- Handles disambiguation errors with full `code` and `matchingIds` fields

### Layer 4: Transport/Infrastructure Layer

- Handled by existing `scriptExecution.ts` patterns
- OmniFocus not running, osascript timeout, syntax errors
- Referenced by spec.md Clarification #4 - no new code needed

### Error Message Standards

All error messages MUST be actionable per FR-040:

| Error Type | Format | Example |
|------------|--------|---------|
| Not found | `"{Type} '{id}' not found"` | "Tag 'abc123' not found" |
| Disambiguation | `"Ambiguous {type} name '{name}'. Found N matches: {ids}. Please specify by ID."` | (full format) |
| Invalid parent | `"Parent tag '{id}' not found"` | "Parent tag 'xyz' not found" |
| Invalid relativeTo | `"Reference tag '{id}' not found for position placement"` | (full format) |
| Invalid status | `"Invalid status '{value}'. Expected 'active', 'onHold', or 'dropped'"` | "Invalid status 'Active'..." |
| Empty name | `"Tag name is required and must be a non-empty string"` | (static) |
| Missing relativeTo | `"relativeTo is required for 'before' and 'after' placements"` | (static) |
| No updates | `"At least one update field (newName, status, allowsNextAction) must be provided"` | (static) |
| clearAll conflict | `"Cannot specify both clearAll and tagIds..."` | (see spec.md) |

### Batch Operation Error Semantics (FR-041 to FR-044)

For `assign_tags` and `remove_tags`:

1. **Continue-on-error**: One failed item does NOT halt the batch (FR-042)
2. **Top-level success**: `success: true` means operation completed, NOT all items succeeded (FR-041)
3. **Per-item results**: At same array index as input; `error` present only when `success: false` (FR-044)
4. **Disambiguation in batch**: Per-item results include `code` and `matchingIds` when applicable

```typescript
// Consumer MUST check per-item results:
if (response.success) {
  response.results.forEach((item, index) => {
    if (!item.success) {
      console.error(`Item ${index} failed: ${item.error}`);
    }
  });
}
```

### Silent Failure Detection

Empty OmniJS results indicate silent failure:

```typescript
if (rawResult === undefined || rawResult === null || rawResult === '') {
  return {
    success: false,
    error: 'OmniJS script returned empty result (possible syntax error). ' +
           'Test the script in OmniFocus Script Editor to diagnose.'
  };
}
```
