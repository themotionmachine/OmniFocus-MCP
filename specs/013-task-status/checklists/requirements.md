# Specification Quality Checklist: Task Status & Completion

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-03-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- All items pass validation. Spec is ready for `/speckit.plan`.
- 6 user stories covering all 6 planned tools with clear priority ordering (P1-P4)
- 12 functional requirements, all testable
- 8 success criteria, all technology-agnostic and measurable
- 8 edge cases (expanded from 6 after clarification session)
- 10 assumptions (expanded from 7 after OmniJS API research)
- Clarification session (2026-03-17): 6 OmniJS API questions resolved via official docs, 0 user questions needed
- Key clarification outcomes: `allOccurrences` parameter added to drop, `markIncomplete` dual-mechanism documented, single-actions `nextTask` distinction added

---

# Requirements Deep Review: Task Status & Completion

**Purpose**: Validate that all 6 user stories have complete functional requirements, batch operations are fully specified, edge cases are covered, and floating timezone scope is clear
**Created**: 2026-03-17 (Checklist Phase)
**Feature**: [spec.md](../spec.md), [data-model.md](../data-model.md)

## User Story → Functional Requirement Traceability

- [ ] CHK001 - Does US1 (Mark Complete) trace to FR-001 (complete with optional date), FR-004 (batch), FR-005 (per-item results), FR-006 (ID/name lookup), and FR-012 (idempotent)? [Traceability, Spec §US1 → §FR-001/004/005/006/012]
- [ ] CHK002 - Does US2 (Mark Incomplete) trace to FR-002 (reopen completed/dropped), FR-004 (batch), FR-005 (per-item results), FR-006 (ID/name lookup), and FR-012 (idempotent)? [Traceability, Spec §US2 → §FR-002/004/005/006/012]
- [ ] CHK003 - Does US3 (Drop Items) trace to FR-003 (drop with allOccurrences), FR-004 (batch), FR-005 (per-item results), FR-006 (ID/name lookup), FR-010 (version error), and FR-012 (idempotent)? [Traceability, Spec §US3 → §FR-003/004/005/006/010/012]
- [ ] CHK004 - Does US4 (Set Project Type) trace to FR-007 (type with mutual exclusion) and FR-006 (ID/name lookup)? [Traceability, Spec §US4 → §FR-007/006]
- [ ] CHK005 - Does US5 (Get Next Task) trace to FR-008 (next task query) and FR-006 (ID/name lookup)? [Traceability, Spec §US5 → §FR-008/006]
- [ ] CHK006 - Does US6 (Floating Timezone) trace to FR-009 (floating TZ on tasks AND projects) and FR-006 (ID/name lookup)? [Traceability, Spec §US6 → §FR-009/006]
- [ ] CHK007 - Are all 12 functional requirements (FR-001 through FR-012) traceable to at least one user story? [Traceability]

## Batch Operations Completeness

- [ ] CHK008 - Is the batch scope explicitly limited to 3 tools (mark_complete, mark_incomplete, drop_items) with the other 3 tools specified as single-item only? [Completeness, Spec §FR-004]
- [ ] CHK009 - Are per-item success/failure results specified for all 3 batch tools with consistent result structure? [Consistency, Spec §FR-005, Data-model §StatusBatchItemResult]
- [ ] CHK010 - Is the partial failure behavior specified — successful items proceed even when other items fail? [Completeness, Spec §FR-005]
- [ ] CHK011 - Is disambiguation handling specified for name-based lookups within batch operations (per-item disambiguation, not batch-level)? [Completeness, Spec §FR-006, Spec §US1 Scenario 5]
- [x] CHK012 - Are batch operations specified to process items at their original array indices (results array matches input array)? [Clarity, Resolved] → Data-model §Batch Response updated: "Each result corresponds to the input item at the same array index" and `results[i] corresponds to items[i]`, matching review-tools pattern (`batch.ts:38`, `mark-reviewed.ts:71`).

## Edge Cases — Idempotent/No-Op Scenarios

- [ ] CHK013 - Is the already-completed scenario specified for mark_complete with the `ALREADY_COMPLETED` code? [Completeness, Spec §FR-012, Data-model §Error Codes]
- [ ] CHK014 - Is the already-dropped scenario specified for drop_items with the `ALREADY_DROPPED` code? [Completeness, Spec §US3 Scenario 6, Data-model §Error Codes]
- [ ] CHK015 - Is the already-active scenario specified for mark_incomplete with the `ALREADY_ACTIVE` code? [Completeness, Spec §US2 Scenario 4, Data-model §Error Codes]
- [ ] CHK016 - Are all three no-op codes specified as `success: true` responses (not errors)? [Clarity, Data-model §Error Codes note]
- [ ] CHK017 - Is the no-next-task scenario specified with two distinct cases: no available tasks vs. single-actions project? [Completeness, Spec §US5 Scenarios 3-4]
- [ ] CHK018 - Is the duplicate-identifiers-in-batch edge case specified (second occurrence may be a no-op)? [Completeness, Spec §Edge Cases]

