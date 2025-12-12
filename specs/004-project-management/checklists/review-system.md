# Review System Specification Checklist

**Purpose**: Validate requirements quality for the complete review system including ReviewInterval value objects, review status filtering, and nextReviewDate calculation
**Created**: 2025-12-12
**Feature**: Phase 4 - Project Management Tools
**Last Review**: 2025-12-12 (All items satisfied after remediation)

---

## ReviewInterval Value Object Definition

- [x] CHK001 - Is the ReviewInterval structure explicitly documented with exactly 2 fields (steps: number, unit: ReviewUnit)? [Completeness, data-model.md §Value Object, contracts/shared/project.ts]
- [x] CHK002 - Are the valid unit values ('days', 'weeks', 'months', 'years') exhaustively enumerated? [Completeness, contracts/shared/project.ts ReviewUnitSchema]
- [x] CHK003 - Is the minimum constraint for steps (>= 1) documented in both spec and schema? [Clarity, Spec §Key Entities, contracts .min(1)]
- [x] CHK004 - Is it explicitly stated that steps must be a positive integer (not float)? [Clarity, contracts/shared/project.ts .int()]
- [x] CHK005 - Are the value object semantics (full reassignment required for changes) clearly documented? [Clarity, research.md §3, contracts TSDoc, quickstart.md §Review Interval Value Object]

## Value Object Mutation Pattern Documentation

- [x] CHK006 - Is the WRONG mutation pattern explicitly documented: `project.reviewInterval.steps = 14`? [Clarity, quickstart.md §Review Interval Value Object, contracts/shared/project.ts TSDoc]
- [x] CHK007 - Is the CORRECT mutation pattern explicitly documented: `project.reviewInterval = { steps: 14, unit: 'days' }`? [Clarity, quickstart.md §Review Interval Pattern, contracts TSDoc]
- [x] CHK008 - Is the null assignment pattern documented for clearing reviews: `project.reviewInterval = null`? [Completeness, quickstart.md, spec.md §Clearing Review Schedule]
- [x] CHK009 - Does the TSDoc comment in ReviewIntervalSchema explain the re-assignment requirement? [Completeness, contracts/shared/project.ts "WRONG Pattern" and "CORRECT Pattern"]
- [x] CHK010 - Is there guidance for implementers on why direct property mutation fails? [Clarity, contracts TSDoc "WHY it fails", quickstart.md "Why it fails"]

## ReviewInterval Schema Consistency

- [x] CHK011 - Is ReviewIntervalSchema used consistently in create_project input? [Consistency, contracts/create-project.ts]
- [x] CHK012 - Is ReviewIntervalSchema used consistently in edit_project input? [Consistency, contracts/edit-project.ts]
- [x] CHK013 - Is reviewInterval in ProjectFull output documented as ReviewInterval | null? [Consistency, contracts/shared/project.ts ProjectFullSchema]
- [x] CHK014 - Is reviewInterval explicitly ABSENT from ProjectSummary (only nextReviewDate exposed)? [Clarity, data-model.md §Project Summary, contracts/shared/project.ts]
- [x] CHK015 - Is the rationale documented for why ProjectSummary excludes reviewInterval but includes nextReviewDate? [Clarity, data-model.md §Exclusion Rationale, contracts/shared/project.ts TSDoc]

## NextReviewDate Property Definition

- [x] CHK016 - Is nextReviewDate documented as read-only (computed by OmniFocus)? [Clarity, data-model.md §Review Date Properties, contracts/shared/project.ts "READ-ONLY"]
- [x] CHK017 - Is the computation basis documented (reviewInterval + lastReviewDate)? [Clarity, research.md, data-model.md §nextReviewDate Computation]
- [x] CHK018 - Is nextReviewDate specified as ISO 8601 string format (nullable)? [Clarity, contracts/shared/project.ts field descriptions]
- [x] CHK019 - Is nextReviewDate exposure documented for BOTH ProjectSummary AND ProjectFull? [Completeness, data-model.md, contracts/shared/project.ts both schemas]
- [x] CHK020 - Is it explicitly stated that nextReviewDate is not directly settable via API? [Clarity, spec.md §Review Properties (Read-Only), data-model.md table "Settable via API: NO"]

