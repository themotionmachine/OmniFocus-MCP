# SpecKit Workflow: SPEC-015 — Forecast

**Created**: 2026-03-18
**Purpose**: Track SPEC-015 through all 7 SpecKit phases with review gates.

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ⏳ Pending | |
| Clarify | `/speckit.clarify` | ⏳ Pending | |
| Plan | `/speckit.plan` | ⏳ Pending | |
| Checklist | `/speckit.checklist` | ⏳ Pending | Run for each domain |
| Tasks | `/speckit.tasks` | ⏳ Pending | |
| Analyze | `/speckit.analyze` | ⏳ Pending | |
| Implement | `/speckit.implement` | ⏳ Pending | |

**Status Legend:** ⏳ Pending | 🔄 In Progress | ✅ Complete | ⚠️ Blocked

### Phase Gates

| Gate | Checkpoint | Approval Criteria |
|------|------------|-------------------|
| G1 | After Specify | All user stories clear, no `[NEEDS CLARIFICATION]` markers |
| G2 | After Clarify | Ambiguities resolved, decisions documented |
| G3 | After Plan | Architecture approved, constitution gates pass |
| G4 | After Checklist | All `[Gap]` markers addressed |
| G5 | After Tasks | Task coverage verified, dependencies ordered |
| G6 | After Analyze | No `CRITICAL` issues |
| G7 | After Implement | Tests pass, manual verification complete |

---

## Prerequisites

### Constitution Validation

**Before starting any workflow phase**, verify alignment with the project constitution (`.specify/memory/constitution.md` v2.0.0):

| Principle | Requirement | Verification | Status |
|-----------|-------------|--------------|--------|
| I. Type-First Development | All functions typed, Zod contracts | `pnpm typecheck` | ⏳ |
| II. Separation of Concerns | definitions/ + primitives/ split | Code review | ⏳ |
| III. Script Execution Safety | OmniJS-only, try-catch + JSON | Script Editor test | ⏳ |
| IV. Structured Data Contracts | Zod schemas for all inputs | Contract tests | ⏳ |
| V. Defensive Error Handling | Structured errors, no swallowed exceptions | Unit tests | ⏳ |
| VI. Build Discipline | `pnpm build` after changes | `pnpm build` | ⏳ |
| VII. KISS | Simple, boring solutions | Code review | ⏳ |
| VIII. YAGNI | No premature abstractions | Code review | ⏳ |
| IX. SOLID | Single responsibility | Code review | ⏳ |
| X. TDD | Red-Green-Refactor cycle | Test-first workflow | ⏳ |

**Constitution Check:** ⏳ Pending

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-015 |
| **Name** | Forecast |
| **Branch** | `015-forecast` |
| **Dependencies** | None (Phases 0-5 complete) |
| **Enables** | None directly (SPEC-020 requires all specs complete) |
| **Priority** | P3 |
| **Tier** | 4 (parallel with SPEC-016-017, SPEC-018-019) |

### Success Criteria Summary

- [ ] 3 MCP tools implemented: `get_forecast`, `get_forecast_day`, `select_forecast_days`
- [ ] Zod contracts in `src/contracts/forecast-tools/` for all 3 tools
- [ ] `get_forecast` takes a date range and returns `ForecastDay[]` with date, name, kind, badgeCount, deferredCount
- [ ] `get_forecast_day` returns detailed `ForecastDay` properties for a single date
- [ ] `select_forecast_days` calls `window.selectForecastDays(dates)` (UI side-effect warning)
- [ ] Date parameters use ISO 8601 format
- [ ] `get_forecast` supports configurable range (default: today + 7 days)
- [ ] Full TDD with contract + unit tests
- [ ] OmniJS Script Editor verification (manual step)

---

## Phase 1: Specify

**Output:** `specs/015-forecast/spec.md`

### Specify Prompt

