# Type Safety & Schema Consistency Checklist

**Feature**: Phase 3 - Enhanced Task Management Tools
**Created**: 2025-12-11
**Last Review**: 2025-12-11
**Focus**: Cross-layer type consistency (Zod → TypeScript → OmniJS)
**Scope**: 4 tools (list_tasks, get_task, set_planned_date, append_note), 2 entity schemas (TaskSummary, TaskFull)

---

## TaskSummary vs TaskFull Subset Consistency

Critical: TaskSummary MUST be a proper subset of TaskFull with identical field types.

- [x] CHK001 - Is every field in TaskSummarySchema also present in TaskFullSchema with identical type? [Consistency, contracts/shared/task.ts]
  - **Note**: 7 core fields (id, name, taskStatus, flagged, deferDate, dueDate, plannedDate) are identical. Denormalized fields (projectId/Name, tagIds/Names) are documented transformations.
- [x] CHK002 - Is the `id` field type (`z.string()`) identical between TaskSummary and TaskFull? [Consistency]
- [x] CHK003 - Is the `name` field type (`z.string()`) identical between TaskSummary and TaskFull? [Consistency]
- [x] CHK004 - Is the `taskStatus` field type (TaskStatusSchema) identical between TaskSummary and TaskFull? [Consistency]
- [x] CHK005 - Is the `flagged` field type (`z.boolean()`) identical between TaskSummary and TaskFull? [Consistency]
- [x] CHK006 - Is the `deferDate` field type (`z.string().nullable()`) identical between TaskSummary and TaskFull? [Consistency]
- [x] CHK007 - Is the `dueDate` field type (`z.string().nullable()`) identical between TaskSummary and TaskFull? [Consistency]
- [x] CHK008 - Is the `plannedDate` field type (`z.string().nullable()`) identical between TaskSummary and TaskFull? [Consistency]
- [x] CHK009 - Are the `projectId`/`projectName` summary fields documented as a denormalized form of TaskFull's `containingProject: EntityReference | null`? [Clarity]
  - **Location**: contracts/shared/task.ts TaskSummarySchema JSDoc
- [x] CHK010 - Are the `tagIds`/`tagNames` summary arrays documented as a denormalized form of TaskFull's `tags: TagReference[]`? [Clarity]
  - **Location**: contracts/shared/task.ts TaskSummarySchema JSDoc
- [x] CHK011 - Is the rationale for TaskSummary's denormalized fields (projectId/Name, tagIds/Names) vs TaskFull's nested objects documented? [Completeness]
  - **Location**: contracts/shared/task.ts TaskSummarySchema JSDoc - "reduces response payload size and simplifies client filtering"

---

## TaskStatus Enum Cross-Layer Consistency

7-state enum requiring bidirectional mapping between Zod schema and OmniJS Task.Status constants.

- [x] CHK012 - Are all 7 TaskStatus enum values explicitly listed in TaskStatusSchema? [Completeness, contracts/shared/task.ts]
- [x] CHK013 - Is the case sensitivity of TaskStatus values documented (PascalCase: 'Available' not 'available')? [Clarity, data-model.md]
  - **Location**: data-model.md §Validation Rules; contracts/shared/task.ts JSDoc
- [x] CHK014 - Is the OmniJS-to-Zod mapping documented for each status value (Task.Status.Available → 'Available')? [Completeness]
  - **Location**: contracts/shared/task.ts TaskStatusSchema JSDoc; data-model.md §TaskStatus Bidirectional Mapping
- [x] CHK015 - Is the Zod-to-OmniJS reverse mapping documented for filter inputs (string → Task.Status constant)? [Completeness]
  - **Location**: data-model.md §TaskStatus Bidirectional Mapping (reverseStatusMap)
- [x] CHK016 - Are the 7 status values identical between: Zod enum, data-model.md, and research.md OmniJS reference? [Consistency]
- [x] CHK017 - Is the semantic difference between DueSoon/Next/Overdue (refinements of Available) documented in the schema JSDoc? [Clarity]
  - **Location**: contracts/shared/task.ts TaskStatusSchema JSDoc "Semantic Note"
- [x] CHK018 - Is there a documented handling strategy for unknown/unexpected status values from OmniJS? [Coverage, Edge Case]
  - **Location**: contracts/shared/task.ts TaskStatusSchema JSDoc "Unknown Status Handling"

---

## Date Field Consistency

8 date parameters across tools requiring consistent ISO 8601 nullable string pattern.

- [x] CHK019 - Do all date fields in TaskSummary use `z.string().nullable()` pattern? [Consistency, contracts/shared/task.ts]
- [x] CHK020 - Do all date fields in TaskFull use `z.string().nullable()` pattern? [Consistency, contracts/shared/task.ts]
- [x] CHK021 - Do all date filter parameters (dueBefore, dueAfter, etc.) use `z.string().optional()` pattern? [Consistency, contracts/list-tasks.ts]
- [x] CHK022 - Is the distinction between `.nullable()` (output) and `.optional()` (input) documented for date fields? [Clarity]
  - **Location**: data-model.md §Type System Conventions §Optional vs Nullable Fields
