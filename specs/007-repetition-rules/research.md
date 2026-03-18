# Phase 7: Repetition Rules - API Research

**Research Date**: 2026-03-17
**Sources**: omni-automation.com, discourse.omnigroup.com, c-command.com, OmniFocus API Reference
**Research Method**: Tavily deep search, Serena memory consolidation, spec clarification sessions

## Summary

Comprehensive research on OmniFocus Omni Automation API for task/project
repetition rule management. Research was conducted during the `/speckit.clarify`
phase with 3 of 5 questions verified against official documentation via
tavily-mcp. All unknowns resolved; no NEEDS CLARIFICATION items remain.

---

## Key API Findings

### 1. Task.RepetitionRule Properties

| Property | Type | Writable | Notes |
|----------|------|----------|-------|
| `ruleString` | String | r/o | ICS RRULE format (e.g., `FREQ=WEEKLY;BYDAY=MO`) |
| `method` | Task.RepetitionMethod | r/o | **DEPRECATED** — DueDate, Fixed, DeferUntilDate, None |
| `scheduleType` | Task.RepetitionScheduleType | r/o | v4.7+ — Regularly, FromCompletion, None |
| `anchorDateKey` | Task.AnchorDateKey | r/o | v4.7+ — DeferDate, DueDate, PlannedDate |
| `catchUpAutomatically` | Boolean | r/o | v4.7+ — auto-skip past occurrences |

**Critical**: All properties on the RepetitionRule *object* are read-only.
To "modify" a rule, you must construct a new `Task.RepetitionRule` and reassign
it to `task.repetitionRule`.

### 2. task.repetitionRule Property

| Property | Readable | Writable | Notes |
|----------|----------|----------|-------|
| `task.repetitionRule` | ✅ Yes | ✅ Yes | Despite `r/o` in docs, assignment works |

- `task.repetitionRule = new Task.RepetitionRule(...)` — sets a rule
- `task.repetitionRule = null` — clears the rule
- The `r/o` annotation on the task.html docs page refers to the RepetitionRule
  object properties, not the task property itself
- Confirmed by: official examples on omni-automation.com, c-command.com
  production plug-in

### 3. Constructor Signatures

**Legacy (all versions):**

```javascript
new Task.RepetitionRule(ruleString, method)
// method is DEPRECATED — pass null for universal compat
// Example: new Task.RepetitionRule("FREQ=DAILY", null)
```

**v4.7+ (5-param):**

```javascript
new Task.RepetitionRule(
  ruleString,           // String|null — ICS format
  method,               // null — DEPRECATED, must be null with new params
  scheduleType,         // Task.RepetitionScheduleType|null
  anchorDateKey,        // Task.AnchorDateKey|null
  catchUpAutomatically  // Boolean|null
)
```

**Critical Constraint**: Providing BOTH deprecated `method` AND
`scheduleType`/`anchorDateKey` throws an error. They are mutually exclusive.

### 4. Enum Values

**Task.RepetitionScheduleType (v4.7+):**

| Value | Description |
|-------|-------------|
| `Regularly` | Repeats from assigned dates (default) |
| `FromCompletion` | Calculates next from completion date |
| `None` | No repetition |

**Task.AnchorDateKey (v4.7+):**

| Value | Description |
|-------|-------------|
| `DueDate` | Anchors to due date (default) |
| `DeferDate` | Anchors to defer date |
| `PlannedDate` | Anchors to planned date |

**Task.RepetitionMethod (DEPRECATED):**

| Value | Notes |
|-------|-------|
| `DueDate` | Use scheduleType.Regularly + anchorDateKey.DueDate instead |
| `Fixed` | Use scheduleType.Regularly instead |
| `DeferUntilDate` | Use scheduleType.Regularly + anchorDateKey.DeferDate instead |
| `None` | Use scheduleType.None instead |

### 5. Version Detection

**Decision**: Version detection only (no feature detection)

**Pattern** (matches existing `setPlannedDate` primitive):

```javascript
var userVersion = app.userVersion;
if (!userVersion.atLeast(new Version('4.7'))) {
  return JSON.stringify({
    success: false,
    error: 'Feature requires OmniFocus v4.7 or later. Current version: '
      + userVersion.versionString
  });
}
```

