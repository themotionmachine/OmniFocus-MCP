# Implementation Plan: SPEC-008 Perspectives

**Branch**: `008-perspectives` | **Date**: 2026-03-18 | **Spec**: [specs/008-perspectives/spec.md](spec.md)
**Input**: Feature specification from `specs/008-perspectives/spec.md`

## Summary

Replace two legacy perspective tools (`list_perspectives`, `get_perspective_view`) and add
four new tools (`get_perspective`, `switch_perspective`, `export_perspective`,
`set_perspective_icon`) for full perspective management through the MCP server. Uses clean-break
migration: delete legacy files, no backward compatibility. All tools follow the modern
definitions/primitives/contracts architecture with Zod schemas, version-gated OmniJS APIs, and
TDD implementation.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode, ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.27.x, Zod 4.x, tsup 8.5+
**Storage**: N/A (OmniFocus internal database via OmniJS)
**Testing**: Vitest 4.0+ (contract + unit tests, TDD Red-Green-Refactor)
**Target Platform**: macOS (Node.js 24+, OmniFocus 4.x via OmniJS)
**Project Type**: Single project (MCP server)
**Performance Goals**: <500ms for list_perspectives with up to 50 custom perspectives; <1s for switch_perspective
**Constraints**: OmniJS execution via `executeOmniFocusScript()`; version-gated APIs (v4.2+ for filter rules, v4.5.2+ for iconColor)
**Scale/Scope**: 5 tools, ~10 source files (5 definitions, 5 primitives), ~8 contract files, ~10 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type-First Development | PASS | All inputs validated via Zod schemas; contract types for all tool responses |
| II. Separation of Concerns | PASS | Definitions in `definitions/`, primitives in `primitives/`, contracts in `contracts/perspective-tools/` |
| III. Script Execution Safety | PASS | All OmniJS scripts wrapped in try-catch returning JSON; version checks before API access |
| IV. Structured Data Contracts | PASS | Zod schemas for all inputs/outputs; discriminated unions for responses; ISO 8601 dates where applicable |
| V. Defensive Error Handling | PASS | NOT_FOUND, DISAMBIGUATION_REQUIRED, NO_WINDOW, VERSION_NOT_SUPPORTED error codes; no silent failures |
| VI. Build Discipline | PASS | No OmniJS script files to copy (scripts generated inline by primitives); standard `pnpm build` |
| VII. KISS | PASS | Each tool does one thing; filter rules serialized as-is (no parsing); simple hex-to-RGB conversion |
| VIII. YAGNI | PASS | No perspective creation/editing/deletion (explicitly out of scope); no filter rule parsing |
| IX. SOLID | PASS | New definition/primitive pairs follow Open-Closed; shared schemas follow Interface Segregation |
| X. TDD | PASS | Contract tests first, unit tests second, implementation third per Red-Green-Refactor |

**Post-Phase 1 Re-check**: All principles remain satisfied. The contract schemas use `z.unknown()` for opaque filter rules (avoiding unnecessary type parsing per KISS/YAGNI). Version gating follows established patterns from SPEC-007 and SPEC-013.

## Project Structure

### Documentation (this feature)