## Edge Cases — State Transitions

- [ ] CHK019 - Is the repeating task completion behavior specified (clone completed, original continues)? [Completeness, Spec §FR-011, Spec §Edge Cases]
- [ ] CHK020 - Is the project completion cascading behavior specified (completes project AND all remaining active child tasks)? [Completeness, Spec §US1 Scenario 3, Spec §Assumptions]
- [ ] CHK021 - Is the project incomplete behavior specified (project reopens but child tasks retain their individual status)? [Completeness, Spec §Assumptions]
- [ ] CHK022 - Is the sequential project dependency cascade specified (completing a task makes the next task available)? [Completeness, Spec §Edge Cases]
- [ ] CHK023 - Is the tag preservation on dropped items specified (tags preserved for future reference if reopened)? [Completeness, Spec §Edge Cases]
- [ ] CHK024 - Is the dropped-item-in-dropped-folder scenario specified (project reopens regardless of folder status)? [Completeness, Spec §Edge Cases]

## Floating Timezone Scope (Special Attention)

- [ ] CHK025 - Is `set_floating_timezone` explicitly specified as operating on BOTH tasks AND projects? [Completeness, Spec §FR-009, Spec §US6]
- [ ] CHK026 - Are acceptance scenarios defined for both a task with dates AND a project with dates? [Coverage, Spec §US6 Scenarios 1-2]
- [ ] CHK027 - Is the no-dates-assigned scenario specified (setting applied, takes effect when dates later assigned)? [Completeness, Spec §US6 Scenario 4, Spec §Assumptions]
- [ ] CHK028 - Is the floating timezone described as a per-item boolean (`shouldUseFloatingTimeZone`), not a global setting? [Clarity, Spec §Assumptions]
- [ ] CHK029 - Is the disable scenario specified (dates pinned to the timezone in which they were originally set)? [Completeness, Spec §US6 Scenario 3]
- [ ] CHK030 - Is the `set_floating_timezone` response format specified with item type (`'task'` or `'project'`) to confirm what was modified? [Completeness, Data-model §SetFloatingTimezoneInput, Quickstart §set_floating_timezone]

## Success Criteria Measurability

- [ ] CHK031 - Can SC-001 (complete in single operation, immediately reflected) be objectively measured? [Measurability, Spec §SC-001]
- [ ] CHK032 - Can SC-003 (batch up to 100, individual failures don't block) be objectively measured? [Measurability, Spec §SC-003]
- [ ] CHK033 - Can SC-004 (idempotent — repeated operations produce consistent results) be objectively measured? [Measurability, Spec §SC-004]
- [ ] CHK034 - Can SC-007 (version-incompatible returns clear error, not silent failure) be objectively measured? [Measurability, Spec §SC-007]
- [ ] CHK035 - Can SC-008 (all 6 tools pass contract + unit tests with same standards as existing) be objectively measured? [Measurability, Spec §SC-008]

## Requirement Clarity & Consistency

- [ ] CHK036 - Is the "active state" definition consistent across mark_incomplete (returns to active), drop_items (removes from active), and mark_complete (removes from active)? [Consistency, Spec §FR-001/002/003]
- [ ] CHK037 - Is the item identification by ID vs name specified consistently across all 6 tools (3 batch use `items[]`, 3 single-item use inline `id`/`name`)? [Consistency, Spec §FR-006, Data-model §ItemIdentifier]
- [x] CHK038 - Is the out-of-scope boundary clear — does the spec explicitly exclude task status querying (handled by list_tasks) and project status changes (handled by edit_project)? [Clarity, Resolved] → Spec §Out of Scope section added: explicitly excludes task status querying (Phase 3 list_tasks) and project status changes via edit (Phase 4 edit_project), distinguishing from the dedicated lifecycle operations in this spec.
- [ ] CHK039 - Are the priority assignments (P1-P4) for the 6 user stories documented with rationale for each? [Clarity, Spec §US1-US6]

## Assumptions Validation

- [ ] CHK040 - Are all 10 assumptions documented and traceable to either official API documentation or clarification session findings? [Completeness, Spec §Assumptions, Spec §Clarifications]
- [ ] CHK041 - Is the assumption about `markIncomplete()` only working on completed items (not dropped) validated by official docs? [Assumption, Spec §Assumptions, Research §3]
- [ ] CHK042 - Is the assumption about project type mutual exclusion (`containsSingletonActions` wins) consistent with the existing Phase 4 edit_project behavior? [Consistency, Spec §Assumptions, Spec §FR-007]

## Deep Review Notes

- Check items off as completed: `[x]`
- Add comments or findings inline with `→ Note: ...`
- Items with `[Gap]` indicate potential missing requirements
- Items with `[Consistency]` should be checked across multiple spec artifacts
