---
description: Perform a non-destructive post-implementation verification gate validating
  the implementation against spec.md, plan.md, tasks.md, and constitution.md.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
handoffs:
- label: Address findings and re-implement
  agent: speckit.implement
  prompt: Address the verification findings and re-run implementation to resolve issues
- label: Re-analyze specification consistency
  agent: speckit.analyze
  prompt: Re-analyze specification consistency based on verification findings
---


<!-- Extension: verify -->
<!-- Config: .specify/extensions/verify/ -->
## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Validate the implementation against its specification artifacts (`spec.md`, `plan.md`, `tasks.md`, `constitution.md`). This command MUST run only after `/speckit.implement` has completed.

## Operating Constraints

**STRICTLY READ-ONLY**: Do **not** modify any files. Output a structured analysis report. Offer an optional remediation plan (user must explicitly approve before any follow-up editing commands would be invoked manually).

**Constitution Authority**: The project constitution (`.specify/memory/constitution.md`) is **non-negotiable** within this verification scope. Constitution conflicts are automatically CRITICAL and require adjustment of the spec, plan, tasks or implementation—not dilution, reinterpretation, or silent ignoring of the principle. If a principle itself needs to change, that must occur in a separate, explicit constitution update outside `/speckit.verify`.

## Execution Steps

### 1. Initialize Verification Context

Run `{SCRIPT}` once from repo root and parse JSON for FEATURE_DIR and AVAILABLE_DOCS. Derive absolute paths:

- SPEC = FEATURE_DIR/spec.md
- PLAN = FEATURE_DIR/plan.md
- TASKS = FEATURE_DIR/tasks.md

Abort if SPEC or TASKS is missing (instruct the user to run the missing prerequisite command). PLAN and constitution are optional — checks that depend on them are skipped gracefully.
Abort if TASKS has no completed tasks.
For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

### 2. Load Artifacts (Progressive Disclosure)

Load only the minimal necessary context from each artifact:

**From spec.md:**

- Functional Requirements
- User Stories and Acceptance Criteria
- Scenarios
- Edge Cases (if present)

**From plan.md (optional):**

- Architecture/stack choices
- Data Model references
- Project structure (directory layout)

**From tasks.md:**

- Task IDs
- Completion status
- Descriptions
- Phase grouping
- Referenced file paths
- Count total tasks and completed tasks

**From constitution (optional):**

- Load `.specify/memory/constitution.md` for principle validation
- If missing or placeholder: skip constitution checks, emit Info finding

### 3. Identify Implementation Scope

Build the set of files to verify from tasks.md.

- Parse all tasks in tasks.md — both completed (`[x]`/`[X]`) and incomplete (`[ ]`)
- Extract file paths referenced in each task description
- Build **REVIEW_FILES** set from completed task file paths
- Track **INCOMPLETE_TASK_FILES** from incomplete tasks (used by check C)

### 4. Build Semantic Models

Create internal representations (do not include raw artifacts in output):

- **Task inventory**: Each task with ID, completion status, referenced file paths, and phase grouping
- **Implementation mapping**: Map each completed task to its referenced file paths
- **File inventory**: All REVIEW_FILES with existence verification — flag any task-referenced file that does not exist on disk
- **Requirements inventory**: Each functional requirement with a stable key — map to tasks and REVIEW_FILES for implementation evidence (evidence = file in REVIEW_FILES containing keyword/ID match, function signatures, or code paths that address the requirement)
- **Spec intent references**: User stories, acceptance criteria, and scenarios from spec.md
- **Constitution rule set**: Extract principle names and MUST/SHOULD normative statements

### 5. Verification Checks (Token-Efficient Analysis)

Focus on high-signal findings. Limit to 50 findings total; aggregate remainder in overflow summary.

#### A. Task Completion

- Compare completed (`[x]`/`[X]`) vs total tasks
- Flag majority incomplete vs minority incomplete

#### B. File Existence

- Task-referenced files that do not exist on disk
- Tasks referencing ambiguous or unresolvable paths

#### C. Requirement Coverage

