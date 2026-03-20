# Specification Quality Checklist: TaskPaper Import/Export

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-03-20
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

## Import Partial Failure & Undo Semantics (US1)

- [x] CHK001 - Does the spec explicitly state whether `byParsingTransportText` creates items partially (some lines succeed, some silently skipped) or all-or-nothing? [Clarity, Spec §FR-001] [Gap -- Remediated: Added explicit "partial creation" language to FR-001]
- [x] CHK002 - Is there a requirement that the `import_taskpaper` MCP tool description must warn that import CANNOT be undone atomically? [Completeness, Spec §US1 / FR-001] [Gap -- Remediated: Added FR-011 requiring WARNING: prefix in tool description]
- [ ] CHK003 - Are the acceptance scenarios for US1 sufficient to cover the case where `byParsingTransportText` silently skips some lines and creates fewer items than the input implies? [Coverage, Spec §US1 Acceptance Scenarios / Edge Cases line 72]
- [ ] CHK004 - Is the import result structure clear about what "items" means when some input lines were silently ignored -- does the spec state that the returned list contains ONLY items actually created, not a mapping of input lines to outcomes? [Clarity, Spec §FR-001 / Key Entities > Import Result]
- [ ] CHK005 - Does the spec define what happens when `byParsingTransportText` returns an empty array (no items created from non-empty input)? Is the error message requirement clear? [Completeness, Spec §Clarifications Session 2026-03-20 Q3]

## Export Scope & Edge Cases (US2)

- [ ] CHK006 - Is the mutual exclusion constraint for export scope parameters (exactly one of projectId, folderId, or taskIds) specified in the functional requirements, not just in the contracts? [Traceability, Spec §FR-003/FR-004/FR-005]
- [ ] CHK007 - Does FR-004 (folder export) specify the expected output structure when a folder contains many nested projects with subtasks -- specifically whether the output nests projects under the folder or flattens them? [Clarity, Spec §FR-004]
- [ ] CHK008 - Are edge case requirements defined for exporting an empty project (project with no tasks)? [Coverage, Spec §US2 Acceptance Scenario 5]
- [x] CHK009 - Does FR-004 define the behavior when a folder contains sub-folders? [Completeness, Spec §FR-004] [Gap -- Remediated: FR-004 now specifies recursive sub-folder traversal]
- [x] CHK010 - Is there a requirement specifying the order of items in export output? [Clarity, Spec §FR-003/FR-004/FR-005] [Gap -- Remediated: FR-004 and new edge case specify OmniFocus native display order]
- [x] CHK011 - Does the export response schema include a `warnings` field as described in Key Entities? [Consistency, Spec §Key Entities > Export Result vs. contracts/export-taskpaper.ts] [Gap -- Remediated: Added warnings: z.array(ValidationWarningSchema) to ExportTaskpaperSuccessSchema]

## Validator AI-Agent Utility (US3)

- [ ] CHK012 - Does FR-006 specify that the validator returns enough parsed information (task count, project names, dates found, tag names) for an AI agent to reason about what would be created before committing an import? [Completeness, Spec §FR-006 / Clarifications Q7]
- [ ] CHK013 - Is the pure TypeScript constraint for validate_transport_text documented in the functional requirements, or only in the Assumptions section? [Traceability, Spec §Assumptions vs. FR-006]
- [x] CHK014 - Does the spec define how the validator reports `::ProjectName` references in parsed output? [Consistency, Spec §Edge Cases vs. FR-006] [Gap -- Remediated: Added projectName field to FR-006, ParsedItem schema, data-model.md, and validation-types.ts contract]
- [ ] CHK015 - Is the validator's handling of mixed indentation (tabs vs. spaces) specified as a warning, not an error? [Clarity, Spec §Edge Cases line 71]

## Round-Trip Fidelity Limitations (FR-010)

- [x] CHK016 - Does FR-010's enumeration of non-representable properties include ALL omitted categories? [Completeness, Spec §FR-010 vs. Assumptions] [Gap -- Remediated: FR-010 now lists @autodone, @parallel alongside repetition rules, review intervals, perspectives, attachments]
- [ ] CHK017 - Is the round-trip fidelity limitation documented in a location that is user-facing (e.g., tool description or response metadata), not just in the spec's FR-010? [Clarity, Spec §FR-010]
- [ ] CHK018 - Does SC-004 (round-trip fidelity success criterion) explicitly state which properties are in scope for the round-trip match, given that some properties are known to be lost? [Measurability, Spec §SC-004]
- [ ] CHK019 - Are completion status (`@done(date)`) and drop status addressed in round-trip fidelity? Export emits `@done` but does the spec state whether dropped status survives round-trip? [Coverage, Spec §SC-004 / FR-003]

## Non-Atomic Undo Warning

- [x] CHK020 - Is there a functional requirement mandating that the import tool's MCP description clearly communicates the irreversibility risk to AI agents? [Completeness] [Gap -- Remediated: FR-011 added requiring WARNING: prefix convention in tool description]

## Notes

- All items from the original pre-plan checklist pass (marked [x] above).
- CHK001-CHK020 added for focused requirements quality review per user prompt targeting: US1 partial failure semantics, US2 export scope edge cases, US3 validator AI-agent utility, round-trip fidelity documentation, and non-atomic undo warnings.
- All 8 [Gap] items have been remediated (see individual items for details).
- Assumptions section documents key technical constraints (transport text format, OmniJS API behavior, export being custom-built, round-trip fidelity limitations) that inform planning but do not prescribe implementation.
