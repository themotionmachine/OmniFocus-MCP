# Tasks: Notifications

**Input**: Design documents from `/specs/006-notifications/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/schemas.md
**Branch**: `006-notifications`

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Contracts: `src/contracts/notification-tools/`
- Shared schemas: `src/contracts/notification-tools/shared/`
- Primitives: `src/tools/primitives/`
- Definitions: `src/tools/definitions/`
- Contract tests: `tests/contract/notification-tools/`
- Unit tests: `tests/unit/notification-tools/`
- Integration tests: `tests/integration/notification-tools/`

---

## Phase 1: Setup

**Purpose**: Verify baseline and create directory structure for notification tools.

- [x] T001 Verify baseline: run `pnpm install && pnpm build && pnpm test` and confirm all 1922+ existing tests pass
- [x] T002 Create directory structure: `src/contracts/notification-tools/shared/`, `tests/contract/notification-tools/`, `tests/unit/notification-tools/`, `tests/integration/notification-tools/`

---

## Phase 2: Foundation (Shared Schemas)

**Purpose**: Core shared schemas that ALL 5 notification tools depend on. MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T003 Write contract tests for TaskIdentifierSchema: at-least-one refinement rejects empty, .min(1) rejects empty strings, taskId takes precedence, both optional individually, in tests/contract/notification-tools/shared-schemas.test.ts → verify FAILS (FR-001, FR-009, FR-018, FR-026, FR-034)
- [x] T004 Write contract tests for NotificationKindSchema (4 valid values: Absolute, DueRelative, DeferRelative, Unknown) and NotificationOutputSchema (discriminated union on `kind` with 3 variants: Absolute adds absoluteFireDate, Relative adds relativeFireOffset, Unknown has base only) in tests/contract/notification-tools/shared-schemas.test.ts → verify FAILS (FR-004, FR-004a, FR-004b, FR-007)

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T005 [P] Implement TaskIdentifierSchema with z.object({ taskId: z.string().min(1).optional(), taskName: z.string().min(1).optional() }).refine(atLeastOne) in src/contracts/notification-tools/shared/task-identifier.ts
- [x] T006 [P] Implement NotificationKindSchema, NotificationBaseSchema (index, kind, initialFireDate, nextFireDate, isSnoozed, repeatInterval), AbsoluteNotificationSchema (+ absoluteFireDate), RelativeNotificationSchema (kind: DueRelative|DeferRelative, + relativeFireOffset), UnknownNotificationSchema, and NotificationOutputSchema as discriminated union in src/contracts/notification-tools/shared/notification.ts
- [x] T007 Create barrel exports: src/contracts/notification-tools/shared/index.ts re-exports task-identifier and notification; src/contracts/notification-tools/index.ts re-exports shared and will later re-export tool schemas
- [x] T008 Verify shared schema contract tests GREEN: run `pnpm test tests/contract/notification-tools/shared-schemas.test.ts`

### 🔵 REFACTOR Phase

- [x] T009 Run `pnpm typecheck && pnpm lint && pnpm build` — foundation compiles clean with no errors

**Checkpoint**: Shared schemas ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — List Notifications (Priority: P1) 🎯 MVP

**Goal**: Read-only tool to list all notifications on a task with kind-conditional fields.

**Independent Test**: Call `list_notifications` with a task ID → receive notification array with correct kind, fire dates, and offset details.

**FRs**: FR-001 through FR-008, FR-043, FR-044, FR-046

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T010 [P] [US1] Write contract tests for ListNotificationsInputSchema (extends TaskIdentifier), ListNotificationsSuccessSchema ({success: true, taskId, taskName, count, notifications: NotificationOutput[]}), ListNotificationsErrorSchema, and DisambiguationErrorSchema variant in tests/contract/notification-tools/list-notifications.test.ts → verify FAILS (FR-001, FR-003, FR-005, FR-006)
- [x] T011 [P] [US1] Write unit tests for listNotifications primitive (mock executeOmniJS): task by ID returns notifications, task by name returns notifications, empty notifications returns count:0, mixed kinds (Absolute has absoluteFireDate, DueRelative has relativeFireOffset), disambiguation error with matchingIds, task not found error, in tests/unit/notification-tools/listNotifications.test.ts → verify FAILS (FR-001 through FR-008, FR-045)

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T012 [US1] Implement ListNotificationsInputSchema, ListNotificationsSuccessSchema, ListNotificationsErrorSchema, and ListNotificationsResponseSchema (union) in src/contracts/notification-tools/list-notifications.ts → contract tests GREEN (FR-003, FR-005, FR-006)
- [x] T013 [US1] Implement listNotifications primitive with generateListNotificationsScript(): task resolution via id/name with disambiguation, iterate task.notifications with kind detection (check Task.Notification.Kind constants + string fallback for DeferRelative), kind-conditional property reading (absoluteFireDate for Absolute, relativeFireOffset for DueRelative/DeferRelative), return JSON with count and notification array, in src/tools/primitives/listNotifications.ts → unit tests GREEN (FR-003, FR-004, FR-004a, FR-004b, FR-007, FR-008)
- [x] T014 [US1] Implement listNotifications MCP definition: export schema (ListNotificationsInputSchema) and handler function that calls primitive and returns MCP-formatted response, in src/tools/definitions/listNotifications.ts (FR-043, FR-044)

### 🔵 REFACTOR Phase

- [x] T015 [US1] Run `pnpm typecheck && pnpm lint && pnpm test` — all tests GREEN including new notification tests
- [x] T016 [US1] Manual verification: test list OmniJS script in Script Editor with a task that has mixed notification kinds — covered by integration test: mixed kinds on same task

**Checkpoint**: list_notifications fully functional — users can see existing notifications.

---

## Phase 4: User Story 2 — Add Notification (Priority: P1)

**Goal**: Add absolute (Date) or relative (seconds offset) notifications to a task.

**Independent Test**: Call `add_notification` with type "absolute"/"relative" → verify notification appears with correct kind and fire date.

**FRs**: FR-009 through FR-017, FR-043, FR-044, FR-046

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T017 [P] [US2] Write contract tests for AddNotificationInputSchema (discriminated union on type: absolute requires dateTime, relative requires offsetSeconds as finite number), AddNotificationSuccessSchema ({success, taskId, taskName, notification: NotificationOutput}), and response union in tests/contract/notification-tools/add-notification.test.ts → verify FAILS (FR-010, FR-011, FR-012, FR-014, FR-015, FR-016)
- [x] T018 [P] [US2] Write unit tests for addNotification primitive (mock executeOmniJS): absolute notification adds with correct Date, relative notification adds with offset, no effectiveDueDate returns error for relative, invalid dateTime returns error, positive offsetSeconds accepted, disambiguation error, task not found, in tests/unit/notification-tools/addNotification.test.ts → verify FAILS (FR-009 through FR-017, FR-045)

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T019 [US2] Implement AddNotificationInputSchema as discriminated union on `type` field (absolute variant: {type, dateTime: z.string()}, relative variant: {type, offsetSeconds: z.number().finite()}) merged with TaskIdentifier, plus success/error/response schemas in src/contracts/notification-tools/add-notification.ts → contract tests GREEN (FR-010, FR-011, FR-012, FR-015, FR-016)
- [x] T020 [US2] Implement addNotification primitive with generateAddNotificationScript(): task resolution, type branching — absolute: task.addNotification(new Date(dateTime)), relative: pre-check task.effectiveDueDate then task.addNotification(offsetSeconds) — read back added notification details with kind-conditional fields, escapeForJS() for dateTime string, in src/tools/primitives/addNotification.ts → unit tests GREEN (FR-009, FR-013, FR-014, FR-017)
- [x] T021 [US2] Implement addNotification MCP definition: export schema and handler in src/tools/definitions/addNotification.ts (FR-043, FR-044)

### 🔵 REFACTOR Phase

- [x] T022 [US2] Run `pnpm typecheck && pnpm lint && pnpm test` — all tests GREEN
- [x] T023 [US2] Manual verification: test add OmniJS script in Script Editor — both absolute Date and relative offset; verify ⚠️ unit is seconds — covered by integration test: relativeFireOffset === -3600 and initialFireDate tolerance check

**Checkpoint**: add_notification fully functional — users can add absolute and relative notifications.

---

## Phase 5: User Story 3 — Remove Notification (Priority: P2)

**Goal**: Remove a notification by index with proper index-to-object translation.

**Independent Test**: Call `remove_notification` with task ID and index → verify notification array shrinks by one and remainingCount is correct.

**FRs**: FR-018 through FR-025, FR-043, FR-044, FR-046

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T024 [P] [US3] Write contract tests for RemoveNotificationInputSchema (TaskIdentifier + index: z.number().int().min(0)), RemoveNotificationSuccessSchema ({success, taskId, taskName, removedIndex, remainingCount}), and response union in tests/contract/notification-tools/remove-notification.test.ts → verify FAILS (FR-019, FR-024)
- [x] T025 [P] [US3] Write unit tests for removeNotification primitive (mock executeOmniJS): successful removal returns removedIndex and remainingCount, index out of bounds returns error with valid range, no notifications returns "has no notifications to remove" error, disambiguation error, task not found, in tests/unit/notification-tools/removeNotification.test.ts → verify FAILS (FR-018 through FR-025, FR-045)

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T026 [US3] Implement RemoveNotificationInputSchema (TaskIdentifier + index: z.number().int().min(0)) and RemoveNotificationSuccessSchema, error, and response union schemas in src/contracts/notification-tools/remove-notification.ts → contract tests GREEN (FR-019)
- [x] T027 [US3] Implement removeNotification primitive with generateRemoveNotificationScript(): task resolution, pre-check task.notifications.length > 0, validate index < task.notifications.length, index-to-object translation (var notif = task.notifications[index]; task.removeNotification(notif)), return {removedIndex, remainingCount: task.notifications.length}, in src/tools/primitives/removeNotification.ts → unit tests GREEN (FR-020, FR-021, FR-022, FR-023, FR-024)
- [x] T028 [US3] Implement removeNotification MCP definition: export schema and handler in src/tools/definitions/removeNotification.ts (FR-043, FR-044)

### 🔵 REFACTOR Phase

- [x] T029 [US3] Run `pnpm typecheck && pnpm lint && pnpm test` — all tests GREEN
- [x] T030 [US3] Manual verification: test remove OmniJS script in Script Editor — verify index-to-object translation works — covered by integration test: add 3, remove middle, verify remaining offsets

**Checkpoint**: remove_notification fully functional — users can remove specific notifications by index.

---

## Phase 6: User Story 4 — Add Standard Notifications (Priority: P2)

**Goal**: Add preset notification patterns (day_before, hour_before, 15_minutes, week_before, standard) for quick setup.

**Independent Test**: Call `add_standard_notifications` with each preset → verify correct relative notifications are added with expected offsets.

**Depends on**: Phase 4 (US2) pattern — reuses `task.addNotification(offset)` OmniJS pattern.

**FRs**: FR-026 through FR-033, FR-043, FR-044, FR-046

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T031 [P] [US4] Write contract tests for AddStandardNotificationsInputSchema (TaskIdentifier + preset: z.enum 5 values), AddStandardNotificationsSuccessSchema ({success, taskId, taskName, addedCount, notifications: NotificationOutput[]}), and response union in tests/contract/notification-tools/add-standard-notifications.test.ts → verify FAILS (FR-027, FR-031)
- [x] T032 [P] [US4] Write unit tests for addStandardNotifications primitive (mock executeOmniJS): day_before adds 1 notif at -86400, hour_before at -3600, 15_minutes at -900, week_before at -604800, standard adds 2 notifs (-86400 and -3600), no effectiveDueDate returns error, additive behavior (existing notifications preserved), disambiguation error, in tests/unit/notification-tools/addStandardNotifications.test.ts → verify FAILS (FR-026 through FR-033, FR-045)

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T033 [US4] Implement AddStandardNotificationsInputSchema (TaskIdentifier + preset: z.enum(['day_before','hour_before','15_minutes','week_before','standard'])) and success/error/response schemas in src/contracts/notification-tools/add-standard-notifications.ts → contract tests GREEN (FR-027)
- [x] T034 [US4] Implement addStandardNotifications primitive with generateAddStandardNotificationsScript(): task resolution, preset-to-offsets map (standard → [-86400, -3600]), pre-check task.effectiveDueDate, loop task.addNotification(offset) for each offset, read back all added notifications with kind-conditional fields, in src/tools/primitives/addStandardNotifications.ts → unit tests GREEN (FR-028, FR-029, FR-030, FR-032)
- [x] T035 [US4] Implement addStandardNotifications MCP definition: export schema and handler in src/tools/definitions/addStandardNotifications.ts (FR-043, FR-044)

### 🔵 REFACTOR Phase

- [x] T036 [US4] Run `pnpm typecheck && pnpm lint && pnpm test` — all tests GREEN
- [x] T037 [US4] Manual verification: test standard notifications OmniJS script in Script Editor — verify each preset adds correct offsets — covered by integration tests: hour_before (-3600), 15_minutes (-900), week_before (-604800)

**Checkpoint**: add_standard_notifications fully functional — users can quickly add preset reminders.

---

## Phase 7: User Story 5 — Snooze Notification (Priority: P3)

**Goal**: Postpone Absolute notifications by updating absoluteFireDate to a new target time.

**Independent Test**: Call `snooze_notification` with task ID, notification index, and target datetime → verify notification's absoluteFireDate is updated and isSnoozed reflects change.

**FRs**: FR-034 through FR-042, FR-043, FR-044, FR-046

### 🔴 RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [x] T038 [P] [US5] Write contract tests for SnoozeNotificationInputSchema (TaskIdentifier + index: z.number().int().min(0) + snoozeUntil: z.string()), SnoozeNotificationSuccessSchema ({success, taskId, taskName, notification: NotificationOutput}), kind error response shape, and response union in tests/contract/notification-tools/snooze-notification.test.ts → verify FAILS (FR-035, FR-036, FR-039, FR-040)
- [x] T039 [P] [US5] Write unit tests for snoozeNotification primitive (mock executeOmniJS): successful snooze updates absoluteFireDate, non-Absolute kind returns "only Absolute notifications can be snoozed" error, no notifications returns "has no notifications to snooze" error, index out of bounds, invalid snoozeUntil, re-snooze (already snoozed notification), disambiguation error, in tests/unit/notification-tools/snoozeNotification.test.ts → verify FAILS (FR-034 through FR-042, FR-045)

### 🟢 GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [x] T040 [US5] Implement SnoozeNotificationInputSchema (TaskIdentifier + index: z.number().int().min(0) + snoozeUntil: z.string()) and success/error/response schemas in src/contracts/notification-tools/snooze-notification.ts → contract tests GREEN (FR-035, FR-036, FR-039)
- [x] T041 [US5] Implement snoozeNotification primitive with generateSnoozeNotificationScript(): task resolution, pre-check notifications.length > 0, validate index in bounds, check notification.kind is Absolute (error if DueRelative/DeferRelative/Unknown with specific message), set notification.absoluteFireDate = new Date(snoozeUntil), escapeForJS() for snoozeUntil, read back updated notification, in src/tools/primitives/snoozeNotification.ts → unit tests GREEN (FR-037, FR-037a, FR-038, FR-038a, FR-041)
- [x] T042 [US5] Implement snoozeNotification MCP definition: export schema and handler in src/tools/definitions/snoozeNotification.ts (FR-043, FR-044)

### 🔵 REFACTOR Phase

- [x] T043 [US5] Run `pnpm typecheck && pnpm lint && pnpm test` — all tests GREEN
- [x] T044 [US5] Manual verification: test snooze OmniJS script in Script Editor — verify ⚠️ invalid Date behavior for absoluteFireDate — covered by integration tests: "not-a-date" and "" both return error, existing notification untouched

**Checkpoint**: snooze_notification fully functional — users can postpone Absolute notifications.

---

## Phase 8: Integration & Polish

**Purpose**: Wire all 5 tools into MCP server, create integration scaffold, final validation.

- [x] T045 Register all 5 notification tools in src/server.ts: import each definition from src/tools/definitions/{listNotifications,addNotification,removeNotification,addStandardNotifications,snoozeNotification}.ts, call server.tool() for each with name, description, schema.shape, and handler — follow existing registration pattern in server.ts (FR-046)
- [x] T046 [P] Create integration test scaffold for manual OmniFocus verification (add → list → verify → snooze → verify → remove → verify round-trip) in tests/integration/notification-tools/notification-round-trip.test.ts (SC-010)
- [x] T047 [P] Update barrel export in src/contracts/notification-tools/index.ts to re-export all 5 tool schemas
- [x] T048 Run full validation: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all tests GREEN including all new notification tests
- [x] T049 Run `pnpm test:coverage` — pre-existing @vitest/coverage-v8 version mismatch with vitest 4.0.15 (not a notification-tools issue); all 2164 tests pass without coverage

**Checkpoint**: All 5 tools registered, compiled, tested, and ready for deployment.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 — List (Phase 3)**: Depends on Phase 2 — no other story dependencies
- **US2 — Add (Phase 4)**: Depends on Phase 2 — no other story dependencies
- **US3 — Remove (Phase 5)**: Depends on Phase 2 — no other story dependencies
- **US4 — Standard (Phase 6)**: Depends on Phase 2 + Phase 4 (reuses addNotification OmniJS pattern)
- **US5 — Snooze (Phase 7)**: Depends on Phase 2 — no other story dependencies
- **Integration (Phase 8)**: Depends on ALL user story phases complete

### User Story Dependencies

```text
Phase 2 (Foundation) ──┬──→ Phase 3 (US1 List) ───────────────────┐
                       ├──→ Phase 4 (US2 Add) ──→ Phase 6 (US4 Standard) ─┤
                       ├──→ Phase 5 (US3 Remove) ─────────────────┤
                       └──→ Phase 7 (US5 Snooze) ─────────────────┤
                                                                    └──→ Phase 8 (Integration)
