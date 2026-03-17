# SpecKit Workflow: SPEC-006 — Notifications

**Created**: 2026-03-17
**Purpose**: Track SPEC-006 through all 7 SpecKit phases with review gates.

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ✅ Complete | 46 FRs, 5 user stories, 10 SCs, 0 clarifications |
| Clarify | `/speckit.clarify` | ✅ Complete | 4 clarifications via OmniJS API research; 5 critical spec corrections |
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

| Principle | Requirement | Verification |
|-----------|-------------|--------------|
| Type Safety | Zod schemas for all inputs, no `as Type` | `pnpm typecheck` ✅ |
| Test-First | TDD Red→Green→Refactor | `pnpm test` ✅ (1924 tests, 90 files) |
| OmniJS-First | All operations via OmniJS execution | Baseline verified ✅ |
| Simplicity | Single responsibility, no premature abstractions | Baseline verified ✅ |

**Constitution Check:** ✅ (2026-03-17)

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-006 |
| **Name** | Notifications |
| **Branch** | `006-notifications` |
| **Dependencies** | None (Phases 0-5 complete) |
| **Enables** | None |
| **Priority** | P2 |

### Success Criteria Summary

- [ ] 5 MCP tools implemented: `list_notifications`, `add_notification`, `remove_notification`, `add_standard_notifications`, `snooze_notification`
- [ ] Zod contracts in `src/contracts/notification-tools/` for all 5 tools
- [ ] Absolute and relative notification support (`add_notification`)
- [ ] Preset-based notifications (`add_standard_notifications`)
- [ ] Snooze functionality via `absoluteFireDate` manipulation
- [ ] Full TDD with contract + unit tests
- [ ] OmniJS Script Editor verification

---

## Phase 1: Specify

**Output:** `specs/006-notifications/spec.md`

### Specify Prompt

```bash
/speckit.specify

## Feature: Notifications

### Problem Statement
OmniFocus users need to manage task notifications (reminders) through the MCP server.
Currently there is no way to list, add, remove, or snooze notifications via AI assistants.

### Users
GTD practitioners using AI assistants to manage OmniFocus tasks who need reminder management.

### User Stories
1. As a GTD practitioner, I want to list all notifications on a task so I can see what reminders are set
2. As a GTD practitioner, I want to add a notification at a specific date/time so I'm reminded at the right moment
3. As a GTD practitioner, I want to add a notification relative to the due date (e.g., 1 hour before) so reminders auto-adjust
4. As a GTD practitioner, I want to remove a specific notification from a task
5. As a GTD practitioner, I want to add standard notification presets (day before, hour before, 15 min, week before) for quick setup
6. As a GTD practitioner, I want to snooze a notification to a later time

### Technical Context from Master Plan
- 5 MCP tools: list_notifications, add_notification, remove_notification, add_standard_notifications, snooze_notification
- OmniJS APIs: task.notifications, task.addNotification(dateOrOffset), task.removeNotification(notificationObject)
- relativeFireOffset is in MINUTES (not seconds)
- addNotification(Number) also takes minutes
- Task.Notification.Kind: Absolute, DueRelative, DeferRelative, Unknown
- remove_notification takes index in MCP contract but must retrieve object internally via task.notifications[index]
- Presets: day_before (-1440 min), hour_before (-60 min), 15_minutes (-15 min), week_before (-10080 min), standard (day + hour)
- snooze_notification sets absoluteFireDate on existing notification

### Constraints
- Follow definitions/primitives separation pattern from existing tools
- All OmniJS scripts must use try-catch with JSON.stringify returns
- Zod 4.x for all input validation
- Must handle tasks without due dates gracefully (relative notifications need due dates)

### Out of Scope
- Notification repeat interval editing
- Push notification integration (platform limitation)
```

### Specify Results

| Metric | Value |
|--------|-------|
| Functional Requirements | FR-001 through FR-046 (46 total) |
| User Stories | 5 (2x P1, 2x P2, 1x P3) |
| Acceptance Scenarios | 24 across all stories |
| Success Criteria | SC-001 through SC-010 |
| NEEDS CLARIFICATION | 0 (resolved via informed assumptions) |
| Checklist | All items passing |

### Key Design Decisions

- Per-task only — no batch operations across tasks (AI assistants loop if needed)
- Index-based notification identification (0-based, matching `task.notifications` order)
- Additive presets — `add_standard_notifications` appends, never clears existing
- Absolute snooze — `snooze_notification` takes ISO 8601 target time
- No DeferRelative creation — `list_notifications` reports them, creation is OmniFocus-internal

### Files Generated

- [x] `specs/006-notifications/spec.md`
- [x] `specs/006-notifications/checklists/requirements.md`

---

## Phase 2: Clarify (Optional but Recommended)

### Clarify Prompts

#### Session 1: OmniJS API Focus

```bash
/speckit.clarify Focus on OmniJS API: notification object structure, edge cases with missing due dates for relative notifications, DeferRelative vs DueRelative behavior, snooze mechanism via absoluteFireDate
```

#### Session 2: Error Handling Focus

```bash
/speckit.clarify Focus on error handling: what happens when adding relative notification to task without due date, removing notification by invalid index, snoozing an already-fired notification, adding duplicate notifications
```

### Clarify Results

| Session | Focus Area | Questions | Key Outcomes |
|---------|------------|-----------|--------------|
| 1 | OmniJS API | 4 (2 user-answered, 2 resolved by docs) | 5 critical spec corrections (see below) |
| 2 | Error Handling | 0 (all already covered) | No ambiguities — all 4 focus areas pre-addressed in spec |

#### Critical Corrections from OmniJS API Research

