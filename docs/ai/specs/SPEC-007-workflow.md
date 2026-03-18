# SpecKit Workflow: SPEC-007 — Repetition

**Template Version**: 1.0.0
**Created**: 2026-03-17
**Purpose**: Track the SpecKit workflow for SPEC-007 Repetition tools (5 MCP tools for task repetition rule management).

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ✅ Complete | 8 FRs, 5 stories, 19 acceptance scenarios |
| Clarify | `/speckit.clarify` | ✅ Complete | 5 questions answered, OmniJS API focus |
| Plan | `/speckit.plan` | ✅ Complete | research.md, data-model.md, quickstart.md, plan.md generated |
| Checklist | `/speckit.checklist` | ✅ Complete | 3 checklists: api-contracts (35), error-handling (33), type-safety (34) — 102 items, 18 gaps resolved |
| Tasks | `/speckit.tasks` | ✅ Complete | 58 tasks across 8 phases, organized by user story, TDD Red-Green-Refactor |
| Analyze | `/speckit.analyze` | ✅ Complete | 11 findings (2 CRITICAL, 2 HIGH, 4 MEDIUM, 3 LOW) — all remediated |
| Implement | `/speckit.implement` | ✅ Complete | 58/58 tasks, 292 new tests (2216 total), 5 tools registered |

**Status Legend:** ⏳ Pending | 🔄 In Progress | ✅ Complete | ⚠️ Blocked

### Phase Gates (SpecKit Best Practice)

Each phase requires **human review and approval** before proceeding:

| Gate | Checkpoint | Approval Criteria |
|------|------------|-------------------|
| G1 | After Specify | All user stories clear, no `[NEEDS CLARIFICATION]` markers remain |
| G2 | After Clarify | Ambiguities resolved, decisions documented |
| G3 | After Plan | Architecture approved, constitution gates pass, dependencies identified |
| G4 | After Checklist | All `[Gap]` markers addressed |
| G5 | After Tasks | Task coverage verified, dependencies ordered |
| G6 | After Analyze | No `CRITICAL` issues, `WARNING` items reviewed |
| G7 | After Each Implementation Phase | Tests pass, manual verification complete |

---

## Prerequisites

### Constitution Validation

**Before starting any workflow phase**, verify alignment with the project constitution (`.specify/memory/constitution.md` v2.0.0):

| Principle | Requirement | Verification | Status |
|-----------|-------------|--------------|--------|
| I. Type-First Development | All functions typed, Zod contracts | `pnpm typecheck` | ✅ Pass |
| II. Separation of Concerns | definitions/ + primitives/ split | Code review | ✅ 34 definitions, 34 primitives |
| III. Script Execution Safety | OmniJS-only, try-catch + JSON | Script Editor test | ✅ Existing patterns verified |
| IV. Structured Data Contracts | Zod schemas for all inputs | Contract tests | ✅ 5 contract dirs (folder/project/review/tag/task) |
| V. Defensive Error Handling | Structured errors, no swallowed exceptions | Unit tests | ✅ 1924 tests pass |
| VI. Build Discipline | `pnpm build` after changes | `pnpm build` | ✅ Build succeeds |
| VII. KISS | Simple, boring solutions | Code review | ✅ Verified |
| VIII. YAGNI | No premature abstractions | Code review | ✅ Verified |
| IX. SOLID | Single responsibility | Code review | ✅ Verified |
| X. TDD | Red-Green-Refactor cycle | Test-first workflow | ✅ 90 test files, 1924 tests |

**Constitution Check:** ✅ Verified 2026-03-17 — Constitution v2.0.0 (RATIFIED), all principles satisfied

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-007 |
| **Name** | Repetition Rule Management |
| **Branch** | `worktree-007-repetition` |
| **Dependencies** | None (Phases 0-5 complete) |
| **Enables** | None |
| **Priority** | P2 |
| **Tier** | 1 (parallel with SPEC-006, SPEC-013) |

### Success Criteria Summary

- [x] `get_repetition` returns ruleString (ICS format), scheduleType, anchorDateKey, catchUpAutomatically
- [x] `set_repetition` accepts raw ICS rule string (e.g., `FREQ=WEEKLY;BYDAY=MO,WE,FR`)
- [x] `set_common_repetition` provides 8 presets: daily, weekdays, weekly, biweekly, monthly, monthly_last_day, quarterly, yearly
- [x] `set_advanced_repetition` uses v4.7+ constructor with RepetitionScheduleType and AnchorDateKey
- [x] `clear_repetition` sets repetitionRule = null
- [x] Version detection for v4.7+ features with graceful fallback
- [x] Full TDD with contract tests + unit tests per tool
- [x] All 5 tools registered in server.ts

