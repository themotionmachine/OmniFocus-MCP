# Implementation Plan: Forecast Tools

**Branch**: `015-forecast` | **Date**: 2026-03-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-forecast/spec.md`

## Summary

Implement 3 read-only forecast tools for querying OmniFocus Forecast perspective data and navigating the Forecast view via MCP. The tools bridge the AI assistant with OmniFocus's Forecast perspective to support daily planning, weekly reviews, and visual navigation. All tools use the OmniJS `forecastDayForDate()` and `selectForecastDays()` APIs with mandatory Forecast perspective auto-switching. Scripts use the standard synchronous IIFE pattern (Timer.once is incompatible with the evaluateJavascript execution model).

## Technical Context

**Language/Version**: TypeScript 5.9+ with strict mode (ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.27.x, Zod 4.2.x, tsup 8.5+
**Storage**: N/A (OmniFocus internal database via OmniJS)
**Testing**: Vitest 4.0+ with TDD Red-Green-Refactor
**Target Platform**: macOS (OmniFocus desktop automation via OmniJS)
**Project Type**: Single project (MCP server)
**Performance Goals**: All forecast queries for ranges up to 30 days complete without noticeable delay (SC-004)
**Constraints**: Maximum 90-day range limit; Forecast perspective must be active (auto-switched synchronously); Timer.once(1) is NOT compatible with evaluateJavascript execution model (see research.md item 11)
**Scale/Scope**: 3 new tools, ~6 new source files, ~8 new test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gate Check

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First Development | PASS | Zod 4.2.x schemas for all inputs/outputs; ForecastDayKind and ForecastDayStatus as z.enum(); strict TypeScript |
| II. Separation of Concerns | PASS | definitions/ handle MCP protocol; primitives/ generate OmniJS; contracts/ define schemas; follows existing 50+ tool pattern |
| III. Script Execution Safety | PASS | All OmniJS scripts use IIFE + try-catch + JSON.stringify error pattern; Forecast perspective auto-switch before API calls |
| IV. Structured Data Contracts | PASS | All responses are discriminated unions with success/error; ISO 8601 dates; structured ForecastDayOutput schema |
| V. Defensive Error Handling | PASS | Validation errors for invalid dates, illogical ranges; OmniJS try-catch; perspective switch failure handling |
| VI. Build Discipline | PASS | No OmniJS pre-built scripts needed (scripts generated inline by primitives); standard pnpm build |
| VII. KISS | PASS | 3 simple tools, each single-purpose; no abstractions beyond shared Zod schemas |
| VIII. YAGNI | PASS | Only implements what spec requires; no filtering, no calendar integration, no preferences |
| IX. SOLID | PASS | Each tool is a separate definition/primitive pair; shared schemas for common types; no modification to existing tools |
| X. TDD | PASS | Contract tests first, then unit tests for primitives, then definitions; Red-Green-Refactor cycle |

**Gate Result**: ALL PASS -- proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/015-forecast/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── get-forecast-range.md
│   ├── get-forecast-day.md
│   └── select-forecast-days.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── contracts/forecast-tools/
│   ├── index.ts                    # Barrel exports
│   ├── get-forecast-range.ts       # Input/Output schemas for get_forecast_range
│   ├── get-forecast-day.ts         # Input/Output schemas for get_forecast_day
│   ├── select-forecast-days.ts     # Input/Output schemas for select_forecast_days
│   └── shared/
│       ├── index.ts                # Shared exports
│       └── forecast-enums.ts       # ForecastDayKind, ForecastDayStatus enums
│       └── forecast-day.ts         # ForecastDayOutput shared schema
├── tools/definitions/
│   ├── getForecastRange.ts         # MCP handler for get_forecast_range
│   ├── getForecastDay.ts           # MCP handler for get_forecast_day
│   └── selectForecastDays.ts       # MCP handler for select_forecast_days
└── tools/primitives/
    ├── getForecastRange.ts         # OmniJS script generator + executor
    ├── getForecastDay.ts           # OmniJS script generator + executor
    └── selectForecastDays.ts       # OmniJS script generator + executor

tests/
├── contract/forecast-tools/
│   ├── get-forecast-range.contract.test.ts
│   ├── get-forecast-day.contract.test.ts
│   ├── select-forecast-days.contract.test.ts
│   └── shared.contract.test.ts
└── unit/forecast-tools/
    ├── getForecastRange.test.ts
    ├── getForecastDay.test.ts
    └── selectForecastDays.test.ts
```

