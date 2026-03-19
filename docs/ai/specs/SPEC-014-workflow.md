# SpecKit Workflow: SPEC-014 — Window & UI Control

**Created**: 2026-03-18
**Purpose**: Track SPEC-014 through all 7 SpecKit phases with review gates.

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ✅ Complete | 16 FRs, 6 stories, 31 scenarios, 8 edge cases |
| Clarify | `/speckit.clarify` | ✅ Complete | 2 sessions, 10 questions, 7 decisions; tree.select, nodesForObjects, extending, reveal 1-10 |
| Plan | `/speckit.plan` | ✅ Complete | 8 ADs, 8 research tasks, 11 contract files, 10/10 constitution pass |
| Checklist | `/speckit.checklist` | ✅ Complete | 3 domains, 137 items, 23 gaps remediated |
| Tasks | `/speckit.tasks` | ✅ Complete | 79 tasks, 9 phases, 46 parallel (58%), 22 FRs covered |
| Analyze | `/speckit.analyze` | ✅ Complete | 0 CRITICAL, 0 HIGH, 5 MEDIUM, 2 LOW — all remediated |
| Implement | `/speckit.implement` | ✅ Complete | 79/79 tasks, 8 tools, 250 new tests (3073 total) |

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
- Branch: `014-window-ui` (worktree)

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-014 |
| **Name** | Window & UI Control |
| **Branch** | `014-window-ui` |
| **Dependencies** | None (Phases 0-5 complete) |
| **Enables** | None directly (SPEC-020 requires all specs complete) |
| **Priority** | P3 |
| **Tier** | 3 (parallel with SPEC-010, SPEC-012) |

### Success Criteria Summary

- [x] 8 MCP tools implemented: `reveal_items`, `expand_items`, `collapse_items`, `expand_notes`, `collapse_notes`, `focus_items`, `unfocus`, `select_items`
- [x] Zod contracts in `src/contracts/window-tools/`
- [x] All tools operate on `document.windows[0]` (primary window)
- [x] `reveal_items` uses `tree.reveal(nodes)` to navigate outline
- [x] `expand_items`/`collapse_items` use `node.expand(completely?)`/`node.collapse(completely?)`
- [x] `expand_notes`/`collapse_notes` use `node.expandNote(completely?)`/`node.collapseNote(completely?)`
- [x] `focus_items` sets `window.focus = [projects/folders]`
- [x] `unfocus` sets `window.focus = []` (empty array, NOT null)
- [x] `select_items` uses `tree.select(nodes, extending)`
- [ ] OmniFocus 4+ version requirement enforced with clear error message for OF3
- [ ] macOS-only `content` property documented and enforced
- [ ] UI side-effect warnings in all tool descriptions
- [ ] Full TDD with contract + unit tests
- [ ] OmniJS Script Editor verification (manual step)

---

## Phase 1: Specify

**Output:** `specs/014-window-ui/spec.md`

### Specify Prompt