---

## Phase 1: Specify

**Status:** ✅ Complete (2026-03-17)
**Output:** `specs/007-repetition-rules/spec.md`

### Specify Prompt

```bash
/speckit.specify

## Feature: Repetition Rule Management

### Problem Statement
OmniFocus users need programmatic control over task and project repetition rules — the ability to read, set, modify, and clear recurring schedules. Currently there's no MCP interface for the OmniJS repetition API, forcing manual OmniFocus interaction for recurring task management.

### Users
- AI assistants managing OmniFocus tasks via MCP
- Power users automating GTD review workflows
- Developers building OmniFocus integrations

### User Stories
- As a user, I want to **read the repetition rule** on a task so I can understand its recurrence pattern
- As a user, I want to **set a repetition rule using ICS format** so I can define precise recurrence patterns
- As a user, I want to **use common presets** (daily, weekly, monthly) so I don't need to know ICS syntax
- As a user, I want to **use advanced v4.7+ scheduling** (from-completion, anchor dates) for sophisticated patterns
- As a user, I want to **clear a repetition rule** to make a task non-recurring

### Constraints
- ICS rules are opaque strings — we do NOT parse or validate them; OmniFocus is the authority
- `set_advanced_repetition` requires OmniFocus v4.7+ — must detect version and fail gracefully
- All OmniJS scripts must use try-catch with JSON returns (constitution Principle III)
- Follow existing tool patterns: definitions/primitives split, Zod contracts
- 5 tools total: get_repetition, set_repetition, clear_repetition, set_common_repetition, set_advanced_repetition

### Out of Scope
- Custom ICS rule validation/parsing (pass-through to OmniFocus)
- RepetitionRule serialization/deserialization beyond what OmniJS provides
- Batch repetition operations (single task/project per call)

### Key Technical Context
- OmniJS API: `task.repetitionRule` (RW), `Task.RepetitionRule` constructor
- ICS format: `FREQ=WEEKLY;BYDAY=MO,WE,FR`
- v4.7+ additions: `RepetitionScheduleType` (FromCompletion, Regularly, None), `AnchorDateKey` (DeferDate, DueDate, PlannedDate)
- `set_common_repetition` generates ICS rules internally for convenience presets
```

### Specify Results

| Metric | Value |
|--------|-------|
| Functional Requirements | FR-001 through FR-008 |
| User Stories | 5 (2x P1, 2x P2, 1x P3) |
| Acceptance Criteria | 19 acceptance scenarios |
| Edge Cases | 5 documented |
| NEEDS CLARIFICATION | 0 (none needed) |

### Files Generated

- [x] `specs/007-repetition-rules/spec.md`
- [x] `specs/007-repetition-rules/checklists/requirements.md` (all items pass)

---

## Phase 2: Clarify (Optional but Recommended)

**When to run:** When spec has areas that could be interpreted multiple ways.

### Clarify Prompts

#### Session 1: OmniJS API Focus

```bash
/speckit.clarify Focus on OmniJS API: RepetitionRule constructor signatures, version detection mechanisms, property access patterns for repetitionRule, scheduleType, anchorDateKey
```

#### Session 2: ICS Format & Presets

```bash
/speckit.clarify Focus on ICS format: What ICS rule strings does OmniFocus actually accept? How do common presets map to ICS rules? Edge cases with monthly_last_day and quarterly?
```

### Clarify Results

| Session | Focus Area | Questions | Key Outcomes |
|---------|------------|-----------|--------------|
| 1 | OmniJS API | 5 asked, 5 answered | Version detection: `app.userVersion.atLeast`; 8 presets; legacy 2-param constructor for basic tools; all v4.7+ params optional; read-then-merge pattern for `set_advanced_repetition` |
| 2 | ICS Format | — | Absorbed into Session 1 (ICS questions folded into preset/constructor clarifications) |

---

## Phase 3: Plan

**When to run:** After spec is finalized. Output: `specs/007-repetition/plan.md`

### Plan Prompt