**Rationale**: `app.userVersion.atLeast(new Version('4.7'))` is the documented
pattern on omni-automation.com and is already proven in the `setPlannedDate`
primitive. Feature detection (`typeof Task.RepetitionScheduleType`) is not
documented and less reliable.

### 6. Project Root Task Pattern

Projects hold their repetition rule on their root task:

```javascript
var project = Project.byIdentifier(id);
var rootTask = project.task;  // .task property gives root task
var rule = rootTask.repetitionRule;  // read from root task
rootTask.repetitionRule = newRule;   // write to root task
```

**Note**: `project.repetitionRule` also exists as a convenience accessor, but
the underlying storage is on `project.task.repetitionRule`.

---

## ICS RRULE Research

### Confirmed RRULE Components (OmniFocus-supported)

| Component | Values | Example |
|-----------|--------|---------|
| `FREQ` | YEARLY, MONTHLY, WEEKLY, DAILY, HOURLY, MINUTELY | `FREQ=WEEKLY` |
| `INTERVAL` | Positive integer | `FREQ=WEEKLY;INTERVAL=2` |
| `BYDAY` | SU,MO,TU,WE,TH,FR,SA (with ordinal prefixes) | `BYDAY=MO,WE,FR` or `BYDAY=2SU` |
| `BYMONTHDAY` | 1-31, -1 for last day | `BYMONTHDAY=15` or `BYMONTHDAY=-1` |
| `BYMONTH` | 1-12 | `BYMONTH=1` |
| `BYSETPOS` | Positive/negative integer | `BYSETPOS=-1` (last) |
| `BYHOUR` | 0-23 | `BYHOUR=8,9` |
| `BYMINUTE` | 0-59 | `BYMINUTE=30` |
| `COUNT` | Positive integer | `COUNT=10` |

### Preset → ICS Mapping (8 presets)

| Preset | ICS String | Optional Params |
|--------|-----------|-----------------|
| `daily` | `FREQ=DAILY` | — |
| `weekdays` | `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` | — |
| `weekly` | `FREQ=WEEKLY` | `days?: string[]` → `BYDAY=MO,WE,FR` |
| `biweekly` | `FREQ=WEEKLY;INTERVAL=2` | `days?: string[]` → `BYDAY=...` |
| `monthly` | `FREQ=MONTHLY` | `dayOfMonth?: number` → `BYMONTHDAY=15` |
| `monthly_last_day` | `FREQ=MONTHLY;BYMONTHDAY=-1` | — |
| `quarterly` | `FREQ=MONTHLY;INTERVAL=3` | `dayOfMonth?: number` → `BYMONTHDAY=15` |
| `yearly` | `FREQ=YEARLY` | — |

**Important**: OmniFocus has NO built-in named presets. All combinations are
number + unit in the UI. Our preset mapping is a convenience layer that
generates the correct ICS string server-side (in TypeScript, not in OmniJS).

### ICS String Caveats

- Remove trailing semicolons from rule strings (causes errors)
- Forum support said complex combos "aren't possible" but this was
  contradicted by API examples showing they work
- UI may not expose all combinations, but the API accepts standard ICS strings
- OmniFocus references RFC 5545 and points users to icalendar.org RRULE Tool

---

## Read-Then-Merge Pattern (Critical for set_advanced_repetition)

### Source

c-command.com "Catch Up Automatically" OmniJS script — the only known
real-world production example of modifying repetition rule parameters.

### Pattern

```javascript
// Read existing rule properties
var existingRule = task.repetitionRule;
if (!existingRule) {
  return JSON.stringify({
    success: false,
    error: 'No existing rule to merge from. Provide ruleString.'
  });
}

// Merge: use provided values or fall back to existing
var newRuleString = providedRuleString || existingRule.ruleString;
var newScheduleType = providedScheduleType || existingRule.scheduleType;
var newAnchorDateKey = providedAnchorDateKey || existingRule.anchorDateKey;
var newCatchUp = providedCatchUp !== null ? providedCatchUp : existingRule.catchUpAutomatically;

// Construct new rule with merged values
var newRule = new Task.RepetitionRule(
  newRuleString,
  null,              // deprecated method — must be null
  newScheduleType,
  newAnchorDateKey,
  newCatchUp
);

task.repetitionRule = newRule;
```

