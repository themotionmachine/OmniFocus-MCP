# Data Model: Verify-Tasks Phantom Completion Detector

**Date**: 2026-03-12
**Feature Branch**: `001-verify-tasks-phantom`

---

## Overview

This extension is prompt-driven with no persistent application state. The data model describes the conceptual entities the agent processes in-memory during a verification run, and the structured markdown artifacts it reads and produces.

---

## Entities

### Task

A single work item parsed from `tasks.md`.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | string | Identifier token extracted from task line (flexible format: `1.1`, `T-003`, `FEAT-05`, etc.) | Non-empty; first identifier-like token after checkbox |
| `description` | string | Full task description text | Non-empty |
| `status` | enum | `complete` (`[X]`) or `incomplete` (`[ ]`) | Must be one of two valid checkbox states |
| `file_paths` | string[] | File paths extracted from description (exact, glob, or directory) | Valid path syntax; globs expanded at verification time |
| `code_references` | string[] | Symbol names (functions, classes, types, configs) extracted from description and inline code | May be empty for behavioral-only tasks |
| `acceptance_criteria` | string[] | Given/When/Then scenarios or bullet-point criteria | May be empty |
| `parent_id` | string \| null | ID of parent task if this is a subtask | null for top-level tasks |
| `depth` | number | Nesting level (0 = top-level, 1 = first subtask, etc.) | >= 0 |
| `markers` | string[] | Optional markers like `[P]` (parallel), `[US1]` (user story) | May be empty |
| `line_number` | number | Line number in `tasks.md` where this task appears | >= 1 |

**Relationships**:

- A Task may have zero or more child Tasks (subtasks)
- Parent and subtask verdicts are independent — no roll-up

**State Transitions**:

- Not applicable — tasks are parsed as read-only snapshots from `tasks.md`. The extension never modifies task status.

---

### VerificationLayerResult

The result of a single verification layer for a single task.

| Field | Type | Description |
|-------|------|-------------|
| `layer` | enum | `file_existence` \| `git_diff` \| `content_match` \| `dead_code` \| `semantic` |
| `status` | enum | `positive` \| `negative` \| `not_applicable` \| `skipped` |
| `detail` | string | Human-readable explanation of what was checked and found |
| `evidence` | string[] | Specific file paths, line numbers, or grep matches that support the result |

**Status meanings**:

- `positive`: Layer found evidence supporting implementation
- `negative`: Layer found evidence of missing/incomplete implementation
- `not_applicable`: Layer doesn't apply to this task (e.g., no file paths → file_existence is N/A)
- `skipped`: Layer was skipped due to environment limitations (e.g., no git → git_diff skipped)

---

### TaskVerdict

The overall verification result for a single task, combining all layer results.

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | References the Task being verified |
| `evidence_level` | enum | `VERIFIED` \| `PARTIAL` \| `WEAK` \| `NOT_FOUND` \| `SKIPPED` |
| `summary` | string | One-line human-readable summary of the verdict |
| `layer_results` | VerificationLayerResult[] | Results from each of the five verification layers |

**Evidence Level Assignment Rules**:

- `✅ VERIFIED`: ALL applicable mechanical layers (1–4) return `positive`
- `🔍 PARTIAL`: At least one mechanical layer returns `positive`, but at least one returns `negative`
- `⚠️ WEAK`: Only semantic layer (5) returns `positive`, OR mechanical evidence is ambiguous
- `❌ NOT_FOUND`: No layers return `positive` — probable phantom completion
- `⏭️ SKIPPED`: All mechanical layers return `not_applicable`; task has no verifiable indicators

**Invariant**: Semantic assessment (`layer 5`) alone NEVER yields `VERIFIED` for a task with mechanically verifiable indicators.

---

### DiffScope

The range of changes considered as evidence of implementation.

| Field | Type | Description |
|-------|------|-------------|
| `scope_type` | enum | `branch` \| `uncommitted` \| `plan_anchored` \| `all` |
| `base_ref` | string \| null | Git ref for comparison (e.g., `origin/main`); null for `uncommitted` |
| `anchor_date` | string \| null | ISO date for `plan_anchored` scope; null otherwise |

**Default**: `all` (most inclusive, per Constitution Principle VIII)

---

### VerificationReport

The structured markdown output document.

| Section | Description |
|---------|-------------|
| Header | Feature name, verification date, diff scope used, total task count |
| Fresh-Session Advisory | Prominent banner per Constitution Principle II |
| Summary Scorecard | Counts per evidence level: `VERIFIED: N, PARTIAL: N, WEAK: N, NOT_FOUND: N, SKIPPED: N` |
| Flagged Items | TaskVerdicts where evidence_level ∈ {NOT_FOUND, PARTIAL, WEAK}, sorted by severity |
| Verified Items | TaskVerdicts where evidence_level ∈ {VERIFIED, SKIPPED} |

**File**: `verify-tasks-report.md` in the feature's spec directory (alongside `tasks.md`)
**Lifecycle**: Overwritten on each run — one canonical report per feature
**Format**: Machine-parseable structured markdown; each task verdict is extractable via text pattern `| TASK_ID | EMOJI VERDICT | summary |`

---

## Entity Relationship Diagram

```
tasks.md (input)
    │
    ├── Task (parsed, 0..N with [X] status)
    │     │
    │     ├── has 0..N child Tasks (subtasks, verified independently)
    │     │
    │     └── verified by ──► VerificationLayerResult (5 layers per task)
    │                              │
    │                              └── aggregated into ──► TaskVerdict
    │                                                         │
    DiffScope (configuration) ─────────────────────────────────┤
    │                                                         │
    └──────────────────────────────────────────────────────────┤
                                                              │
                                                    VerificationReport (output)
                                                              │
                                                    verify-tasks-report.md (file)
```

---

## Input/Output File Mapping

| Artifact | Direction | Path | Format |
|----------|-----------|------|--------|
| `tasks.md` | INPUT (read-only) | `specs/{feature}/tasks.md` | Standard spec-kit task format |
| `plan.md` | INPUT (read-only) | `specs/{feature}/plan.md` | For plan-anchored date extraction |
| `spec.md` | INPUT (read-only) | `specs/{feature}/spec.md` | For semantic assessment context |
| Source files | INPUT (read-only) | Repository root | For all verification layers |
| Git history | INPUT (read-only) | `.git/` | For Layer 2 (git diff) |
| `verify-tasks-report.md` | OUTPUT (write) | `specs/{feature}/verify-tasks-report.md` | Structured markdown report |
