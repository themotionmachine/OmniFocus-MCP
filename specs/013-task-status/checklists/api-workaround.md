# API Workaround Checklist: Task Status & Completion

**Purpose**: Validate that requirements clearly specify OmniJS API workarounds, version constraints, and mechanism differences for task/project lifecycle operations
**Created**: 2026-03-17
**Feature**: [spec.md](../spec.md), [research.md](../research.md), [quickstart.md](../quickstart.md)

## Version Detection & Compatibility (drop API — v3.8+)

- [ ] CHK001 - Is the minimum OmniFocus version requirement (v3.8+) for `drop()` explicitly stated with the exact version number? [Completeness, Spec §FR-010, §Assumptions]
- [ ] CHK002 - Is the version detection mechanism specified with the exact OmniJS API call (`app.userVersion.atLeast(new Version("3.8"))`)? [Clarity, Research §6, Quickstart §Version Detection]
- [ ] CHK003 - Is the deprecated `app.version` API explicitly called out as NOT to be used? [Clarity, Research §10]
- [ ] CHK004 - Is the error message format for unsupported versions defined with specific content (including current version string)? [Clarity, Spec §FR-010, Quickstart §drop_items]
- [ ] CHK005 - Is the error code `VERSION_NOT_SUPPORTED` defined and its usage scope limited to `drop_items` only? [Completeness, Data-model §Error Codes]
- [ ] CHK006 - Is the version check specified to occur BEFORE individual item processing (fail-fast, not per-item)? [Clarity, Quickstart §drop_items]
- [x] CHK007 - Is the behavior for older versions explicitly scoped — does the spec state that ONLY `drop_items` requires v3.8+, not other tools? [Clarity, Resolved] → Spec §Clarifications and §Assumptions updated: only `drop_items` requires v3.8+; all other APIs are standard with no version constraints (confirmed via omni-automation.com task.html/project.html)
- [ ] CHK008 - Is the version check response format specified as a catastrophic error (top-level `success: false`) rather than a per-item error? [Consistency, Data-model §Batch Response]

## drop(allOccurrences) API — Task vs Project Mechanism

- [ ] CHK009 - Is the critical difference between task drop (`task.drop(allOccurrences)`) and project drop (`project.status = Project.Status.Dropped`) explicitly documented? [Completeness, Research §2, Quickstart §Projects Have No drop() Method]
- [ ] CHK010 - Is the absence of `Project.drop()` method stated as a hard API constraint, not just an implementation detail? [Clarity, Research §2]
- [ ] CHK011 - Is the `allOccurrences` parameter default value (`true`) documented with GTD rationale ("drop = permanent abandon")? [Clarity, Spec §US3 Scenario 4, Data-model §DropItemsInput]
- [ ] CHK012 - Are both `allOccurrences` values (true/false) specified with distinct behavioral outcomes for repeating tasks? [Completeness, Spec §US3 Scenarios 4-5]
- [ ] CHK013 - Is the idempotent behavior for already-dropped items specified with the `ALREADY_DROPPED` no-op code? [Completeness, Spec §US3 Scenario 6, Data-model §Error Codes]
- [x] CHK014 - Is the `allOccurrences` parameter specified as ignored/irrelevant for project drop operations? [Resolved] → Spec §Assumptions, §Clarifications, and Data-model §DropItemsInput updated: `allOccurrences` is task-only, ignored for projects which use status assignment (confirmed via omni-automation.com project.html — no `drop()` method on Project)
- [ ] CHK015 - Are requirements consistent between the spec (which mentions `allOccurrences`) and the data model (which defines its type and default)? [Consistency, Spec §FR-003 vs Data-model §DropItemsInput]

## markComplete(date?) — Date Parameter Handling

