# Type Safety Checklist: Task Status & Completion

**Purpose**: Validate that requirements clearly specify Zod schemas, validation rules, type discriminants, and contract structures for all 6 status tools
**Created**: 2026-03-17
**Feature**: [spec.md](../spec.md), [data-model.md](../data-model.md), [plan.md](../plan.md)

## Input Schema Coverage (All 6 Tools)

- [ ] CHK001 - Are input schemas defined for all 6 tools with field names, types, and required/optional status? [Completeness, Data-model §MarkCompleteInput through §SetFloatingTimezoneInput]
- [ ] CHK002 - Is the `ItemIdentifier` shared schema specified with the conditional requirement (at least one of `id` or `name` must be non-empty)? [Clarity, Data-model §ItemIdentifier]
- [ ] CHK003 - Is the `id`-takes-precedence rule documented when both `id` and `name` are provided? [Clarity, Data-model §ItemIdentifier Validation Rule 2]
- [ ] CHK004 - Is the contract directory structure specified (`src/contracts/status-tools/` with `shared/` subdirectory)? [Completeness, Plan §Project Structure]
- [ ] CHK005 - Is the `projectType` field specified as a constrained enum (`'sequential' | 'parallel' | 'single-actions'`) rather than a free-form string? [Clarity, Data-model §SetProjectTypeInput]
- [ ] CHK006 - Is the `enabled` field for `set_floating_timezone` specified as a required boolean (not optional)? [Clarity, Data-model §SetFloatingTimezoneInput]
- [ ] CHK007 - Is the `allOccurrences` field for `drop_items` specified with both its type (boolean) and default value (true)? [Completeness, Data-model §DropItemsInput]

## Output/Response Schema Coverage

- [ ] CHK008 - Are batch response schemas defined with the three-level structure (top-level success, results array, summary object)? [Completeness, Data-model §Batch Response]
- [ ] CHK009 - Are single-item response schemas defined for `set_project_type`, `get_next_task`, and `set_floating_timezone` with their tool-specific fields? [Completeness, Data-model §Single-Item Response]
- [ ] CHK010 - Is the `GetNextTaskSuccess` response specified as a discriminated type with `hasNext` controlling presence of `task` vs `reason` fields? [Clarity, Data-model §GetNextTaskSuccess]
- [ ] CHK011 - Are the catastrophic error responses (top-level `success: false`) distinguished from per-item failures in the schema definitions? [Clarity, Data-model §Batch Response vs §StatusBatchItemResult]
- [ ] CHK012 - Is the `SetProjectType` success response specified to include both the requested `projectType` string AND the resolved `sequential`/`containsSingletonActions` booleans? [Completeness, Quickstart §set_project_type]

## Completion Date Format (Special Attention)

- [ ] CHK013 - Is the `completionDate` field specified as an optional ISO 8601 string with explicit nullable semantics (null = current date)? [Clarity, Data-model §MarkCompleteInput, Research §5]
- [x] CHK014 - Is the ISO 8601 format precision specified — does the schema accept date-only (`2026-03-17`), datetime (`2026-03-17T10:00:00`), or both? [Clarity, Resolved] → Data-model §MarkCompleteInput updated: accepts both date-only and datetime formats, follows existing contract pattern (`z.string()` with no regex, matching list-projects and set_planned_date). OmniJS `Formatter.Date.iso8601` produces `2026-03-12T18:30:31.725Z`.
- [ ] CHK015 - Is the validation error message for invalid date strings specified (e.g., "Invalid date format: {value}")? [Completeness, Data-model §Validation Rules]
- [ ] CHK016 - Is the internal conversion from ISO 8601 string to OmniJS `Date` object documented as an implementation concern separate from the schema validation? [Clarity, Research §5, Spec §Assumptions]
- [ ] CHK017 - Is the `completionDate` specified as applying to ALL items in a batch (not per-item)? [Clarity, Data-model §MarkCompleteInput]

## Batch Validation (1-100 Items)

- [ ] CHK018 - Is the `items` array constraint specified with both minimum (1) and maximum (100) bounds? [Completeness, Data-model §Validation Rules, Spec §FR-004]
- [ ] CHK019 - Are the validation error messages for out-of-bounds arrays specified (e.g., "items must contain 1-100 entries")? [Completeness, Data-model §Validation Rules]
- [ ] CHK020 - Is the batch constraint (1-100) consistent across all three batch tools (mark_complete, mark_incomplete, drop_items)? [Consistency, Spec §FR-004]
- [x] CHK021 - Is the batch size limit specified at the Zod schema level (not just documented as a convention)? [Clarity, Resolved] → Data-model §Validation Rules updated: `.min(1).max(100)` enforced at Zod schema level, matching review-tools pattern (`mark-reviewed.ts:52-54`, `set-review-interval.ts:66-68`).
- [ ] CHK022 - Are the `items` array elements specified as `ItemIdentifier` objects (not raw strings)? [Clarity, Data-model §MarkCompleteInput/§MarkIncompleteInput/§DropItemsInput]

