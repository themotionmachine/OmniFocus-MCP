# Implementation Plan: Window & UI Control

**Branch**: `014-window-ui` | **Date**: 2026-03-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-window-ui/spec.md`

## Summary

Window & UI Control provides 8 MCP tools for navigating and controlling the
OmniFocus outline through AI assistants. Tools enable revealing items, expanding
and collapsing nodes and notes, focusing on projects/folders, and selecting
items programmatically.

**Primary Requirements:**
- `reveal_items`: Navigate to items in the outline (1-10 items)
- `expand_items` / `collapse_items`: Control outline detail level (1-50 items, optional `completely`)
- `expand_notes` / `collapse_notes`: Toggle note visibility (1-50 items, optional `completely`)
- `focus_items`: Narrow view to projects/folders only
- `unfocus`: Clear focus, restore full outline
- `select_items`: Select items for visual review (1-100 items, optional `extending`)

**Technical Approach:**
- All operations use pure OmniJS via `executeOmniFocusScript()`
- ContentTree API (`document.windows[0].content`) for node operations (macOS + OF4+ only)
- Focus/unfocus use `window.focus` property directly (no content tree needed)
- 4-type item resolution: task, project, folder, tag (all valid in content tree)
- Batch operations with per-item success/failure results

## Technical Context

**Language/Version**: TypeScript 5.9+ with strict mode (ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.27.x, Zod 4.2.x, tsup 8.5+
**Storage**: N/A (OmniFocus internal database via OmniJS)
**Testing**: Vitest 4.0+ with TDD Red-Green-Refactor
**Target Platform**: macOS (OmniFocus Pro 4+ with Omni Automation)
**Project Type**: Single project (established MCP server structure)
**Performance Goals**: N/A (UI operations are instant; no database queries)
**Constraints**: OmniFocus 4.0+ required (content tree API); macOS only for content tree operations
**Scale/Scope**: GTD practitioners; batch limits of 10/50/100 items per operation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First Development | PASS | Zod schemas for all 8 tool inputs/outputs (16 FRs), TypeScript strict mode |
| II. Separation of Concerns | PASS | Definitions in `definitions/`, primitives in `primitives/`, contracts in `contracts/window-tools/` |
| III. Script Execution Safety | PASS | All OmniJS wrapped in IIFE + try-catch with JSON error returns; version/platform guards |
| IV. Structured Data Contracts | PASS | Discriminated unions for all responses, per-item batch results with codes |
| V. Defensive Error Handling | PASS | Per-item results for batch ops, distinct error codes (NOT_FOUND, NODE_NOT_FOUND, INVALID_TYPE, DISAMBIGUATION_REQUIRED) |
| VI. Build Discipline | PASS | Standard `pnpm build` workflow; no OmniJS script files to copy (inline generation) |
| VII. KISS | PASS | Follows established batch patterns from status-tools; simple node method calls |
| VIII. YAGNI | PASS | Only 8 spec'd tools; no sidebar, inspector, multi-window, or perspective switching |
| IX. SOLID | PASS | Single responsibility per file; definitions/primitives separation; new tool pairs don't modify existing |
| X. TDD | PASS | Contract tests -> Unit tests -> Implementation -> Manual verification |

**Violations Requiring Justification**: None

## Project Structure

### Documentation (this feature)

```text
specs/014-window-ui/
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (API research)
├── plan.md              # This file
├── data-model.md        # Phase 1 output (entity definitions)
├── quickstart.md        # Phase 1 output (OmniJS patterns)
├── contracts/           # Phase 1 output (Zod schemas)
│   ├── shared/
│   │   ├── item-identifier.ts   # WindowItemIdentifierSchema (4-type)
│   │   ├── batch.ts             # WindowBatchItemResultSchema, WindowBatchSummarySchema
│   │   └── index.ts
│   ├── reveal-items.ts
│   ├── expand-items.ts
│   ├── collapse-items.ts
│   ├── expand-notes.ts
│   ├── collapse-notes.ts
│   ├── focus-items.ts          # FocusTargetSchema (project/folder only)
│   ├── unfocus.ts
│   ├── select-items.ts
│   └── index.ts
├── checklists/          # Requirements validation
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── contracts/
│   └── window-tools/                  # NEW - Zod schemas (copied from specs contracts)
│       ├── shared/
│       │   ├── item-identifier.ts     # WindowItemIdentifierSchema
│       │   ├── batch.ts               # WindowBatchItemResult, WindowBatchSummary
│       │   └── index.ts
│       ├── reveal-items.ts
│       ├── expand-items.ts
│       ├── collapse-items.ts
│       ├── expand-notes.ts
│       ├── collapse-notes.ts
│       ├── focus-items.ts
│       ├── unfocus.ts
│       ├── select-items.ts
│       └── index.ts
├── tools/
│   ├── definitions/
│   │   ├── revealItems.ts             # NEW
│   │   ├── expandItems.ts             # NEW
│   │   ├── collapseItems.ts           # NEW
│   │   ├── expandNotes.ts             # NEW
│   │   ├── collapseNotes.ts           # NEW
│   │   ├── focusItems.ts              # NEW
│   │   ├── unfocus.ts                 # NEW
│   │   └── selectItems.ts             # NEW
│   └── primitives/
│       ├── revealItems.ts             # NEW
│       ├── expandItems.ts             # NEW
│       ├── collapseItems.ts           # NEW
│       ├── expandNotes.ts             # NEW
│       ├── collapseNotes.ts           # NEW
│       ├── focusItems.ts              # NEW
│       ├── unfocus.ts                 # NEW
│       └── selectItems.ts             # NEW
└── server.ts                          # Tool registration (8 new tools)

