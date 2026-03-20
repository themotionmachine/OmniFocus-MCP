# Type Safety Checklist: TaskPaper Import/Export

**Purpose**: Validate that type safety requirements for Zod 4.x schemas, data structures, and null/undefined handling are complete, clear, and consistent across spec and plan artifacts.
**Created**: 2026-03-20
**Feature**: specs/012-taskpaper/spec.md

## Requirement Completeness — Zod Schema Definitions

- [ ] CHK001 - Are Zod 4.x input schemas explicitly defined for all 3 tools (import_taskpaper, export_taskpaper, validate_transport_text) with field types, constraints, and defaults? [Completeness, Spec §FR-001/003/006]
- [ ] CHK002 - Are Zod 4.x output/response schemas explicitly defined for all 3 tools with success and error discriminated union variants? [Completeness, Spec §FR-001/003/006]
- [ ] CHK003 - Is the ParsedItem schema structure explicitly specified as recursive (children: ParsedItem[]) or flat list with parentId? [Clarity, Spec §FR-006, Data Model §ParsedItem]
- [ ] CHK004 - Is the CreatedItem schema fully specified with all fields and their types (id, name, type), and is the absence or presence of a parentTaskId field documented? [Completeness, Data Model §CreatedItem]
- [ ] CHK005 - Is the ExportedText response schema (transportText string + ExportSummary + warnings array) fully specified with field names and types? [Completeness, Spec §FR-003, Data Model §ExportSummary]
- [ ] CHK006 - Are the ValidationSummary and ValidationWarning schemas explicitly defined with all fields and Zod types (number().int().min(0), etc.)? [Completeness, Data Model §ValidationSummary/ValidationWarning]

## Requirement Clarity — Null vs Undefined Handling

- [x] CHK007 - Is the null vs undefined convention for optional task properties (deferDate, dueDate, estimatedMinutes, note, doneDate) explicitly specified as `.nullable()` (not `.optional()`)? [Clarity, Remediated — Spec §Type Safety Conventions > Null vs Undefined Convention]
- [ ] CHK008 - Is the export serializer's behavior for null date/estimate properties explicitly documented as "omit the token" with reference to the Zod schema using `.nullable()`? [Clarity, Spec §Edge Cases, OmniJS Property Reference]
- [ ] CHK009 - Does the spec or plan explicitly state whether ParsedItem fields (dueDate, deferDate, doneDate, estimate, note) use `null` to represent "not set" vs `undefined`/omission? [Clarity, Data Model §ParsedItem]
- [ ] CHK010 - Is the distinction between empty string `""` and `null` for the `note` field documented (OmniJS returns `""` for empty notes; should the schema allow both or normalize)? [Clarity, Spec §OmniJS Property Reference]

## Requirement Consistency — Shared Types and Token Mapping

- [x] CHK011 - Is the shared token-to-property mapping (used by both validator and export serializer) specified as TypeScript types (not runtime Zod schemas) to avoid duplication, as the user prompt requires? [Consistency, Remediated — Spec §Type Safety Conventions > Shared Token-to-Property Mapping]
- [ ] CHK012 - Are the full set of recognized TaskPaper tokens (`@defer`, `@due`, `@done`, `@estimate`, `@flagged`, `@tags`, `@autodone`, `@parallel`, `@repeat-method`, `@repeat-rule`) consistently listed in both the validator requirements (FR-006) and the OmniJS Property Reference table? [Consistency, Spec §FR-006 vs §OmniJS Property Reference]
- [ ] CHK013 - Is the relationship between the export-only token subset (@defer, @due, @done, @estimate, @flagged, @tags) and the full validator token set consistent with the KISS rationale in the Clarifications? [Consistency, Spec §Clarifications]
- [ ] CHK014 - Are the shared schema file names and locations consistent between the plan's Project Structure section and the data model entities? [Consistency, Plan §Project Structure vs Data Model]

## Requirement Clarity — Input Schema Constraints