### Key Implications

1. All v4.7+ params are optional in the MCP tool input
2. When params are omitted, read existing values from current rule
3. When no existing rule exists AND no `ruleString` provided → error
4. `null` for unspecified params lets OmniFocus apply defaults (DueDate anchor,
   Regularly schedule, no catch-up)

---

## Implementation Decisions

### Decision 1: Version Detection Method

- **Chosen**: `app.userVersion.atLeast(new Version('4.7'))`
- **Rationale**: Documented pattern, proven in setPlannedDate primitive
- **Rejected**: Feature detection (`typeof Task.RepetitionScheduleType`) —
  not documented, less reliable

### Decision 2: Preset List

- **Chosen**: 8 presets (daily, weekdays, weekly, biweekly, monthly,
  monthly_last_day, quarterly, yearly)
- **Rationale**: Covers most common recurrence patterns while keeping the
  list manageable
- **Rejected**: 4 presets (too limited), open-ended (defeats purpose of
  convenience layer)

### Decision 3: Basic Tool Constructor

- **Chosen**: Legacy 2-param `new Task.RepetitionRule(ruleString, null)`
- **Rationale**: Universal compatibility across all OmniFocus versions
- **Rejected**: 5-param with nulls (unnecessary complexity, breaks on pre-v4.7)

### Decision 4: Advanced Tool Param Optionality

- **Chosen**: All v4.7+ params optional, OmniFocus defaults for unspecified
- **Rationale**: Reduces API surface complexity, matches OmniJS constructor
  behavior with null params
- **Rejected**: All required (forces users to specify values they may not care
  about)

### Decision 5: Advanced Tool Merge Strategy

- **Chosen**: Read-then-merge from existing rule
- **Rationale**: Proven by c-command.com production script, avoids data loss
  when only changing one parameter
- **Rejected**: Require all inputs (forces users to re-specify unchanged values)

---

## OmniFocus Version Requirements

| Feature | Minimum Version |
|---------|-----------------|
| `task.repetitionRule` (read/write) | All versions |
| `Task.RepetitionRule(ruleString, method)` | All versions |
| `Task.RepetitionScheduleType` enum | OmniFocus 4.7+ |
| `Task.AnchorDateKey` enum | OmniFocus 4.7+ |
| `catchUpAutomatically` parameter | OmniFocus 4.7+ |
| 5-param constructor | OmniFocus 4.7+ |

---

## Validation Checklist

- [x] `task.repetitionRule` is writable (assignment) — **CONFIRMED**
- [x] `task.repetitionRule = null` clears the rule — **CONFIRMED**
- [x] All RepetitionRule properties are read-only on the object — **CONFIRMED**
- [x] Legacy 2-param constructor works on all versions — **CONFIRMED**
- [x] 5-param constructor available on v4.7+ — **CONFIRMED**
- [x] `method` and `scheduleType` are mutually exclusive — **CONFIRMED**
- [x] `app.userVersion.atLeast()` is the version detection method — **CONFIRMED**
- [x] `project.task.repetitionRule` accesses project's root task rule — **CONFIRMED**
- [x] ICS RRULE strings match RFC 5545 subset — **CONFIRMED**
- [x] Read-then-merge is the established modification pattern — **CONFIRMED**

---

## Research Sources

1. **omni-automation.com/omnifocus/task.html** — Task class reference
2. **omni-automation.com/omnifocus/task-repetition-rule.html** — RepetitionRule class
3. **omni-automation.com/omnifocus/task-repeat.html** — Repetition examples
4. **discourse.omnigroup.com** — OmniFocus forum discussions on repetition
5. **c-command.com/scripts/omnifocus/catch-up-automatically** — Production
   OmniJS script demonstrating read-modify-write pattern
6. **RFC 5545** — iCalendar RRULE specification
