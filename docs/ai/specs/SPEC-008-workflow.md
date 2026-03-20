# SpecKit Workflow: SPEC-008 — Perspectives

**Created**: 2026-03-18
**Purpose**: Track SPEC-008 through all 7 SpecKit phases with review gates.

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ✅ Complete | 43 FRs, 5 user stories, 25 scenarios, 0 clarifications |
| Clarify | `/speckit.clarify` | ✅ Complete | 2 sessions, 10 questions answered; byName() confirmed, iconColor confirmed v4.5.2+, clean-break migration |
| Plan | `/speckit.plan` | ✅ Complete | 7 ADs, 8 research tasks, 9 contract files, 10/10 constitution pass |
| Checklist | `/speckit.checklist` | ✅ Complete | 3 domains (135 items), 22 gaps remediated |
| Tasks | `/speckit.tasks` | ✅ Complete | 57 tasks, 9 phases, 35 parallel, 5/5 US covered |
| Analyze | `/speckit.analyze` | ✅ Complete | 8 findings (1 CRITICAL, 2 MEDIUM, 5 LOW), all remediated |
| Implement | `/speckit.implement` | ✅ Complete | 57/57 tasks, 55 new tests (2878 total), 5 tools registered |

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
| I. Type-First Development | All functions typed, Zod contracts | `pnpm typecheck` | ✅ Pass |
| II. Separation of Concerns | definitions/ + primitives/ split | Code review | ✅ 50 definitions, 50 primitives |
| III. Script Execution Safety | OmniJS-only, try-catch + JSON | Script Editor test | ✅ Existing patterns verified |
| IV. Structured Data Contracts | Zod schemas for all inputs | Contract tests | ✅ 8 contract dirs |
| V. Defensive Error Handling | Structured errors, no swallowed exceptions | Unit tests | ✅ 2823 tests pass |
| VI. Build Discipline | `pnpm build` after changes | `pnpm build` | ✅ Pass (ESM + CJS) |
| VII. KISS | Simple, boring solutions | Code review | ✅ Verified |
| VIII. YAGNI | No premature abstractions | Code review | ✅ Verified |
| IX. SOLID | Single responsibility | Code review | ✅ Verified |
| X. TDD | Red-Green-Refactor cycle | Test-first workflow | ✅ 125 test files |

**Constitution Check:** ✅ Verified 2026-03-18 — Constitution v2.0.0 (RATIFIED), all principles satisfied

**Baseline Snapshot:**

- Typecheck: clean
- Tests: 2823 passing / 125 files
- Build: clean (ESM + CJS)
- Lint: 360 files, 0 errors
- Branch: `008-perspectives` (worktree)

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-008 |
| **Name** | Perspectives |
| **Branch** | `008-perspectives` |
| **Dependencies** | None (Phases 0-5 complete) |
| **Enables** | None |
| **Priority** | P2 |
| **Tier** | 2 (parallel with SPEC-009, SPEC-011) |

### Success Criteria Summary

- [ ] 5 MCP tools implemented: `list_perspectives` (enhanced), `get_perspective` (enhanced), `switch_perspective`, `export_perspective`, `set_perspective_icon`
- [ ] Zod contracts in `src/contracts/perspective-tools/` for all 5 tools
- [ ] `list_perspectives` enhanced — adds `Perspective.Custom.all` enumeration with identifier, filter rules
- [ ] `get_perspective` enhanced — uses `Perspective.Custom.all` filtered by name, returns metadata + filter rules
- [ ] `switch_perspective` sets `document.windows[0].perspective` (UI side-effect warning)
- [ ] `export_perspective` calls `fileWrapper()` on custom perspectives
- [ ] `set_perspective_icon` sets `iconColor` property (UNVERIFIED — must verify in Script Editor)
- [ ] Legacy `list_perspectives`/`get_perspective_view` tools replaced with new architecture
- [ ] Full TDD with contract + unit tests
- [ ] OmniJS Script Editor verification

---

## Phase 1: Specify

**Output:** `specs/008-perspectives/spec.md`

### Specify Prompt

