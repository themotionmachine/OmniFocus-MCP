# Type Safety & Schema Consistency Checklist

**Purpose**: Validate requirements clarity, completeness, and consistency for type definitions across Zod schemas, TypeScript types, and OmniJS script structures
**Created**: 2025-12-12
**Feature**: Phase 4 - Project Management Tools
**Last Review**: 2025-12-12 (All items satisfied)

---

## Enum Requirements Consistency

- [x] CHK001 - Is the ProjectStatus enum documented with exactly 4 values (Active, OnHold, Done, Dropped) consistently across all layers? [Consistency, data-model.md §ProjectStatus]
- [x] CHK002 - Is the OmniJS Project.Status bidirectional mapping explicitly documented for all 4 enum values? [Completeness, research.md §2]
- [x] CHK003 - Are the ProjectStatus string values specified as case-sensitive (PascalCase) in requirements? [Clarity, contracts/shared/project.ts]
- [x] CHK004 - Is the ProjectType enum documented with exactly 3 values (parallel, sequential, single-actions) consistently? [Consistency, data-model.md §ProjectType]
- [x] CHK005 - Is ProjectType explicitly marked as DERIVED (not stored) in all documentation? [Clarity, Gap]
- [x] CHK006 - Is the ProjectType derivation logic (sequential + containsSingletonActions → projectType) specified identically across layers? [Consistency, data-model.md §Type Derivation]
- [x] CHK007 - Are the ReviewUnit enum values (days, weeks, months, years) consistently defined across Zod schema and OmniJS usage patterns? [Consistency, contracts/shared/project.ts]
- [x] CHK008 - Are the ReviewStatusFilter enum values (due, upcoming, any) with their semantic definitions documented? [Completeness, contracts/shared/project.ts]

## ProjectSummary ↔ ProjectFull Subset Relationship

- [x] CHK009 - Is it explicitly documented that ProjectSummary MUST be a proper subset of ProjectFull? [Completeness, data-model.md §ProjectSummary]
- [x] CHK010 - Are all 12 ProjectSummary fields documented with identical types to their ProjectFull counterparts? [Consistency, data-model.md §Field Counts]
- [x] CHK011 - Are the denormalized fields (parentFolderId, parentFolderName vs parentFolder EntityReference) mapping rules specified? [Clarity, data-model.md §Denormalized Field Derivation]
- [x] CHK012 - Is the field count explicitly stated (ProjectSummary: 12 fields, ProjectFull: 30 fields) for traceability? [Completeness, data-model.md §Field Counts]
- [x] CHK013 - Are field type differences between Summary and Full explicitly prohibited or the transformation rules documented? [Clarity, data-model.md §Subset Constraint]

## ReviewInterval Nested Structure

- [x] CHK014 - Is ReviewInterval documented as a nested object with exactly 2 fields (steps: number, unit: ReviewUnit)? [Completeness, contracts/shared/project.ts]
- [x] CHK015 - Is the ReviewInterval value object semantics (re-assign required) documented for OmniJS usage? [Clarity, research.md §3]
- [x] CHK016 - Is ReviewInterval specified as nullable (not optional) in both ProjectFull schema and input schemas? [Consistency, data-model.md]
- [x] CHK017 - Are the ReviewInterval min constraints (steps >= 1) consistently defined across Zod and OmniJS layers? [Consistency, data-model.md §ReviewInterval Constraints]

## Date Field Consistency

- [x] CHK018 - Are all date fields specified with consistent type pattern (string | null using ISO 8601)? [Consistency, data-model.md §Date Formats]
- [x] CHK019 - Are the 6 date fields in ProjectFull (deferDate, dueDate, effectiveDeferDate, effectiveDueDate, completionDate, dropDate) plus 2 review dates (lastReviewDate, nextReviewDate) all documented? [Completeness, data-model.md §OmniJS Mapping]
- [x] CHK020 - Is the OmniJS date serialization pattern (date?.toISOString() ?? null) documented for all date fields? [Completeness, data-model.md §OmniJS Mapping]
- [x] CHK021 - Are the 3 date fields in ProjectSummary (deferDate, dueDate, nextReviewDate) subset-consistent with ProjectFull? [Consistency, data-model.md §Subset Constraint]