- [x] CHK015 - Is the `text` input parameter for import_taskpaper specified with Zod constraints (min length, trim behavior, max length)? [Clarity, Remediated — Spec §Type Safety Conventions > Input Schema Constraints]
- [x] CHK016 - Is the `text` input parameter for validate_transport_text specified with the same Zod constraints as import_taskpaper for consistency? [Consistency, Remediated — Spec §Type Safety Conventions > Input Schema Constraints]
- [ ] CHK017 - Is the mutual exclusion constraint for export_taskpaper scope parameters (projectId OR folderId OR taskIds) specified as a Zod `.refine()` or discriminated union? [Clarity, Plan §Post-Design Constitution Re-Check]
- [ ] CHK018 - Is the `taskIds` array for export_taskpaper specified with bounds (1-100 items) matching the existing codebase pattern? [Clarity, Data Model §Validation Rules]
- [ ] CHK019 - Is the `status` filter enum for export_taskpaper specified to reuse the existing `TaskStatusFilterSchema` from search-tools, or does it define its own? [Consistency, Spec §FR-003]

## Acceptance Criteria Quality — Response Schemas

- [ ] CHK020 - Are the import response schema fields (CreatedItem[], ImportSummary) specified with enough precision that a contract test can validate them without ambiguity? [Measurability, Spec §FR-001]
- [ ] CHK021 - Are the export response schema fields (transportText string, ExportSummary, warnings) specified with enough precision for contract testing? [Measurability, Spec §FR-003]
- [ ] CHK022 - Are the validation response schema fields (ParsedItem[], ValidationSummary, ValidationWarning[]) specified with enough precision for contract testing? [Measurability, Spec §FR-006]
- [x] CHK023 - Is the discriminated union pattern (`success: true/false`) for response schemas explicitly specified, following the codebase convention (e.g., search-tools pattern)? [Consistency, Remediated — Spec §Type Safety Conventions > Response Schema Patterns]

## Edge Case Coverage — Type Boundary Conditions

- [ ] CHK024 - Is the Zod type for `estimatedMinutes` in the export OmniJS property (Number or null) and the ParsedItem `estimate` field (string or null) clearly distinguished, with the conversion logic (minutes to duration string) specified? [Clarity, Spec §OmniJS Property Reference]
- [ ] CHK025 - Are date format requirements for ParsedItem date fields specified (ISO 8601 `yyyy-MM-dd` strings, not Date objects) to ensure Zod schema uses `z.string().nullable()` not `z.date()`? [Clarity, Spec §Date Formatting]
- [ ] CHK026 - Is the behavior for empty tags array explicitly specified (empty array `[]` vs omission of `@tags` token)? [Edge Case, Spec §OmniJS Property Reference]
- [ ] CHK027 - Is the Zod schema for `depth` field specified as `z.number().int().min(0)` to prevent negative or fractional depth values? [Edge Case, Data Model §ParsedItem]
- [ ] CHK028 - Is the handling of `task.tasks` (TaskArray, read-only) return type from OmniJS documented for the recursive export traversal, including what happens when a leaf task has no children (empty array)? [Edge Case, Spec §OmniJS Property Reference]

## Scenario Coverage — Zod 4.x Specific Patterns

- [x] CHK029 - Does the spec or plan specify which Zod 4.x union pattern to use for response schemas: `z.discriminatedUnion()` vs `z.union()`? [Clarity, Remediated — Spec §Response Schema Patterns + Plan §Schema Design Decisions]
- [ ] CHK030 - Is the recursive ParsedItem schema specified using `z.lazy()` for the `children` field, following Zod 4.x patterns for recursive types? [Clarity, Plan §Post-Design Constitution Re-Check]
- [x] CHK031 - Are Zod 4.x breaking changes from Zod 3 acknowledged in the schema design (e.g., `.describe()` method changes, type inference changes)? [Coverage, Remediated — Spec §Type Safety Conventions > Zod 4.x Compatibility Notes]

## Dependencies and Assumptions — Reuse of Existing Patterns

- [ ] CHK032 - Is the reuse of existing `TaskStatusFilterSchema` from search-tools explicitly documented as a dependency, or is a new status enum defined? [Dependency, Spec §FR-003]
- [ ] CHK033 - Are the shared schema files (import-types.ts, export-types.ts, validation-types.ts) specified in the plan's Project Structure consistent with the data model entities? [Consistency, Plan §Project Structure]
- [x] CHK034 - Is the export_taskpaper `warnings` field in the response schema defined (data model §ExportSummary does not mention warnings but Spec §FR-003 implies metadata fidelity concerns)? [Remediated — Spec §Key Entities > Export Result + Data Model §Relationships]

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- Link to relevant resources or documentation
- Items are numbered sequentially for easy reference