```bash
/speckit.specify

## Feature: Perspectives

### Problem Statement
OmniFocus users need full perspective management through the MCP server — listing both
built-in and custom perspectives, getting detailed perspective configuration including
filter rules, switching the active perspective, exporting perspective configurations,
and setting icon colors. Currently only basic list and view operations exist via legacy
tools that predate the modern definitions/primitives/contracts architecture.

### Users
GTD practitioners using AI assistants to navigate and manage OmniFocus perspectives
for context-based task views.

### User Stories
1. As a GTD practitioner, I want to list all perspectives (built-in + custom) with identifiers and filter rules so I can understand what views are available
2. As a GTD practitioner, I want to get detailed perspective information including filter rule configuration so I can understand how a perspective works
3. As a GTD practitioner, I want to switch the active perspective so the AI can navigate to the relevant view for my current workflow
4. As a GTD practitioner, I want to export a custom perspective configuration so I can back up or share my perspective setup
5. As a GTD practitioner, I want to set a perspective's icon color so I can visually organize my perspectives

### Technical Context from Master Plan
- 5 MCP tools: list_perspectives (enhanced), get_perspective (enhanced), switch_perspective, export_perspective, set_perspective_icon
- `list_perspectives` enhances existing legacy tool — adds `Perspective.Custom.all` enumeration with identifier, filter rules
- `get_perspective` enhances existing `get_perspective_view` — uses `Perspective.Custom.all` filtered by name (no `byName()` method exists), returns perspective metadata + filter rule configuration (`archivedFilterRules` JSON, `archivedTopLevelFilterAggregation`)
- `switch_perspective` sets `document.windows[0].perspective` — changes the active perspective in the UI (platform warning: changes what the user sees)
- `export_perspective` calls `fileWrapper()` on custom perspectives — returns exportable config. Also has `writeFileRepresentationIntoDirectory(parentURL)` for direct file save
- `set_perspective_icon` sets `iconColor` property — **UNVERIFIED**: `iconColor` not in official OmniAutomation docs. Must verify in Script Editor before implementing. May need to be dropped.
- **Migration**: Legacy `list_perspectives`/`get_perspective_view` definitions replaced with new implementations following current architecture
- Built-in perspectives: Inbox, Projects, Tags, Forecast, Flagged, Review, Nearby (iOS), Search
- `Perspective.Custom.all` enumerates all custom perspectives
- No `Perspective.byName()` exists — must filter `Perspective.Custom.all` by name manually

### Constraints
- Follow definitions/primitives/contracts separation pattern from existing tools
- All OmniJS scripts must use try-catch with JSON.stringify returns
- Zod 4.x for all input validation
- Must replace legacy tools cleanly — no wrapper/shim approach
- `switch_perspective` changes UI state — tool description must clearly warn AI assistants
- `set_perspective_icon` property existence must be verified before implementation — may be dropped

### Out of Scope
- Creating custom perspectives programmatically (OmniJS limitation — created via UI only)
- Editing perspective filter rules (complex JSON format, defer to future enhancement)
```

### Specify Results

| Metric | Value |
|--------|-------|
| Functional Requirements | FR-001 through FR-043 (43 total) |
| User Stories | 5 (2x P1, 1x P2, 2x P3) |
| Acceptance Scenarios | 25 across all stories |
| Edge Cases | 8 identified |
| Success Criteria | 7 measurable outcomes |
| NEEDS CLARIFICATION | 0 (iconColor handled via CONTINGENCY in FR-039) |

### Key Design Decisions

- 4 confirmed tools + 1 contingent (`set_perspective_icon` depends on `iconColor` verification)
- Per-perspective operations — no batch operations
- Legacy tools replaced (not wrapped)
- Built-in perspectives listed via hardcoded enum, custom via `Perspective.Custom.all`

### Files Generated

- [x] `specs/008-perspectives/spec.md`
- [x] `specs/008-perspectives/checklists/requirements.md`

---

## Phase 2: Clarify (Optional but Recommended)

### Clarify Prompts

#### Session 1: OmniJS Perspective API Focus

```bash
/speckit.clarify Focus on OmniJS Perspective API:
- What properties are available on Perspective.Custom objects? (identifier, name, archivedFilterRules, archivedTopLevelFilterAggregation, fileWrapper?)
- Does `Perspective.Custom.all` include built-in perspectives or only user-created ones?
- What is the return type of `fileWrapper()` on a custom perspective?
- Does `iconColor` property exist on Perspective.Custom? If not, what alternatives exist for visual customization?
- How does `document.windows[0].perspective` work — does it accept a Perspective object or a name string?
```

#### Session 2: Legacy Migration Focus

```bash
/speckit.clarify Focus on legacy tool migration:
- What do the existing list_perspectives and get_perspective_view primitives currently return?
- Are there any consumers of the legacy tool response shapes that would break?
- Should the new tools maintain backward-compatible response shapes or use clean new schemas?
- How should the transition be handled in server.ts — replace registrations in place?
```