- [x] CHK023 - Are all 8 date filter parameters (dueBefore, dueAfter, deferBefore, deferAfter, plannedBefore, plannedAfter, completedBefore, completedAfter) documented in list_tasks input schema? [Completeness, contracts/list-tasks.ts]
- [x] CHK024 - Is the ISO 8601 format requirement explicitly stated in schema descriptions for all date fields? [Clarity]
  - **Location**: All date field descriptions in contracts include "(ISO 8601)"
- [x] CHK025 - Is the OmniJS date-to-ISO-8601 serialization pattern (`date.toISOString()`) documented? [Completeness]
  - **Location**: research.md §OmniJS Script Patterns; data-model.md §Cross-Layer Traceability
- [x] CHK026 - Is the null handling for missing dates (OmniJS null → JSON null → Zod nullable) documented? [Clarity]
  - **Location**: contracts/shared/task.ts TaskFullSchema JSDoc "Date Handling"
- [x] CHK027 - Is timezone handling documented (OmniFocus local time interpretation)? [Completeness, data-model.md]

---

## Version-Conditional Fields

Fields requiring OmniFocus version checks: plannedDate (v4.7+), effectivePlannedDate (v4.7.1+), estimatedMinutes (v3.5+ macOS).

- [x] CHK028 - Is the version requirement for `plannedDate` (v4.7+) documented in the schema description? [Completeness, contracts/shared/task.ts]
- [x] CHK029 - Is the version requirement for `effectivePlannedDate` (v4.7.1+) documented in the schema description? [Completeness, contracts/shared/task.ts]
- [x] CHK030 - Is the version/platform requirement for `estimatedMinutes` (v3.5+ macOS only) documented? [Completeness, contracts/shared/task.ts]
  - **Location**: TaskFullSchema description "(v3.5+ macOS only, null on iOS/iPadOS)"
- [x] CHK031 - Is `shouldUseFloatingTimeZone` version requirement (v3.6+) documented? [Completeness]
  - **Location**: contracts/shared/task.ts TaskFullSchema description; data-model.md §Version-Specific Features
- [x] CHK032 - Is the fallback behavior (omit vs null vs default) for version-conditional fields explicitly documented? [Clarity]
  - **Location**: contracts/shared/task.ts TaskFullSchema JSDoc; data-model.md §Version-Specific Features table
- [x] CHK033 - Is the OmniJS version check pattern (`app.userVersion.atLeast(new Version("4.7"))`) documented? [Completeness, research.md]
- [x] CHK034 - Is the planned date database migration caveat documented (may fail silently even on v4.7+)? [Coverage, Edge Case, research.md]
- [x] CHK035 - Are error messages for version-unsupported operations specified? [Completeness]
  - **Location**: spec.md §Error Message Standards ("Planned date requires OmniFocus v4.7 or later")

---

## EntityReference and TagReference Sub-Schemas

Consistent {id, name} pattern for relationship references.

- [x] CHK036 - Is EntityReferenceSchema structure (`{id: string, name: string}`) documented? [Completeness, contracts/shared/task.ts]
- [x] CHK037 - Is TagReferenceSchema structure (`{id: string, name: string}`) documented? [Completeness, contracts/shared/task.ts]
- [x] CHK038 - Is the EntityReference pattern used consistently for `containingProject` and `parent` fields? [Consistency]
- [x] CHK039 - Is the TagReference pattern used consistently for the `tags` array? [Consistency]
- [x] CHK040 - Is the nullable vs non-nullable distinction documented (`containingProject: EntityReference | null`, `tags: TagReference[]`)? [Clarity]
- [x] CHK041 - Is the OmniJS extraction pattern for EntityReference (project.id.primaryKey, project.name) documented? [Completeness]
  - **Location**: contracts/shared/task.ts EntityReferenceSchema JSDoc; data-model.md §Cross-Layer Traceability
- [x] CHK042 - Is handling for deleted/orphan references (project deleted but task remains) documented? [Coverage, Edge Case]
  - **Location**: contracts/shared/task.ts EntityReferenceSchema JSDoc "Orphan Reference Handling"

---

## Response Type Discriminated Unions

4 tools with discriminated union response types.

- [x] CHK043 - Does ListTasksResponseSchema use `z.discriminatedUnion('success', [...])` pattern? [Completeness, contracts/list-tasks.ts]
- [x] CHK044 - Does GetTaskResponseSchema include all three variants (success, disambiguation, error)? [Completeness, contracts/get-task.ts]
  - **Note**: Uses z.union() due to DisambiguationError also having success: false
