# Checklist: API Contracts

**Purpose**: Validate requirements quality for bulk operations API contract schemas -- shared batch result types, position parameters, property update validation, error codes, and response mappings.
**Created**: 2026-03-18
**Domain**: api-contracts
**Depth**: Standard
**Audience**: Reviewer (PR)
**Focus**: Shared batch schemas, position schemas, batch_update_tasks input validation, convert response mapping, per-item error codes

---

## Requirement Completeness

- [ ] CHK001 - Are all 9 error codes (NOT_FOUND, DISAMBIGUATION_REQUIRED, TARGET_NOT_FOUND, OPERATION_FAILED, TAG_NOT_FOUND, RELATIVE_TARGET_NOT_FOUND, ALREADY_A_PROJECT, VERSION_NOT_SUPPORTED, VALIDATION_ERROR) enumerated with scope (per-item vs top-level) and applicable tools? [Completeness, Spec Edge Cases + Plan AD-08]
- [ ] CHK002 - Is the `BulkBatchItemResultSchema` field inventory complete -- does the spec explicitly list all 9 fields (itemId, itemName, itemType, success, error, code, candidates, newId, newName) with their types and optionality? [Completeness, Spec Key Entities - Batch Result]
- [ ] CHK003 - Are all 12 property fields for `PropertyUpdateSetSchema` explicitly enumerated with their types (flagged:boolean, dueDate:string, clearDueDate:boolean, deferDate:string, clearDeferDate:boolean, estimatedMinutes:number, clearEstimatedMinutes:boolean, plannedDate:string, clearPlannedDate:boolean, addTags:string[], removeTags:string[], note:string)? [Completeness, Spec FR-006 + Key Entities - Property Update Set]
- [ ] CHK004 - Are the `TaskPositionSchema` target types explicitly listed with their field names and optionality (projectId, projectName, taskId, taskName, inbox)? [Completeness, Spec Key Entities - Position]
- [ ] CHK005 - Is it specified which tools use `TaskPositionSchema` (move_tasks, duplicate_tasks) vs `SectionPositionSchema` (move_sections, duplicate_sections) vs neither (batch_update_tasks, convert_tasks_to_projects)? [Completeness, Plan AD-03]
- [ ] CHK006 - Are the `SummarySchema` fields (total, succeeded, failed) and the runtime invariant (total === succeeded + failed) documented? [Completeness, Spec Key Entities implied but not explicit]
- [ ] CHK007 - Is it specified that `convert_tasks_to_projects` uses `targetFolderId`/`targetFolderName` rather than a position schema, and that it defaults to the library root when neither is specified? [Completeness, Spec FR-003]
- [ ] CHK008 - Are all 6 tools documented to share the same discriminated union response pattern (success:true with results+summary vs success:false with error+code)? [Completeness, Plan data-model.md Tool Response Shapes]

## Requirement Clarity

- [ ] CHK009 - Is the "at least one property must be specified" validation rule for `batch_update_tasks` unambiguously defined -- does it specify what counts as "specified" (i.e., `Object.values(data).some(v => v !== undefined)`)? [Clarity, Spec FR-013]
- [ ] CHK010 - Is it clear how `TaskPositionSchema` validates "exactly one target must be specified" -- is the constraint defined as exactly-one or at-least-one, and does the spec acknowledge that multiple targets (e.g., both projectId and inbox) should be rejected? [Clarity, Spec Key Entities - Position]
- [ ] CHK011 - Is the `relativeTo` requirement for `before`/`after` placements unambiguously stated for both `TaskPositionSchema` and `SectionPositionSchema`, including the error message when missing? [Clarity, Spec FR-010]
- [ ] CHK012 - Is "tag removals processed before additions" (FR-014) specified clearly enough for implementation -- does it define the exact ordering semantics within a single task's property application? [Clarity, Spec FR-014]
- [ ] CHK013 - Is the behavior of `note` in `batch_update_tasks` clearly specified as "append to existing note" (not overwrite), including what happens when the existing note is empty? [Clarity, Spec FR-006 + Acceptance Scenario 7]
- [ ] CHK014 - Are the mutual exclusion constraints (dueDate vs clearDueDate, deferDate vs clearDeferDate, estimatedMinutes vs clearEstimatedMinutes, plannedDate vs clearPlannedDate) explicitly defined with their validation error messages? [Clarity, Contracts shared.ts]
- [ ] CHK015 - Is the `placement` field default value (`ending`) explicitly documented in the spec for `TaskPositionSchema`, consistent with how existing tools default position? [Clarity, Spec FR-010 + Contracts shared.ts line 136]