### Clarify Results

| Session | Focus Area | Questions | Key Outcomes |
|---------|------------|-----------|--------------|
| 1 | OmniJS Perspective API | 5 asked, 5 answered | `byName()`/`byIdentifier()` confirmed; `iconColor` confirmed v4.5.2+; `archivedFilterRules` opaque object (v4.2+); FR-010 corrected, FR-012a added, FR-039 CONTINGENCY removed |
| 2 | Legacy Migration | 5 asked, 5 answered | Clean break: new `type` enum replaces legacy booleans; new Zod contracts; replace-in-place in server.ts; CSS hex for iconColor input; delete legacy files |

#### Critical Corrections from Clarify

1. **`byName()` and `byIdentifier()` EXIST** — FR-010 corrected. Spec originally said "no `byName()` method exists" — API confirms both exist on `Perspective.Custom`.
2. **`iconColor` confirmed (v4.5.2+)** — FR-039 CONTINGENCY removed. Version-gated with `app.userVersion.atLeast(new Version('4.5.2'))`.
3. **`archivedFilterRules` version-gated (v4.2+)** — FR-012a added. Opaque object returned via JSON.stringify.
4. **Clean-break migration** — No backward compatibility. Delete legacy files, replace registrations in server.ts.
5. **CSS hex color input** — `set_perspective_icon` accepts "#RRGGBB" or "#RRGGBBAA", converts to `Color.RGB()` in primitive.

---

## Phase 3: Plan

**Output:** `specs/008-perspectives/plan.md`

### Plan Prompt

```bash
/speckit.plan

## Tech Stack
- Runtime: Node.js 24+
- Language: TypeScript 5.9+ (strict mode, ES2024 target)
- Build: tsup 8.5+
- Test: Vitest 4.0+
- Lint: Biome 2.3+
- MCP SDK: @modelcontextprotocol/sdk 1.27.x
- Validation: Zod 4.x

## Constraints
- Follow existing tool pattern: definitions/ for MCP handlers, primitives/ for business logic
- OmniJS scripts via executeOmniFocusScript() with temp files
- Contracts in src/contracts/perspective-tools/
- Use logger utility for all diagnostics (never console.error)
- Must remove legacy list_perspectives and get_perspective_view implementations
- switch_perspective changes UI state — document side effects clearly

## Architecture Notes
- Mirror existing patterns from review-tools (005) or notification-tools (006)
- Perspective lookup by name requires filtering Perspective.Custom.all (no byName() method)
- Built-in perspectives accessed differently from custom perspectives
- Legacy tool migration: remove old files, register new tools in server.ts
- set_perspective_icon may need to be dropped if iconColor doesn't exist — plan for conditional scope
```

### Plan Results

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ✅ | 7 architecture decisions, constitution gates 10/10 PASS |
| `research.md` | ✅ | 8 research tasks resolved (RT-001 through RT-008) |
| `data-model.md` | ✅ | 5 tool entities, version gates, color conversion |
| `contracts/` | ✅ | 9 files (5 tool contracts + 3 shared + 1 index) |
| `quickstart.md` | ✅ | OmniJS patterns for all 5 tools |

### Key Architecture Decisions

- AD-001: Direct API methods (`byName()`, `byIdentifier()`) over manual filtering
- AD-002: Clean-break migration — delete 4 legacy files + 1 interface
- AD-003: CSS hex color input → `Color.RGB()` conversion in OmniJS
- AD-004: `archivedFilterRules` as opaque JSON (v4.2+)
- AD-005: `iconColor` version-gated to v4.5.2+
- AD-006: `fileWrapper()` metadata serialization (not binary)
- AD-007: `document.windows[0].perspective` accepts Perspective objects

---

## Phase 4: Domain Checklists

### Recommended Domains

| Signal in Spec/Plan | Recommended Domain | Justification |
|---|---|---|
| OmniJS perspective API, fileWrapper(), iconColor verification | **api-workaround** | Multiple unverified APIs, legacy migration |
| Zod contracts for 5 tools, input/output schemas | **type-safety** | New contracts + legacy schema replacement |
| Requirements coverage, legacy tool migration | **requirements** | Ensure all 5 user stories + migration covered |

### Checklist Prompts

#### 1. API Workaround Checklist

Why: Multiple OmniJS APIs need verification — iconColor, fileWrapper(), Perspective.Custom.all behavior.

