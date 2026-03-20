---

description: "Task list template — OmniFocus MCP preset (TDD mandatory, integration tests mandatory)"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## NON-NEGOTIABLE: TDD Red-Green-Refactor

Every task MUST follow strict TDD. This is not optional.

### For EVERY task:

1. **RED** — Write failing tests FIRST:
   - Contract tests for input/output schemas (Zod validation)
   - Unit tests for business logic
   - Integration tests for end-to-end behavior
   - Run tests → verify they FAIL with real assertion errors
   - Do NOT write implementation code yet

2. **GREEN** — Write MINIMUM code to pass:
   - Implement only what's needed to make tests green
   - Run tests → verify they PASS
   - Do NOT optimize or refactor yet

3. **REFACTOR** — Clean up while green:
   - Improve code quality, remove duplication
   - Run tests → verify they STAY GREEN

### Banned Test Patterns

The following are NOT tests and MUST NEVER appear:

```
it.todo('should ...')           ← placeholder, not a test
it.skip('should ...', () => {}) ← skipped, never runs
xit('should ...', () => {})     ← skipped, never runs
test.todo('should ...')         ← placeholder, not a test
it('should ...', () => {})      ← empty body, no assertions
```

Every test MUST have: setup → call → assertion (expect/assert).

### Test Types Required Per Task

| Test Type | Purpose | Location | Required? |
|-----------|---------|----------|-----------|
| Contract | Validate Zod input/output schemas | `tests/contract/<domain>/` | YES |
| Unit | Test business logic in isolation | `tests/unit/<domain>/` | YES |
| Integration | End-to-end behavior verification | `tests/integration/` | YES (per spec) |

### Test Commands

Discover test commands from `package.json` before writing tests.
Many projects have separate configs for unit vs integration tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Architecture: Definitions + Primitives

Each tool domain follows the definitions/primitives split:

- **Definitions** (`src/tools/definitions/<domain>.ts`) — Tool schemas, MCP handler registration, input/output types
- **Primitives** (`src/tools/primitives/<domain>.ts`) — Core business logic, OmniJS script generation + execution
- **Contracts** (`src/contracts/<domain>/`) — Zod schemas for all inputs, outputs, and shared types

## OmniJS Script Conventions

All primitives that interact with OmniFocus use Omni Automation JavaScript:

```javascript
(function() {
  try {
    // OmniJS logic here
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

- Always wrap in IIFE with try-catch
- Always return structured JSON (never raw strings)
- Use `Task.byIdentifier()`, `Project.byIdentifier()`, `Folder.byIdentifier()`
- Never silently swallow exceptions

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Create Zod contract schemas in `src/contracts/<domain>/`
- [ ] T003 [P] Configure any new dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation (MANDATORY — TDD Red phase)

> **Write these tests FIRST. Run them. Verify they FAIL.**

- [ ] T004 [P] Contract tests for shared schemas in `tests/contract/<domain>/`
- [ ] T005 [P] Unit tests for shared utilities in `tests/unit/<domain>/`

### Implementation for Foundation (TDD Green phase)

- [ ] T006 Implement shared types and schemas (make T004 pass)
- [ ] T007 Implement shared utilities (make T005 pass)

### Verification

- [ ] T008 Run full verification suite (build + typecheck + lint + unit tests + integration tests)

**Checkpoint**: Foundation ready — all tests pass, user story implementation can begin

---

## Phase 3: User Story 1 - [Title] (Priority: P1) MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (MANDATORY — TDD Red phase)

> **Write these tests FIRST. Run them. Verify they FAIL.**

- [ ] T009 [P] [US1] Contract tests for tool inputs/outputs in `tests/contract/<domain>/`
- [ ] T010 [P] [US1] Unit tests for primitive logic in `tests/unit/<domain>/`

### Implementation for User Story 1 (TDD Green phase)

- [ ] T011 [P] [US1] Create tool definition in `src/tools/definitions/<domain>.ts`
- [ ] T012 [US1] Create tool primitive in `src/tools/primitives/<domain>.ts`
- [ ] T013 [US1] Register tool in `src/server.ts`

### Verification for User Story 1

- [ ] T014 [US1] Run full verification suite — all tests pass

**Checkpoint**: User Story 1 fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

[Follow same pattern: Tests FIRST → Implementation → Verification]

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N-1: Integration Tests (MANDATORY)

**Purpose**: End-to-end verification across all user stories

- [ ] TXXX Create spec-specific integration tests in `tests/integration/<spec-name>.integration.test.ts`
- [ ] TXXX Run integration tests with the integration test command (NOT the default unit test command)
- [ ] TXXX Verify all integration tests pass

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX Code cleanup and refactoring (tests must stay green)
- [ ] TXXX Run full verification suite (build + typecheck + lint + unit tests + integration tests)
- [ ] TXXX Verify 0 `it.todo()` or placeholder tests in any test file