```

### TDD Order Within Each User Story (MANDATORY)

```text
1. 🔴 RED: Write failing tests
   - Contract tests for schemas (validates shapes)
   - Unit tests for primitives (mock executeOmniJS, validates logic)
   - Run `pnpm test` → verify tests FAIL

2. 🟢 GREEN: Implement minimum code
   - Contract schemas first (types)
   - Primitives second (business logic + OmniJS script generation)
   - Definitions third (MCP interface)
   - Run `pnpm test` → tests turn GREEN

3. 🔵 REFACTOR: Clean up
   - Improve code quality, tests MUST stay GREEN
   - Manual OmniFocus Script Editor verification (last step)
```

### Parallel Opportunities

- **Within Foundation**: T003 + T004 sequential (same file: shared-schemas.test.ts); T005 + T006 in parallel (different files)
- **Across Stories after Foundation**: US1 + US2 + US3 + US5 can ALL run in parallel (4 independent stories)
- **Within Each Story**: RED tests always parallelizable (contract test + unit test are different files)
- **US4 constraint**: Must wait for US2 completion (reuses addNotification OmniJS pattern)

---

## TDD Parallel Example: US1 + US2 in Parallel

```bash
# After Foundation completes, launch both stories simultaneously:

# === Agent A: US1 (List) ===
# 🔴 RED:
Task: "T010 [P] [US1] Contract test" + "T011 [P] [US1] Unit test" (parallel within story)
# 🟢 GREEN:
Task: "T012 → T013 → T014" (sequential: schema → primitive → definition)
# 🔵 REFACTOR:
Task: "T015 + T016"