```bash
/speckit.checklist api-workaround

Focus on Perspectives requirements:
- Perspective.Custom.all enumeration — does it include built-in perspectives?
- fileWrapper() return type and usage for export
- iconColor property existence verification
- document.windows[0].perspective setter behavior
- Pay special attention to: APIs that are UNVERIFIED in official docs (iconColor, filter rule access)
```

#### 2. Type Safety Checklist

Why: 5 new tools with Zod contracts replacing legacy schemas.

```bash
/speckit.checklist type-safety

Focus on Perspectives requirements:
- Zod schemas for all 5 tools (input + output)
- Perspective identifier type (string ID vs name)
- Filter rules JSON schema (opaque JSON vs structured)
- Export format response type (base64? file path? raw data?)
- Pay special attention to: response schema design for list_perspectives (built-in vs custom distinction)
```

#### 3. Requirements Checklist

```bash
/speckit.checklist requirements

Focus on Perspectives requirements:
- All 5 user stories have functional requirements
- Legacy tool migration covered (remove old, register new)
- Edge cases: no custom perspectives, built-in perspective export attempt, invalid perspective name
- Pay special attention to: UI side-effect warnings in switch_perspective tool description
```

### Checklist Results

| Checklist | Items | Gaps | Spec References |
|-----------|-------|------|-----------------|
| api-workaround | 42 | 9 (all remediated) | FR-006, FR-012a, FR-015, FR-021, FR-035, FR-039 |
| type-safety | 44 | 5 (all remediated) | FR-003, FR-010, FR-012, FR-025, FR-036 |
| functional-requirements | 49 | 8 (all remediated) | FR-006, FR-007, FR-012a, FR-014, FR-015, FR-021, FR-035 |
| **Total** | **135** | **22 (all remediated)** | |

**Key Remediations:**

- 4 acceptance scenarios added (US1-AS6/7, US2-AS6/7)
- 7 edge cases added (iconColor round-trip, custom icon, multi-window, Pro license)
- FR-021 updated: switch_perspective now returns previous perspective
- Disambiguation pattern documented (candidates vs matchingIds justified)
- Migration order specified: create new → delete old → update server.ts
- 5 assumptions added (Pro license, byName case sensitivity, identifier opacity)

---

## Phase 5: Tasks

**Output:** `specs/008-perspectives/tasks.md`

### Tasks Prompt

```bash
/speckit.tasks

## Task Structure
- Small, testable chunks (1-2 hours each)
- Clear acceptance criteria referencing FR-xxx
- Dependency ordering: contracts → primitives → definitions → integration
- Mark parallel-safe tasks explicitly with [P]
- Organize by user story

## Implementation Phases
1. Foundation (shared schemas, contracts, legacy audit)
2. List Perspectives (US1) — enhanced from legacy
3. Get Perspective (US2) — enhanced from legacy
4. Switch Perspective (US3) — independently testable
5. Export Perspective (US4) — independently testable
6. Set Perspective Icon (US5) — independently testable (conditional on iconColor verification)
7. Legacy cleanup & migration
8. Server registration & integration

## Constraints
- Contracts in src/contracts/perspective-tools/
- Primitives in src/tools/primitives/
- Definitions in src/tools/definitions/
- Tests in tests/unit/perspective-tools/ and tests/contract/perspective-tools/
- Legacy files to remove: existing list_perspectives and get_perspective_view primitives/definitions
```

### Tasks Results

| Metric | Value |
|--------|-------|
| **Total Tasks** | 57 (T001-T057) |
| **Phases** | 9 (Setup, Foundation, US1-US5, Legacy Cleanup, Polish) |
| **Parallel Opportunities** | 35 tasks marked [P]; all 5 US phases parallel after Foundation |
| **User Stories Covered** | 5/5 (US1: 10 tasks, US2-US5: 6 tasks each) |
| **FR Coverage** | FR-001 through FR-043 (all 43 FRs referenced) |
| **TDD Compliance** | All stories follow RED→GREEN→REFACTOR cycle |

---

## Phase 6: Analyze

### Analyze Prompt

```bash
/speckit.analyze

Focus on:
1. Constitution alignment — Zod validation, TDD, OmniJS-first
2. Coverage gaps — all 5 user stories and FRs have tasks
3. File path consistency with project structure
4. Verify legacy tool removal is covered by tasks
5. Verify iconColor conditional scope handling
```