```bash
/speckit.specify

## Feature: Window & UI Control

### Problem Statement
OmniFocus users need UI navigation and control through the MCP server — revealing items
in the outline, expanding/collapsing nodes and notes, focusing on specific projects or
folders, and selecting items programmatically. These operations enable AI assistants to
navigate the OmniFocus UI on behalf of the user, supporting workflows like "show me this
project" or "focus on my Work folder." Currently, there is no programmatic control over
the OmniFocus window state through the MCP server.

### Users
GTD practitioners using AI assistants to navigate and control the OmniFocus UI for
focused task engagement and visual review workflows.

### User Stories
1. As a GTD practitioner, I want to reveal a specific task or project in the outline so the AI can navigate me directly to items we're discussing
2. As a GTD practitioner, I want to expand or collapse outline nodes so the AI can control the detail level of what I see during reviews
3. As a GTD practitioner, I want to expand or collapse notes on items so I can see or hide note content during review workflows
4. As a GTD practitioner, I want to focus on a specific project or folder so the AI can narrow my view to a relevant area during context-based work
5. As a GTD practitioner, I want to unfocus (clear focus) so the AI can return me to the full view after focused work
6. As a GTD practitioner, I want to select specific items in the outline so the AI can prepare selections for batch operations or visual review

### Technical Context from Master Plan
- 8 MCP tools: `reveal_item`, `expand_items`, `collapse_items`, `expand_notes`, `collapse_notes`, `focus_items`, `unfocus`, `select_items`
- All tools operate on `document.windows[0]` (primary window)
- `reveal_item` uses `tree.reveal(nodes)` — navigates outline to show the specified item
- `expand_items`/`collapse_items` use `node.expand(completely?)`/`node.collapse(completely?)` — toggle outline disclosure
- `expand_notes`/`collapse_notes` use `node.expandNote(completely?)`/`node.collapseNote(completely?)` — toggle note visibility
- `focus_items` sets `window.focus = [projects/folders]` — focuses view on specific items
- `unfocus` sets `window.focus = []` (empty array) — clears focus, returns to full view. **Note:** Official docs specify empty array `[]`, NOT `null`.
- `select_items` uses `window.selectObjects(items)` — selects items in the current view
- **Version requirement**: All tools require OmniFocus 4+ (node tree API). Version detection with clear error message for OF3.
- **Platform requirement**: `content` property on DocumentWindow is **macOS only**. All content tree operations (reveal, expand, collapse) are macOS only.
- **UI side-effect warning**: All tools in this spec change the user's visible UI state. Tool descriptions must clearly communicate this.

### Constraints
- All operations must use OmniJS execution via `executeOmniFocusScript()`
- Follow existing definitions/primitives/contracts architecture (50+ tools already established)
- Contracts go in `src/contracts/window-tools/`
- Definitions in `src/tools/definitions/`, primitives in `src/tools/primitives/`
- All OmniJS scripts must use the IIFE + try-catch + JSON.stringify pattern
- **OmniFocus 4+ required** — the ContentTree/node API does not exist in OF3. No fallback for OF3 — return version error.
- **macOS only** — `content` property on DocumentWindow is macOS-only. All content tree operations are macOS only.
- **UI side effects** — all 8 tools change the user's visible UI state. Tool descriptions MUST warn AI assistants about this.
- Use Zod 4.x for all input validation, no `as Type` assertions
- `unfocus` uses empty array `[]`, NOT `null` — this is explicitly documented in OmniFocus API
- Version detection pattern: `app.userVersion.atLeast(new Version('4.0'))` (established by SPEC-007 advanced repetition)

### Key OmniJS APIs (from master plan)
- `document.windows[0]` — primary DocumentWindow
- `document.windows[0].content` — ContentTree (macOS only, OF4+)
- `tree.rootNode` — root of the content tree
- `tree.nodeForObject(item)` — find node for a database object
- `tree.reveal(nodes)` — reveal nodes in the outline
- `node.expand(completely?)` — expand node (optional: expand all children)
- `node.collapse(completely?)` — collapse node
- `node.expandNote(completely?)` — show note for node
- `node.collapseNote(completely?)` — hide note for node
- `window.focus = [items]` — focus on projects/folders
- `window.focus = []` — unfocus (clear focus, show full view)
- `window.selectObjects(items)` — select items in current view
- `app.userVersion.atLeast(new Version('4.0'))` — version detection

### Out of Scope
- Sidebar/inspector visibility toggling (low value, high risk of user confusion)
- Multi-window management (complexity with minimal benefit)
- Reading selection state (add in future if needed)
- OF3 fallback — tools return version error on OF3
- iOS/iPadOS support — content tree is macOS only
```

### Specify Results

| Metric | Value |
|--------|-------|
| Functional Requirements | 16 (FR-001 through FR-016) |
| User Stories | 6 (US1-US6) |
| Acceptance Scenarios | 31 |
| Edge Cases | 8 |
| Success Criteria | 9 |
| Assumptions | 12 |

### Files Generated

- [x] `specs/014-window-ui/spec.md`
- [x] `specs/014-window-ui/checklists/requirements.md`

---

## Phase 2: Clarify

**When to run:** After Specify — OmniJS ContentTree/node API behavior needs verification.

### Clarify Prompts

#### Pre-Answered (from master plan — do not re-ask)

- All tools require OmniFocus 4+ for the ContentTree/node API
- `content` property on DocumentWindow is macOS only
- `unfocus` uses empty array `[]`, NOT `null`
- `window.focus` accepts projects and folders
- Version detection uses `app.userVersion.atLeast(new Version('4.0'))`

#### Session 1: ContentTree & Node API Behavior

