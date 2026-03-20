# Contract: `/speckit.verify-tasks` Command Interface

**Date**: 2026-03-12
**Type**: Slash command (prompt-driven agent command)

---

## Command Invocation

```
/speckit.verify-tasks [OPTIONS]
```

### Arguments (`$ARGUMENTS`)

The command accepts a free-text argument string parsed for the following options:

| Option | Format | Default | Description |
|--------|--------|---------|-------------|
| Task filter | Task IDs (space or comma separated) | None (verify all `[X]` tasks) | Restrict verification to specific task IDs |
| Diff scope | `--scope branch\|uncommitted\|plan-anchored\|all` | `all` | Which changes count as evidence |

**Examples**:

```
/speckit.verify-tasks                          # Verify all [X] tasks, scope=all
/speckit.verify-tasks T-003 T-007              # Re-verify specific tasks only
/speckit.verify-tasks --scope branch           # Verify using branch diff scope
/speckit.verify-tasks T-003 --scope uncommitted # Combine filter + scope
```

---

## Input Contract

### Required Files (must exist)

| File | Location | Purpose |
|------|----------|---------|
| `tasks.md` | `specs/{feature}/tasks.md` | Source of tasks to verify |

### Optional Files (used if available)

| File | Location | Purpose |
|------|----------|---------|
| `plan.md` | `specs/{feature}/plan.md` | Date extraction for plan-anchored scope |
| `spec.md` | `specs/{feature}/spec.md` | Additional context for semantic assessment |
| `.git/` | Repository root | Git history for Layer 2 verification |

---

## Output Contract

### Verification Report File

**Path**: `specs/{feature}/verify-tasks-report.md`
**Lifecycle**: Created or overwritten on each run (one canonical report per feature)

### Report Structure

```markdown
# Verification Report: {Feature Name}

**Date**: {ISO date} | **Scope**: {scope_type} | **Tasks Verified**: {count}

---

> ⚠️ **FRESH SESSION ADVISORY**: For maximum reliability, run `/speckit.verify-tasks`
> in a separate agent session from the one that performed `/speckit.implement`.
> The implementing agent's context biases it toward confirming its own work.

---

## Summary Scorecard

| Verdict | Count |
|---------|-------|
| ✅ VERIFIED | {n} |
| 🔍 PARTIAL | {n} |
| ⚠️ WEAK | {n} |
| ❌ NOT_FOUND | {n} |
| ⏭️ SKIPPED | {n} |

---

## Flagged Items

### ❌ NOT_FOUND

| Task | Verdict | Summary |
|------|---------|---------|
| {task_id} | ❌ NOT_FOUND | {one-line summary} |

### 🔍 PARTIAL

| Task | Verdict | Summary |
|------|---------|---------|
| {task_id} | 🔍 PARTIAL | {one-line summary} |

### ⚠️ WEAK

| Task | Verdict | Summary |
|------|---------|---------|
| {task_id} | ⚠️ WEAK | {one-line summary} |

---

## Verified Items

| Task | Verdict | Summary |
|------|---------|---------|
| {task_id} | ✅ VERIFIED | {one-line summary} |

---

## Unassessable Items

| Task | Verdict | Summary |
|------|---------|---------|
| {task_id} | ⏭️ SKIPPED | {one-line summary} |
```

### Per-Task Detail Format

Each flagged task includes expandable per-layer detail:

```markdown
**{task_id}**: {task description excerpt}

| Layer | Result | Detail |
|-------|--------|--------|
| 1. File Existence | ✅ / ❌ / ⏭️ | {what was checked and found} |
| 2. Git Diff | ✅ / ❌ / ⏭️ | {what was checked and found} |
| 3. Content Match | ✅ / ❌ / ⏭️ | {what was checked and found} |
| 4. Dead-Code Check | ✅ / ❌ / ⏭️ | {what was checked and found} |
| 5. Semantic Assessment | ✅ / ⚠️ / ⏭️ | {interpretive assessment} |
```

### Machine-Parseable Verdict Line

Each task verdict is extractable via text pattern:

```
| {TASK_ID} | {EMOJI} {VERDICT} | {summary} |
```

---

## Interactive Walkthrough Contract

After report generation, the command enters interactive mode for flagged items:

1. Present flagged items in severity order (NOT_FOUND → PARTIAL → WEAK)
2. For each flagged item:
   - Display the evidence gap explanation
   - Offer: "Investigate further?" / "Attempt fix?" / "Skip"
3. Any proposed code fix requires explicit user confirmation (`y/n`) before application
4. No automatic code modification — read-only until user approves

---

## Error Conditions

| Condition | Behavior |
|-----------|----------|
| No `tasks.md` found | ERROR: Exit with message "No tasks.md found in feature directory" |
| No `[X]` tasks found | Report: "No completed tasks found to verify" — clean exit |
| Malformed task entries | WARNING per entry; continue processing parseable tasks |
| Git unavailable | WARNING: Skip Layer 2; continue with remaining layers |
| Shallow clone | WARNING: Layer 2 results may be incomplete |
| Task filter references non-existent ID | WARNING: Skip unknown ID; verify remaining specified tasks |