# === Agent B: US2 (Add) ===  (runs at same time as Agent A)
# 🔴 RED:
Task: "T017 [P] [US2] Contract test" + "T018 [P] [US2] Unit test" (parallel within story)
# 🟢 GREEN:
Task: "T019 → T020 → T021" (sequential: schema → primitive → definition)
# 🔵 REFACTOR:
Task: "T022 + T023"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (shared schemas)
3. Complete Phase 3: US1 — List Notifications (TDD cycle)
4. **STOP and VALIDATE**: All tests GREEN, list_notifications works in Script Editor
5. Early registration in server.ts for feedback

### Incremental Delivery

1. Setup + Foundation → Shared schemas ready
2. US1 (List) → TDD → All tests GREEN → Users can see notifications
3. US2 (Add) → TDD → All tests GREEN → Users can add notifications
4. US3 (Remove) + US5 (Snooze) → TDD → Users can manage notifications
5. US4 (Standard) → TDD → Users get preset convenience
6. Integration (Phase 8) → Final validation → Deploy

### Parallel Execution Strategy (4 Agents)

After Foundation completes, launch in parallel:

- **Agent A**: US1 (List) — no dependencies
- **Agent B**: US2 (Add) — no dependencies
- **Agent C**: US3 (Remove) — no dependencies
- **Agent D**: US5 (Snooze) — no dependencies

Then sequentially:

- **Agent E**: US4 (Standard) — after Agent B (US2) completes
- **Final**: Phase 8 (Integration) — after all stories complete

---

## Script Editor Verification Gates

⚠️ These MUST be verified in OmniFocus Script Editor before implementing the relevant phases:

1. **Before Phase 3 (US1)**: Verify `Task.Notification.Kind.DeferRelative` exists as enum constant (research.md Decision 8)
2. **Before Phase 4 (US2)**: Verify `addNotification(Number)` unit is seconds (quickstart.md verification script)
3. **Before Phase 7 (US5)**: Verify invalid Date behavior for `absoluteFireDate` (plan.md Open Items)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for FR traceability
- Each user story is independently completable and testable
- **TDD is mandatory** — tests MUST fail before implementation begins
- Commit after each TDD cycle (RED verified, GREEN achieved, REFACTOR done)
- All OmniJS scripts must use try-catch with JSON.stringify returns (FR-046)
- Use `logger` utility for all diagnostics, never `console.error`
- Use `escapeForJS()` for all user-provided strings in OmniJS scripts
- All text files must end with a newline
- Import paths require `.js` extension (ESM)
