# Implementation Plan: TaskPaper Import/Export

**Branch**: `012-taskpaper` | **Date**: 2026-03-20 | **Spec**: `specs/012-taskpaper/spec.md`
**Input**: Feature specification from `/specs/012-taskpaper/spec.md`

## Summary

Add 3 MCP tools for OmniFocus TaskPaper transport text handling: `import_taskpaper` (OmniJS-based bulk task creation via `byParsingTransportText`), `export_taskpaper` (OmniJS custom serializer for scoped task/project/folder export), and `validate_transport_text` (pure TypeScript parser for dry-run validation without OmniFocus side effects). Follows the existing definitions/primitives/contracts architecture mirroring the search-tools and database-tools patterns.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode, ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.27.x, Zod 4.2.x, tsup 8.5+, Biome 2.4+
**Storage**: OmniFocus internal database via OmniJS (no external DB)
**Testing**: Vitest 4.0+
**Target Platform**: macOS (OmniFocus automation via OmniJS + JXA)
**Project Type**: MCP server (tool domain extension)
**Performance Goals**: Import 50+ nested tasks in under 5 seconds (SC-001)
**Constraints**: executeOmniJS is synchronous; cannot use async OmniJS APIs
**Scale/Scope**: 3 tools, ~8 contract files, 3 definitions, 3 primitives, ~6 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Type-First Development | PASS | All inputs validated via Zod schemas; explicit types throughout |
| II | Separation of Concerns | PASS | Definitions handle MCP interface; primitives handle business logic + OmniJS generation |
| III | Script Execution Safety | PASS | OmniJS scripts wrapped in IIFE + try-catch + JSON.stringify; validate_transport_text is pure TS (no scripts) |
| IV | Structured Data Contracts | PASS | All boundaries use JSON; dates in ISO 8601; per-item results for import |
| V | Defensive Error Handling | PASS | Empty text rejected; empty byParsingTransportText result handled; item-not-found errors returned |
| VI | Build Discipline | PASS | Standard pnpm build; no new OmniJS script files to copy (scripts generated inline by primitives) |
| VII | KISS | PASS | 3 tools, each single-purpose; export omits @autodone/@parallel/@repeat-* for simplicity |
| VIII | YAGNI | PASS | No dry-run import (API does not support it); no @autodone/@parallel export; no undo support |
| IX | SOLID | PASS | One definition per tool; shared schemas in contracts/shared/; primitives depend on executeOmniFocusScript abstraction |
| X | TDD | PASS | Contract tests first, unit tests for primitives, then implementation |

**Gate result**: PASS (0 violations)

## Post-Design Constitution Re-Check

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Type-First Development | PASS | ParsedItem uses recursive z.lazy() for tree structure; all schemas fully typed |
| II | Separation of Concerns | PASS | validate_transport_text primitive is pure TS; import/export primitives generate OmniJS |
| III | Script Execution Safety | PASS | Import/export OmniJS scripts follow IIFE + try-catch pattern |
| IV | Structured Data Contracts | PASS | Shared schemas: ParsedItem, CreatedItem, ExportSummary, ValidationWarning |
| V | Defensive Error Handling | PASS | Export scope mutual exclusion via Zod .refine(); import empty-result detection |
| VI | Build Discipline | PASS | No new build steps required |
| VII | KISS | PASS | Minimal token set; no structural parameters in export |
| VIII | YAGNI | PASS | No features beyond spec requirements |
| IX | SOLID | PASS | Clean separation across 8 shared schema files + 3 tool contracts |
| X | TDD | PASS | Test-first ordering specified in quickstart |

**Post-design gate result**: PASS (0 violations)

## Project Structure

### Documentation (this feature)

```text
specs/012-taskpaper/
├── plan.md              # This file
├── research.md          # Phase 0 output (8 research decisions)
├── data-model.md        # Phase 1 output (6 entities)
├── quickstart.md        # Phase 1 output (build/test/format reference)
├── contracts/           # Phase 1 output (Zod schema contracts)
│   ├── index.ts
│   ├── import-taskpaper.ts
│   ├── export-taskpaper.ts
│   ├── validate-transport-text.ts
│   └── shared/
│       ├── index.ts
│       ├── import-types.ts
│       ├── export-types.ts
│       └── validation-types.ts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── contracts/
│   └── taskpaper-tools/        # NEW: Zod schemas for 3 tools
│       ├── index.ts
│       ├── import-taskpaper.ts
│       ├── export-taskpaper.ts
│       ├── validate-transport-text.ts
│       └── shared/
│           ├── index.ts
│           ├── import-types.ts
│           ├── export-types.ts
│           └── validation-types.ts
├── tools/
│   ├── definitions/
│   │   ├── importTaskpaper.ts   # NEW: MCP handler
│   │   ├── exportTaskpaper.ts   # NEW: MCP handler
│   │   └── validateTransportText.ts  # NEW: MCP handler
│   └── primitives/
│       ├── importTaskpaper.ts   # NEW: OmniJS script gen + execution
│       ├── exportTaskpaper.ts   # NEW: OmniJS script gen + execution
│       └── validateTransportText.ts  # NEW: Pure TypeScript parser
└── server.ts                    # MODIFIED: Register 3 new tools

tests/
├── contract/
│   └── taskpaper-tools/         # NEW: Schema validation tests
│       ├── import-taskpaper.test.ts
│       ├── export-taskpaper.test.ts
│       └── validate-transport-text.test.ts
└── unit/
    └── taskpaper-tools/         # NEW: Primitive logic tests
        ├── importTaskpaper.test.ts
        ├── exportTaskpaper.test.ts
        └── validateTransportText.test.ts
```

**Structure Decision**: Follows the established single-project pattern with contracts/definitions/primitives separation. Mirrors search-tools (closest in complexity: multiple tools with shared schemas and mixed OmniJS/non-OmniJS primitives).

## Schema Design Decisions

### Zod 4.x Patterns

All response schemas use `z.discriminatedUnion('success', [SuccessSchema, ErrorSchema])` -- the standard codebase pattern. Each tool has exactly one success variant, so `z.discriminatedUnion()` is correct (unlike `get_repetition` which requires `z.union()` for multiple success variants).

ParsedItem uses `z.lazy()` with an explicit `z.ZodType<ParsedItem>` type annotation for the recursive `children` field. This is required for correct Zod 4.x type inference with recursive schemas (per https://zod.dev/v4/changelog and GitHub issue #4783).

### Null Convention

Output schemas: `.nullable()` for all "can be unset" fields (dueDate, deferDate, doneDate, estimate, note). Follows `TaskFullSchema` pattern.
Input schemas: `.optional()` for omittable fields (targetProjectId), `.nullable().optional()` NOT used (no patch/clear semantics in this domain).

### Shared Token Mapping

The TaskPaper token-to-OmniJS-property mapping is shared between the validator primitive and the export OmniJS script generator. It is defined as TypeScript types and constants (not Zod runtime schemas) to avoid duplication. Location: within the primitives layer, co-located with the parser/serializer logic.

### Export Warnings

The export response includes a `warnings: ValidationWarning[]` field (reusing the same schema from validation) for non-fatal issues like empty task names. The array is empty when no issues are encountered.

## Complexity Tracking

No violations to justify. All 10 constitution gates pass.