```bash
/speckit.clarify Focus on OmniJS ContentTree and node API:
- Does `document.windows[0].content` return a ContentTree object? What properties does it have (rootNode, selectedNodes, etc.)?
- Does `tree.nodeForObject(item)` work for all item types (tasks, projects, folders, tags)? Or only certain types?
- What does `tree.reveal(nodes)` accept — an array of Node objects? A single node? What does it return (void or the revealed nodes)?
- Does `node.expand(completely)` — what is the type of `completely`? Boolean? What is the default if omitted?
- What happens when calling `tree.nodeForObject()` for an item not visible in the current perspective? Does it return null or throw?
```

#### Session 2: Focus & Selection API Behavior

```bash
/speckit.clarify Focus on focus and selection APIs:
- Does `window.focus` accept only projects and folders, or also tasks? What happens if you pass a tag or task?
- What does `window.selectObjects(items)` accept — database objects directly, or nodes? Does it return anything?
- Can `focus_items` accept multiple items (e.g., focus on two folders simultaneously)?
- What is the initial state of `window.focus` — is it an empty array by default, or null?
- How does `focus` interact with perspectives — does focusing override the perspective's filter, or work within it?
```

### Clarify Results

| Session | Focus Area | Questions | Key Outcomes |
|---------|------------|-----------|--------------|
| 1 | ContentTree & Node APIs | 5 | tree.select() over selectObjects, TreeNode terminology, nodesForObjects for batch, tags supported, nodeForObject returns null |
| 2 | Focus & Selection APIs | 5 | focus null vs [] asymmetric, extending param exposed, reveal accepts 1-10, select void return, focus-perspective independent |

---

## Phase 3: Plan

**Output:** `specs/014-window-ui/plan.md`

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
- Contracts go in `src/contracts/window-tools/`
- Definitions in `src/tools/definitions/`, primitives in `src/tools/primitives/`
- All OmniJS scripts use the IIFE + try-catch + JSON.stringify pattern
- OmniFocus 4+ version detection required for ALL 8 tools
- macOS-only platform check required for content tree operations
- UI side-effect warnings in all tool descriptions
- Use logger utility for all diagnostics (never console.error)

## Architecture Notes
- All 8 tools share a common pattern: get window → get content tree → operate on nodes
- Version detection should be a shared utility or guard at the start of each OmniJS script
- Platform detection: check for `document.windows[0].content` existence (undefined on iOS)
- `completely` parameter on expand/collapse is optional boolean — maps to OmniJS `completely` param
- Focus and unfocus are simple property assignments — no ContentTree needed
- Select uses `window.selectObjects()` which takes database objects, not tree nodes
- Consider shared schemas for WindowResult, NodeIdentifier
- Expand/collapse tools could accept arrays of item IDs for batch node operations
- `reveal_item` likely only accepts a single item (or small set) — verify in clarify
```

### Plan Results

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ✅ | 8 architecture decisions, 10/10 constitution gates PASS |
| `research.md` | ✅ | 8 research tasks resolved (R1-R8) |
| `data-model.md` | ✅ | 5 entities: WindowItemIdentifier, WindowBatchItemResult, BatchSummary, FocusTarget, DisambiguationCandidate |
| `contracts/` | ✅ | 11 files (3 shared + 8 tool contracts) |
| `quickstart.md` | ✅ | OmniJS patterns for all 8 tools |

---

## Phase 4: Domain Checklists

### Recommended Domains

| Signal in Spec/Plan | Recommended Domain | Justification |
|---|---|---|
| OmniFocus 4+ version detection, ContentTree API, macOS-only platform check | **api-workaround** | Unverified APIs, version gating, platform constraints |
| 8 tool contracts, shared node/window schemas | **type-safety** | New contracts with version-gated response types |
| UI side-effect tools, version/platform errors | **api-contracts** | Error response schemas, warning metadata in responses |

#### 1. api-workaround Checklist

Why: Multiple unverified OmniJS APIs — ContentTree, node operations, focus/select — all require OF4+ version and macOS platform detection.

```bash
/speckit.checklist api-workaround

