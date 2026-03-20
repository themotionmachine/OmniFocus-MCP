# Tasks: Verify-Tasks Phantom Completion Detector

**Input**: Design documents from `/specs/001-verify-tasks-phantom/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/command-interface.md

**Tests**: Test fixtures are included per SC-001/SC-002 requirements in the feature specification. These are synthetic validation fixtures, not unit tests — they provide known-good and known-bad inputs for manual agent-session testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **commands/**: Prompt-driven command files (one per slash command)
- **tests/**: Synthetic test fixtures for validation
- This is a spec-kit extension — no `src/`, `models/`, or `services/` directories. The extension is entirely prompt-driven.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the project directory structure per plan.md

- [X] T001 Create project directory structure: commands/, tests/fixtures/phantom-tasks/src/, tests/fixtures/genuine-tasks/src/, tests/fixtures/edge-cases/, tests/fixtures/scalability/src/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Scaffold the command file and write the core steps that ALL user stories depend on (argument parsing, task parsing, diff scope determination)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Create command file scaffold with YAML frontmatter (description, handoffs), ## User Input section with $ARGUMENTS placeholder, and ## Outline skeleton in commands/speckit.verify-tasks.md
- [X] T003 Write Outline Step 1: Prerequisites check — call check-prerequisites.sh --json to discover FEATURE_DIR, validate tasks.md exists, handle missing-file error condition in commands/speckit.verify-tasks.md
- [X] T004 Write Outline Step 2: Task parsing — extract all [X] tasks from tasks.md including flexible ID extraction, file paths, code references (symbol names), acceptance criteria, subtask depth, and markers; report warnings for malformed entries per FR-001 through FR-004 in commands/speckit.verify-tasks.md
- [X] T005 Write Outline Step 3: Diff scope determination — parse --scope argument (branch|uncommitted|plan-anchored|all, default all), detect git availability, determine base ref per R-004, handle graceful degradation when git is unavailable per FR-010 through FR-013 in commands/speckit.verify-tasks.md

**Checkpoint**: Foundation ready — command file has structural scaffold, argument parsing, task extraction, and diff scope logic. User story implementation can now proceed.

---

## Phase 3: User Story 1 — Post-Implementation Verification (Priority: P1) 🎯 MVP

**Goal**: Verify that every task marked [X] in tasks.md has corresponding evidence of implementation via a five-layer verification cascade producing a structured markdown report.

**Independent Test**: Create a tasks.md with a mix of genuinely completed and phantom-completed tasks, run /speckit.verify-tasks, confirm all phantoms are flagged while genuine completions are verified.

### Implementation for User Story 1

- [X] T006 [US1] Write fresh-session advisory banner instruction — prominent warning at start of every verification run per FR-035 and Constitution Principle II in commands/speckit.verify-tasks.md
- [X] T007 [US1] Write Outline Step 4: Layer 1 — File existence verification — for each file path referenced in a task, check whether the file exists at the expected path per FR-009 in commands/speckit.verify-tasks.md
- [X] T008 [US1] Write Outline Step 5: Layer 2 — Git diff cross-reference — check whether referenced files were modified within the determined diff scope, skip gracefully if git unavailable per FR-010 and FR-013 in commands/speckit.verify-tasks.md
- [X] T009 [US1] Write Outline Step 6: Layer 3 — Content pattern matching — search modified files for expected symbols, patterns, or behaviors described in the task (function names, type definitions, configuration entries) per FR-014 in commands/speckit.verify-tasks.md
- [X] T010 [US1] Write Outline Step 7: Layer 4 — Dead-code detection — for symbols that exist, check whether they are referenced, called, or imported using multi-pass grep/git-grep strategy per FR-015, FR-016, and R-003 in commands/speckit.verify-tasks.md
- [X] T011 [US1] Write Outline Step 8: Layer 5 — Semantic assessment — for tasks that cannot be verified mechanically, perform best-effort semantic assessment by reading relevant files; clearly label results as interpretive per FR-017 and FR-018 in commands/speckit.verify-tasks.md
- [X] T012 [US1] Write Outline Step 9: Evidence level assignment — combine all layer results into a TaskVerdict per data-model.md rules (VERIFIED requires ALL mechanical layers positive, semantic alone never VERIFIED, ambiguous → PARTIAL/WEAK) per FR-019 and R-006 in commands/speckit.verify-tasks.md
- [X] T013 [US1] Write Outline Step 10: Verification report generation — produce verify-tasks-report.md with header, summary scorecard, flagged items sorted by severity (NOT_FOUND → PARTIAL → WEAK), verified items, per-task detail rows, machine-parseable verdict lines per FR-020 through FR-025 and the report contract in contracts/command-interface.md; write to specs/{feature}/verify-tasks-report.md per FR-024; overwrite any existing report file per FR-036
- [X] T014 [P] [US1] Create phantom-tasks test fixture: tasks.md with 10 [X] tasks (5 planted phantoms — missing file, empty file, declared-but-unused symbol, wrong file modified, behavioral gap) and src/ with partial/missing source files in tests/fixtures/phantom-tasks/
- [X] T015 [P] [US1] Create genuine-tasks test fixture: tasks.md with 10 [X] tasks that are all genuinely and correctly implemented, with complete src/ files that pass all five verification layers in tests/fixtures/genuine-tasks/
- [X] T016 [P] [US1] Create edge-cases test fixture: tasks.md with edge-case entries — no file paths (behavioral-only), malformed entries (missing IDs, broken checkbox syntax), glob patterns, nested subtasks, and zero [X] tasks scenario in tests/fixtures/edge-cases/tasks.md
- [X] T017 [US1] Create expected-verdicts.md documenting the expected evidence level for every task in every test fixture (phantom, genuine, edge-case) with rationale per SC-001 and SC-002 in tests/expected-verdicts.md

**Checkpoint**: User Story 1 is fully functional — the command can verify all [X] tasks through the five-layer cascade and produce a complete verification report. Test fixtures are available for validation.

---

## Phase 4: User Story 2 — Targeted Re-Verification After Fixes (Priority: P2)

**Goal**: Allow developers to re-run verification on specific tasks they have fixed, confirming gaps are closed without re-checking the entire task list.

**Independent Test**: Run full verification, fix one flagged task, re-run with a task filter for that task ID, confirm only that task is re-checked and now passes.

### Implementation for User Story 2

- [X] T018 [US2] Add task filter conditional logic to the verification loop — when task IDs are specified in $ARGUMENTS, only verify those tasks; when no filter is active, verify all [X] tasks; warn and skip unknown task IDs per FR-029 and FR-030 in commands/speckit.verify-tasks.md

**Checkpoint**: User Story 2 is complete — users can re-verify specific tasks by ID.

---

## Phase 5: User Story 4 — Interactive Flagged-Item Walkthrough (Priority: P2)

**Goal**: After report generation, walk the user through each flagged item interactively, explaining the evidence gap and offering to investigate further or attempt a fix.

**Independent Test**: Run verification on a codebase with known gaps, confirm the tool presents each flagged item with an explanation, the specific layer that failed, and offers investigate/fix/skip options.

### Implementation for User Story 4

- [X] T019 [US4] Write Outline Step 11: Interactive walkthrough — after report generation, present flagged items in severity order (NOT_FOUND → PARTIAL → WEAK), explain the evidence gap for each, offer "Investigate further?" / "Attempt fix?" / "Skip" per flagged item, require explicit user confirmation before any code modification per FR-026 through FR-028 in commands/speckit.verify-tasks.md

**Checkpoint**: User Story 4 is complete — flagged items are walked through interactively with fix offers requiring user approval.

---

## Phase 6: User Story 3 — Historical Branch Verification (Priority: P3)

**Goal**: Enable developers to run verify-tasks against a previously-completed feature branch to assess whether phantom completions exist in already-completed work.

**Independent Test**: Check out a historical feature branch with a completed tasks.md, run /speckit.verify-tasks with branch-scoped diff, confirm the report correctly identifies the implementation state.

### Implementation for User Story 3

- [X] T020 [US3] Add historical branch usage notes section to the Outline — write agent instructions for handling branch-scoped verification edge cases: (a) detecting files deleted in subsequent commits and flagging as NOT_FOUND, (b) extracting plan.md date for plan-anchored scope, (c) a usage example showing `--scope branch` invocation; insert as a subsection within the Outline after the report generation step in commands/speckit.verify-tasks.md

**Checkpoint**: User Story 3 is complete — the tool works correctly for retroactive verification of historical branches.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, cross-agent compatibility, and validation

- [X] T021 [P] Add comprehensive error condition messaging to the Outline — handle all error/warning cases from the error conditions table in contracts/command-interface.md (no tasks.md found, no [X] tasks, shallow clone warning, malformed task entries, task filter references non-existent ID) as early-exit or warning instructions in commands/speckit.verify-tasks.md
- [X] T022 [P] Produce a cross-agent compatibility checklist as a comment block at the end of commands/speckit.verify-tasks.md — enumerate every shell command and agent capability used (file read, grep, find, git diff, git log, git grep, git status), confirm each is available on Claude Code, GitHub Copilot, Gemini CLI, Cursor, and Windsurf per FR-033; flag and rewrite any agent-specific syntax found
- [X] T023 Run quickstart.md validation — execute the three-step validation process (copy test fixture → run /speckit.verify-tasks → compare report against expected-verdicts.md) for each fixture category (phantom, genuine, edge-cases); pass criteria: all phantom fixture verdicts match expected-verdicts.md exactly, all genuine fixture tasks produce zero NOT_FOUND, all edge-case warnings are emitted; if any mismatch is found, document the discrepancy and loop back to the relevant task for correction
- [X] T024 [P] Create a 50-task synthetic fixture in tests/fixtures/scalability/ with tasks.md containing 50 [X] tasks of varied types (file-referencing, behavioral-only, nested subtasks, glob patterns) and corresponding src/ files; run /speckit.verify-tasks against it and confirm the command completes without session overflow or truncation per SC-003

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational phase completion — BLOCKS US2, US4 (which build on US1's verification infrastructure)
- **US2 (Phase 4)**: Depends on US1 completion (task filter operates on the verification loop built in US1)
- **US4 (Phase 5)**: Depends on US1 completion (walkthrough operates on the report produced by US1)
- **US3 (Phase 6)**: Depends on US1 completion (historical verification uses the same cascade built in US1)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories — **THIS IS THE MVP**
- **User Story 2 (P2)**: Can start after US1 is complete — adds targeted filter on top of US1 infrastructure
- **User Story 4 (P2)**: Can start after US1 is complete — adds interactive walkthrough on top of US1 report generation
- **User Story 3 (P3)**: Can start after US1 is complete — existing diff scope mechanics handle this; adds documentation/guidance
- **US2, US4, US3 can proceed in parallel** once US1 is complete (they modify different sections of the command file)

### Within Each User Story

- Core verification logic before report generation
- Report generation before interactive walkthrough
- Implementation of command file sections before test fixture creation
- Test fixtures before expected-verdicts.md

### Parallel Opportunities

- **Phase 2**: T003, T004, T005 are independent command file sections but target the same file — write sequentially within the outline structure
- **Phase 3**: T014, T015, T016 (test fixtures) can run in parallel — they are completely separate directories and files
- **Phase 4, 5, 6**: US2, US4, US3 can run in parallel after US1 — each modifies a different section of the command file
- **Phase 7**: T021, T022, and T024 can run in parallel — error handling, compatibility review, and scalability fixture are independent concerns

---

## Parallel Example: User Story 1 Test Fixtures

```bash
# After T013 (report generation) is complete, launch all test fixtures in parallel:
Task T014: "Create phantom-tasks test fixture in tests/fixtures/phantom-tasks/"
Task T015: "Create genuine-tasks test fixture in tests/fixtures/genuine-tasks/"
Task T016: "Create edge-cases test fixture in tests/fixtures/edge-cases/"