### Analysis Results

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| F1 | CRITICAL | `z.discriminatedUnion` with duplicate `success: true` variants in export-perspective contract | ✅ Changed to `z.union()` (SPEC-007 pattern) |
| F2 | MEDIUM | Missing type exports in barrel index.ts | ✅ Added FileSuccess/MetadataSuccess type exports |
| F3 | MEDIUM | Plan summary says "three new tools" but lists four | ✅ Fixed to "four new tools" |
| F4 | MEDIUM | T044/T046 delete files that were already overwritten by GREEN phase | ✅ Reworded to "verify legacy content replaced" |
| F5 | LOW | FR-030 promises base64 data but contract returns metadata only | ✅ Updated FR-030 to match contract design |
| F6 | LOW | Constitution uses "TypeScript enums" but codebase uses Zod enums | ℹ️ Informational — all specs use Zod enums consistently |
| F7 | LOW | T049 covers all 5 tool registrations in one task | ℹ️ Acceptable — single file edit |
| F8 | LOW | byName() case sensitivity unspecified for OmniJS | ℹ️ data-model.md clarifies: case-insensitive in TypeScript for built-ins |

**Constitution Alignment**: All 10 principles PASS — 0 violations
**FR Coverage**: 43/43 (100%)
**iconColor Handling**: Verified correct (v4.5.2+ version gate, built-in rejection, idempotent overwrite)

---

## Phase 7: Implement

### Implement Prompt

```bash
/speckit.implement

## Approach: TDD-First

For each task:
1. RED: Write failing test
2. GREEN: Minimum code to pass
3. REFACTOR: Clean up
4. VERIFY: pnpm build && pnpm test

### Pre-Implementation
1. pnpm install
2. pnpm build (verify clean)
3. pnpm test (verify baseline)
4. Branch: 008-perspectives

### Implementation Notes
- Mirror notification-tools pattern for contract structure
- Test OmniJS scripts in Script Editor before integrating
- Use logger utility, never console.error
- All text files end with newline
- Remove legacy list_perspectives and get_perspective_view files after new tools are registered
- Verify iconColor in Script Editor before implementing set_perspective_icon
```

### Implementation Progress

| Phase | Tasks | Completed | Notes |
|-------|-------|-----------|-------|
| 1 - Setup | T001 | 1/1 | Directory structure |
| 2 - Foundation | T002-T011 | 10/10 | Contracts, shared schemas, barrel exports |
| 3 - List Perspectives (US1) | T012-T017 | 6/6 | Type filter, sorted, totalCount, v4.2+ filterAggregation |
| 4 - Get Perspective (US2) | T018-T023 | 6/6 | Filter rules, disambiguation, version gating |
| 5 - Switch Perspective (US3) | T024-T029 | 6/6 | UI-affecting, previousPerspective, NO_WINDOW error |
| 6 - Export Perspective (US4) | T030-T035 | 6/6 | Metadata or file save, z.union() for dual-success |
| 7 - Set Perspective Icon (US5) | T036-T041 | 6/6 | CSS hex → Color.RGB(), v4.5.2+ version gate |
| 8 - Legacy Cleanup | T042-T048 | 7/7 | Deleted legacy files, removed old registrations |
| 9 - Polish | T049-T057 | 9/9 | Server registration, full suite verification |

**Total: 57/57 tasks complete. 55 new tests. 2878 total tests across 130 files.**

---

## Post-Implementation Checklist

- [x] All tasks marked complete in tasks.md (57/57)
- [x] `pnpm lint` passes (380 files, 0 errors)
- [x] `pnpm typecheck` passes (clean)
- [x] `pnpm test` passes (2878 tests, 130 files)
- [x] `pnpm build` succeeds (ESM + CJS)
- [ ] OmniJS scripts verified in Script Editor (deferred — manual step)
- [x] Legacy tools removed (getPerspectiveView definition/primitive, OmnifocusPerspective interface)
- [ ] Manual OmniFocus verification (deferred — manual step)
- [x] PR created: https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/42
- [x] CLAUDE.md updated with 008-perspectives tech stack

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
omnifocus-mcp/
├── src/
│   ├── server.ts                       # MCP server entry point
│   ├── contracts/perspective-tools/    # Zod contracts (NEW)
│   ├── tools/
│   │   ├── definitions/                # MCP tool handlers (replace legacy)
│   │   └── primitives/                 # Business logic (replace legacy)
│   └── utils/
│       ├── omnifocusScripts/           # Pre-built OmniJS scripts
│       └── logger.ts                   # MCP-compliant logger
├── tests/
│   ├── unit/perspective-tools/         # Unit tests (NEW)
│   └── contract/perspective-tools/     # Contract tests (NEW)
└── specs/008-perspectives/             # Spec artifacts (NEW)
```