- Requirements with no implementation evidence in REVIEW_FILES
- Requirements whose tasks are all incomplete

#### D. Scenario & Test Coverage

- Spec scenarios with no corresponding test or code path
- No test files detected at all in REVIEW_FILES

#### E. Spec Intent Alignment

- Implementation diverging from spec intent (minor vs fundamental divergence)
- Compare acceptance criteria against actual behaviour in REVIEW_FILES

#### F. Constitution Alignment

- Any implementation element conflicting with a constitution MUST principle
- Missing mandated sections or quality gates from constitution

#### G. Design & Structure Consistency

- Architectural decisions or design patterns from plan.md not reflected in code
- Planned directory/file layout deviating from actual structure
- New code deviating from existing project conventions (naming, module structure, error handling patterns)
- Public APIs/exports/endpoints not described in plan.md

### 6. Severity Assignment

Use this heuristic to prioritize findings:

- **CRITICAL**: Violates constitution MUST, majority of tasks incomplete, task-referenced files missing from disk, requirement with zero implementation
- **HIGH**: Spec intent divergence, fundamental implementation mismatch with acceptance criteria, missing scenario/test coverage
- **MEDIUM**: Design pattern drift, minor spec intent deviation
- **LOW**: Structure deviations, naming inconsistencies, minor observations not affecting functionality
- **INFO**: Positive confirmations (all tasks complete, all requirements covered, no issues found). Use sparingly — only in summary metrics, not as individual finding rows.

### 7. Produce Compact Verification Report

Output a Markdown report (no file writes) with the following structure:

## Verification Report

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| A1 | Task Completion | CRITICAL | tasks.md | 3 of 12 tasks incomplete | Complete tasks T05, T08, T11 |
| B1 | File Existence | CRITICAL | src/auth.ts | Task-referenced file missing | Create file or update task reference |
| C1 | Requirement Coverage | CRITICAL | spec.md:FR-003 | No implementation evidence | Implement FR-003 |

(Add one row per finding; generate stable IDs prefixed by check letter: A1, B1, C1... Reference specific files and line numbers in Location(s) where applicable.)

**Task Summary Table:**

| Task ID | Status | Referenced Files | Notes |
|---------|--------|-----------------|-------|

**Constitution Alignment Issues:** (if any)

**Metrics:**

- Total Tasks (completed / total)
- Requirement Coverage % (requirements with implementation evidence / total)
- Files Verified
- Critical Issues Count

### 8. Provide Next Actions

At end of report, output a concise Next Actions block:

- If CRITICAL issues exist: Recommend resolving before proceeding
- If HIGH issues exist: Recommend addressing before merge; user may proceed at own risk
- If only LOW/MEDIUM: User may proceed, but provide improvement suggestions
- Provide explicit command suggestions: e.g., "Run `/speckit.implement` to address findings and re-run verification", "Implementation verified — ready for review or merge"

### 9. Offer Remediation

Ask the user: "Would you like me to suggest concrete remediation edits for the top N issues?" (Do NOT apply them automatically.)

## Operating Principles

### Context Efficiency

- **Minimal high-signal tokens**: Focus on actionable findings, not exhaustive documentation
- **Progressive disclosure**: Load artifacts and source files incrementally; don't dump all content into analysis
- **Token-efficient output**: Limit findings table to 50 rows; summarize overflow
- **Deterministic results**: Rerunning without changes should produce consistent IDs and counts

### Analysis Guidelines

- **NEVER modify files** (this is read-only analysis)
- **NEVER hallucinate missing sections** (if absent, report them accurately)
- **Prioritize constitution violations** (these are always CRITICAL)
- **Use examples over exhaustive rules** (cite specific instances, not generic patterns)
- **Report zero issues gracefully** (emit success report with coverage statistics)
- **Every finding must trace back** to a specification artifact (spec.md requirement, user story, scenario, edge case), a structural reference (plan.md, constitution.md), or a task in tasks.md

### Idempotency by Design

The command produces deterministic output — running verification twice on the same state yields the same report. No counters, timestamp-dependent logic, or accumulated state affects findings. The report is fully regenerated on each run.