```bash
/speckit.specify

## Feature: Forecast

### Problem Statement
OmniFocus users need programmatic access to forecast data through the MCP server —
getting an overview of upcoming due items across date ranges, getting detailed
information for a specific forecast day, and navigating to specific days in the
Forecast perspective. Currently there is no way to query forecast data or control
Forecast perspective navigation via AI assistants. These capabilities enable daily
review workflows ("what's due today?", "show me this week's forecast") and GTD
horizon planning.

### Users
GTD practitioners using AI assistants to review upcoming work, plan their day,
and navigate the OmniFocus Forecast perspective.

### User Stories
1. As a GTD practitioner, I want to get a forecast overview for a date range so I can see what's due and deferred across the next week (or any custom range)
2. As a GTD practitioner, I want to get detailed forecast data for a specific day so I can understand exactly what's due, deferred, and the day's badge status
3. As a GTD practitioner, I want to navigate the Forecast perspective to specific days so the AI can show me exactly the dates I'm discussing

### Technical Context from Master Plan
- 3 MCP tools: `get_forecast`, `get_forecast_day`, `select_forecast_days`
- Zod contracts in `src/contracts/forecast-tools/`
- `get_forecast` takes a date range and returns `ForecastDay[]` — each with date, name, kind (Day/Today/Past/FutureMonth/DistantFuture), badgeCount, deferredCount
- **Note:** `badgeKind()` is a **function call** (not a property) returning `ForecastDay.Status` (Available/DueSoon/NoneAvailable/Overdue)
- `get_forecast_day` returns detailed `ForecastDay` properties for a single date
- `select_forecast_days` calls `window.selectForecastDays(dates)` — navigates the Forecast perspective to show specific days (UI side-effect warning required)
- Date parameters use ISO 8601 format
- `get_forecast` supports configurable range (default: today + 7 days)
- Requires Forecast perspective to be accessible (works in any perspective but data reflects global forecast)
- ForecastDay.Kind enum: Day, Today, Past, FutureMonth, DistantFuture
- ForecastDay.Status enum (from badgeKind()): Available, DueSoon, NoneAvailable, Overdue

### Constraints
- All operations must use OmniJS execution via `executeOmniFocusScript()`
- Follow existing definitions/primitives/contracts architecture (50+ tools established)
- Contracts go in `src/contracts/forecast-tools/`
- Definitions in `src/tools/definitions/`, primitives in `src/tools/primitives/`
- All OmniJS scripts must use the IIFE + try-catch + JSON.stringify pattern
- `select_forecast_days` changes the user's visible UI state — tool description must clearly warn AI assistants
- `badgeKind()` is a function call, not a property — must use parentheses in OmniJS
- Date parameters use ISO 8601 format; OmniFocus interprets local time
- Use Zod 4.x for all input validation, no `as Type` assertions

### Key OmniJS APIs
- `ForecastDay` — represents a single day in the forecast
- `ForecastDay.Kind` enum: Day, Today, Past, FutureMonth, DistantFuture
- `ForecastDay.Status` enum (via badgeKind()): Available, DueSoon, NoneAvailable, Overdue
- `forecastDay.badgeKind()` — function call returning ForecastDay.Status
- `forecastDay.badgeCount` — number of badge items (due tasks)
- `forecastDay.deferredCount` — number of deferred items becoming available
- `forecastDay.date` — the Date for this forecast day
- `forecastDay.name` — display name (e.g., "Monday", "Today")
- `forecastDay.kind` — ForecastDay.Kind enum value
- `window.selectForecastDays(dates)` — navigates Forecast perspective to specific days
- Forecast iteration: likely via date range construction and ForecastDay lookup

### Out of Scope
- Modifying forecast data (forecast is derived from task dates — modify via task tools)
- Calendar event integration (OmniJS does not expose calendar data)
- Forecast preferences/settings (defer to SPEC-016-017 Settings tools)
```

### Specify Results

| Metric | Value |
|--------|-------|
| Functional Requirements | |
| User Stories | |
| Acceptance Criteria | |

### Files Generated

- [ ] `specs/015-forecast/spec.md`
- [ ] `specs/015-forecast/checklists/requirements.md`

---

## Phase 2: Clarify

**When to run:** After Specify — OmniJS ForecastDay API behavior needs verification.

### Clarify Prompts

#### Session 1: ForecastDay API Behavior

```bash
/speckit.clarify Focus on OmniJS ForecastDay API:
- How do you iterate forecast days for a date range? Is there a `ForecastDay.forDate(date)` method, or do you iterate a collection?
- What is the full set of properties available on a ForecastDay object? (date, name, kind, badgeCount, deferredCount — anything else?)
- Does `badgeKind()` always return a value, or can it return null/undefined for days with no items?
- What is the return type of `forecastDay.date` — a JavaScript Date object or a DateComponents?
- How does `get_forecast` access forecast days — is there a `document.forecast` collection, or do you construct dates and query individually?
```

#### Session 2: Forecast Navigation & Edge Cases

```bash
/speckit.clarify Focus on forecast navigation and edge cases:
- Does `window.selectForecastDays(dates)` require the Forecast perspective to be active, or does it switch to it automatically?
- What happens when calling `selectForecastDays` with dates that have no items — does it still navigate, or throw?
- What is the behavior for past dates vs future dates in the forecast — can you query forecast data for dates in the past?
- Does `ForecastDay.Kind` include all possible kinds, or are there undocumented values? Is `DistantFuture` reliable?
- Can `get_forecast` return forecast data when NOT in the Forecast perspective, or must the perspective be active?
```

### Clarify Results

| Session | Focus Area | Questions | Key Outcomes |
|---------|------------|-----------|--------------|
| 1 | ForecastDay API | 5 | |
| 2 | Navigation & Edge Cases | 5 | |

