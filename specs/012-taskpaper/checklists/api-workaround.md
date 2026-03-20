# API Workaround Checklist: TaskPaper Import/Export

**Purpose**: Validate that OmniJS API workaround requirements are complete, clear, and consistent -- focusing on `byParsingTransportText` error handling, custom export serializer property mapping, subtask recursion, date formatting, and project reference behavior.
**Created**: 2026-03-20
**Feature**: [spec.md](../spec.md)
**Depth**: Standard
**Audience**: Reviewer (PR)

## Requirement Completeness -- byParsingTransportText Error Handling

- [ ] CHK001 - Is the behavior of `byParsingTransportText` on malformed input explicitly documented (returns empty array vs. throws vs. partial parse)? [Completeness, Spec Clarifications §2026-03-20]
- [x] CHK002 - Are requirements defined for detecting and reporting when `byParsingTransportText` returns an empty array from seemingly-valid input (partial parse failure)? [Gap, Remediated: Spec Edge Cases + FR-001 updated to document lenient API behavior and skipped-line handling]
- [ ] CHK003 - Is the spec explicit about whether `byParsingTransportText` can return a partial result (some tasks created, some lines silently ignored) and how the system should handle that case? [Clarity, Spec Assumptions]
- [x] CHK004 - Are requirements defined for what the import tool returns when `byParsingTransportText` produces fewer items than the transport text implies? [Gap, Remediated: Spec Edge Cases + FR-001 updated -- import returns only actually-created items; callers use validate_transport_text for pre-import checking]
- [ ] CHK005 - Is the empty-input rejection behavior (FR-008) consistent between the import tool and the validator? [Consistency, Spec §FR-008]

## Requirement Clarity -- Export Serializer Property Mapping

- [ ] CHK006 - Are the exact OmniJS Task API property names for export explicitly listed (e.g., `task.name`, `task.flagged`, `task.tags`, `task.deferDate`, `task.dueDate`, `task.estimatedMinutes`, `task.note`)? [Clarity, Spec §FR-003]
- [ ] CHK007 - Is the mapping between OmniJS property names and TaskPaper output tokens unambiguous (e.g., `task.deferDate` maps to `@defer(date)`, `task.dueDate` maps to `@due(date)`)? [Clarity, Spec §FR-003]
- [x] CHK008 - Is it documented whether `task.estimatedMinutes` is a number (minutes) or a Duration object, and how it converts to the `@estimate(duration)` string format? [Clarity, Gap, Remediated: Spec §OmniJS Property Reference table documents type as Number or null with conversion notes]
- [x] CHK009 - Is it documented which property provides tag access for export -- `task.tags` (Tag objects) vs. `task.tags.map(t => t.name)` -- and how tag names are serialized? [Clarity, Gap, Remediated: Spec §OmniJS Property Reference documents TagArray access pattern with map function]
- [ ] CHK010 - Is the note property access documented -- `task.note` (string) -- and is the `//` serialization format for multi-line notes specified? [Clarity, Spec §FR-009]

## Requirement Completeness -- Subtask Recursion

- [ ] CHK011 - Is the distinction between `task.children` (direct children) and `task.flattenedTasks` (all descendants) explicitly documented in the spec or plan? [Completeness, Spec §R-005]
- [x] CHK012 - Does the spec explicitly state which OmniJS property is used for recursive export traversal (`task.children` for direct children only, preserving hierarchy)? [Clarity, Gap, Remediated: Spec §FR-003 and §OmniJS Property Reference specify task.tasks for export traversal]
- [ ] CHK013 - Does the spec explicitly state which OmniJS property is used for import ID collection (`task.flattenedTasks` or manual recursion via `task.children`)? [Clarity, Spec §FR-001]
- [x] CHK014 - Are requirements defined for maximum recursion depth in both export and import to prevent stack overflow on deeply nested tasks? [Coverage, Gap, Remediated: Spec Assumptions documents YAGNI decision -- no artificial depth limit; natural termination at leaf tasks]