```bash
/speckit.plan

## Tech Stack
- Runtime: Node.js 24+
- Language: TypeScript 5.9+ (strict, ES2024 target)
- Build: tsup 8.5+
- Test: Vitest 4.0+
- Lint/Format: Biome 2.3+
- MCP SDK: @modelcontextprotocol/sdk 1.27.x
- Validation: Zod 4.x

## Constraints
- OmniJS-only execution (no AppleScript, no JXA)
- definitions/primitives separation (constitution Principle II)
- ICS rules are opaque — no parsing/validation
- v4.7+ version detection for advanced features
- Follow existing patterns from 005-review-system and 004-project-management

## Architecture Notes
- Mirror 005-review-system structure for contracts in src/contracts/repetition-tools/
- Reuse executeOmniFocusScript + generateOmniScript + writeSecureTempFile pattern
- set_common_repetition generates ICS strings server-side, not in OmniJS
```

### Plan Results

**Status:** ✅ Complete (2026-03-17)

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ✅ | Technical context, constitution checks, project structure, implementation strategy |
| `research.md` | ✅ | OmniJS RepetitionRule API: constructors, enums, version detection, read-then-merge |
| `data-model.md` | ✅ | 5 entities (RepetitionRuleData, ItemIdentifier, PresetName, ScheduleType, AnchorDateKey) |
| `contracts/` | ✅ (designed) | 6 contract files + 3 shared schemas (structure in plan.md, code in Phase 5) |
| `quickstart.md` | ✅ | 5 tool OmniJS patterns + preset→ICS TypeScript mapping |

---

## Phase 4: Domain Checklists

**When to run:** After `/speckit.plan` — validates both spec AND plan together.

### Step 1: Recommended Domains

| Signal in Spec/Plan | Recommended Domain |
|---|---|
| 5 MCP tools with Zod contracts | **api-contracts** |
| v4.7+ version detection, graceful fallback | **error-handling** |
| ICS format validation, user-provided strings | **type-safety** |
| Specific OmniFocus requirements checklist | **requirements** |

### Step 2: Run Enriched Checklist Prompts

#### 1. api-contracts Checklist

Why: 5 new tools with ICS format input/output, version-dependent behavior.

```bash
/speckit.checklist api-contracts

Focus on SPEC-007 Repetition requirements:
- get_repetition response schema: ruleString, scheduleType, anchorDateKey, catchUpAutomatically
- set_repetition input: raw ICS rule string validation (or pass-through)
- set_common_repetition: preset enum validation (8 values)
- set_advanced_repetition: RepetitionScheduleType + AnchorDateKey enums
- Pay special attention to: version-dependent response fields for v4.7+ vs older
```

#### 2. error-handling Checklist

Why: Version detection is critical — v4.7+ features must fail gracefully on older OmniFocus.

```bash
/speckit.checklist error-handling

Focus on SPEC-007 Repetition requirements:
- Version detection for set_advanced_repetition (v4.7+ only)
- Graceful fallback when v4.7+ features unavailable
- OmniJS script error handling (silent failures with empty results)
- Pay special attention to: What happens when set_advanced_repetition is called on pre-v4.7 OmniFocus?
```

#### 3. type-safety Checklist

Why: ICS format strings and OmniJS type mapping require careful contract design.

```bash
/speckit.checklist type-safety

Focus on SPEC-007 Repetition requirements:
- ICS rule string type (opaque string vs validated format)
- RepetitionScheduleType enum mapping (OmniJS → TypeScript)
- AnchorDateKey enum mapping (OmniJS → TypeScript)
- Preset names as string literal union type
- Pay special attention to: Zod schemas for ICS rule strings — should they validate format or pass through?
```

### Checklist Results

| Checklist | Items | Gaps | Spec References |
|-----------|-------|------|-----------------|
| api-contracts | 35 | 0 (5 resolved via MCP research) | Spec §FR-001–008, Data Model §Validation Rules, §API Response Formats |
| error-handling | 33 | 0 (8 resolved via codebase research) | Spec §FR-005/007, Constitution §III, Quickstart §Version Detection |
| type-safety | 34 | 0 (5 resolved via codebase research) | Spec §FR-002/004/008, Data Model §ScheduleType/AnchorDateKey/PresetName |
| **Total** | **102** | **0 (18 resolved)** | |

---

## Phase 5: Tasks

**When to run:** After checklists complete (all gaps resolved). Output: `specs/007-repetition/tasks.md`