## LastReviewDate Property Definition

- [x] CHK021 - Is lastReviewDate documented as read-only (updated by OmniFocus on review)? [Clarity, Spec §FR-017, data-model.md §lastReviewDate Behavior]
- [x] CHK022 - Is lastReviewDate documented as ABSENT from ProjectSummary? [Clarity, data-model.md §Project Summary Schema]
- [x] CHK023 - Is lastReviewDate documented as PRESENT in ProjectFull? [Completeness, contracts/shared/project.ts ProjectFullSchema]
- [x] CHK024 - Is it documented that users cannot set lastReviewDate via API? [Clarity, spec.md §Review Properties (Read-Only), data-model.md table "Settable via API: NO"]
- [x] CHK025 - Is the relationship between lastReviewDate and nextReviewDate documented (OmniFocus recalculates on review)? [Clarity, data-model.md §Relationship Between Properties, spec.md §Review Workflow Chain]

## Review Workflow Requirements

- [x] CHK026 - Is the workflow chain documented: User sets reviewInterval -> OmniFocus calculates nextReviewDate? [Completeness, spec.md §Review Workflow Chain, data-model.md §Relationship Between Properties]
- [x] CHK027 - Is the workflow chain documented: User marks reviewed -> OmniFocus updates lastReviewDate -> OmniFocus recalculates nextReviewDate? [Completeness, spec.md §Review Workflow Chain step 3, data-model.md]
- [x] CHK028 - Is it explicitly stated that API observes computed values but does not control the review process? [Clarity, Spec §Out of Scope]
- [x] CHK029 - Is "marking project as reviewed" explicitly documented as Out of Scope (Phase 5)? [Coverage, Spec §Out of Scope, spec.md §Review Workflow Chain "(Out of Scope - Phase 5)"]

## Review Status Filter Definition

- [x] CHK030 - Are the 3 valid reviewStatus values ('due', 'upcoming', 'any') documented? [Completeness, Spec §FR-004, contracts/shared/project.ts]
- [x] CHK031 - Is 'any' documented as the default value when reviewStatus is omitted? [Clarity, contracts/list-projects.ts .default('any')]
- [x] CHK032 - Is the ReviewStatusFilterSchema defined with these exact 3 values? [Completeness, contracts/shared/project.ts]

## Review Status: 'due' Semantics

- [x] CHK033 - Is 'due' defined as: nextReviewDate <= today? [Clarity, Spec §FR-004, spec.md §Review Status Filter Behavior]
- [x] CHK034 - Is "today" specified as midnight local time (start of day)? [Clarity, quickstart.md "today at midnight", spec.md "today at midnight local time"]
- [x] CHK035 - Is the OmniJS date comparison pattern documented: `today.setHours(0, 0, 0, 0)`? [Completeness, quickstart.md §Review Status Filter implementation]
- [x] CHK036 - Is it explicitly stated that projects with null nextReviewDate are EXCLUDED from 'due' filter? [Clarity, quickstart.md null check, contracts/shared/project.ts TSDoc]

## Review Status: 'upcoming' Semantics

- [x] CHK037 - Is 'upcoming' defined as: today < nextReviewDate <= today+7 days? [Clarity, Spec §FR-004, spec.md §Review Status Filter Behavior]
- [x] CHK038 - Is it explicitly stated that 'upcoming' EXCLUDES projects that are already 'due'? [Clarity, data-model.md §Review Status Filter, "today < nextReviewDate" excludes due]
- [x] CHK039 - Is the 7-day boundary documented as INCLUSIVE or EXCLUSIVE? [Clarity, spec.md §Boundary Conditions "upper boundary is INCLUSIVE", contracts TSDoc]
- [x] CHK040 - Is it explicitly stated that projects with null nextReviewDate are EXCLUDED from 'upcoming' filter? [Clarity, quickstart.md null check, contracts/shared/project.ts TSDoc]