---

## Phase 3: Plan

**Output:** `specs/015-forecast/plan.md`

### Plan Prompt

```bash
/speckit.plan

## Tech Stack
- Runtime: Node.js 24+ with TypeScript 5.9+ strict mode (ES2024 target)
- Build: tsup 8.5+ (ESM + CJS dual output)
- Testing: Vitest 4.0+ with TDD Red→Green→Refactor
- Validation: Zod 4.2.x for all contracts
- MCP SDK: @modelcontextprotocol/sdk 1.27.x
- Lint: Biome 2.4+
- OmniJS: Pure Omni Automation JavaScript executed via `executeOmniFocusScript()`

## Constraints
- Follow existing definitions/primitives/contracts architecture (50+ tools established)
- Contracts go in `src/contracts/forecast-tools/`
- Definitions in `src/tools/definitions/`, primitives in `src/tools/primitives/`
- All OmniJS scripts use the IIFE + try-catch + JSON.stringify pattern
- `select_forecast_days` has UI side effects — document clearly
- `badgeKind()` is a function call (parentheses required)
- Date handling: ISO 8601 input, local time interpretation
- Use logger utility for all diagnostics (never console.error)

## Architecture Notes
- Small spec: only 3 tools, all read-only except select_forecast_days (UI navigation)
- Mirror existing tool patterns (find get_projects_for_review or list_tasks for read patterns)
- `select_forecast_days` follows the switch_perspective UI-affecting pattern from SPEC-008
- ForecastDay.Kind and ForecastDay.Status are OmniJS enums — parse with enumName() helper if needed (see SPEC-007 pattern)
- Consider shared schemas for ForecastDayOutput, ForecastKind enum, ForecastStatus enum
- Date range parameter: startDate (default: today) + days (default: 7) OR startDate + endDate
- All 3 tools are independent — no cross-tool dependencies
```

### Plan Results

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ⏳ | |
| `research.md` | ⏳ | |
| `data-model.md` | ⏳ | |
| `contracts/` | ⏳ | |
| `quickstart.md` | ⏳ | |

---

## Phase 4: Domain Checklists

### Recommended Domains

| Signal in Spec/Plan | Recommended Domain | Justification |
|---|---|---|
| OmniJS ForecastDay API, badgeKind() function call, enum parsing | **api-workaround** | ForecastDay API undocumented behavior, enum handling |
| 3 tool contracts, Zod schemas, date validation | **type-safety** | Date input validation, ForecastDay output schemas |
| 3 tools, UI side effect in select_forecast_days | **api-contracts** | Consistent response shapes, UI warning metadata |

#### 1. api-workaround Checklist

Why: ForecastDay API has several undocumented behaviors — iteration pattern, badgeKind() as function call, enum parsing.

```bash
/speckit.checklist api-workaround

Focus on Forecast requirements:
- ForecastDay iteration pattern — how to query days for a date range
- `badgeKind()` is a function call (not property) — verify calling convention
- `ForecastDay.Kind` and `ForecastDay.Status` enum parsing (String() vs enumName())
- `forecastDay.date` return type — Date object or DateComponents?
- `window.selectForecastDays(dates)` — parameter type (Date array?), perspective switching behavior
- Pay special attention to: how to construct a date range and iterate ForecastDay objects
```

#### 2. type-safety Checklist

Why: Date validation and ForecastDay output schemas need careful design.

```bash
/speckit.checklist type-safety

Focus on Forecast requirements:
- Zod 4.x schemas for all 3 tool inputs and outputs
- No `as Type` assertions anywhere
- Date input validation (ISO 8601 format, reasonable range limits)
- ForecastDay output schema with kind enum and status enum
- `get_forecast` response: array of ForecastDay with pagination/limit?
- Pay special attention to: date parameter design (startDate + days vs startDate + endDate)
```

#### 3. api-contracts Checklist

Why: Consistent response shapes across 3 tools, UI warning for select_forecast_days.

```bash
/speckit.checklist api-contracts

Focus on Forecast requirements:
- Consistent success/failure discriminated union for all 3 tools
- ForecastDayOutput shared schema reused across get_forecast and get_forecast_day
- `select_forecast_days` response includes UI side-effect acknowledgment
- Error codes: INVALID_DATE_RANGE, NO_WINDOW (for select), PERSPECTIVE_NOT_AVAILABLE
- Pay special attention to: whether get_forecast_day should reuse the same ForecastDayOutput or have extended detail fields
```

### Checklist Results

| Checklist | Items | Gaps | Spec References |
|-----------|-------|------|-----------------|
| api-workaround | | | |
| type-safety | | | |
| api-contracts | | | |
| **Total** | | | |

---

## Phase 5: Tasks

**Output:** `specs/015-forecast/tasks.md`