## Requirement Consistency

- [ ] CHK016 - Is the `SectionPositionSchema` in the contracts structurally consistent with the existing `PositionSchema` from `src/contracts/folder-tools/shared/position.ts` (same fields, same refinements, same null/undefined semantics)? [Consistency, Plan AD-03 + Research RT-03]
- [ ] CHK017 - Is the `ItemIdentifierSchema` in bulk-tools structurally consistent with the existing `ItemIdentifierSchema` from `src/contracts/status-tools/shared/item-identifier.ts` (same fields, same refinements, same describe text)? [Consistency, Plan AD-02 + Research RT-02]
- [ ] CHK018 - Does the `BulkBatchItemResultSchema` extend the status-tools `StatusBatchItemResultSchema` pattern consistently -- are all shared fields (itemId, itemName, itemType, success, error, code, candidates) identical in type and optionality? [Consistency, Research RT-02]
- [ ] CHK019 - Is the `batch_update_tasks` tag handling (addTags/removeTags) consistent with existing `assign_tags`/`remove_tags` tools regarding tag identifier format (names or IDs accepted)? [Consistency, Spec Assumptions]
- [ ] CHK020 - Are the per-item result indices documented consistently across all 6 tools ("at original array indices") in both the spec and the contract schemas? [Consistency, Spec FR-007 + Constitution IV]
- [ ] CHK021 - Is the `batch_update_tasks` note-append behavior documented consistently with the existing `append_note` tool behavior? [Consistency, Spec FR-006 Acceptance Scenario 7]
- [ ] CHK022 - Is the `SectionPositionSchema` `placement` field required (no default) while `TaskPositionSchema` `placement` defaults to `ending` -- is this asymmetry intentional and documented? [Consistency, Contracts shared.ts lines 134-136 vs 198-201]

## Acceptance Criteria Quality

- [ ] CHK023 - Do the acceptance scenarios for `batch_update_tasks` (User Story 3) cover the "at least one property" validation error case explicitly (not just in Edge Cases)? [Acceptance Criteria, Spec Edge Cases line 129]
- [ ] CHK024 - Do the acceptance scenarios for `convert_tasks_to_projects` specify that the response includes both `newId` (project ID) and `newName` (project name) for each successfully converted task? [Acceptance Criteria, Spec FR-017 + Acceptance Scenario 3]
- [ ] CHK025 - Do the acceptance scenarios for `duplicate_tasks` specify that the response includes `newId` for each duplicate and that the copy is active/incomplete (FR-011, FR-017)? [Acceptance Criteria, Spec User Story 2 Scenario 3-5]
- [ ] CHK026 - Is the maximum batch size (100 items) testable via acceptance scenarios -- does User Story 1 Scenario 5 (50 items) or any scenario explicitly test the 100-item limit boundary? [Acceptance Criteria, Spec FR-009 + Edge Cases line 132]
- [ ] CHK027 - Are the disambiguation acceptance scenarios measurable -- do they specify the exact structure of `candidates` array (id + name + type per candidate)? [Acceptance Criteria, Spec User Story 1 Scenario 2]

## Scenario Coverage

- [ ] CHK028 - Are requirements defined for what happens when `batch_update_tasks` specifies `plannedDate` on a system running OmniFocus below v4.7? [Coverage, Spec FR-006 + data-model.md Version Gating]
- [ ] CHK029 - Are requirements defined for how `convert_tasks_to_projects` handles the `convertTasksToProjects()` return value when the OmniJS function returns the new project -- specifically, how `newId` and `newName` are extracted from the returned Project object? [Coverage, Spec Clarifications - Session 2026-03-18]
- [x] CHK030 - Are requirements defined for what happens when `addTags` and `removeTags` reference the same tag in a single `batch_update_tasks` call? [Coverage, Spec Edge Cases -- REMEDIATED: edge case added to spec.md]
- [ ] CHK031 - Are requirements defined for how `duplicate_tasks` handles duplication of a task whose subtasks have tags, dates, and completion states -- are subtask properties preserved in the copy? [Coverage, Spec FR-002 + User Story 2 Scenario 2]

## Edge Case Coverage