```text
specs/008-perspectives/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (design-time contracts)
│   ├── index.ts
│   ├── list-perspectives.ts
│   ├── get-perspective.ts
│   ├── switch-perspective.ts
│   ├── export-perspective.ts
│   ├── set-perspective-icon.ts
│   └── shared/
│       ├── index.ts
│       ├── perspective-identifier.ts
│       └── perspective-summary.ts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── contracts/perspective-tools/    # Runtime contracts (copied from specs)
│   ├── index.ts
│   ├── list-perspectives.ts
│   ├── get-perspective.ts
│   ├── switch-perspective.ts
│   ├── export-perspective.ts
│   ├── set-perspective-icon.ts
│   └── shared/
│       ├── index.ts
│       ├── perspective-identifier.ts
│       └── perspective-summary.ts
├── tools/
│   ├── definitions/
│   │   ├── listPerspectives.ts     # New (replaces legacy)
│   │   ├── getPerspective.ts       # New (replaces legacy getPerspectiveView)
│   │   ├── switchPerspective.ts    # New
│   │   ├── exportPerspective.ts    # New
│   │   └── setPerspectiveIcon.ts   # New
│   └── primitives/
│       ├── listPerspectives.ts     # New (replaces legacy)
│       ├── getPerspective.ts       # New (replaces legacy getPerspectiveView)
│       ├── switchPerspective.ts    # New
│       ├── exportPerspective.ts    # New
│       └── setPerspectiveIcon.ts   # New
└── server.ts                       # Updated registrations

tests/
├── contract/perspective-tools/     # Contract schema tests
│   ├── list-perspectives.contract.test.ts
│   ├── get-perspective.contract.test.ts
│   ├── switch-perspective.contract.test.ts
│   ├── export-perspective.contract.test.ts
│   ├── set-perspective-icon.contract.test.ts
│   └── shared.contract.test.ts
└── unit/perspective-tools/         # Primitive unit tests
    ├── listPerspectives.test.ts
    ├── getPerspective.test.ts
    ├── switchPerspective.test.ts
    ├── exportPerspective.test.ts
    └── setPerspectiveIcon.test.ts
```

### Files to Delete (Legacy Cleanup)

```text
src/tools/definitions/listPerspectives.ts    # Legacy definition (replaced)
src/tools/definitions/getPerspectiveView.ts  # Legacy definition (retired)
src/tools/primitives/listPerspectives.ts     # Legacy primitive (replaced)
src/tools/primitives/getPerspectiveView.ts   # Legacy primitive (retired)
src/types.ts                                 # Remove OmnifocusPerspective interface only
```

**Structure Decision**: Single project, following the existing MCP server architecture with
definitions/primitives/contracts separation. Mirrors the patterns established by
notification-tools (SPEC-006) and review-tools (SPEC-005).

## Architecture Decisions

### AD-001: Clean-Break Migration

Legacy tools have no tests, no contracts, and no external consumers. Delete legacy files,
replace registrations in-place, and create new implementations following modern architecture.

**Migration order**: (1) Create new contract, definition, and primitive files first,
(2) delete legacy files, (3) update server.ts registrations. This ensures the build
never references deleted files.

### AD-002: Shared PerspectiveIdentifier Schema

All 5 tools (except `list_perspectives`) share the same lookup pattern: accept `name` or
`identifier`, identifier takes precedence. A shared `PerspectiveIdentifierSchema` with
`.refine()` validation mirrors `TaskIdentifierSchema` from notification-tools.

### AD-003: Version-Gated Filter Rules

`archivedFilterRules` and `archivedTopLevelFilterAggregation` require OmniFocus v4.2+.
Check `app.userVersion.atLeast(new Version('4.2'))` in OmniJS scripts and return `null`
for these fields on older versions (graceful degradation, not error).

### AD-004: Version-Gated Icon Color

`iconColor` requires OmniFocus v4.5.2+. Check `app.userVersion.atLeast(new Version('4.5.2'))`
in OmniJS scripts and return an error with `VERSION_NOT_SUPPORTED` code on older versions
(hard error, not degradation -- the feature simply does not exist).

### AD-005: Hex-to-RGB Conversion Location

CSS hex parsing and validation happens in the TypeScript contract (Zod regex). The
conversion to `Color.RGB(r, g, b, a)` float values happens in the OmniJS script generation
(primitive). This keeps the contract clean and the OmniJS script simple (receives pre-computed
float values).

### AD-006: Export Strategy

`export_perspective` uses `fileWrapper()` to get the exportable configuration. When `saveTo`
is provided, `writeFileRepresentationIntoDirectory()` writes the `.ofocus-perspective` file.
When omitted, return metadata (filename, type) since binary content is not practical over MCP.

### AD-007: Built-in Perspective Lookup

Built-in perspectives use name matching against a hardcoded well-known list. Case-insensitive
comparison for usability. No identifier-based lookup for built-in perspectives (they use
`Perspective.BuiltIn.*` enum, not `byIdentifier()`).

## Complexity Tracking

No violations requiring justification. All architecture decisions follow established patterns.