### Tasks Prompt

```bash
/speckit.tasks

## Task Structure
- Small, testable chunks (1-2 hours each)
- Clear acceptance criteria referencing FR-xxx
- Dependency ordering: foundation → individual tools → integration → validation
- Mark parallel-safe tasks explicitly with [P]
- Organize by user story, not by technical layer

## Implementation Phases
1. Foundation (shared schemas, contracts infrastructure, ForecastDay types)
2. Get Forecast (US1) — independently testable [P]
3. Get Forecast Day (US2) — independently testable [P]
4. Select Forecast Days (US3) — independently testable [P]
5. Integration testing & polish

## Constraints
- Contracts in `src/contracts/forecast-tools/`
- Definitions in `src/tools/definitions/`
- Primitives in `src/tools/primitives/`
- Tests: `tests/contract/forecast-tools/`, `tests/unit/forecast-tools/`
- TDD: Red→Green→Refactor for every task
- Mirror existing tool patterns (find get_projects_for_review for read-only query pattern)
- select_forecast_days mirrors switch_perspective for UI-affecting pattern
```

### Tasks Results

| Metric | Value |
|--------|-------|
| **Total Tasks** | |
| **Phases** | |
| **Parallel Opportunities** | |
| **User Stories Covered** | |

---

## Phase 6: Analyze

### Analyze Prompt

```bash
/speckit.analyze

Focus on:
1. Constitution alignment — verify coding standards compliance
2. Coverage gaps — ensure all 3 user stories and all FRs have tasks
3. Consistency between task file paths and actual project structure
4. Verify ForecastDay enum handling is covered (Kind and Status)
5. Verify UI side-effect warning is present in select_forecast_days tool description
6. Verify date parameter design is consistent across get_forecast and get_forecast_day
```

### Analysis Results

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| | | | |

---

## Phase 7: Implement

### Implement Prompt

```bash
/speckit.implement

## Approach: TDD-First

For each task, follow this cycle:

1. **RED**: Write failing test defining expected behavior
2. **GREEN**: Implement minimum code to make test pass
3. **REFACTOR**: Clean up while tests still pass
4. **VERIFY**: Manual verification of acceptance criteria

### Pre-Implementation Setup

1. Verify worktree: `git branch` shows `015-forecast`
2. Verify baseline: `pnpm test` — all existing tests pass
3. Verify build: `pnpm build` — clean
4. Verify lint: `pnpm lint` — clean
5. Create spec output dir: `specs/015-forecast/`

### Implementation Notes
- Small spec — only 3 tools, can be completed quickly
- Mirror existing read-only tool patterns (get_projects_for_review for query, switch_perspective for UI)
- ForecastDay enum parsing: check if enumName() helper works, or if String() is needed (see SPEC-007 repetition pattern)
- `badgeKind()` is a FUNCTION CALL — use parentheses in OmniJS
- Date construction in OmniJS: use `new Date(isoString)` or DateComponents
- Register all 3 tools in `src/server.ts`
- Run `pnpm build` after every source change
- Use logger utility for all diagnostics
```

### Implementation Progress

| Phase | Tasks | Completed | Notes |
|-------|-------|-----------|-------|
| 1 - Foundation | | | Shared schemas, contracts, ForecastDay types |
| 2 - Get Forecast | | | Date range query, ForecastDay array |
| 3 - Get Forecast Day | | | Single day detail |
| 4 - Select Forecast Days | | | UI navigation, Forecast perspective |
| 5 - Integration & Polish | | | Server registration, build, final tests |

---

## Post-Implementation Checklist

- [ ] All tasks marked complete in tasks.md
- [ ] Typecheck passes: `pnpm typecheck` (0 errors)
- [ ] Tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build` (ESM + CJS clean)
- [ ] Lint passes: `pnpm lint`
- [ ] All 3 tools registered in `src/server.ts`
- [ ] Manual OmniJS Script Editor verification
- [ ] PR created targeting `main`
- [ ] Merged to main branch
- [ ] Master plan progress tracking updated

---

## Lessons Learned

### What Worked Well

-

### Challenges Encountered

-

### Patterns to Reuse

-

---

## Project Structure Reference

```text
src/
├── server.ts                          # MCP server entry point (register 3 new tools here)
├── contracts/
│   └── forecast-tools/                # NEW: Zod contracts for 3 forecast tools + shared schemas
├── tools/
│   ├── definitions/                   # NEW: 3 tool definition files
│   └── primitives/                    # NEW: 3 primitive files
tests/
├── contract/
│   └── forecast-tools/                # NEW: Contract tests
├── unit/
│   └── forecast-tools/                # NEW: Unit tests
└── integration/
    └── forecast-tools/                # NEW: Integration tests (optional)
specs/
└── 015-forecast/                      # Spec artifacts
```
