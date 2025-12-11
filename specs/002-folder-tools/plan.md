# Implementation Plan: Folder Management Tools

**Branch**: `002-folder-tools` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Phase 1: Folder Management Tools - Implement 5 tools for OmniFocus folder operations

## Summary

Implement 5 folder management tools (`list_folders`, `add_folder`, `edit_folder`, `remove_folder`, `move_folder`) using **Omni Automation JavaScript** via the existing `executeOmniFocusScript` pattern. The implementation follows the definitions/primitives separation pattern established in the codebase, uses Zod 4 schemas for validation, and returns structured JSON responses.

**Key Technical Decision**: Use Omni Automation JavaScript (NOT AppleScript) as the automation layer. This aligns with Omni Group's recommended approach and matches the existing OmniJS scripts in `omnifocusScripts/`. The execution bridge (`app.evaluateJavascript()` via JXA) is already implemented in `scriptExecution.ts`.

## Technical Context

**Language/Version**: TypeScript 5.9+, Node.js 24+
**Primary Dependencies**: @modelcontextprotocol/sdk 1.24.3, Zod 4.1.x
**Storage**: N/A (OmniFocus database accessed via Omni Automation)
**Testing**: Vitest with V8 coverage
**Target Platform**: macOS (OmniFocus automation via osascript)
**Project Type**: Single (MCP server)
**Performance Goals**: <3 seconds per operation (SC-004), <2 seconds for list (SC-001)
**Constraints**: macOS only, OmniFocus required, stdio-based MCP transport
**Scale/Scope**: 5 folder tools (list, add, edit, remove, move)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design | Post-Design | Notes |
|-----------|------------|-------------|-------|
| I. Type-First Development | PASS | PASS | Zod schemas for all inputs, strict TypeScript |
| II. Separation of Concerns | PASS | PASS | definitions/ + primitives/ pattern |
| III. Script Execution Safety | PASS | PASS | try-catch in OmniJS, JSON responses |
| IV. Structured Data Contracts | PASS | PASS | JSON in/out, ISO 8601 dates |
| V. Defensive Error Handling | PASS | PASS | Catch at every layer, actionable errors |
| VI. Build Discipline | PASS | PASS | Standard build process, no new scripts needed |
| VII. KISS | PASS | PASS | Direct Omni Automation API mapping |
| VIII. YAGNI | PASS | PASS | Only specified 5 tools, no extras |
| IX. SOLID | PASS | PASS | One tool = one responsibility |

**MCP Integration**: Uses existing patterns - `server.tool()` registration, Zod schemas, `RequestHandlerExtra<ServerRequest, ServerNotification>` typing.

**Script Execution**: Uses `executeOmniFocusScript` with dynamically generated OmniJS (same pattern as `queryOmnifocus.ts`), NOT pre-built scripts.

## Project Structure

### Documentation (this feature)

```text
specs/002-folder-tools/
├── plan.md              # This file
├── research.md          # Phase 0 output - Omni Automation API research
├── data-model.md        # Phase 1 output - Entity definitions
├── quickstart.md        # Phase 1 output - Implementation guide
├── contracts/           # Phase 1 output - Zod schemas
│   ├── index.ts         # Main barrel export
│   ├── shared/          # Shared schemas
│   │   ├── index.ts     # Shared barrel export
│   │   ├── folder.ts    # FolderSchema
│   │   ├── position.ts  # PositionSchema
│   │   └── disambiguation.ts  # DisambiguationSchema + type guard
│   ├── list-folders.ts
│   ├── add-folder.ts
│   ├── edit-folder.ts
│   ├── remove-folder.ts
│   └── move-folder.ts
├── checklists/          # Implementation verification checklists
│   ├── type-safety.md   # Type safety & schema consistency
│   └── ...              # Additional checklists
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── tools/
│   ├── definitions/          # MCP interface layer
│   │   ├── listFolders.ts    # NEW
│   │   ├── addFolder.ts      # NEW
│   │   ├── editFolder.ts     # NEW
│   │   ├── removeFolder.ts   # NEW
│   │   └── moveFolder.ts     # NEW
│   └── primitives/           # Business logic layer
│       ├── listFolders.ts    # NEW
│       ├── addFolder.ts      # NEW
│       ├── editFolder.ts     # NEW
│       ├── removeFolder.ts   # NEW
│       └── moveFolder.ts     # NEW
├── utils/
│   └── scriptExecution.ts    # Existing - no changes needed
└── server.ts                 # Register new tools

tests/
├── unit/
│   ├── listFolders.test.ts   # NEW
│   ├── addFolder.test.ts     # NEW
│   ├── editFolder.test.ts    # NEW
│   ├── removeFolder.test.ts  # NEW
│   └── moveFolder.test.ts    # NEW
└── contract/
    └── folder-schemas.test.ts # NEW - Schema validation tests
```