- [x] CHK045 - Does SetPlannedDateResponseSchema include all three variants? [Completeness, contracts/set-planned-date.ts]
  - **Note**: Uses z.union() due to DisambiguationError also having success: false
- [x] CHK046 - Does AppendNoteResponseSchema include all three variants? [Completeness, contracts/append-note.ts]
  - **Note**: Uses z.union() due to DisambiguationError also having success: false
- [x] CHK047 - Is DisambiguationErrorSchema's `code: z.literal('DISAMBIGUATION_REQUIRED')` consistent across all tools that use it? [Consistency, contracts/shared/disambiguation.ts]
- [x] CHK048 - Is the `matchingIds` array minimum length (`z.array(...).min(2)`) documented with rationale? [Clarity, contracts/shared/disambiguation.ts]
  - **Location**: contracts/shared/disambiguation.ts JSDoc "min(2) Rationale"
- [x] CHK049 - Are standard error schema structures (`{success: false, error: string}`) consistent across all 4 tools? [Consistency]

---

## TypeScript Type Inference

Primitive function signatures must match Zod-inferred types.

- [x] CHK050 - Are TypeScript types exported using `z.infer<typeof Schema>` pattern for all schemas? [Completeness]
- [x] CHK051 - Is TaskSummary TypeScript type documented as a strict subset of TaskFull type? [Clarity]
  - **Location**: contracts/shared/task.ts TaskSummarySchema JSDoc "Subset Relationship"
- [x] CHK052 - Are function parameter types documented to use Zod-inferred input types? [Completeness]
  - **Location**: data-model.md §Zod Schema ↔ TypeScript Type Mapping
- [x] CHK053 - Are function return types documented to use Zod-inferred response types? [Completeness]
  - **Location**: data-model.md §Zod Schema ↔ TypeScript Type Mapping
- [x] CHK054 - Is the relationship between contracts (specs/) and implementation (src/) documented? [Completeness]
  - **Location**: plan.md §Project Structure; data-model.md §Contract Location Mapping

---

## Optional Field Handling

null vs undefined vs omitted field semantics.

- [x] CHK055 - Is the distinction between `z.optional()` (input - may be undefined) and `z.nullable()` (output - may be null) documented? [Clarity]
  - **Location**: data-model.md §Type System Conventions §Optional vs Nullable Fields
- [x] CHK056 - Is the handling of omitted optional input fields documented (use defaults vs skip filter)? [Completeness]
  - **Location**: data-model.md §Type System Conventions §Optional vs Nullable Fields
- [x] CHK057 - Are default values for optional fields with `.default()` documented (e.g., `tagFilterMode: 'any'`, `limit: 100`)? [Completeness, contracts/list-tasks.ts]
- [x] CHK058 - Is the OmniJS-to-JSON null serialization pattern documented (OmniJS null → JSON null)? [Clarity]
  - **Location**: contracts/shared/task.ts TaskFullSchema JSDoc; data-model.md §Cross-Layer Traceability
- [x] CHK059 - Is the handling of empty arrays vs undefined documented for array fields (`tagIds`, `tagNames`)? [Clarity]
  - **Location**: data-model.md §Type System Conventions §Empty Array Handling

---

## Cross-Layer Traceability

Mapping between specification layers.

- [x] CHK060 - Is there a mapping table from Zod schema fields to OmniJS Task API properties? [Completeness]
  - **Location**: data-model.md §Cross-Layer Traceability §Zod Schema ↔ OmniJS Property Mapping
- [x] CHK061 - Is there a mapping table from Zod schema fields to data-model.md TypeScript interfaces? [Completeness]
  - **Location**: data-model.md §Cross-Layer Traceability §Zod Schema ↔ TypeScript Type Mapping
- [x] CHK062 - Are OmniJS property names that differ from schema field names documented (e.g., `id.primaryKey` → `id`)? [Clarity]
  - **Location**: data-model.md §Cross-Layer Traceability (id: task.id.primaryKey)
- [x] CHK063 - Is the `taskStatus` property name mapping documented (OmniJS `taskStatus` vs `Task.Status` enum)? [Clarity]
  - **Location**: data-model.md §TaskStatus Bidirectional Mapping; research.md §Status Mapping

---

## Summary

| Category | Items | Satisfied | Critical |
|----------|-------|-----------|----------|
| TaskSummary vs TaskFull Subset | 11 | 11 | Yes |
| TaskStatus Enum | 7 | 7 | Yes |
| Date Field Consistency | 9 | 9 | Yes |
| Version-Conditional Fields | 8 | 8 | Medium |
| EntityReference/TagReference | 7 | 7 | Medium |
| Response Discriminated Unions | 7 | 7 | Low |
| TypeScript Type Inference | 5 | 5 | Medium |
| Optional Field Handling | 5 | 5 | Medium |
| Cross-Layer Traceability | 4 | 4 | Low |
| **Total** | **63** | **63** | |

**Status**: ✅ ALL ITEMS SATISFIED (100%)
