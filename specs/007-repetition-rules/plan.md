# Implementation Plan: Repetition Rule Management

**Branch**: `worktree-007-repetition` | **Date**: 2026-03-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-repetition-rules/spec.md`

## Summary

Repetition Rule Management provides five MCP tools for reading, setting,
clearing, and configuring task/project repetition rules in OmniFocus. This
enables AI assistants and power users to manage recurring task schedules
programmatically.

**Primary Requirements:**

- `get_repetition`: Read the current repetition rule (ICS string + v4.7+ metadata)
- `set_repetition`: Set a repetition rule using a raw ICS recurrence string
- `clear_repetition`: Remove a repetition rule (make non-recurring)
- `set_common_repetition`: Set from 8 named presets (daily, weekdays, weekly, etc.)
- `set_advanced_repetition`: Configure v4.7+ params (schedule type, anchor, catch-up)

**Technical Approach:**

- All operations use pure OmniJS via `executeOmniJS()`
- ICS strings are opaque — passed through to OmniFocus without validation
- `set_common_repetition` generates ICS strings server-side in TypeScript
- `set_advanced_repetition` uses read-then-merge pattern (c-command.com proven)
- Version detection via `app.userVersion.atLeast(new Version('4.7'))`
- Legacy 2-param constructor for basic tools; 5-param for advanced (v4.7+ only)

## Technical Context

**Language/Version**: TypeScript 5.9+ with strict mode (ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.27.x, Zod 4.x, tsup 8.5+
**Storage**: N/A (OmniFocus internal database via OmniJS)
**Testing**: Vitest 4.0+ with V8 coverage
**Target Platform**: macOS (OmniFocus Pro with Omni Automation)
**Project Type**: Single project (established MCP server structure)
**Performance Goals**: N/A (single-item operations, sub-second expected)
**Constraints**: v4.7+ for advanced features; all versions for basic tools
**Scale/Scope**: Single task/project per call (no batch operations)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First Development | ✅ PASS | Zod schemas for all 5 tools (FR-008), TypeScript strict mode |
| II. Separation of Concerns | ✅ PASS | Definitions in `definitions/`, primitives in `primitives/`, contracts in `contracts/` |
| III. Script Execution Safety | ✅ PASS | All OmniJS wrapped in try-catch with JSON error returns (FR-007) |
| IV. Structured Data Contracts | ✅ PASS | JSON responses with success/failure, ICS strings as opaque strings |
| V. Defensive Error Handling | ✅ PASS | Version errors, NOT_FOUND errors, missing ruleString errors |
| VI. Build Discipline | ✅ PASS | Standard `pnpm build` workflow, no OmniJS script files to copy |
| VII. KISS | ✅ PASS | Follows established patterns from Phase 5; preset logic is simple mapping |
| VIII. YAGNI | ✅ PASS | Only spec'd requirements; no batch operations, no ICS parsing |
| IX. SOLID | ✅ PASS | Single responsibility per file, definitions/primitives separation |
| X. TDD | ✅ PASS | Contract tests → Unit tests → Implementation → Manual verification |

**Violations Requiring Justification**: None

## Project Structure

### Documentation (this feature)

```text
specs/007-repetition-rules/
├── spec.md              # Feature specification ✅
├── research.md          # Phase 0 output (API research) ✅
├── plan.md              # This file ✅
├── data-model.md        # Phase 1 output (entity definitions) ✅
├── quickstart.md        # Phase 1 output (OmniJS patterns) ✅
├── checklists/          # Requirements and validation checklists ✅ EXISTS
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── contracts/
│   └── repetition-tools/              # NEW - Zod schemas
│       ├── shared/
│       │   ├── repetition-enums.ts   # ScheduleType, AnchorDateKey, PresetName, DayAbbreviation enums
│       │   ├── repetition-rule.ts    # RepetitionRuleDataSchema
│       │   └── index.ts
│       ├── get-repetition.ts
│       ├── set-repetition.ts
│       ├── clear-repetition.ts
│       ├── set-common-repetition.ts
│       ├── set-advanced-repetition.ts
│       └── index.ts
├── tools/
│   ├── definitions/
│   │   ├── getRepetition.ts           # NEW
│   │   ├── setRepetition.ts           # NEW
│   │   ├── clearRepetition.ts         # NEW
│   │   ├── setCommonRepetition.ts     # NEW
│   │   └── setAdvancedRepetition.ts   # NEW
│   └── primitives/
│       ├── getRepetition.ts           # NEW
│       ├── setRepetition.ts           # NEW
│       ├── clearRepetition.ts         # NEW
│       ├── setCommonRepetition.ts     # NEW
│       └── setAdvancedRepetition.ts   # NEW
└── server.ts                          # Tool registration (5 new tools)