**Structure Decision**: Follows established definitions/primitives/contracts architecture matching review-tools, repetition-tools, and status-tools patterns. Shared enums in `shared/` directory with barrel exports via `index.ts`.

## Type Safety Design Decisions

### Date Validation Approach

**Decision**: Date input fields use plain `z.string().optional()` with ISO 8601 format documented via `.describe()` text only. No regex refinement, no `z.string().date()`, no custom Zod validator at the schema level.

**Rationale**: This follows the established codebase pattern used consistently across all domains (review-tools, repetition-tools, status-tools, task-tools, project-tools). Date format enforcement occurs at the primitive/OmniJS layer via `new Date(dateString)` inside try-catch. Invalid dates produce `{ success: false, error: e.message }` with appropriate error codes (INVALID_DATE). This approach keeps Zod schemas as structural contracts while delegating semantic validation to the execution layer.

**Sources**: `src/contracts/task-tools/set-planned-date.ts`, `src/contracts/review-tools/shared/review-project.ts`, `src/contracts/status-tools/mark-complete.ts` -- all use `z.string()` without format enforcement.

### Validation Layer

**Decision**: Date validation is a two-layer process:
1. **Zod schema layer** (structural): Validates that the field is a string (or absent if optional). No format enforcement.
2. **Primitive layer** (semantic): The primitive function validates date format, range limits (90-day max), and logical constraints (start <= end) BEFORE generating the OmniJS script. Invalid inputs return error responses with specific error codes (INVALID_DATE, INVALID_RANGE, RANGE_TOO_LARGE) without executing any OmniJS script.
3. **OmniJS layer** (runtime): The OmniJS script's try-catch wraps `new Date(dateString)` as a final safety net. Any errors at this level return PERSPECTIVE_SWITCH_FAILED or general error messages.

**Rationale**: Server-side validation in the primitive (layer 2) catches invalid dates before they reach OmniJS, providing faster feedback and specific error codes. This is consistent with how other tools handle validation -- Zod enforces structure, primitives enforce semantics.

### Type Export Convention

**Decision**: Every Zod schema constant (`XSchema`) MUST have a paired TypeScript type export using `z.infer`: `export type X = z.infer<typeof XSchema>`. This applies to input schemas, success schemas, error schemas, response schemas, enum schemas, and shared schemas.

**Rationale**: Universal codebase convention. All existing contract files follow this pattern (see `src/contracts/repetition-tools/shared/repetition-enums.ts`, `src/contracts/repetition-tools/get-repetition.ts`). Ensures TypeScript types are derived from Zod schemas (single source of truth) rather than manually duplicated.

### OmniJS Result Narrowing

**Decision**: Primitives narrow the `unknown` return type from `executeOmniJS()` using `result as XResponse` type assertions. No runtime Zod `.parse()` or `.safeParse()` is applied to OmniJS script results.

**Rationale**: This follows the established codebase pattern where all existing primitives use `as` assertions for OmniJS result narrowing (see `src/tools/primitives/setPlannedDate.ts`, `src/tools/primitives/getRepetition.ts`, `src/tools/primitives/markReviewed.ts`). While CLAUDE.md prohibits `as Type` assertions generally, the `executeOmniJS()` return type (`unknown`) is a specific case where the assertion is the established convention. The OmniJS scripts always return structured JSON via `JSON.stringify()` with a consistent success/error shape, making the assertion safe in practice. A null guard before the cast (as in `getRepetition.ts`) is recommended as a defensive measure.

**NOTE**: This is a known tension with the CLAUDE.md "NEVER use type assertions (`as Type`)" rule. The existing codebase universally uses this pattern for OmniJS results. A future improvement could add runtime Zod validation of OmniJS results, but this is out of scope for the forecast tools (YAGNI -- no other tool does it).

### Error Code Typing

**Decision**: Error `code` fields use `z.string().optional()` with known codes documented in the `.describe()` text. Not `z.enum()`.

**Rationale**: Follows the established codebase pattern (see `src/contracts/review-tools/shared/batch.ts`, `src/contracts/status-tools/shared/batch.ts`, `src/contracts/review-tools/get-projects-for-review.ts`). Using `z.string().optional()` rather than `z.enum()` allows OmniJS scripts to return error codes without being constrained to a compile-time enum, which is important because OmniJS errors may include unexpected codes from the OmniFocus runtime. The `.describe()` text documents the expected codes for AI assistant consumption.