## Review Status: 'any' Semantics

- [x] CHK041 - Is 'any' documented as: no filtering based on review status? [Clarity, Spec §FR-004, spec.md §Review Status Filter Behavior]
- [x] CHK042 - Is it documented that 'any' includes projects WITH and WITHOUT review schedules? [Clarity, data-model.md, spec.md, contracts/shared/project.ts TSDoc "'any' Filter Behavior"]
- [x] CHK043 - Is it documented that 'any' includes projects regardless of nextReviewDate value? [Clarity, spec.md "any nextReviewDate value (null, past, or future)", contracts TSDoc]

## Edge Case: Boundary Conditions

- [x] CHK044 - Is the behavior specified when nextReviewDate = exactly today? [Coverage, spec.md §Boundary Conditions "exactly today: Classified as 'due'"]
- [x] CHK045 - Is the behavior specified when nextReviewDate = exactly today+7 days? [Coverage, spec.md §Boundary Conditions "exactly today+7: Classified as 'upcoming'"]
- [x] CHK046 - Is it documented what happens with reviewStatus='due' when NO projects have reviewInterval? [Coverage, spec.md §FR-010 empty array, valid result]
- [x] CHK047 - Is the OmniJS filtering code in quickstart.md consistent with spec semantics? [Consistency, quickstart.md boundary condition comments aligned with spec]

## Edge Case: Null Handling

- [x] CHK048 - Is null nextReviewDate handling documented for 'due' filter (exclude)? [Completeness, quickstart.md null check]
- [x] CHK049 - Is null nextReviewDate handling documented for 'upcoming' filter (exclude)? [Completeness, quickstart.md null check]
- [x] CHK050 - Is it documented that setting reviewInterval=null clears the review schedule? [Clarity, data-model.md §Clearing Review, spec.md §Clearing Review Schedule]
- [x] CHK051 - Is it documented what happens to nextReviewDate when reviewInterval is set to null? [Clarity, spec.md §Clearing Review Schedule, data-model.md "nextReviewDate becomes null"]

## Edge Case: ReviewInterval with null NextReviewDate

- [x] CHK052 - Is it documented whether a project can have reviewInterval but null nextReviewDate? [Clarity, spec.md §Edge Case, data-model.md §Edge Case "transient state"]
- [x] CHK053 - If CHK052 is possible, what causes this state? [Clarity, spec.md "sync timing issue, database initialization"]
- [x] CHK054 - If CHK052 is possible, how should filter behavior handle it? [Clarity, spec.md "EXCLUDED from 'due' and 'upcoming'", contracts TSDoc]

## Input Validation Requirements

- [x] CHK055 - Is it documented that steps < 1 is caught by Zod schema validation? [Clarity, contracts/shared/project.ts .min(1)]
- [x] CHK056 - Is it documented that invalid unit values are caught by Zod enum validation? [Clarity, contracts/shared/project.ts ReviewUnitSchema enum]
- [x] CHK057 - Is the error message format specified for invalid ReviewInterval inputs? [Coverage, Spec §Error Message Standards, Zod default format]
- [x] CHK058 - Is it documented that steps must be integer (non-fractional)? [Clarity, contracts/shared/project.ts .int()]

## Cross-Tool ReviewInterval Usage

- [x] CHK059 - Is reviewInterval input documented for create_project (optional, nullable)? [Completeness, Spec §FR-025]
- [x] CHK060 - Is reviewInterval input documented for edit_project (optional, nullable to clear)? [Completeness, Spec §FR-031]
- [x] CHK061 - Is reviewInterval output documented for get_project (in ProjectFull)? [Completeness, Spec §FR-017]
- [x] CHK062 - Is reviewStatus filter documented for list_projects? [Completeness, Spec §FR-004]
- [x] CHK063 - Is the ReviewInterval structure IDENTICAL across all 4 tools? [Consistency, all contracts import from shared/project.ts]

