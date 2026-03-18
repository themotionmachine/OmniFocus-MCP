# Implementation Plan: Notifications

**Branch**: `006-notifications` | **Date**: 2026-03-17 | **Spec**: [spec.md](spec.md)

## Summary

Implement 5 MCP tools for managing OmniFocus task notifications: list, add (absolute/relative),
remove, add presets, and snooze. Each tool follows the established definitions/primitives
separation with Zod contracts and OmniJS script generation via `executeOmniJS()`.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode, ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.27.x, Zod 4.x, tsup 8.5+
**Storage**: N/A (OmniFocus internal database via OmniJS)
**Testing**: Vitest 4.0+, Biome 2.3+ (lint)
**Target Platform**: macOS (OmniFocus + Node.js 24+)
**Project Type**: Single project (MCP server)
**Performance Goals**: Per-task operations; no special perf targets
**Constraints**: OmniJS API limitations on kind-conditional properties (see research.md)
**Scale/Scope**: 5 tools, ~15 source files, ~10 test files

## Constitution Check

*GATE: All principles verified against existing codebase patterns.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First | ✅ Pass | Zod schemas for all 5 tool inputs; strict mode; no `as Type` |
| II. Separation of Concerns | ✅ Pass | definitions/ for MCP handlers, primitives/ for business logic |
| III. Script Execution Safety | ✅ Pass | All OmniJS scripts wrapped in try-catch with JSON returns |
| IV. Structured Data Contracts | ✅ Pass | Contracts in `src/contracts/notification-tools/` with shared schemas |
| V. Defensive Error Handling | ✅ Pass | Per-tool error handling; disambiguation; bounds checking |
| VI. Build Discipline | ✅ Pass | No OmniJS script files to copy (scripts are generated inline) |
| VII. KISS | ✅ Pass | Simple per-task operations; no batch across tasks |
| VIII. YAGNI | ✅ Pass | No batch, no DeferRelative creation, no repeat editing |
| IX. SOLID | ✅ Pass | New definition/primitive pairs; no modification of existing tools |
| X. TDD | ✅ Pass | Contract tests → unit tests → implementation → integration |

**No violations. No complexity tracking needed.**

## Project Structure

### Documentation (this feature)

```text
specs/006-notifications/
├── plan.md              # This file
├── research.md          # OmniJS API research findings
├── data-model.md        # Notification entity model
├── quickstart.md        # Implementation quick-reference
├── contracts/           # Zod schema contracts (design reference)
├── checklists/          # Validation checklists
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── contracts/notification-tools/    # NEW: Zod schemas
│   ├── index.ts                     # Barrel export
│   ├── list-notifications.ts        # list_notifications schemas
│   ├── add-notification.ts          # add_notification schemas
│   ├── remove-notification.ts       # remove_notification schemas
│   ├── add-standard-notifications.ts # add_standard_notifications schemas
│   ├── snooze-notification.ts       # snooze_notification schemas
│   └── shared/
│       ├── index.ts                 # Barrel export
│       ├── task-identifier.ts       # Reusable id/name identifier schema
│       └── notification.ts          # NotificationOutput, NotificationKind schemas
│
├── tools/
│   ├── definitions/                 # NEW: MCP tool handlers (5 files)
│   │   ├── listNotifications.ts
│   │   ├── addNotification.ts
│   │   ├── removeNotification.ts
│   │   ├── addStandardNotifications.ts
│   │   └── snoozeNotification.ts
│   │
│   └── primitives/                  # NEW: Business logic (5 files)
│       ├── listNotifications.ts
│       ├── addNotification.ts
│       ├── removeNotification.ts
│       ├── addStandardNotifications.ts
│       └── snoozeNotification.ts
│
└── server.ts                        # MODIFIED: Register 5 new tools

tests/
├── contracts/notification-tools/    # NEW: Contract tests (5+ files)
│   ├── list-notifications.test.ts
│   ├── add-notification.test.ts
│   ├── remove-notification.test.ts
│   ├── add-standard-notifications.test.ts
│   ├── snooze-notification.test.ts
│   └── shared-schemas.test.ts
│
├── unit/notification-tools/         # NEW: Unit tests (5 files)
│   ├── listNotifications.test.ts
│   ├── addNotification.test.ts
│   ├── removeNotification.test.ts
│   ├── addStandardNotifications.test.ts
│   └── snoozeNotification.test.ts
│
└── integration/notification-tools/  # NEW: Integration test scaffold
    └── notification-round-trip.test.ts
```

**Structure Decision**: Single project following existing `contracts/ → primitives/ → definitions/`
architecture established by review-tools (005) and task-tools (003). New files only; no
modification of existing source files except `server.ts` (tool registration).

## Implementation Phases