tests/
├── contract/
│   └── repetition-tools/              # NEW
│       ├── get-repetition.test.ts
│       ├── set-repetition.test.ts
│       ├── clear-repetition.test.ts
│       ├── set-common-repetition.test.ts
│       ├── set-advanced-repetition.test.ts
│       └── shared-schemas.test.ts
└── unit/
    └── repetition-tools/              # NEW
        ├── getRepetition.test.ts
        ├── setRepetition.test.ts
        ├── clearRepetition.test.ts
        ├── setCommonRepetition.test.ts
        └── setAdvancedRepetition.test.ts
```

**Structure Decision**: Single project layout following established Phase 5 patterns.
Contracts in `src/contracts/repetition-tools/`, following `review-tools/` organization
with `shared/` subdirectory for reusable schemas (RepetitionRuleData, PresetName,
ScheduleType, AnchorDateKey).

## Implementation Strategy

### Key OmniJS Patterns (from research.md)

**Item Resolution (Task or Project):**

```javascript
// All tools use this pattern — ID can be task OR project
var task = Task.byIdentifier(id);
var itemName = '';
if (task) {
  itemName = task.name;
} else {
  var project = Project.byIdentifier(id);
  if (project) {
    task = project.task;  // root task holds repetition rule
    itemName = project.name;
  }
}
if (!task) {
  return JSON.stringify({ success: false, error: "Item not found" });
}
```

**Legacy Constructor (set_repetition, set_common_repetition):**

```javascript
task.repetitionRule = new Task.RepetitionRule(ruleString, null);
// method param is deprecated — always null
```

**v4.7+ Read-Then-Merge (set_advanced_repetition — CRITICAL):**

```javascript
// Read existing rule properties
var existingRule = task.repetitionRule;
if (!existingRule && !providedRuleString) {
  return JSON.stringify({
    success: false,
    error: 'ruleString required when no existing rule'
  });
}

// Merge: provided values override existing
var rs = providedRuleString || existingRule.ruleString;
var st = providedScheduleType || (existingRule ? existingRule.scheduleType : null);
var ak = providedAnchorDateKey || (existingRule ? existingRule.anchorDateKey : null);
var cu = (providedCatchUp !== null) ? providedCatchUp
  : (existingRule ? existingRule.catchUpAutomatically : null);