**Structure Decision**: Single project pattern. New folder tools follow existing definitions/primitives structure. No new directories needed beyond standard tool locations.

## Complexity Tracking

> No Constitution violations requiring justification. All tools follow established patterns.

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Script generation | Dynamic OmniJS strings | Matches `queryOmnifocus.ts` pattern |
| Position handling | Maps to Omni Automation API | Direct translation, no abstraction |
| Error handling | Structured JSON + error codes | Per FR-027/FR-028 |
| Disambiguation | `code: "DISAMBIGUATION_REQUIRED"` | Enables AI agent retry flows |

## Implementation Approach

### Execution Pattern

All folder operations use the **Omni Automation JavaScript** pattern via the existing JXA bridge:

```typescript
// In primitives/listFolders.ts
const omnijsScript = `
(() => {
  try {
    const folders = flattenedFolders.map(f => ({
      id: f.id.primaryKey,
      name: f.name,
      status: f.status === Folder.Status.Active ? 'active' : 'dropped',
      parentId: f.parent ? f.parent.id.primaryKey : null
    }));
    return JSON.stringify({ success: true, folders });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
})()
`;

// Execute via existing bridge
const result = await executeOmniFocusScript(omnijsScript);
```

### Type Safety Requirements

**Type Inference Pattern**: Primitive functions MUST use Zod's type inference for all parameters and return types. This ensures compile-time type safety that matches runtime validation:

```typescript
// REQUIRED: Use z.infer for type derivation
import {
  AddFolderInputSchema,
  AddFolderResponseSchema,
  type AddFolderInput,    // = z.infer<typeof AddFolderInputSchema>
  type AddFolderResponse  // = z.infer<typeof AddFolderResponseSchema>
} from '../contracts/add-folder.js';

// Primitive function signature uses inferred types
export async function addFolderPrimitive(
  input: AddFolderInput
): Promise<AddFolderResponse> {
  // Implementation...
}
```

**Prohibitions**:

- ❌ Type assertions (`as Type`) are prohibited - they bypass TypeScript's type checker
- ❌ Manual type definitions that duplicate Zod schemas are prohibited
- ❌ Using `any` or `unknown` without proper narrowing is prohibited

### Definition/Primitive Relationship

The **definitions/primitives separation** serves distinct purposes:

| Layer | File | Purpose | Dependencies |
|-------|------|---------|--------------|
| **Definition** | `definitions/addFolder.ts` | MCP interface, tool registration, request handling | Imports primitive function |
| **Primitive** | `primitives/addFolder.ts` | Business logic, OmniJS generation, response construction | Uses Zod schemas for types |

**Key Responsibilities**:

- **Definition**: Registers tool with MCP SDK, extracts input from request, calls primitive, formats MCP response
- **Primitive**: Pure function with typed input/output, generates OmniJS, handles disambiguation, returns typed response

**Why This Separation Matters**:

1. **Testability**: Primitives can be tested without MCP SDK mocking
2. **Type Safety**: Zod schemas define the contract between layers
3. **Clarity**: MCP plumbing isolated from business logic

### API Mapping (Omni Automation)

| MCP Tool | Omni Automation JavaScript |
|----------|---------------------------|
| `list_folders` | `flattenedFolders`, `database.folders`, `folder.folders` |
| `add_folder` | `new Folder(name, position)` |
| `edit_folder` | `folder.name = "..."`, `folder.status = Folder.Status.X` |
| `remove_folder` | `deleteObject(folder)` |
| `move_folder` | `moveSections([folder], position)` |

### Position Resolution

```typescript
// Position mapping for Omni Automation
function resolvePosition(position: Position): string {
  if (!position.relativeTo) {
    // Library root
    return `library.${position.placement}`;
  }
  // Relative to folder
  return `Folder.byIdentifier("${position.relativeTo}").${position.placement}`;
}
```

## Dependencies

### External (no changes)

- `@modelcontextprotocol/sdk@1.24.3` - MCP protocol
- `zod@4.1.x` - Schema validation

### Internal (existing)

- `src/utils/scriptExecution.ts` - `executeOmniFocusScript` function
- `src/utils/tempFileUtils.ts` - Secure temp file handling (if needed)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OmniJS silent failures | All scripts wrapped in try-catch with JSON error returns |
| Name disambiguation | Structured error with `matchingIds` array per FR-027 |
| Position validation | Validate relativeTo folder exists before operation |
| Circular move detection | Check if destination is descendant of source |

## Success Metrics

- [ ] All 5 tools pass unit tests
- [ ] All 5 tools pass contract schema tests
- [ ] `pnpm build` succeeds with no errors
- [ ] `pnpm typecheck` passes (strict mode)
- [ ] `pnpm lint` passes (Biome)
- [ ] Manual verification in OmniFocus for each tool