tests/
├── contract/
│   └── window-tools/                  # NEW
│       ├── reveal-items.test.ts
│       ├── expand-items.test.ts
│       ├── collapse-items.test.ts
│       ├── expand-notes.test.ts
│       ├── collapse-notes.test.ts
│       ├── focus-items.test.ts
│       ├── unfocus.test.ts
│       ├── select-items.test.ts
│       └── shared-schemas.test.ts
├── unit/
│   └── window-tools/                  # NEW
│       ├── revealItems.test.ts
│       ├── expandItems.test.ts
│       ├── collapseItems.test.ts
│       ├── expandNotes.test.ts
│       ├── collapseNotes.test.ts
│       ├── focusItems.test.ts
│       ├── unfocus.test.ts
│       └── selectItems.test.ts
└── integration/
    └── window-tools/                  # NEW
        └── window-workflow.integration.test.ts
```

**Structure Decision**: Single project layout following established patterns from
status-tools (Phase 13) and review-tools (Phase 5). Contracts in
`src/contracts/window-tools/` with `shared/` subdirectory for reusable schemas.
New `WindowItemIdentifierSchema` supports all 4 types (task, project, folder, tag)
rather than reusing the 2-type `ItemIdentifierSchema` from status-tools.

## Implementation Strategy

### Key Architecture Decisions

1. **New WindowItemIdentifier (not reused from status-tools)**: The existing
   `ItemIdentifierSchema` only covers tasks and projects. Window-UI needs all
   4 types. A new schema avoids breaking existing contracts.

2. **Shared guard pattern (inline, not shared utility)**: Each OmniJS script
   includes version/window/platform checks inline. Since scripts execute in
   isolation (no shared modules in OmniJS context), a shared utility would
   require code duplication anyway. KISS principle applies.

3. **Focus/unfocus skip content tree check**: These tools use `window.focus`
   directly and do not need `document.windows[0].content`. The guard omits the
   platform check for these 2 tools.

4. **Batch node resolution via nodesForObjects()**: For expand, collapse, notes,
   select, and reveal, use `tree.nodesForObjects(objects)` for efficient batch
   resolution. Items not visible are reported as `NODE_NOT_FOUND` in per-item
   results.

5. **FocusTarget as separate schema**: Focus only accepts projects and folders.
   A dedicated `FocusTargetSchema` communicates this restriction via Zod
   validation and tool description text. Type validation (reject task/tag)
   happens in the OmniJS script after item resolution.

6. **Unfocus has no items parameter**: It simply sets `window.focus = []`.
   The input schema is an empty object.

7. **UI side-effect warnings in all descriptions**: Per FR-013, every tool
   description includes "WARNING: This operation changes the visible OmniFocus
   UI state."

8. **Per-item result tracking in OmniJS**: The batch result tracking happens
   inside the OmniJS script (not at the TypeScript layer) to avoid multiple
   round-trips to OmniFocus. Each item is resolved, operated on, and its result
   recorded in a single script execution. This follows established patterns
   from SPEC-007 and SPEC-013 where all item resolution, operation execution,
   and error tracking happen within the OmniJS closure.

9. **select_items pre-flight reveal (FR-017)**: The OmniJS API specifies that
   `tree.select()` only selects TreeNodes "that are visible (nodes with
   collapsed ancestors cannot be selected)." The `select_items` OmniJS script
   MUST call `tree.reveal(resolvedNodes)` before `tree.select(resolvedNodes,
   extending)` to ensure all targeted nodes are visible. Without this step,
   nodes with collapsed ancestors would silently fail to be selected.

10. **ContentTree platform availability**: The `!tree` guard on
    `document.windows[0].content` is a defensive runtime check, not a platform
    detector. The ContentTree API is available on macOS, iOS, and iPadOS as of
    OF4, but since the MCP server is macOS-only, the guard protects against
    edge cases such as the window not being fully loaded.

11. **No `as Type` assertions in new code**: Per CLAUDE.md NEVER rule ("Use
    type assertions (`as Type`) - use Zod or type narrowing instead"),
    window-tools primitives MUST NOT use `as Type` assertions to cast
    `executeOmniJS()` results. **Note on established pattern**: Existing
    primitives (markComplete, dropItems, etc.) use `return result as
    ResponseType` because `executeOmniJS()` returns `Promise<unknown>`.
    Window-tools SHOULD follow the same pattern for consistency with the
    existing codebase, using `result as ResponseType` at the primitive boundary
    where the OmniJS script is known to return a specific JSON shape. This is
    the one place where `as Type` is tolerated because the OmniJS script's
    JSON output shape is controlled by the same developer who writes the
    contract schema. All other TypeScript code (definitions, utilities, tests)
    MUST use Zod `.parse()` / `.safeParse()` or type narrowing instead of
    `as Type`. Enforcement: `grep -rn ' as [A-Z]' src/tools/ --include='*.ts'`
    should only find matches in `primitives/*.ts` at the `executeOmniJS`
    return boundary.

12. **OmniJS result parsing pattern**: The `executeOmniJS()` function in
    `src/utils/scriptExecution.ts` returns `Promise<unknown>` after
    `JSON.parse(stdout)`. Primitives bridge the `unknown` type to the
    contract-defined response type. The established codebase pattern is:
    (a) null/undefined guard: `if (!result) return { success: false, error:
    '...' }`, (b) cast at boundary: `return result as XxxResponse`. This
    pattern is acceptable because the OmniJS script and the response schema
    are co-authored, making the cast a documented contract rather than an
    unsafe assumption. Runtime validation via Zod `.parse()` on OmniJS output
    would add overhead without practical benefit since the script shape is
    controlled by the same codebase.

### Reusable Schemas

The following new shared schemas are defined in `contracts/window-tools/shared/`:
- `WindowItemIdentifierSchema` -- ID or name for 4-type lookup
- `WindowItemTypeSchema` -- `'task' | 'project' | 'folder' | 'tag'`
- `DisambiguationCandidateSchema` -- id, name, type for disambiguation results
- `WindowBatchItemResultSchema` -- per-item success/failure with codes
- `WindowBatchSummarySchema` -- total/succeeded/failed counts

### Batch Operation Pattern

Following established pattern from status-tools:
- Per-item results at original array indices
- Partial failures do not fail entire batch
- Disambiguation errors include `candidates` array
- Distinct error codes: NOT_FOUND, NODE_NOT_FOUND, DISAMBIGUATION_REQUIRED, INVALID_TYPE
- Idempotent no-op behavior for already-expanded/collapsed nodes

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Phase Completion Criteria

### Phase 0: Research -- COMPLETE
- [x] ContentTree API access pattern documented (R1)
- [x] 4-type item resolution pattern documented (R2)
- [x] Batch node resolution via nodesForObjects() documented (R3)
- [x] TreeNode expand/collapse method signatures documented (R4)
- [x] Focus/unfocus API asymmetry documented (R5)
- [x] tree.select() and tree.reveal() return behavior documented (R6)
- [x] Shared vs per-tool ItemIdentifier decision documented (R7)
- [x] UI side-effect warning pattern documented (R8)
- [x] All unknowns resolved -- 0 NEEDS CLARIFICATION remaining

### Phase 1: Design & Contracts -- COMPLETE
- [x] data-model.md with 5 entity definitions
- [x] contracts/ with Zod schemas (11 files: 3 shared + 8 tool contracts)
- [x] quickstart.md with OmniJS patterns for all 8 tools
- [x] Constitution re-check passed (see below)

**Post-Design Constitution Re-Check** (2026-03-18):
| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First | PASS | All 8 contracts use Zod schemas, discriminated unions |
| II. Separation | PASS | Contracts in specs/contracts/, OmniJS patterns in quickstart.md |
| III. Script Safety | PASS | Guard pattern documented, all scripts in IIFE + try-catch |
| IV. Data Contracts | PASS | Discriminated unions, per-item batch results with codes |
| V. Error Handling | PASS | 4 error codes, per-item results, no-window/version/platform guards |
| VI. Build Discipline | PASS | Standard pnpm build workflow |
| VII. KISS | PASS | Reuses batch patterns from status-tools, inline guards |
| VIII. YAGNI | PASS | Only 8 spec'd tools, no extras |
| IX. SOLID | PASS | Single responsibility per contract file, definition/primitive pairs |
| X. TDD | READY | Contract tests defined, ready for /speckit.tasks |

### Phase 2: Tasks -- COMPLETE
- [x] TDD task ordering per Constitution X
- [x] Contract tests defined
- [x] Unit tests defined
- [x] Implementation tasks defined
- [x] Integration tests defined
