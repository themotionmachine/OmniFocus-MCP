# OmniJS Quickstart: Repetition Rules

**Phase**: 007-repetition-rules | **Date**: 2026-03-17

This document provides ready-to-use OmniJS patterns for implementing the
Repetition Rule tools. All patterns are based on research from official
omni-automation.com docs and the c-command.com production plug-in.

## Critical Constraints

### All RepetitionRule Properties Are Read-Only

You cannot modify properties on a `Task.RepetitionRule` object. To change any
aspect of a rule, you must construct a NEW rule and reassign it.

```javascript
// ❌ WRONG — properties are read-only
task.repetitionRule.ruleString = "FREQ=DAILY";

// ✅ CORRECT — construct new rule, reassign
task.repetitionRule = new Task.RepetitionRule("FREQ=DAILY", null);
```

### task.repetitionRule Is Writable (Despite Docs)

The `r/o` annotation on task.html refers to the RepetitionRule object's
properties, not the task property itself:

```javascript
task.repetitionRule = new Task.RepetitionRule("FREQ=WEEKLY", null);  // ✅ Works
task.repetitionRule = null;  // ✅ Clears the rule
```

### Two Constructor Forms — Never Mix

| Form | Signature | When to Use |
|------|-----------|-------------|
| Legacy | `(ruleString, method)` | `set_repetition`, `set_common_repetition` |
| v4.7+ | `(ruleString, null, scheduleType, anchorDateKey, catchUp)` | `set_advanced_repetition` |

**Critical**: Providing BOTH `method` AND `scheduleType`/`anchorDateKey`
throws an error. Always pass `null` for `method` when using the 5-param form.

### Version Detection Pattern

```javascript
var userVersion = app.userVersion;
if (!userVersion.atLeast(new Version('4.7'))) {
  return JSON.stringify({
    success: false,
    error: 'Advanced repetition requires OmniFocus v4.7 or later. '
      + 'Current version: ' + userVersion.versionString
  });
}
```

This matches the existing `setPlannedDate` primitive pattern exactly.

## Item Resolution Pattern

All repetition tools accept an ID that could be a task or project. Projects
hold their repetition rule on the root task.

```javascript
// Resolve task or project → always returns the task holding the rule
var task = null;
var itemName = '';

task = Task.byIdentifier("${escapedId}");
if (task) {
  itemName = task.name;
} else {
  var project = Project.byIdentifier("${escapedId}");
  if (project) {
    task = project.task;  // root task holds repetition rule
    itemName = project.name;
  }
}

if (!task) {
  return JSON.stringify({
    success: false,
    error: "Item '${escapedId}' not found as task or project"
  });
}
```

## Tool Implementation Patterns

### get_repetition