1. **`absoluteFireDate` is Absolute-kind-only** — throws on relative notifications. Spec updated: FR-004 split into FR-004/004a/004b with kind-conditional fields. `initialFireDate` is now the universal fire date.
2. **`relativeFireOffset` is relative-kind-only** — throws on Absolute. Spec updated: conditional access based on `kind`.
3. **Unit is SECONDS, not minutes** — official code examples + task-notifications.html confirm. All preset values updated (e.g., day_before: -86400 sec). `offsetMinutes` renamed to `offsetSeconds`.
4. **Snooze restricted to Absolute kind** — `absoluteFireDate` setter throws on relative. FR-037a added. New error message for snooze on relative notifications.
5. **Positive offsets are valid** — official docs explicitly support "before (negative) or after (positive)" offsets.

---

## Phase 3: Plan

**Output:** `specs/006-notifications/plan.md`

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
- Contracts in src/contracts/notification-tools/
- Use Calendar API for date math where applicable
- Logger utility for all diagnostics (never console.error)

## Architecture Notes
- Mirror existing patterns from review-tools (005) or task-tools (003)
- Notification removal requires object reference, not index — primitive must handle translation
- relativeFireOffset in minutes (OmniFocus convention)
```

### Plan Results

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ⏳ | |
| `research.md` | ⏳ | OmniJS notification API research |
| `data-model.md` | ⏳ | Notification entities |
| `contracts/` | ⏳ | 5 tool contracts |
| `quickstart.md` | ⏳ | |

---

## Phase 4: Domain Checklists

### Recommended Domains

| Signal | Domain | Justification |
|--------|--------|---------------|
| OmniJS notification API workarounds | **api-workaround** | Index-to-object translation, minutes convention |
| Input validation (dates, indices, presets) | **type-safety** | Zod contracts, edge cases |
| Requirements coverage | **requirements** | Ensure all 6 user stories covered |

### Checklist Prompts

#### 1. API Workaround Checklist

```bash
/speckit.checklist api-workaround

Focus on Notifications requirements:
- Index-to-object translation for remove_notification
- Minutes convention for relativeFireOffset and addNotification(Number)
- absoluteFireDate manipulation for snooze
- Handling tasks without due dates for relative notifications
- Pay special attention to: DeferRelative vs DueRelative notification kinds
```

#### 2. Type Safety Checklist

```bash
/speckit.checklist type-safety

Focus on Notifications requirements:
- Zod schemas for all 5 tools (input + output)
- ISO 8601 date validation for absolute notifications
- Notification index bounds checking
- Preset name validation (enum of valid presets)
- Pay special attention to: minutes vs seconds confusion in relative offsets
```

#### 3. Requirements Checklist

```bash
/speckit.checklist requirements

Focus on Notifications requirements:
- All 6 user stories have functional requirements
- Edge cases: no due date, empty notification list, invalid index
- Batch behavior for add_standard_notifications
- Pay special attention to: complete coverage of NotificationKind enum in list output
```

### Checklist Results

| Checklist | Items | Gaps | Spec References |
|-----------|-------|------|-----------------|
| api-workaround | | | |
| type-safety | | | |
| requirements | | | |

---

## Phase 5: Tasks

**Output:** `specs/006-notifications/tasks.md`

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
1. Foundation (shared schemas, contracts)
2. List Notifications (US1) — independently testable
3. Add Notification (US2, US3) — independently testable
4. Remove Notification (US4) — independently testable
5. Standard Notifications (US5) — depends on add
6. Snooze Notification (US6) — independently testable
7. Server registration & integration

## Constraints
- Contracts in src/contracts/notification-tools/
- Primitives in src/tools/primitives/
- Definitions in src/tools/definitions/
- Tests in tests/unit/notification-tools/ and tests/contracts/notification-tools/
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
1. Constitution alignment — Zod validation, TDD, OmniJS-first
2. Coverage gaps — all 6 user stories and FRs have tasks
3. File path consistency with project structure
4. Verify notification-specific edge cases covered (no due date, invalid index)
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

For each task:
1. RED: Write failing test
2. GREEN: Minimum code to pass
3. REFACTOR: Clean up
4. VERIFY: pnpm build && pnpm test

### Pre-Implementation
1. pnpm install
2. pnpm build (verify clean)
3. pnpm test (verify baseline)
4. Branch: 006-notifications

### Implementation Notes
- Mirror review-tools pattern for contract structure
- Test OmniJS scripts in Script Editor before integrating
- Use logger utility, never console.error
- All text files end with newline
```

### Implementation Progress

| Phase | Tasks | Completed | Notes |
|-------|-------|-----------|-------|
| 1 - Foundation | | | |
| 2 - List Notifications | | | |
| 3 - Add Notification | | | |
| 4 - Remove Notification | | | |
| 5 - Standard Notifications | | | |
| 6 - Snooze Notification | | | |
| 7 - Integration | | | |

---

## Post-Implementation Checklist

- [ ] All tasks marked complete in tasks.md
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (all existing + new)
- [ ] `pnpm build` succeeds
- [ ] OmniJS scripts verified in Script Editor
- [ ] Manual OmniFocus verification
- [ ] PR created targeting `main`
- [ ] CLAUDE.md updated with phase status

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
│   ├── server.ts                    # MCP server entry point
│   ├── contracts/notification-tools/ # Zod contracts (NEW)
│   ├── tools/
│   │   ├── definitions/             # MCP tool handlers
│   │   └── primitives/              # Business logic
│   └── utils/
│       ├── omnifocusScripts/        # Pre-built OmniJS scripts
│       └── logger.ts                # MCP-compliant logger
├── tests/
│   ├── unit/notification-tools/     # Unit tests (NEW)
│   └── contracts/notification-tools/ # Contract tests (NEW)
└── specs/006-notifications/         # Spec artifacts (NEW)
```