### Tasks Prompt

```bash
/speckit.tasks

## Task Structure
- Small, testable chunks (1-2 hours each)
- Clear acceptance criteria referencing FR-xxx
- Dependency ordering: foundation → components → integration → validation
- Mark parallel-safe tasks explicitly with [P]
- Organize by user story, not by technical layer

## Implementation Phases
1. Foundation (contracts, shared schemas, types)
2. Read operations (get_repetition)
3. Write operations (set_repetition, set_common_repetition, set_advanced_repetition, clear_repetition)
4. Integration (server registration, build verification)

## Constraints
- Contracts in src/contracts/repetition-tools/
- Primitives in src/tools/primitives/
- Definitions in src/tools/definitions/
- Tests in tests/unit/repetition-tools/ and tests/contracts/repetition-tools/
- Follow TDD: test files before implementation files
```

### Tasks Results

| Metric | Value |
|--------|-------|
| **Total Tasks** | 58 |
| **Phases** | 8 (Setup, Foundation, US1-get, US2-set, US3-clear, US4-common, US5-advanced, Polish) |
| **Parallel Opportunities** | 15+ (within-phase parallel test pairs, cross-story parallelism for US2/US3/US4) |
| **User Stories Covered** | 5/5 (US1-P1, US2-P1, US3-P2, US4-P2, US5-P3) |
| **MVP Scope** | Phase 1-3 (US1: get_repetition) — 16 tasks |
| **TDD Compliance** | All stories follow RED→GREEN→REFACTOR cycle |

---

## Phase 6: Analyze

**When to run:** Always run after generating tasks to catch issues.

### Analyze Prompt

```bash
/speckit.analyze

Focus on:
1. Constitution alignment — verify TDD ordering, definitions/primitives split
2. Coverage gaps — ensure all 5 tools have contracts, primitives, definitions, and tests
3. Consistency between task file paths and actual project structure
4. Verify version detection is covered by tasks
```

### Analyze Severity Levels

| Severity | Meaning | Action Required |
|----------|---------|-----------------|
| `CRITICAL` | Blocks implementation, violates constitution | **Must fix before G6 gate** |
| `HIGH` | Significant gap, impacts quality | Should fix |
| `MEDIUM` | Improvement opportunity | Review and decide |
| `LOW` | Minor inconsistency | Note for future |

### Analysis Results

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| C1 | CRITICAL | tasks.md references `generateOmniScript` + `writeSecureTempFile` + `executeOmniFocusScript` — none exist; actual pattern is local `generateXxxScript()` + `executeOmniJS(script)` | Fixed T011, T020, T029, T038, T047 with correct function names |
| C2 | CRITICAL | plan.md `shared/preset.ts` doesn't match tasks.md `shared/repetition-enums.ts` | Fixed plan.md to use `repetition-enums.ts` |
| D1 | HIGH | Phase 1 creates schemas before Phase 2 tests — violates strict TDD | Added TDD note: infrastructure exception; strict RED-first applies to Phases 3–7 |
| D2 | HIGH | T010/T019/T028/T037/T046 marked [P] but have sequential import deps | Removed [P], updated parallel opportunities section |
| E1 | HIGH | 4 of 6 spec edge cases had zero task coverage | Added edge cases to T009, T018, T027, T036, T045 descriptions |
| E2 | MEDIUM | T008 missing dual-discriminator (`success` + `hasRule`) test note | Added explicit dual-discriminator validation to T008 |
| F1 | MEDIUM | T036 says "each of 8 presets" but lists 10 cases | Clarified: "8 presets with 2 modifier combinations (10 test cases)" |
| G1 | MEDIUM | T047 missing OmniJS enum constant write pattern | Added note: reference `Task.RepetitionScheduleType.Regularly` directly, not strings |
| G2 | LOW | Per-primitive naming convention not explicit | Added `generateXxxScript()` naming to all primitive tasks |
| H1 | LOW | No barrel export verification task | Added verification note to T057 build task |
| H2 | LOW | 6 redundant lint tasks across phases | Fixed: merged lint into each phase's build+test step; standalone lint tasks converted to refactor reviews; removed T056 duplicate |

| M2 | LOW | kebab-case vs camelCase file naming could confuse implementers | Fixed: added File Naming Convention table to tasks.md header documenting per-directory conventions |

**Metrics**: 8/8 FRs covered (100%), 19/19 scenarios covered (100%), 6/6 edge cases now covered (100%), 0 issues remaining