- [ ] CHK032 - Is the behavior defined when `TaskPositionSchema` receives both `projectId` and `inbox: true` simultaneously (conflicting targets)? [Edge Case, Contracts shared.ts refine line 144-159]
- [ ] CHK033 - Is the behavior defined when `ItemIdentifierSchema` receives both `id` and `name` and they refer to different items -- does the spec clearly state `id` takes precedence? [Edge Case, Spec Key Entities - ItemIdentifier implied]
- [x] CHK034 - Is the behavior defined for empty arrays in `addTags: []` or `removeTags: []` in `batch_update_tasks` -- do they count as "specified" for the "at least one property" validation? [Edge Case, Spec Edge Cases -- REMEDIATED: edge case added to spec.md + .min(1) added to contract]
- [x] CHK035 - Is the behavior defined when `batch_update_tasks` receives `clearDueDate: false` -- does `false` count as "specified" or is it treated as unspecified for the "at least one property" check? [Edge Case, Spec Edge Cases -- REMEDIATED: edge case added to spec.md + refine updated in contract]
- [ ] CHK036 - Is the behavior defined for duplicate item identifiers within the same batch request (same ID appearing twice in the items array)? [Edge Case, Spec Edge Cases line 127]
- [ ] CHK037 - Is the behavior defined when `SectionPositionSchema` is used with `beginning`/`ending` and no `relativeTo` -- does the spec explicitly state this maps to the library root? [Edge Case, Contracts shared.ts SectionPositionSchema comments]

## Non-Functional Requirements

- [ ] CHK038 - Are performance requirements specified for bulk operations at the maximum batch size (100 items) -- is there a timeout or latency expectation? [Non-Functional, Spec SC-008]
- [ ] CHK039 - Is the per-item error handling documented for atomicity guarantees -- specifically, the spec says "no rollback on partial property failure within a task" but does it specify what properties may have been applied on a failed task? [Non-Functional, Spec Out of Scope - Rollback]

## Dependencies & Assumptions

- [ ] CHK040 - Is the assumption that all 5 OmniJS bulk API functions (`moveTasks`, `duplicateTasks`, `convertTasksToProjects`, `moveSections`, `duplicateSections`) are available in all supported OmniFocus versions explicitly documented and validated? [Assumption, Spec Assumptions]
- [ ] CHK041 - Is the dependency on the existing `PositionSchema` from folder-tools documented in the spec or plan, including the claim that `SectionPositionSchema` "reuses" it vs being a structural copy? [Dependency, Plan AD-03 + Research RT-03]

## Ambiguities & Conflicts

- [x] CHK042 - Does the spec clarify whether `TaskPositionSchema` target validation is "exactly one target" or "at least one target" -- the contracts use "at least one" (refine `targets >= 1`) but the data-model.md says "Exactly one target type must be specified"? [Conflict -- REMEDIATED: contract updated to double-refine (at-least-one + no-more-than-one), spec edge case added]
- [x] CHK043 - Does the spec clarify whether `convert_tasks_to_projects` supports `targetFolderId` OR `targetFolderName` simultaneously, and if so, which takes precedence? [Ambiguity -- REMEDIATED: spec edge case added, contract JSDoc updated with precedence rule]
- [x] CHK044 - Does the data-model.md `TaskPosition` entity use a nested `target` object structure while the Zod contract uses flat fields -- is this discrepancy between documentation and contract schema acknowledged? [Conflict -- REMEDIATED: data-model.md updated to flat fields matching contract, consistent with all existing position schemas]

---

## Appendix: Focused API-Contracts Review (Run 2)

**Created**: 2026-03-18
**Focus**: Deep review of shared batch schemas, position schema asymmetries, batch_update_tasks wide-input validation, convert response mapping, warning field coverage

### Shared Batch Result Schema

- [x] CHK045 - Is the spec's requirement that moving/duplicating items into an inactive (completed/dropped) target project returns a "warning in the response" (Edge Cases) reflected in the BulkBatchItemResult schema? The contract has no `warning` field -- is this an intentional omission or a gap? [Gap -- REMEDIATED: Added optional `warning` field to BulkBatchItemResult in spec Key Entities, contracts/shared.ts, and data-model.md. No existing batch schema has a warning field (confirmed via RepoPrompt codebase audit); this is a net-new addition documented as unique to bulk-tools]
- [ ] CHK046 - Is the `itemId` value explicitly specified for the case where a name-based lookup finds zero matches (NOT_FOUND)? The contracts describe it as "Resolved item ID (or input identifier if lookup failed)" but do not clarify whether "input identifier" is the input name string, the input ID string, or a synthetic placeholder. [Clarity, Contracts shared.ts line 60]
- [ ] CHK047 - Are the conditions under which `newId` and `newName` are populated vs undefined enumerated per-tool in a single reference table (currently scattered across individual contract comments)? [Completeness, Contracts shared.ts, data-model.md Tool Input/Output Summary]

