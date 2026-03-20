---
description: Perform a post-implementation retrospective analysis measuring spec adherence, implementation deviations, and lessons learned.
handoffs:
  - label: Update Constitution
    agent: speckit.constitution
    prompt: Update constitution based on retrospective learnings
    send: true
  - label: Create New Feature
    agent: speckit.specify
    prompt: Create a new feature incorporating learnings from retrospective
    send: true
  - label: Create Checklist
    agent: speckit.checklist
    prompt: Create checklist based on retrospective findings
    send: true
scripts:
  sh: ../../scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
  ps: ../../scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
---

## User Input

```text
$ARGUMENTS
```

Consider user input before proceeding (if not empty).

## Goal

Analyze completed implementation against `spec.md`, `plan.md`, and `tasks.md` to measure spec adherence and drift. Generate actionable insights for future SDD cycles.

## Constraints

- Output: Generates and saves `retrospective.md` report to FEATURE_DIR
- Post-Implementation: Run after implementation complete; warn if <80% tasks done, confirm before proceeding if <50%
- Human Gate for spec changes: before any action that modifies `spec.md` (including `/speckit.specify` handoff), explicitly ask for user confirmation and stop if not approved
- Confirmation policy: default is NO. Only explicit approvals (`y`, `yes`, `si`, `s`, `sí`) count as consent

## Execution Steps

### 1. Initialize Context

Run `{SCRIPT}` from repo root. Parse JSON for FEATURE_DIR and AVAILABLE_DOCS. Derive paths: SPEC, PLAN, TASKS = FEATURE_DIR/{spec,plan,tasks}.md. Abort if missing.

For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

### 2. Validate Completeness

```bash
total_tasks=$(grep -c '^- \[[ Xx]\]' "$TASKS" || echo 0)
completed_tasks=$(grep -c '^- \[[Xx]\]' "$TASKS" || echo 0)
if [ "$total_tasks" -eq 0 ]; then
  echo "No tasks found in $TASKS" && exit 1
fi
completion_rate=$((completed_tasks * 100 / total_tasks))
```

Completion thresholds:
- >=80%: Proceed with full retrospective
- 50-79%: Warn about incomplete implementation, continue with partial analysis
- <50%: STOP and confirm before continuing

### 3. Load Artifacts

- `spec.md`: FR-XXX, NFR-XXX, SC-XXX, user stories, assumptions, edge cases
- `plan.md`: Architecture, data model, phases, constraints, dependencies
- `tasks.md`: All tasks with status, file paths, blockers
- constitution: `/memory/constitution.md` (if exists)

### 4. Discover Implementation

- Extract file paths from completed tasks plus recent git history
- Inventory: Models, APIs, Services, Tests, Config changes
- Audit: Libraries, frameworks, integrations actually used

### 5. Spec Drift Analysis

Perform:
1. Requirement coverage (implemented, partial, not implemented, modified, unspecified)
2. Success criteria validation
3. Architecture drift against plan
4. Task fidelity (completed/modified/added/dropped)
5. Timeline and blockers (if available)

Calculate:

```text
Spec Adherence % = ((IMPLEMENTED + MODIFIED + (PARTIAL * 0.5)) / (Total Requirements - UNSPECIFIED)) * 100
```

Where Total Requirements is the count of all FR-XXX, NFR-XXX, SC-XXX from `spec.md`.

### 6. Severity Classification

Classify findings as:
- CRITICAL (core functionality or constitution violations)
- SIGNIFICANT (deviations that affect UX/performance/operations)
- MINOR (small or cosmetic variations)
- POSITIVE (improvements over spec)

### 7. Innovation Opportunities

For positive deviations, document:
- What improved
- Why it is better
- Reusability potential
- Whether it is a constitution candidate

### 8. Root Cause Analysis

For key deviations capture:
- Discovery point (planning/implementation/testing/review)
- Cause (spec gap, tech constraint, scope evolution, misunderstanding, improvement, process skip)
- Prevention recommendation

### 9. Constitution Compliance

Check each constitution article against implementation. Treat violations as CRITICAL.

### 10. Generate Report

Create `retrospective.md` with:
- YAML frontmatter (feature, branch, date, completion_rate, spec_adherence, counts)
- Executive summary
- Proposed Spec Changes (explicit list of intended `spec.md` edits, grouped by FR/NFR/SC and rationale)
- Requirement coverage matrix
- Success criteria assessment
- Architecture drift table
- Significant deviations
- Innovations and best practices
- Constitution compliance
- Unspecified implementations
- Task execution analysis
- Lessons learned and recommendations
- File traceability appendix

### 11. Self-Assessment Checklist (Required)

Before finalizing output, run this checklist and mark each item as PASS/FAIL:

- Evidence completeness:
  - Every major deviation includes concrete evidence (file/task/behavior).
- Coverage integrity:
  - FR/NFR/SC coverage is complete with no missing requirement IDs.
- Metrics sanity:
  - `completion_rate` and `spec_adherence` formulas are applied correctly.
- Severity consistency:
  - CRITICAL/SIGNIFICANT/MINOR/POSITIVE labels match stated impact.
- Constitution review:
  - Constitution violations are explicitly listed (or `None` is stated).
- Human Gate readiness:
  - If spec changes are proposed, `Proposed Spec Changes` is populated and ready for user confirmation.
- Actionability:
  - Recommendations are specific, prioritized, and directly tied to findings.

Blocking rule:
- If any of these fail: `Coverage integrity`, `Metrics sanity`, `Human Gate readiness` (when applicable), or `Constitution review`, do not finalize the report. Fix the gaps first.

### 12. Save Report

1. Write to `FEATURE_DIR/retrospective.md`
2. Optionally commit with:
   - `feat(retrospective): add spec adherence report (adherence X%, completion X%)`
3. Confirm:
   - `Retrospective saved | Adherence: X% | Critical findings: X`

### 13. Human Gate Before Spec Changes

If retrospective findings recommend updating or regenerating the spec:

1. Present a short summary of the proposed `spec.md` changes, referencing the `Proposed Spec Changes` section.
2. Ask explicitly: `Do you want me to modify spec.md now? (y/N)`
3. Treat any response other than `y`, `yes`, `si`, `s`, or `sí` as NO.
4. Require a separate confirmation for each spec-modifying action (for example, each `/speckit.specify` run or direct `spec.md` edit).
5. If declined or no response, do not modify spec and continue with report-only recommendations.

Treat launching `/speckit.specify` as a spec-modifying action that requires this gate.

### 14. Follow-up Actions

Prioritize:
1. CRITICAL: constitution violations, breaking changes, security issues
2. HIGH: significant drift and process improvements
3. MEDIUM: best practices and constitution candidates
4. LOW: minor optimizations

Follow-up commands:
- `/speckit.constitution` for violations
- `/speckit.specify` for spec updates
- `/speckit.checklist` for new checklists

## Guidelines

### Count as Drift

Features differing from spec, dropped requirements, scope creep, or changes in technical approach.

### Not Drift

Implementation details, bounded optimizations, bug fixes, refactoring, and test improvements.

### Principles

- Facts over judgments
- Process over blame
- Positive deviations are learning opportunities
- Keep report concise and actionable