### ForecastDayOutput Shared Schema Reuse

**Decision**: Both `get_forecast_range` and `get_forecast_day` reuse the exact same `ForecastDayOutputSchema` from `shared/forecast-day.ts`. The `get_forecast_day` tool does NOT define extended detail fields beyond what `ForecastDayOutput` provides.

**Rationale**: The OmniJS `forecastDayForDate(date)` API returns identical `ForecastDay` objects regardless of whether the call is made once (single-day query) or in a loop (range query). The complete set of properties is: `date`, `name`, `kind`, `badgeCount`, `deferredCount`, and `badgeKind()` (function). There are no additional properties available for single-day queries -- the API surface is the same. User Story 2's phrase "detailed forecast data" refers to the full ForecastDayOutput shape (all 6 fields) as opposed to a hypothetical summary -- it does not imply fields beyond what the OmniJS API provides. The difference between the two tools is scope (range vs. single day), not detail level.

**Sources**: Clarifications Session 1 item 3 (complete ForecastDay properties), research.md item 4 (ForecastDay Property Extraction), omni-automation.com/omnifocus/forecast.html (ForecastDay class reference).

### Discriminated Union Pattern

**Decision**: All 3 forecast tool response schemas use `z.discriminatedUnion('success', [SuccessSchema, ErrorSchema])` with the `success` boolean as the discriminator.

**Rationale**: Follows the established pattern from review-tools, repetition-tools (for tools with simple success/error variants), and status-tools. All 3 forecast tools have exactly 2 response variants (success: true, success: false), making `z.discriminatedUnion` the correct choice over `z.union`. The `z.union` pattern is reserved for tools with multiple success variants sharing the same discriminator value (e.g., `get_repetition` with hasRule/noRule).

## Complexity Tracking

> No constitution violations. All tools follow established patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Synchronous perspective switch before Forecast API calls | Forecast API throws without active perspective; Timer.once is incompatible with evaluateJavascript | Timer.once returns are discarded in JXA evaluateJavascript; must try synchronous switch + immediate API call, catch PERSPECTIVE_SWITCH_FAILED |

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Post-Design Evidence |
|-----------|--------|---------------------|
| I. Type-First Development | PASS | Zod schemas defined for all 3 tools (input + success + error + discriminated union); ForecastDayKind (5 values) and ForecastDayStatus (4 values) as z.enum(); ForecastDayOutput shared schema with typed fields |
| II. Separation of Concerns | PASS | 3 contracts in `src/contracts/forecast-tools/`, 3 definitions, 3 primitives; shared schemas in `shared/` subdirectory; no modification to existing tools |
| III. Script Execution Safety | PASS | All 3 OmniJS scripts use synchronous IIFE + try-catch + JSON.stringify; perspective auto-switch via `Perspective.BuiltIn.Forecast` (synchronous, no Timer.once -- see research.md item 11); window existence check before API calls |
| IV. Structured Data Contracts | PASS | All responses use `z.discriminatedUnion('success', [...])` matching review-tools/repetition-tools pattern; ISO 8601 dates; error codes for distinct failure modes |
| V. Defensive Error Handling | PASS | Error codes: INVALID_DATE, INVALID_RANGE, RANGE_TOO_LARGE, NO_WINDOW, PERSPECTIVE_SWITCH_FAILED, EMPTY_DATES; single try-catch wrapping perspective switch + API calls (no Timer.once callback) |
| VI. Build Discipline | PASS | No pre-built OmniJS scripts (all generated inline by primitives); standard `pnpm build` sufficient |
| VII. KISS | PASS | Each tool is single-purpose; shared enum/output schemas avoid duplication without over-abstraction; no complex orchestration between tools |
| VIII. YAGNI | PASS | No task-level filtering, no calendar integration, no preferences, no historical snapshots; only what spec requires |
| IX. SOLID | PASS | S: each file has single responsibility; O: new tool pairs added without modifying existing; I: minimal input schemas; D: primitives depend on executeOmniJS abstraction |
| X. TDD | PASS | Test plan: 4 contract test files + 3 unit test files; contract tests validate schema shapes; unit tests validate OmniJS script generation + execution flow |

**Post-Design Gate Result**: ALL PASS -- design is constitution-compliant. Proceed to Phase 2 (tasks).