## Cross-Document Consistency

- [x] CHK064 - Does spec.md FR-004 definition match quickstart.md filter implementation? [Consistency, aligned semantics and boundary conditions]
- [x] CHK065 - Does data-model.md ReviewInterval definition match contracts/shared/project.ts? [Consistency, identical structure]
- [x] CHK066 - Does research.md §3 value object semantics match TSDoc in contracts? [Consistency, both emphasize reassignment requirement]
- [x] CHK067 - Are the 7-day calculation semantics consistent between spec and implementation? [Consistency, spec.md and quickstart.md both specify INCLUSIVE upper boundary]

## OmniJS API Alignment

- [x] CHK068 - Is Project.ReviewInterval documented as a value object in research.md? [Completeness, research.md §3]
- [x] CHK069 - Is the re-assignment pattern documented with OmniJS code example? [Completeness, research.md §3, quickstart.md]
- [x] CHK070 - Is the nextReviewDate computation documented as OmniFocus-internal? [Clarity, research.md, data-model.md "computed by OmniFocus"]
- [x] CHK071 - Is the date comparison pattern for filtering aligned with OmniJS Date behavior? [Consistency, quickstart.md uses standard JavaScript Date]

## Filter Implementation Guidance

- [x] CHK072 - Is the OmniJS filtering logic documented in quickstart.md for reviewStatus? [Completeness, quickstart.md §list_projects Complete OmniJS Pattern]
- [x] CHK073 - Is the date comparison pattern documented: midnight comparison for 'due'? [Completeness, quickstart.md setHours(0,0,0,0)]
- [x] CHK074 - Is the 7-day calculation documented: `today.getTime() + 7 * 24 * 60 * 60 * 1000`? [Completeness, quickstart.md sevenDaysFromNow calculation]
- [x] CHK075 - Is efficient filtering guidance provided (filter before serialization)? [Completeness, quickstart.md §Efficient Filtering Guidance]

## Error Handling for Review System

- [x] CHK076 - Is it documented that invalid reviewStatus values return Zod validation errors? [Coverage, contracts/shared/project.ts TSDoc "Error Handling"]
- [x] CHK077 - Is the error message format specified for invalid reviewStatus? [Clarity, spec.md §Error Message Standards, contracts TSDoc error format]
- [x] CHK078 - Is it documented that no error is returned when reviewStatus filter returns empty results? [Clarity, Spec §FR-010 empty array]

## TSDoc and Schema Documentation

- [x] CHK079 - Does ReviewIntervalSchema TSDoc explain value object semantics? [Completeness, contracts/shared/project.ts extensive TSDoc]
- [x] CHK080 - Does ReviewIntervalSchema TSDoc include OmniJS usage example? [Completeness, contracts/shared/project.ts WRONG and CORRECT patterns]
- [x] CHK081 - Does ReviewStatusFilterSchema TSDoc explain each filter mode? [Completeness, contracts/shared/project.ts comprehensive TSDoc]
- [x] CHK082 - Do ProjectFull schema field descriptions explain review properties? [Completeness, contracts/shared/project.ts "READ-ONLY" annotations]

## Gaps Identified

- [x] CHK083 - Is the 7-day boundary for 'upcoming' documented as inclusive (<=) or exclusive (<)? [Clarity, spec.md §Boundary Conditions "INCLUSIVE", contracts TSDoc]
- [x] CHK084 - Is the "today" boundary for 'due' vs 'upcoming' documented (nextReviewDate = today = 'due')? [Clarity, spec.md §Boundary Conditions "exactly today: Classified as 'due'"]
- [x] CHK085 - Is the state where reviewInterval exists but nextReviewDate is null addressed? [Clarity, spec.md §Edge Case, data-model.md §Edge Case, contracts TSDoc]
- [x] CHK086 - Is the behavior documented when OmniFocus has not yet calculated nextReviewDate? [Clarity, spec.md §Edge Case "transient and rare", contracts TSDoc "sync timing issue"]