task.repetitionRule = new Task.RepetitionRule(rs, null, st, ak, cu);
```

**Version Detection (set_advanced_repetition):**

```javascript
if (!app.userVersion.atLeast(new Version('4.7'))) {
  return JSON.stringify({
    success: false,
    error: 'Advanced repetition requires OmniFocus v4.7+. Current: '
      + app.userVersion.versionString
  });
}
```

**Clear Rule:**

```javascript
task.repetitionRule = null;  // makes task non-recurring
```

### Preset → ICS Mapping (Server-Side TypeScript)

ICS string generation happens in the `setCommonRepetition` primitive, NOT in
OmniJS. The OmniJS script receives the pre-computed ICS string.

| Preset | Base ICS | Optional Modifier |
|--------|---------|-------------------|
| `daily` | `FREQ=DAILY` | — |
| `weekdays` | `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` | — |
| `weekly` | `FREQ=WEEKLY` | `days` → `;BYDAY=MO,WE,FR` |
| `biweekly` | `FREQ=WEEKLY;INTERVAL=2` | `days` → `;BYDAY=...` |
| `monthly` | `FREQ=MONTHLY` | `dayOfMonth` → `;BYMONTHDAY=15` |
| `monthly_last_day` | `FREQ=MONTHLY;BYMONTHDAY=-1` | — |
| `quarterly` | `FREQ=MONTHLY;INTERVAL=3` | `dayOfMonth` → `;BYMONTHDAY=...` |
| `yearly` | `FREQ=YEARLY` | — |

### Reusable Patterns

The following patterns from existing tools will be reused:

- **`escapeForJS()`**: String escaping for OmniJS embedding (from `setPlannedDate.ts`)
- **`executeOmniJS()`**: Script execution function (from `scriptExecution.ts`)
- **Item resolution**: Task-or-project ID pattern (similar to review-tools)
- **Contract structure**: Input/Success/Error/Response discriminated unions (from `review-tools/`)

### Key Differences from Review System (005)

| Aspect | Review System | Repetition Rules |
|--------|--------------|------------------|
| Operations | Batch (array of projects) | Single item |
| Entity | Projects only | Tasks AND projects |
| OmniJS complexity | Date calculation (Calendar API) | Constructor invocation + read-merge |
| Server-side logic | Minimal | Preset → ICS mapping |
| Version dependency | None (all versions) | v4.7+ for advanced tool |
| Shared schemas | Batch result, project summary | RepetitionRuleData, preset enum |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Phase Completion Criteria

### Phase 0: Research ✅ COMPLETE

- [x] API research documented in research.md
- [x] All unknowns resolved via spec clarification (5 questions)
- [x] OmniJS RepetitionRule API constraints identified
- [x] Version detection pattern confirmed (matches setPlannedDate)
- [x] Read-then-merge pattern documented (c-command.com source)
- [x] ICS preset mapping defined (8 presets)

### Phase 1: Design & Contracts ✅ COMPLETE

- [x] data-model.md with entity definitions (5 entities, validation rules)
- [x] quickstart.md with OmniJS patterns (5 tool patterns + common utilities)
- [x] plan.md with full implementation strategy (this file)
- [x] Contract structure designed (6 contract files + 3 shared schemas)
- [x] No NEEDS CLARIFICATION items remain

**Post-Design Constitution Re-Check** (2026-03-17):

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Type-First | ✅ PASS | All contracts use Zod schemas, strict TypeScript |
| II. Separation | ✅ PASS | Contracts in contracts/, OmniJS patterns in quickstart.md |
| III. Script Safety | ✅ PASS | All OmniJS patterns wrapped in try-catch with JSON returns |
| IV. Data Contracts | ✅ PASS | Discriminated success/error responses, typed enum values |
| V. Error Handling | ✅ PASS | NOT_FOUND, version errors, missing ruleString errors |
| VI. Build Discipline | ✅ PASS | Standard build workflow |
| VII. KISS | ✅ PASS | Preset mapping is a simple switch; read-merge is straightforward |
| VIII. YAGNI | ✅ PASS | Only spec'd requirements; no batch, no ICS parsing |
| IX. SOLID | ✅ PASS | Single responsibility per contract and primitive file |
| X. TDD | ✅ READY | Contract tests defined, ready for Phase 2 |

### Phase 2: Tasks (pending /speckit.tasks)

- [ ] TDD task ordering per Constitution X
- [ ] Contract tests defined for all 5 tools + shared schemas
- [ ] Unit tests defined for all 5 primitives
- [ ] Implementation tasks for primitives, definitions, server registration
- [ ] Parallel opportunities identified

### Phase 3: Implementation (pending /speckit.implement)

- [ ] Contract tests pass
- [ ] Unit tests pass
- [ ] Primitives implemented
- [ ] Definitions implemented
- [ ] Tools registered in server.ts
- [ ] Full suite passes
- [ ] CLAUDE.md updated