## Nullable vs Optional Field Requirements

- [x] CHK022 - Is the distinction between nullable (field present, value null) and optional (field may be omitted) clearly documented? [Clarity, data-model.md §Type System Conventions]
- [x] CHK023 - Are nullable output fields (all dates, reviewInterval, nextTask, parentFolder, estimatedMinutes, repetitionRule) consistently marked across schemas? [Consistency, contracts/shared/project.ts]
- [x] CHK024 - Are optional input fields (most booleans, positioning parameters) consistently marked across tool input schemas? [Consistency, contracts/*.ts]
- [x] CHK025 - Are default values for optional fields explicitly documented where applicable? [Completeness, contracts/*.ts §.default()]

## EntityReference and TagReference Sub-schemas

- [x] CHK026 - Is EntityReference schema (id: string, name: string) consistently used for parentFolder, nextTask references? [Consistency, contracts/shared/project.ts]
- [x] CHK027 - Is TagReference schema (id: string, name: string) consistently used for tags array items? [Consistency, contracts/shared/project.ts]
- [x] CHK028 - Is the OmniJS extraction pattern for references (entity ? {id: entity.id.primaryKey, name: entity.name} : null) documented? [Completeness, research.md §5]

## Response Type Discriminated Unions

- [x] CHK029 - Are discriminated unions (success: true | false) consistently structured across all 6 tool response schemas? [Consistency, contracts/*.ts §z.discriminatedUnion]
- [x] CHK030 - Is the DisambiguationError response (code: 'DISAMBIGUATION_REQUIRED', matchingIds: string[]) documented for applicable tools? [Completeness, contracts/shared/disambiguation.ts]
- [x] CHK031 - Are success response fields (id, name at minimum) consistently defined across create/edit/delete/move tools? [Consistency, contracts/*.ts]

## OmniJS Field Mapping Requirements

- [x] CHK032 - Is the project.id.primaryKey extraction pattern documented for all ID fields? [Completeness, research.md §5]
- [x] CHK033 - Is the project.task.note pattern (note via root task) documented for ProjectFull? [Clarity, data-model.md §OmniJS Mapping]
- [x] CHK034 - Are statistics computation requirements (taskCount, remainingCount) mapped to OmniJS API properties? [Completeness, data-model.md §Statistics Field Derivation]
- [x] CHK035 - Is the nextTask extraction (first available task, null for single-actions) documented with OmniJS mapping? [Completeness, data-model.md §OmniJS Mapping]

## Cross-Layer Traceability

- [x] CHK036 - Is the Zod schema → TypeScript type inference (z.infer<typeof Schema>) pattern documented? [Completeness, data-model.md §Cross-Layer Traceability]
- [x] CHK037 - Is the bidirectional status mapping table (OmniJS enum ↔ string) complete with all 4 values? [Completeness, data-model.md §ProjectStatus Mapping]
- [x] CHK038 - Are all 30 ProjectFull fields traceable to OmniJS Project API properties? [Completeness, data-model.md §Complete OmniJS Mapping]
- [x] CHK039 - Is the contract location mapping (specs/contracts/ → src/contracts/) documented for implementation sync? [Completeness, data-model.md §Contract Location Mapping]

## Edge Cases and Invalid States

- [x] CHK040 - Is the invalid state (sequential=true AND containsSingletonActions=true) explicitly documented with auto-clear resolution? [Coverage, data-model.md §Project Type Auto-Clear]
- [x] CHK041 - Are requirements defined for unknown/unexpected OmniJS status values? [Coverage, data-model.md §Unknown Status Handling, quickstart.md §Status Mapping]
- [x] CHK042 - Is the behavior specified for projects without reviewInterval when filtering by reviewStatus? [Coverage, data-model.md §Review Status Filter]