---

## Phase 7: Implement

**When to run:** After tasks.md is generated and analyzed (no coverage gaps).

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

Before starting any task:
1. Verify on `feature/007-repetition` branch
2. Run `pnpm build && pnpm test` — all existing tests pass
3. Research OmniJS RepetitionRule API in Script Editor

### Implementation Notes
- Mirror 005-review-system patterns for contract structure
- Use executeOmniFocusScript + generateOmniScript pattern
- set_common_repetition generates ICS strings in TypeScript, not OmniJS
- Version detection: check for RepetitionScheduleType existence in OmniJS
```

### Implementation Progress

| Phase | Tasks | Completed | Notes |
|-------|-------|-----------|-------|
| 1 - Setup | T001-T005 | 5/5 | Shared schemas, directory structure, barrel exports |
| 2 - Foundation Tests | T006-T007 | 2/2 | 23 shared schema contract tests |
| 3 - US1 get_repetition | T008-T016 | 9/9 | 53 tests (43 contract + 10 unit), MVP complete |
| 4 - US2 set_repetition | T017-T025 | 9/9 | 48 tests (34 contract + 14 unit) |
| 5 - US3 clear_repetition | T026-T034 | 9/9 | 39 tests (29 contract + 10 unit) |
| 6 - US4 set_common_repetition | T035-T043 | 9/9 | 66 tests (45 contract + 21 unit) |
| 7 - US5 set_advanced_repetition | T044-T052 | 9/9 | 63 tests (contract + unit), version gating + read-then-merge |
| 8 - Polish | T053-T058 | 6/6 | Full suite, typecheck, lint, build, CLAUDE.md update |

---

## Post-Implementation Checklist

- [x] All tasks marked complete in tasks.md (58/58)
- [x] Linting passes: `pnpm lint` (291 files, no issues)
- [x] Type checking passes: `pnpm typecheck` (no errors)
- [x] Tests pass: `pnpm test` (2216 tests, 101 files)
- [x] Build succeeds: `pnpm build` (ESM + CJS + DTS)
- [ ] Manual verification in OmniFocus Script Editor
- [ ] PR created and reviewed
- [ ] Merged to main branch

---

## Lessons Learned

### What Worked Well

- Parallel agent orchestration: RED tests for 4 tools written simultaneously, GREEN implementations for 3 tools in parallel — ~3x wall-clock speedup
- Comprehensive spec artifacts (data-model.md, quickstart.md) provided exact patterns for agents to follow
- TDD caught the `executeOmniJS` mock pattern issue early (returns objects, not JSON strings)

### Challenges Encountered

- Zod 4.x `z.discriminatedUnion()` requires unique discriminator values — `get_repetition` has two `success: true` variants, required `z.union()` instead
- `executeOmniJS()` returns parsed objects, not strings — unit test mocks initially used `JSON.stringify()` causing 7 test failures
- Coverage tool (`@vitest/coverage-v8`) has a version mismatch with Vitest 4.x — pre-existing, not blocking

### Patterns to Reuse

- Parallel RED phase: write contract + unit tests simultaneously (different files, no deps)
- Parallel GREEN phase: implement multiple tools simultaneously when they don't share imports
- `z.union()` for dual-discriminator responses in Zod 4.x
- Local `escapeForJS()` + `generateXxxScript()` per primitive pattern

---

## Project Structure Reference

```text
omnifocus-mcp/
├── src/
│   ├── server.ts                          # MCP server entry point
│   ├── contracts/repetition-tools/        # Zod contracts (NEW)
│   │   ├── get-repetition.ts
│   │   ├── set-repetition.ts
│   │   ├── clear-repetition.ts
│   │   ├── set-common-repetition.ts
│   │   ├── set-advanced-repetition.ts
│   │   └── shared/
│   ├── tools/
│   │   ├── definitions/                   # MCP tool schemas + handlers
│   │   └── primitives/                    # Core business logic
│   └── utils/
│       └── omnifocusScripts/              # Pre-built OmniJS scripts
├── tests/
│   ├── unit/repetition-tools/             # Unit tests (NEW)
│   └── contracts/repetition-tools/        # Contract tests (NEW)
└── specs/007-repetition/                  # This spec's artifacts
```

---

Template based on SpecKit best practices. Populated for SPEC-007 Repetition tools.