### Phase 1: Foundation (Shared Schemas + Contracts)

**Goal**: All Zod schemas compiled and contract-tested before any business logic.

**Files**:

- `src/contracts/notification-tools/shared/task-identifier.ts` — Reusable TaskIdentifier schema
- `src/contracts/notification-tools/shared/notification.ts` — NotificationOutput, NotificationKind
- `src/contracts/notification-tools/shared/index.ts` — Barrel export
- `src/contracts/notification-tools/index.ts` — Barrel export
- `tests/contract/notification-tools/shared-schemas.test.ts` — Shared schema tests

**Key Design**:

- `TaskIdentifierSchema`: `z.object({ id?, name? }).refine(atLeastOne)` — reuses pattern from task-tools
- `NotificationKindSchema`: `z.enum(["Absolute", "DueRelative", "DeferRelative", "Unknown"])`
- `NotificationBaseSchema`: `{ index, kind, initialFireDate, nextFireDate, isSnoozed, repeatInterval }`
- `AbsoluteNotificationSchema`: base + `{ absoluteFireDate }`
- `RelativeNotificationSchema`: base + `{ relativeFireOffset }`
- `NotificationOutputSchema`: discriminated union on `kind`

### Phase 2: list_notifications (User Story 1 — P1)

**Goal**: Read-only tool; foundational for testing all other tools.

**Files**:

- `src/contracts/notification-tools/list-notifications.ts` — Input/Success/Error/Response schemas
- `tests/contract/notification-tools/list-notifications.test.ts` — Contract tests
- `src/tools/primitives/listNotifications.ts` — OmniJS script generation
- `tests/unit/notification-tools/listNotifications.test.ts` — Unit tests
- `src/tools/definitions/listNotifications.ts` — MCP handler

**OmniJS Script Pattern**:

```javascript
(function() {
  try {
    // Resolve task by id or name (disambiguation)
    // Iterate task.notifications, conditionally read kind-specific properties
    // Return { success: true, taskId, taskName, count, notifications: [...] }
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Critical**: Must check `notification.kind` before accessing `absoluteFireDate` or
`relativeFireOffset` to avoid OmniJS throws.

**DeferRelative Enum Handling**: `DeferRelative` is NOT in the official `Task.Notification.Kind`
enum (only Absolute, DueRelative, Unknown listed). Kind detection must handle both:

1. Enum constant comparison: `notif.kind === Task.Notification.Kind.DeferRelative` (if it exists)
2. String/toString fallback: compare kind string representation if enum constant is absent

Verify in Script Editor before implementation. If absent, DeferRelative notifications report
as "Unknown" and `relativeFireOffset` access must be guarded accordingly.

### Phase 3: add_notification (User Story 2 — P1)

**Goal**: Core write operation supporting both absolute dates and relative offsets.

**Files**:

- `src/contracts/notification-tools/add-notification.ts`
- `tests/contract/notification-tools/add-notification.test.ts`
- `src/tools/primitives/addNotification.ts`
- `tests/unit/notification-tools/addNotification.test.ts`
- `src/tools/definitions/addNotification.ts`

**Key Implementation**:

- Input discriminated by `type: "absolute" | "relative"`
- Absolute: `task.addNotification(new Date(dateTime))`
- Relative: Pre-check `task.effectiveDueDate` (NOT `task.dueDate` — includes inherited dates); then `task.addNotification(offsetSeconds)`
- **Unit is SECONDS** (⚠️ verify in Script Editor — see research.md)
- Return added notification details including index

### Phase 4: remove_notification (User Story 3 — P2)

**Goal**: Remove by index with proper object reference translation.

**Files**:

- `src/contracts/notification-tools/remove-notification.ts`
- `tests/contract/notification-tools/remove-notification.test.ts`
- `src/tools/primitives/removeNotification.ts`
- `tests/unit/notification-tools/removeNotification.test.ts`
- `src/tools/definitions/removeNotification.ts`

**Key Implementation**:

```javascript
// OmniJS: removeNotification takes OBJECT, not index
var notif = task.notifications[index];
task.removeNotification(notif);
```

- Validate index >= 0 and < task.notifications.length
- Return remaining count after removal

### Phase 5: add_standard_notifications (User Story 4 — P2)

**Goal**: Preset-based notification addition (depends on Phase 3 pattern).

**Files**:

- `src/contracts/notification-tools/add-standard-notifications.ts`
- `tests/contract/notification-tools/add-standard-notifications.test.ts`
- `src/tools/primitives/addStandardNotifications.ts`
- `tests/unit/notification-tools/addStandardNotifications.test.ts`
- `src/tools/definitions/addStandardNotifications.ts`

**Key Implementation**:

- Map preset name → offset array (e.g., `"standard"` → `[-86400, -3600]`)
- Pre-check `task.effectiveDueDate` (NOT `task.dueDate`; all presets are due-relative)
- Call `task.addNotification(offset)` for each offset in the array
- Additive: never clears existing notifications
- Return details of all added notifications

### Phase 6: snooze_notification (User Story 5 — P3)

**Goal**: Postpone Absolute notifications by setting `absoluteFireDate`.

**Files**:

- `src/contracts/notification-tools/snooze-notification.ts`
- `tests/contract/notification-tools/snooze-notification.test.ts`
- `src/tools/primitives/snoozeNotification.ts`
- `tests/unit/notification-tools/snoozeNotification.test.ts`
- `src/tools/definitions/snoozeNotification.ts`

**Key Implementation**:

- Validate notification at index has `kind === Task.Notification.Kind.Absolute`
- Error if relative: "Cannot snooze: only Absolute notifications can be snoozed"
- Set `notification.absoluteFireDate = new Date(snoozeUntil)`
- Return updated notification details

### Phase 7: Server Registration & Integration

**Goal**: Wire all 5 tools into the MCP server and verify end-to-end.

**Files**:

- `src/server.ts` — Add 5 `server.tool()` registrations
- `tests/integration/notification-tools/notification-round-trip.test.ts` — Integration scaffold

**Registration Pattern** (per tool):

```typescript
server.tool(
  'list_notifications',
  'List all notifications (reminders) on an OmniFocus task',
  listNotificationsTool.schema.shape,
  listNotificationsTool.handler
);
```

## Cross-Cutting Patterns

### Task Resolution (all 5 tools)

Every tool resolves a task by `id` or `name` using this shared OmniJS pattern:

```javascript
var foundTask = null;
if (id && id.length > 0) {
  foundTask = Task.byIdentifier(id);
} else if (name && name.length > 0) {
  var matches = [];
  flattenedTasks.forEach(function(task) {
    if (task.name === name) { matches.push(task); }
  });
  inbox.forEach(function(task) {
    if (task.name === name) {
      var isDuplicate = false;
      for (var i = 0; i < matches.length; i++) {
        if (matches[i].id.primaryKey === task.id.primaryKey) { isDuplicate = true; break; }
      }
      if (!isDuplicate) { matches.push(task); }
    }
  });
  // Handle 0, 1, or 2+ matches
}
```

### String Escaping (all primitives)

Reuse the `escapeForJS()` utility from existing primitives:

```typescript
function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
```

### Kind-Conditional Property Reading (list_notifications OmniJS)

```javascript
var notifData = {
  index: i,
  kind: kindStr,
  initialFireDate: notif.initialFireDate ? notif.initialFireDate.toISOString() : null,
  nextFireDate: notif.nextFireDate ? notif.nextFireDate.toISOString() : null,
  isSnoozed: notif.isSnoozed,
  repeatInterval: notif.repeatInterval > 0 ? notif.repeatInterval : null
};
if (kindStr === 'Absolute') {
  notifData.absoluteFireDate = notif.absoluteFireDate.toISOString();
}
if (kindStr === 'DueRelative' || kindStr === 'DeferRelative') {
  notifData.relativeFireOffset = notif.relativeFireOffset;
}
```

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Unit seconds vs minutes ambiguity | HIGH — 60x wrong offset | Verify in Script Editor before Phase 3 implementation |
| `absoluteFireDate` throws on relative | HIGH — runtime crash | Check `kind` before access in all OmniJS scripts |
| Notification index shift after removal | MEDIUM — stale indices | Document clearly; user calls `list_notifications` first |
| `addNotification` throws without due date | MEDIUM — unhelpful error | Pre-check `task.effectiveDueDate` in OmniJS script |
| DeferRelative kind may not exist in all OmniFocus versions | **MEDIUM** ⬆️ | `DeferRelative` NOT in official Kind enum. Verify in Script Editor. Fallback: string comparison or map to "Unknown". Report but don't create. |

## Open Items

- **⚠️ Script Editor Verification (Unit)**: Confirm `addNotification(Number)` unit is seconds by running
  test script in OmniFocus Script Editor. Must be done before Phase 3 implementation.
- **⚠️ Script Editor Verification (DeferRelative)**: Confirm `Task.Notification.Kind.DeferRelative`
  exists as an enum constant. If absent, DeferRelative notifications may report as "Unknown" kind.
  Must be done before Phase 2 implementation (list_notifications kind detection logic).
- **⚠️ Script Editor Verification (Invalid Date)**: Test behavior of setting `absoluteFireDate` to
  an invalid Date (`new Date("invalid")`). Undocumented in official API. Must be done before Phase 6
  (snooze_notification).
- **Integration testing**: Requires OmniFocus running; integration test scaffold is manual-trigger only.