Focus on Window & UI Control requirements:
- `document.windows[0].content` — ContentTree availability on macOS vs iOS
- `tree.nodeForObject(item)` — return type when item not visible, item type support
- `tree.reveal(nodes)` — parameter type (array vs single), return value
- `node.expand(completely)` / `node.collapse(completely)` — parameter semantics
- `node.expandNote(completely)` / `node.collapseNote(completely)` — existence verification
- `window.focus = [items]` — what item types accepted, behavior with empty array
- `window.selectObjects(items)` — parameter type (objects vs nodes), return value
- Version detection pattern: `app.userVersion.atLeast(new Version('4.0'))`
- Pay special attention to: ContentTree existence check as macOS platform gate
```

#### 2. type-safety Checklist

Why: 8 new tools with version-gated behavior and UI-affecting operations need careful response schema design.

```bash
/speckit.checklist type-safety

Focus on Window & UI Control requirements:
- Zod 4.x schemas for all 8 tool inputs and outputs
- No `as Type` assertions anywhere
- Item identifier input: accept task/project/folder IDs (shared ItemIdentifier pattern)
- Response schema: should include `uiChanged: true` metadata for UI-affecting tools
- Version error response: structured error with minimum version requirement
- Platform error response: structured error for iOS/non-macOS platforms
- `completely` parameter: optional boolean with clear default documentation
- Pay special attention to: shared version/platform guard response schemas
```

#### 3. api-contracts Checklist

Why: All 8 tools have UI side effects and version/platform constraints that need consistent error handling contracts.

```bash
/speckit.checklist api-contracts

Focus on Window & UI Control requirements:
- Consistent success/failure discriminated union for all 8 tools
- Version error code (e.g., VERSION_TOO_OLD) with minimum version in response
- Platform error code (e.g., PLATFORM_NOT_SUPPORTED) for non-macOS
- NO_WINDOW error if `document.windows.length === 0`
- ITEM_NOT_FOUND error for invalid item IDs
- NODE_NOT_FOUND error when item exists but has no tree node (not visible in current perspective)
- All tools should include `toolAffectsUI: true` in metadata or description
- Pay special attention to: error code consistency across all 8 tools
```

### Checklist Results

| Checklist | Items | Gaps | Spec References |
|-----------|-------|------|-----------------|
| api-workaround | 45 | 8 (all remediated) | FR-001, FR-010, FR-011, FR-015 |
| type-safety | 45 | 8 (all remediated) | FR-010, FR-011, FR-014, FR-018, FR-019, FR-020 |
| api-contracts | 47 | 7 (all remediated) | FR-021, FR-022 |
| **Total** | **137** | **23 (all remediated)** | |

---

## Phase 5: Tasks

**Output:** `specs/014-window-ui/tasks.md`

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
1. Foundation (shared schemas, contracts infrastructure, version/platform guards)
2. Reveal Item (US1) — independently testable [P]
3. Expand/Collapse Items (US2) — independently testable [P]
4. Expand/Collapse Notes (US3) — independently testable [P]
5. Focus Items (US4) — independently testable [P]
6. Unfocus (US5) — independently testable [P]
7. Select Items (US6) — independently testable [P]
8. Integration testing & polish

## Constraints
- Contracts in `src/contracts/window-tools/`
- Definitions in `src/tools/definitions/`
- Primitives in `src/tools/primitives/`
- Tests: `tests/contract/window-tools/`, `tests/unit/window-tools/`
- TDD: Red→Green→Refactor for every task
- All 8 tools share version/platform guard pattern — implement in foundation phase
- Mirror existing tool patterns (find switch_perspective or set_floating_timezone and follow their structure)
```

### Tasks Results

| Metric | Value |
|--------|-------|
| **Total Tasks** | 79 (T001-T079) |
| **Phases** | 9 (Setup, Foundation, US1-US6, Integration & Polish) |
| **Parallel Opportunities** | 46 tasks (58%) marked [P]; all 6 US phases parallel after Foundation |
| **User Stories Covered** | 6/6 (US1: 7, US2: 12, US3: 10, US4: 7, US5: 7, US6: 7 tasks) |
| **FR Coverage** | FR-001 through FR-022 (all 22 FRs with traceability matrix) |

---

## Phase 6: Analyze

### Analyze Prompt

```bash
/speckit.analyze

Focus on:
1. Constitution alignment — verify coding standards compliance
2. Coverage gaps — ensure all 6 user stories and all FRs have tasks
3. Consistency between task file paths and actual project structure
4. Verify version detection (OF4+) is implemented consistently across all 8 tools
5. Verify platform detection (macOS only) is implemented consistently
6. Verify UI side-effect warnings are present in all tool descriptions
7. Verify error codes are consistent across all 8 tools (VERSION_TOO_OLD, PLATFORM_NOT_SUPPORTED, NO_WINDOW, ITEM_NOT_FOUND, NODE_NOT_FOUND)
```