# Then T017 (expected-verdicts.md) depends on T014-T016 being complete
```

## Parallel Example: P2/P3 User Stories

```bash
# After Phase 3 (US1) checkpoint, launch all three stories in parallel:
Task T018: "[US2] Task filter conditional logic"
Task T019: "[US4] Interactive walkthrough"
Task T020: "[US3] Historical branch usage notes"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (directory structure)
2. Complete Phase 2: Foundational (command scaffold, argument parsing, task parsing, diff scope)
3. Complete Phase 3: User Story 1 (five-layer cascade, report generation, test fixtures)
4. **STOP and VALIDATE**: Run /speckit.verify-tasks against phantom-tasks and genuine-tasks fixtures; compare against expected-verdicts.md
5. If validation passes → MVP is complete

### Incremental Delivery

1. Complete Setup + Foundational → Command file scaffold ready
2. Add User Story 1 → Validate against fixtures → **MVP shipped** (full verification + report)
3. Add User Story 2 → Validate task filter re-verification → Targeted re-verification available
4. Add User Story 4 → Validate interactive walkthrough → Guided resolution workflow available
5. Add User Story 3 → Validate historical branch → Retroactive verification available
6. Polish → Error hardening + cross-agent review + quickstart validation → Extension complete

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. One developer implements US1 (the MVP)
3. Once US1 checkpoint passes:
   - Developer A: User Story 2 (task filter)
   - Developer B: User Story 4 (interactive walkthrough)
   - Developer C: User Story 3 (historical branch)
4. Stories complete and merge independently into the command file

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- This extension is 100% prompt-driven — all implementation is writing markdown instructions in commands/speckit.verify-tasks.md
- The command file is the main deliverable; test fixtures validate correctness
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
