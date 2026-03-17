# SpecKit Workflow: SPEC-007 — Repetition

**Template Version**: 1.0.0
**Created**: 2026-03-17
**Purpose**: Track the SpecKit workflow for SPEC-007 Repetition tools (5 MCP tools for task repetition rule management).

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ⏳ Pending | |
| Clarify | `/speckit.clarify` | ⏳ Pending | Optional but recommended |
| Plan | `/speckit.plan` | ⏳ Pending | |
| Checklist | `/speckit.checklist` | ⏳ Pending | Run for each domain |
| Tasks | `/speckit.tasks` | ⏳ Pending | |
| Analyze | `/speckit.analyze` | ⏳ Pending | |
| Implement | `/speckit.implement` | ⏳ Pending | |

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

| Principle | Requirement | Verification |
|-----------|-------------|--------------|
| I. Type-First Development | All functions typed, Zod contracts | `pnpm typecheck` |
| II. Separation of Concerns | definitions/ + primitives/ split | Code review |
| III. Script Execution Safety | OmniJS-only, try-catch + JSON | Script Editor test |
| IV. Structured Data Contracts | Zod schemas for all inputs | Contract tests |
| V. Defensive Error Handling | Structured errors, no swallowed exceptions | Unit tests |
| VI. Build Discipline | `pnpm build` after changes | `pnpm build` |
| VII. KISS | Simple, boring solutions | Code review |
| VIII. YAGNI | No premature abstractions | Code review |
| IX. SOLID | Single responsibility | Code review |
| X. TDD | Red-Green-Refactor cycle | Test-first workflow |

**Constitution Check:** ⏳ (mark before proceeding to G1)

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-007 |
| **Name** | Repetition |
| **Branch** | `feature/007-repetition` |
| **Dependencies** | None (Phases 0-5 complete) |
| **Enables** | None |
| **Priority** | P2 |
| **Tier** | 1 (parallel with SPEC-006, SPEC-013) |

### Success Criteria Summary

- [ ] `get_repetition` returns ruleString (ICS format), scheduleType, anchorDateKey, catchUpAutomatically
- [ ] `set_repetition` accepts raw ICS rule string (e.g., `FREQ=WEEKLY;BYDAY=MO,WE,FR`)
- [ ] `set_common_repetition` provides 8 presets: daily, weekdays, weekly, biweekly, monthly, monthly_last_day, quarterly, yearly
- [ ] `set_advanced_repetition` uses v4.7+ constructor with RepetitionScheduleType and AnchorDateKey
- [ ] `clear_repetition` sets repetitionRule = null
- [ ] Version detection for v4.7+ features with graceful fallback
- [ ] Full TDD with contract tests + unit tests per tool
- [ ] All 5 tools registered in server.ts

---

## Phase 1: Specify

**When to run:** At the start of a new feature specification. Focus on **WHAT** and **WHY**, not implementation details. Output: `specs/007-repetition/spec.md`

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
| Functional Requirements | <!-- e.g., FR-001 through FR-020 --> |
| User Stories | 5 |
| Acceptance Criteria | <!-- Count --> |

### Files Generated

- [ ] `specs/007-repetition/spec.md`

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
| 1 | OmniJS API | | |
| 2 | ICS Format | | |

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

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ⏳ | Technical context, execution flow |
| `research.md` | ⏳ | OmniJS RepetitionRule API research |
| `data-model.md` | ⏳ | RepetitionRule types and ICS format |
| `contracts/` | ⏳ | 5 tool contracts + shared schemas |
| `quickstart.md` | ⏳ | Developer onboarding |

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
| api-contracts | | | |
| error-handling | | | |
| type-safety | | | |
| **Total** | | | |

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
| **Total Tasks** | |
| **Phases** | |
| **Parallel Opportunities** | |
| **User Stories Covered** | |

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
| | | | |

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
| 1 - Foundation | | | |
| 2 - Read (get_repetition) | | | |
| 3 - Write (set/clear/common/advanced) | | | |
| 4 - Integration | | | |

---

## Post-Implementation Checklist

- [ ] All tasks marked complete in tasks.md
- [ ] Linting passes: `pnpm lint`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] Manual verification in OmniFocus Script Editor
- [ ] PR created and reviewed
- [ ] Merged to main branch

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

```
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