- [ ] CHK016 - Is the `completionDate` input format specified as ISO 8601 string with explicit conversion to OmniJS `Date` object? [Clarity, Research §5, Data-model §MarkCompleteInput]
- [ ] CHK017 - Is the null/omitted date behavior documented (null = OmniFocus uses current date/time)? [Completeness, Research §5]
- [ ] CHK018 - Is the repeating task cloning behavior on completion specified (clone completed, original continues)? [Completeness, Spec §Edge Cases, Research §5, Spec §FR-011]
- [ ] CHK019 - Is the project completion cascading behavior documented (completes project AND all remaining active child tasks)? [Completeness, Spec §US1 Scenario 3, Research §2]
- [ ] CHK020 - Is the `ALREADY_COMPLETED` no-op code specified for idempotent re-completion? [Completeness, Data-model §Error Codes, Spec §FR-012]
- [ ] CHK021 - Is the date parameter validation rule specified (valid ISO 8601 or omitted)? [Completeness, Data-model §Validation Rules]

## markIncomplete() — Dropped vs Completed State Detection

- [ ] CHK022 - Is the critical API limitation explicitly stated: `markIncomplete()` ONLY works on completed items, NOT dropped items? [Completeness, Research §3, Quickstart §Critical Constraints]
- [ ] CHK023 - Is the state detection mechanism for tasks specified with both paths: completed → `markIncomplete()`, dropped → `active = true`? [Clarity, Quickstart §mark_incomplete, Research §3]
- [ ] CHK024 - Is the state detection mechanism for projects specified with both paths: Done → `markIncomplete()`, Dropped → `status = Active`? [Clarity, Quickstart §mark_incomplete, Research §3]
- [ ] CHK025 - Is the state detection specified as an internal implementation detail (user calls one tool, tool auto-detects)? [Clarity, Spec §FR-002]
- [ ] CHK026 - Is the `ALREADY_ACTIVE` no-op code specified for already-active items? [Completeness, Data-model §Error Codes]
- [ ] CHK027 - Are the detection properties specified for each item type (task: `completed` + `dropDate !== null`, project: `status === Done/Dropped`)? [Clarity, Research §4, Quickstart §mark_incomplete]
- [ ] CHK028 - Is the requirement clear that `mark_incomplete` MUST work identically from the user's perspective regardless of whether the item was completed or dropped? [Clarity, Spec §US2]

## project.nextTask — Null Return Disambiguation

- [ ] CHK029 - Are both null-return cases for `project.nextTask` explicitly documented as distinct scenarios? [Completeness, Spec §US5 Scenarios 3-4, Research §7]
- [ ] CHK030 - Is the single-actions project check specified to occur BEFORE calling `project.nextTask`? [Clarity, Quickstart §get_next_task]
- [ ] CHK031 - Are the reason codes (`NO_AVAILABLE_TASKS`, `SINGLE_ACTIONS_PROJECT`) defined with distinct user-facing messages? [Clarity, Data-model §GetNextTaskSuccess]
- [ ] CHK032 - Is the `project.containsSingletonActions` property specified as the detection mechanism for single-actions projects? [Clarity, Research §7, Quickstart §get_next_task]
- [ ] CHK033 - Is the parallel project behavior documented (returns first available task, not an error)? [Completeness, Spec §US5 Scenario 2]

## Cross-Tool Consistency

- [ ] CHK034 - Is the item lookup pattern (try Task first, then Project) consistently specified across all 6 tools? [Consistency, Quickstart §Shared Patterns, Data-model §ItemIdentifier]
- [x] CHK035 - Is the disambiguation error format (candidates array with id/name/type) consistent between batch and single-item tools? [Consistency, Resolved] → Data-model §Single-Item Response updated: documented intentional pattern difference — single-item tools use `matchingIds: string[]` (matching existing `DisambiguationErrorSchema` from task-tools/project-tools), batch tools use `candidates: [{id, name, type}]` (richer format for per-item reporting). Confirmed via codebase: `task-tools/shared/disambiguation.ts` and `review-tools/shared/batch.ts`.
- [ ] CHK036 - Are the no-op success codes (`ALREADY_COMPLETED`, `ALREADY_DROPPED`, `ALREADY_ACTIVE`) consistently defined as `success: true` responses across all relevant tools? [Consistency, Data-model §Error Codes note]

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline with `→ Note: ...`
- Items with `[Gap]` indicate potential missing requirements
- Items with `[Consistency]` should be checked across multiple spec artifacts