### Analysis Results

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| F1 | MEDIUM | Version guard error message inconsistency in quickstart.md/research.md | ✅ Updated to match FR-010 pattern |
| F2 | MEDIUM | Content tree guard message inconsistency; "macOS only" contradicts API gap resolution | ✅ Updated to match FR-011; removed incorrect macOS-only framing |
| F3 | MEDIUM | Window guard message missing second sentence in research.md | ✅ Updated to match FR-014 |
| F4 | MEDIUM | research.md R1 factual error claiming content tree macOS-only | ✅ Rewritten to reflect multi-platform per API gap resolution |
| F5 | MEDIUM | focus_items batch limit (50) missing from FR-006 and Assumptions | ✅ Added 1-50 limit to FR-006 and Assumptions |
| F6 | LOW | plan.md Phase 2 still showed "PENDING" after tasks.md generated | ✅ Updated to "COMPLETE" |
| F7 | LOW | FR-019 traceability matrix incomplete in tasks.md | ✅ Extended to cover all batch tool phases |

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

1. Verify worktree: `git branch` shows `014-window-ui`
2. Verify baseline: `pnpm test` — all existing tests pass
3. Verify build: `pnpm build` — clean
4. Verify lint: `pnpm lint` — clean
5. Create spec output dir: `specs/014-window-ui/`

### Implementation Notes
- Mirror existing tool patterns (find switch_perspective for UI-affecting tool pattern)
- Version detection: use `app.userVersion.atLeast(new Version('4.0'))` — established by SPEC-007
- Platform detection: check `document.windows[0].content !== undefined` as macOS gate
- All OmniJS scripts need window existence check: `document.windows.length > 0`
- ContentTree operations: get window → get content → get tree → find node → operate
- Focus/unfocus are simpler: get window → set focus property
- Select: get window → resolve items → call selectObjects()
- Register all 8 tools in `src/server.ts`
- Run `pnpm build` after every source change
- Use logger utility for all diagnostics
```

### Implementation Progress

| Phase | Tasks | Completed | Notes |
|-------|-------|-----------|-------|
| 1 - Setup & Foundation | 23 | 23 | Shared schemas, contracts, guards |
| 2 - Reveal Items (US1) | 7 | 7 | ContentTree + nodeForObject + reveal |
| 3 - Expand/Collapse Items (US2) | 12 | 12 | node.expand/collapse with completely param |
| 4 - Expand/Collapse Notes (US3) | 10 | 10 | node.expandNote/collapseNote |
| 5 - Focus Items (US4) | 7 | 7 | window.focus = [items] |
| 6 - Unfocus (US5) | 7 | 7 | window.focus = [] |
| 7 - Select Items (US6) | 7 | 7 | tree.select(nodes, extending) |
| 8 - Integration & Polish | 6 | 6 | Server registration, build, final tests |

**Total: 79/79 tasks complete. 250 new tests. 3073 total tests across 142 files.**

---

## Post-Implementation Checklist

- [x] All tasks marked complete in tasks.md (79/79)
- [x] Typecheck passes: `pnpm typecheck` (0 errors)
- [x] Tests pass: `pnpm test` (3073 tests, 142 files)
- [x] Build succeeds: `pnpm build` (ESM + CJS clean)
- [x] Lint passes: `pnpm lint`
- [x] All 8 tools registered in `src/server.ts`
- [ ] Manual OmniJS Script Editor verification
- [x] PR created: https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/45
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
├── server.ts                          # MCP server entry point (register 8 new tools here)
├── contracts/
│   └── window-tools/                  # NEW: Zod contracts for 8 window tools + shared schemas
├── tools/
│   ├── definitions/                   # NEW: 8 tool definition files
│   └── primitives/                    # NEW: 8 primitive files
tests/
├── contract/
│   └── window-tools/                  # NEW: Contract tests
├── unit/
│   └── window-tools/                  # NEW: Unit tests
└── integration/
    └── window-ui/                     # NEW: Integration tests (optional)
specs/
└── 014-window-ui/                     # Spec artifacts
```