### Position Parameter Schema Asymmetries

- [x] CHK048_A - Is the `SectionPositionSchema` `placement` field documented as required (no default) while `TaskPositionSchema` `placement` defaults to `ending`? The spec says "optional position control" for both task and section operations (FR-001, FR-004), but the contracts implement different defaults. Is this asymmetry intentional and specified? [Gap -- REMEDIATED: Added explicit documentation in spec Key Entities "Position" explaining the asymmetry: SectionPosition follows established folder-tools PositionSchema (placement required), TaskPosition adds default for convenience. Confirmed folder-tools/shared/position.ts has no default via codebase audit]
- [ ] CHK049_A - Is the `SectionPositionSchema` `relativeTo` dual-purpose semantic (parent folder for beginning/ending, sibling for before/after) documented in the spec, or only in the contract JSDoc? The folder-tools position.ts has extensive documentation on this, but spec.md Key Entities "Position" only briefly mentions it. [Clarity, Spec Key Entities vs Contracts shared.ts SectionPositionSchema JSDoc]

### batch_update_tasks Wide Input Validation

- [ ] CHK050_A - Is the "at least one substantive property" validation rule in FR-013 specified with sufficient precision to distinguish between `flagged: undefined` (not specified, does not count), `flagged: true` (specified, counts), `flagged: false` (specified, counts as unflag), and `clearDueDate: false` (not substantive, does NOT count)? The spec edge case on line 138 addresses `clearX: false` but the main FR-013 text does not reference this nuance. [Clarity, Spec FR-013 + Edge Case line 138]
- [x] CHK051_A - Is the date format validation for `dueDate`, `deferDate`, and `plannedDate` fields specified (e.g., must be ISO 8601 string)? The contract uses `z.string()` without `.datetime()` or format refinement -- is this intentional (letting OmniJS handle format validation) or a gap? [Gap -- REMEDIATED: Confirmed this follows established codebase pattern (no `.datetime()` anywhere in src/contracts/ per RepoPrompt audit). Added explicit documentation in spec Key Entities and data-model.md noting this is an intentional design decision: format validation delegated to OmniJS/OmniFocus layer]
- [x] CHK052_A - Is the `estimatedMinutes` constraint `min(0)` specified in the spec requirements, or only in the contract? FR-006 does not mention a minimum value constraint for estimated minutes. [Gap -- REMEDIATED: Added "non-negative number, min 0" to spec Key Entities PropertyUpdateSet description and "number (min 0)" to data-model.md PropertyUpdateSet table. Note: existing addOmniFocusTask tool uses z.number() without min(0); bulk-tools is intentionally stricter to prevent negative estimates]

### convert_tasks_to_projects Response Mapping

- [ ] CHK053_A - Is the phrase "tags and dates transfer where applicable" (Acceptance Scenario 6-2) defined with specific rules? Which tags transfer to a project? Which dates transfer? OmniFocus projects support due dates and defer dates but not all task date types. This vague language may lead to implementation ambiguity. [Ambiguity, Spec User Story 4 Acceptance Scenario 2]
- [ ] CHK054_A - Is the mapping from input `ItemIdentifier` to output `BulkBatchItemResult` for convert_tasks_to_projects documented such that `itemId` = original task ID and `newId` = newly created project ID? While the data-model.md states this for duplicate operations, the convert-specific mapping is implied but not explicitly stated. [Clarity, data-model.md Tool Input/Output Summary - convert_tasks_to_projects]

### Per-Item Error Code Coverage

- [ ] CHK055_A - Are the per-tool error code assignments documented in a single matrix (tool x error code) showing which codes can be returned by which tool? Currently the information is spread across data-model.md Error Codes, individual contract comments, and spec Edge Cases. [Completeness, data-model.md Error Codes]
- [ ] CHK056_A - Is the `TARGET_NOT_FOUND` error code specified for `batch_update_tasks`? This tool has no position/target parameter -- is TARGET_NOT_FOUND applicable (e.g., for tag resolution) or explicitly excluded? [Clarity, data-model.md Error Codes, Contracts batch-update-tasks.ts line 63]

### Cross-Tool Consistency

- [ ] CHK057_A - Is the error response `code` field documented as optional (`z.string().optional()`) for all 6 tools' error schemas? If the `code` field is omitted on an error response, the consumer has no machine-readable error classification. Should this be required rather than optional? [Consistency, Contracts: all 6 ErrorSchema definitions]