## Requirement Clarity -- Date Formatting

- [ ] CHK015 - Is the date format used by `byParsingTransportText` for parsing explicitly documented (ISO 8601 `yyyy-MM-dd` vs. locale-dependent)? [Clarity, Spec §FR-009]
- [ ] CHK016 - Is the date format emitted by the export serializer explicitly specified (ISO 8601 `yyyy-MM-dd`)? [Clarity, Spec §FR-003]
- [ ] CHK017 - Is the date format expected by the validator parser explicitly specified, and is it consistent with the export format? [Consistency, Spec §FR-006]
- [x] CHK018 - Is it documented whether `task.dueDate` and `task.deferDate` return JavaScript Date objects or ISO strings, and what formatting conversion the export serializer applies? [Clarity, Gap, Remediated: Spec §OmniJS Property Reference and §Date Formatting document Date or null type with local timezone yyyy-MM-dd conversion]
- [x] CHK019 - Are requirements defined for how timezone information is handled in date serialization (local time vs. UTC vs. floating)? [Gap, Remediated: Spec §Date Formatting documents local timezone extraction via getFullYear/getMonth/getDate to avoid UTC date-shifting]

## Scenario Coverage -- Project Reference in Transport Text

- [ ] CHK020 - Is the behavior when `::ProjectName` does not match any existing project explicitly documented in the spec (inbox placement, no auto-creation)? [Completeness, Spec Edge Cases]
- [ ] CHK021 - Is the behavior of `::ProjectName` matching explicitly documented -- is it exact match, case-sensitive, or fuzzy? [Clarity, Spec Clarifications §2026-03-20]
- [x] CHK022 - Are requirements defined for what the validate tool reports when it encounters a `::ProjectName` reference (should it flag as a warning if project existence cannot be verified without OmniFocus)? [Coverage, Gap, Remediated: Spec Edge Cases documents that validator parses ::ProjectName for informational metadata, does NOT warn since it is valid syntax and cannot verify existence]
- [ ] CHK023 - Is the two-phase import approach (parse to inbox, then moveTasks) clearly documented with its failure modes (e.g., what if moveTasks fails after tasks are already created)? [Completeness, Spec §FR-002]

## Edge Case Coverage -- API Behavior Boundaries

- [ ] CHK024 - Are requirements defined for what happens when `byParsingTransportText` is called with text containing only comments or blank lines (not truly empty but no actionable content)? [Coverage, Spec §FR-008]
- [x] CHK025 - Is the behavior documented when transport text contains duplicate `::ProjectName` references on different tasks? [Coverage, Gap, Remediated: Spec Edge Cases documents independent per-line processing with no conflict or deduplication]
- [x] CHK026 - Are requirements defined for how the export serializer handles tasks with null/undefined dates (omit the token vs. emit empty value)? [Coverage, Gap, Remediated: Spec Edge Cases + OmniJS Property Reference document omit-when-null behavior for all optional tokens]
- [x] CHK027 - Are requirements defined for how the export serializer handles tasks with empty string names? [Coverage, Gap, Remediated: Spec Edge Cases documents graceful handling -- emits metadata tokens on line with empty name prefix]
- [ ] CHK028 - Is the handling of special characters in task names during export documented (quotes, backslashes, tab characters within names)? [Coverage, Spec Edge Cases]

## Acceptance Criteria Quality

- [ ] CHK029 - Can SC-002 ("95% of supported metadata fields") be objectively measured -- is the field list and measurement methodology defined? [Measurability, Spec §SC-002]
- [ ] CHK030 - Is SC-004 (round-trip fidelity) testable without manual comparison -- are the "supported properties" explicitly enumerated? [Measurability, Spec §SC-004]

## Notes

- This checklist focuses on API workaround requirements quality for the TaskPaper Import/Export feature.
- Items marked [Gap] indicate requirements that may be missing from the spec or plan.
- Items referencing specific spec sections can be cross-checked against the spec for accuracy.
