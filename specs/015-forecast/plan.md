# Implementation Plan: Forecast Tools

**Branch**: `015-forecast` | **Date**: 2026-03-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-forecast/spec.md`

## Summary

Implement 3 read-only forecast tools for querying OmniFocus Forecast perspective data and navigating the Forecast view via MCP. The tools bridge the AI assistant with OmniFocus's Forecast perspective to support daily planning, weekly reviews, and visual navigation. All tools use the OmniJS `forecastDayForDate()` and `selectForecastDays()` APIs with mandatory Forecast perspective auto-switching via `Timer.once(1)` delay pattern.

## Technical Context

**Language/Version**: TypeScript 5.9+ with strict mode (ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.27.x, Zod 4.2.x, tsup 8.5+
**Storage**: N/A (OmniFocus internal database via OmniJS)
**Testing**: Vitest 4.0+ with TDD Red-Green-Refactor
**Target Platform**: macOS (OmniFocus desktop automation via OmniJS)
**Project Type**: Single project (MCP server)
**Performance Goals**: All forecast queries for ranges up to 30 days complete without noticeable delay (SC-004)
**Constraints**: Maximum 90-day range limit; Forecast perspective must be active (auto-switched); Timer.once(1) delay required for all OmniJS forecast scripts
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
├── contracts/forecast-tools/
│   ├── get-forecast-range.contract.test.ts
│   ├── get-forecast-day.contract.test.ts
│   ├── select-forecast-days.contract.test.ts
│   └── shared.contract.test.ts
└── unit/tools/primitives/
    ├── getForecastRange.test.ts
    ├── getForecastDay.test.ts
    └── selectForecastDays.test.ts
```

**Structure Decision**: Follows established definitions/primitives/contracts architecture matching review-tools, repetition-tools, and status-tools patterns. Shared enums in `shared/` directory with barrel exports via `index.ts`.

## Complexity Tracking

> No constitution violations. All tools follow established patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Timer.once(1) async pattern in OmniJS | Forecast API throws without active perspective | No synchronous alternative; OmniJS requires delay for perspective switch |

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Post-Design Evidence |
|-----------|--------|---------------------|
| I. Type-First Development | PASS | Zod schemas defined for all 3 tools (input + success + error + discriminated union); ForecastDayKind (5 values) and ForecastDayStatus (4 values) as z.enum(); ForecastDayOutput shared schema with typed fields |
| II. Separation of Concerns | PASS | 3 contracts in `src/contracts/forecast-tools/`, 3 definitions, 3 primitives; shared schemas in `shared/` subdirectory; no modification to existing tools |
| III. Script Execution Safety | PASS | All 3 OmniJS scripts use IIFE + try-catch + JSON.stringify; perspective auto-switch via `Perspective.BuiltIn.Forecast` + `Timer.once(1)`; window existence check before API calls |
| IV. Structured Data Contracts | PASS | All responses use `z.discriminatedUnion('success', [...])` matching review-tools/repetition-tools pattern; ISO 8601 dates; error codes for distinct failure modes |
| V. Defensive Error Handling | PASS | Error codes: INVALID_DATE, INVALID_RANGE, RANGE_TOO_LARGE, NO_WINDOW, PERSPECTIVE_SWITCH_FAILED, EMPTY_DATES; inner try-catch inside Timer.once callback |
| VI. Build Discipline | PASS | No pre-built OmniJS scripts (all generated inline by primitives); standard `pnpm build` sufficient |
| VII. KISS | PASS | Each tool is single-purpose; shared enum/output schemas avoid duplication without over-abstraction; no complex orchestration between tools |
| VIII. YAGNI | PASS | No task-level filtering, no calendar integration, no preferences, no historical snapshots; only what spec requires |
| IX. SOLID | PASS | S: each file has single responsibility; O: new tool pairs added without modifying existing; I: minimal input schemas; D: primitives depend on executeOmniJS abstraction |
| X. TDD | PASS | Test plan: 4 contract test files + 3 unit test files; contract tests validate schema shapes; unit tests validate OmniJS script generation + execution flow |

**Post-Design Gate Result**: ALL PASS -- design is constitution-compliant. Proceed to Phase 2 (tasks).