```javascript
(function() {
  try {
    var task = Task.byIdentifier("${escapedId}");
    var itemName = '';
    if (task) {
      itemName = task.name;
    } else {
      var project = Project.byIdentifier("${escapedId}");
      if (project) {
        task = project.task;
        itemName = project.name;
      }
    }

    if (!task) {
      return JSON.stringify({
        success: false,
        error: "Item '${escapedId}' not found as task or project"
      });
    }

    var rule = task.repetitionRule;
    if (!rule) {
      return JSON.stringify({
        success: true,
        id: task.id.primaryKey,
        name: itemName,
        hasRule: false,
        rule: null
      });
    }

    var ruleData = {
      ruleString: rule.ruleString,
      isRepeating: true,
      method: rule.method ? rule.method.name : null
    };

    // v4.7+ fields
    var isV47 = app.userVersion.atLeast(new Version('4.7'));
    if (isV47) {
      ruleData.scheduleType = rule.scheduleType ? rule.scheduleType.name : null;
      ruleData.anchorDateKey = rule.anchorDateKey ? rule.anchorDateKey.name : null;
      ruleData.catchUpAutomatically = rule.catchUpAutomatically;
    }

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: itemName,
      hasRule: true,
      rule: ruleData
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### set_repetition

Uses legacy 2-param constructor for universal compatibility.

```javascript
(function() {
  try {
    // [item resolution pattern — see above]

    task.repetitionRule = new Task.RepetitionRule("${escapedRuleString}", null);

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: itemName,
      ruleString: task.repetitionRule.ruleString
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### clear_repetition

```javascript
(function() {
  try {
    // [item resolution pattern]

    task.repetitionRule = null;

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: itemName
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### set_common_repetition

ICS string is generated server-side in TypeScript. The OmniJS script receives
the computed ICS string and uses the legacy constructor.

**Server-side preset → ICS mapping (TypeScript):**

```typescript
function presetToICS(preset: PresetName, days?: string[], dayOfMonth?: number): string {
  switch (preset) {
    case 'daily':
      return 'FREQ=DAILY';
    case 'weekdays':
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    case 'weekly': {
      const base = 'FREQ=WEEKLY';
      return days?.length ? `${base};BYDAY=${days.join(',')}` : base;
    }
    case 'biweekly': {
      const base = 'FREQ=WEEKLY;INTERVAL=2';
      return days?.length ? `${base};BYDAY=${days.join(',')}` : base;
    }
    case 'monthly': {
      const base = 'FREQ=MONTHLY';
      return dayOfMonth ? `${base};BYMONTHDAY=${dayOfMonth}` : base;
    }
    case 'monthly_last_day':
      return 'FREQ=MONTHLY;BYMONTHDAY=-1';
    case 'quarterly': {
      const base = 'FREQ=MONTHLY;INTERVAL=3';
      return dayOfMonth ? `${base};BYMONTHDAY=${dayOfMonth}` : base;
    }
    case 'yearly':
      return 'FREQ=YEARLY';
  }
}
```

**OmniJS script** (receives the computed ICS string):

```javascript
(function() {
  try {
    // [item resolution pattern]

    task.repetitionRule = new Task.RepetitionRule("${computedICSString}", null);

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: itemName,
      ruleString: task.repetitionRule.ruleString
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### set_advanced_repetition (v4.7+ only)

Uses the read-then-merge pattern from c-command.com.

```javascript
(function() {
  try {
    // Version check
    var userVersion = app.userVersion;
    if (!userVersion.atLeast(new Version('4.7'))) {
      return JSON.stringify({
        success: false,
        error: 'Advanced repetition requires OmniFocus v4.7 or later. '
          + 'Current version: ' + userVersion.versionString
      });
    }

    // [item resolution pattern]

    // Read existing rule for merge
    var existingRule = task.repetitionRule;

    // Determine ruleString
    var ruleString = ${providedRuleString ? '"' + escapedRuleString + '"' : 'null'};
    if (!ruleString) {
      if (!existingRule) {
        return JSON.stringify({
          success: false,
          error: 'ruleString is required when the task has no existing repetition rule'
        });
      }
      ruleString = existingRule.ruleString;
    }

    // Merge: use provided values or fall back to existing
    var scheduleType = ${providedScheduleType
      ? 'Task.RepetitionScheduleType.' + scheduleType
      : 'existingRule ? existingRule.scheduleType : null'};

    var anchorDateKey = ${providedAnchorDateKey
      ? 'Task.AnchorDateKey.' + anchorDateKey
      : 'existingRule ? existingRule.anchorDateKey : null'};

    var catchUp = ${providedCatchUp !== undefined
      ? providedCatchUp
      : 'existingRule ? existingRule.catchUpAutomatically : null'};

    // Construct new rule with 5-param v4.7+ constructor
    var newRule = new Task.RepetitionRule(
      ruleString,
      null,            // deprecated method — must be null
      scheduleType,
      anchorDateKey,
      catchUp
    );

    task.repetitionRule = newRule;

    return JSON.stringify({
      success: true,
      id: task.id.primaryKey,
      name: itemName,
      ruleString: task.repetitionRule.ruleString
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

## Error Response Format

All OmniJS scripts follow this pattern:

```javascript
(function() {
  try {
    // ... implementation ...
    return JSON.stringify({ success: true, /* fields */ });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();
```

## Testing in Script Editor

Before integrating, test all OmniJS patterns in OmniFocus Script Editor:

1. Open OmniFocus
2. Press `⌘-⌃-O` to open Automation Console
3. Paste script and execute
4. Verify JSON output structure

## Related Documentation

- [spec.md](./spec.md) - Feature specification
- [research.md](./research.md) - API research findings
- [data-model.md](./data-model.md) - Entity definitions
- [plan.md](./plan.md) - Implementation plan