## Per-Item Result Types & Discriminants

- [ ] CHK023 - Is the `StatusBatchItemResult` schema specified with `success` as the boolean discriminant field? [Completeness, Data-model §StatusBatchItemResult]
- [ ] CHK024 - Are the conditional fields (`error`, `code`, `candidates`) specified as present only when `success: false`, except for no-op codes? [Clarity, Data-model §StatusBatchItemResult]
- [ ] CHK025 - Are all 6 error/no-op codes defined as a string literal union (`NOT_FOUND | DISAMBIGUATION_REQUIRED | VERSION_NOT_SUPPORTED | ALREADY_COMPLETED | ALREADY_DROPPED | ALREADY_ACTIVE`)? [Completeness, Data-model §Error Codes]
- [ ] CHK026 - Is the `candidates` array schema specified with its element structure (`{id: string, name: string, type: 'task' | 'project'}`)? [Clarity, Data-model §StatusBatchItemResult]
- [ ] CHK027 - Is the `itemType` field specified as a constrained literal union (`'task' | 'project'`) rather than a free-form string? [Clarity, Data-model §StatusBatchItemResult]
- [ ] CHK028 - Is the `summary` object schema specified with exactly three numeric fields (`total`, `succeeded`, `failed`)? [Completeness, Data-model §Batch Response]
- [x] CHK029 - Is the invariant `summary.total === summary.succeeded + summary.failed` documented as a schema-level or runtime constraint? [Clarity, Resolved] → Data-model §Batch Response updated: documented as runtime invariant (not expressible in Zod — cross-field constraint). Enforced by implementation, matching review-tools pattern (`mark-reviewed.ts:72-76`).

## Mutual Exclusion Validation (set_project_type)

- [ ] CHK030 - Is the mutual exclusion rule specified at the requirements level: `containsSingletonActions` wins over `sequential`? [Completeness, Spec §FR-007, Data-model §SetProjectTypeInput]
- [ ] CHK031 - Is the auto-clear behavior documented for each `projectType` value (e.g., `'sequential'` → `containsSingletonActions = false`)? [Clarity, Data-model §SetProjectTypeInput Mutual Exclusion table]
- [ ] CHK032 - Is the mutual exclusion specified as handled by the tool internally (user provides one `projectType` string, not two booleans)? [Clarity, Data-model §SetProjectTypeInput]
- [ ] CHK033 - Is the mutual exclusion behavior consistent with the existing Phase 4 `edit_project` pattern? [Consistency, Plan §Implementation Strategy, Spec §Assumptions]

## Cross-Tool Schema Consistency

- [ ] CHK034 - Is the `ItemIdentifier` schema specified as shared across all 6 tools (3 batch tools use arrays, 3 single-item tools use inline fields)? [Consistency, Plan §Reusable Schemas, Data-model §ItemIdentifier]
- [x] CHK035 - Is the disambiguation error format consistent between batch tools (per-item `candidates` array) and single-item tools (`matchingIds` array)? [Consistency, Resolved] → Data-model §Single-Item Response updated: documented intentional pattern difference — single-item uses `matchingIds: string[]` (matching `DisambiguationErrorSchema`), batch uses `candidates: [{id, name, type}]`. This follows existing codebase conventions (task-tools/shared/disambiguation.ts vs review-tools/shared/batch.ts).
- [ ] CHK036 - Are the no-op success codes (`ALREADY_*`) consistently typed as `success: true` with an optional `code` field across all batch tool schemas? [Consistency, Data-model §Error Codes note]
- [ ] CHK037 - Is the `index.ts` barrel export specified for `src/contracts/status-tools/` to follow the pattern from `review-tools/` and `project-tools/`? [Completeness, Plan §Project Structure]

## Schema-Spec Traceability

- [ ] CHK038 - Does every input schema field trace back to at least one functional requirement (FR-001 through FR-012)? [Traceability]
- [ ] CHK039 - Does every error code trace to a specific acceptance scenario or edge case in the spec? [Traceability, Data-model §Error Codes]
- [ ] CHK040 - Is the Zod version (4.x) specified consistently between the plan and the project's technology stack? [Consistency, Plan §Technical Context, CLAUDE.md §Technology Stack]

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline with `→ Note: ...`
- Items with `[Gap]` indicate potential missing requirements
- Items with `[Consistency]` should be checked across multiple spec artifacts
