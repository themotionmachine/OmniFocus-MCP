# Version Feature Matrix Validation Checklist

**Feature**: Phase 3 - Enhanced Task Management Tools
**Created**: 2025-12-11
**Updated**: 2025-12-11
**Focus**: Version-dependent feature specification and fallback behaviors
**Scope**: 5 version-specific features across 3 version thresholds plus platform restrictions

---

## Version Threshold Documentation - v4.7+ Features

plannedDate (writable) and set_planned_date tool

- [x] CHK001 - Is v4.7 minimum version for `plannedDate` documented in data-model.md? [data-model.md §Version-Specific Features]
- [x] CHK002 - Is v4.7 minimum version for `set_planned_date` tool documented in spec.md? [Spec §FR-024, §Version Requirements]
- [x] CHK003 - Is the distinction between `plannedDate` (v4.7+, writable) and `effectivePlannedDate` (v4.7.1+, read-only) clear? [research.md, spec.md §Version Requirements]
- [x] CHK004 - Is the `plannedDate` property documented as **writable** (not read-only) in v4.7+? [research.md §plannedDate Clarification]
- [x] CHK005 - Is the version requirement consistent across spec.md, data-model.md, and research.md? [Verified - all v4.7+]

---

## Version Threshold Documentation - v4.7.1+ Features

effectivePlannedDate (read-only, computed)

- [x] CHK006 - Is v4.7.1 minimum version for `effectivePlannedDate` documented? [data-model.md §Version-Specific Features, spec.md §Version Requirements]
- [x] CHK007 - Is `effectivePlannedDate` clearly marked as read-only (computed property)? [research.md, spec.md §Version Requirements]
- [x] CHK008 - Is the semantic difference between `plannedDate` and `effectivePlannedDate` documented? [data-model.md §Inheritance Behavior]
- [x] CHK009 - Is the inheritance behavior of `effectivePlannedDate` (computed from task or project) documented? [data-model.md §Inheritance Behavior]

---

## Version Threshold Documentation - v3.x Features

estimatedMinutes, shouldUseFloatingTimeZone, effectiveCompletedDate, effectiveDropDate

- [x] CHK010 - Is v3.5 minimum version for `estimatedMinutes` documented? [data-model.md §Version-Specific Features, spec.md §Version Requirements]
- [x] CHK011 - Is macOS-only platform restriction for `estimatedMinutes` documented? [research.md §Caveats, data-model.md §Platform Detection, spec.md §Version Requirements]
- [x] CHK012 - Is v3.6 minimum version for `shouldUseFloatingTimeZone` documented? [research.md, data-model.md §Version-Specific Features]
- [x] CHK013 - Is v3.8 minimum version for `effectiveCompletedDate` and `effectiveDropDate` documented? [research.md, data-model.md §Version-Specific Features, spec.md §Version Requirements]
- [x] CHK014 - Are all v3.x version requirements listed in a consolidated version table? [data-model.md §Version-Specific Features, spec.md §Version Requirements]

---

## Fallback Behavior - plannedDate in Read Operations

list_tasks and get_task response handling for v < 4.7

- [x] CHK015 - Is fallback behavior for `plannedDate` in `list_tasks` response specified (omit field vs return null)? [data-model.md §Version-Specific Features - Return `null`]
- [x] CHK016 - Is fallback behavior for `plannedDate` in `get_task` response specified (omit field vs return null)? [data-model.md §Version-Specific Features - Return `null`]
- [x] CHK017 - Is fallback behavior for `effectivePlannedDate` in `get_task` response specified for v < 4.7.1? [data-model.md §Version-Specific Features - Return `null`]
- [x] CHK018 - Is the fallback behavior consistent between `list_tasks` and `get_task` for the same field? [Verified - both return null]
- [x] CHK019 - Does the schema allow version-conditional field omission (fields marked optional)? [contracts/shared/task.ts - all version fields are nullable]

---

## Fallback Behavior - plannedDate Filters

plannedBefore/plannedAfter filter behavior on older versions

- [x] CHK020 - Is behavior for `plannedBefore`/`plannedAfter` filters on v < 4.7 specified (error vs ignore)? [spec.md §Version-Conditional Filter Behavior, data-model.md §Version-Specific Features - ignore silently]
- [x] CHK021 - If filters are ignored, is this documented as silent ignore or logged warning? [spec.md §Version-Conditional Filter Behavior - silent ignore]
- [x] CHK022 - Is version check performed before applying `plannedBefore`/`plannedAfter` filters? [quickstart.md §Filter Generation Pattern - version check shown]

---

## Fallback Behavior - Platform-Specific Features

estimatedMinutes on iOS/iPadOS

- [x] CHK023 - Is fallback behavior for `estimatedMinutes` on iOS/iPadOS specified (omit, null, or 0)? [data-model.md §Platform Detection - returns null]
- [x] CHK024 - Is platform detection requirement documented for `estimatedMinutes`? [data-model.md §Platform Detection - MCP server macOS only, not required]
- [x] CHK025 - Is the distinction between "version too old" vs "wrong platform" error documented? [data-model.md §Platform Detection - note about Device.current.type]

---

## Version Checking Implementation - set_planned_date

Runtime version validation requirements

- [x] CHK026 - Is the version check pattern documented (`app.userVersion.atLeast(new Version("4.7"))`)? [research.md §Version Check Example, quickstart.md §Version Checking]
- [x] CHK027 - Is the check sequence documented (version check BEFORE attempting set operation)? [spec.md §Database Migration Handling, quickstart.md §Version Checking]
- [x] CHK028 - Is the error message format specified when version is insufficient? [spec.md §Error Message Standards - "Planned date requires OmniFocus v4.7 or later"]
- [x] CHK029 - Does the specified error message quote the required version? [spec.md §Error Message Standards - "v4.7 or later"]

---

## Error Message Specification - Version Failures

Actionable error messages for version mismatches

- [x] CHK030 - Is the version mismatch error message explicitly specified in the error standards table? [spec.md §Error Message Standards - Version mismatch row]
- [x] CHK031 - Is the error message actionable (quotes required version "v4.7 or later")? [spec.md §Error Message Standards]
- [x] CHK032 - Is the error message distinguishable from "not found" or "disambiguation" errors? [Verified - distinct message format]
- [x] CHK033 - Is error handling consistent with spec FR-042 (standard error response format)? [spec.md §FR-042 - `{success: false, error: string}`]

---

## Database Migration Warning

plannedDate requires database migration even on v4.7+

- [x] CHK034 - Is the database migration requirement for `plannedDate` documented? [research.md §plannedDate Clarification, spec.md §Database Migration Handling]
- [x] CHK035 - Is it documented that set operation may fail on v4.7+ if database not migrated? [spec.md §Database Migration Handling, research.md §Caveats]
- [x] CHK036 - Is the potential "silent failure" or error behavior documented for unmigrated databases? [spec.md §Database Migration Handling - returns migration error]
- [x] CHK037 - Is try-catch handling specified for potential migration-related failures? [quickstart.md §Version Checking - try-catch with migration check]
- [x] CHK038 - Is user guidance provided for migration failure scenarios? [spec.md §Database Migration Handling - step-by-step instructions]

---

## Schema Version Handling

Contract schemas accommodate version-conditional fields

- [x] CHK039 - Is `plannedDate` marked as nullable in TaskSummarySchema? [contracts/shared/task.ts - `z.string().nullable()`]
- [x] CHK040 - Is `plannedDate` marked as nullable in TaskFullSchema? [contracts/shared/task.ts - `z.string().nullable()`]
- [x] CHK041 - Is `effectivePlannedDate` marked as nullable in TaskFullSchema? [contracts/shared/task.ts - `z.string().nullable()`]
- [x] CHK042 - Is `estimatedMinutes` marked as nullable in TaskFullSchema? [contracts/shared/task.ts - `z.number().nullable()`]
- [x] CHK043 - Do schema descriptions mention version requirements? [contracts/shared/task.ts - "(v4.7+)" in descriptions]
- [x] CHK044 - Are version notes in schema descriptions consistent with research.md? [Verified - consistent]

---

## Cross-Tool Consistency

Uniform handling across all 4 tools

- [x] CHK045 - Is `plannedDate` handling consistent between `list_tasks` and `get_task` schemas? [contracts/shared/task.ts - same nullable string type]
- [x] CHK046 - Are version error message formats consistent across tools? [spec.md §Error Message Standards - consistent format]
- [x] CHK047 - Is fallback behavior (omit vs null) uniform across all response schemas? [data-model.md §Version-Specific Features - all return null]
- [x] CHK048 - Are version requirements documented in the same location for all affected tools? [spec.md §Version Requirements table]

---

## Research Document Alignment

Version information across documents

- [x] CHK049 - Do version requirements in data-model.md match research.md? [Verified - consistent]
- [x] CHK050 - Does spec.md §Version Requirements table match research.md findings? [Verified - consistent]
- [x] CHK051 - Are research.md OmniJS API version notes cited as sources for spec requirements? [spec.md §Version Requirements - "Source: research.md"]
- [x] CHK052 - Are there any version assumptions in spec that contradict research.md? [No conflicts detected]

---

## Version Feature Matrix Summary

Consolidated documentation requirements

- [x] CHK053 - Is there a consolidated version requirements table in one location? [data-model.md §Version-Specific Features, spec.md §Version Requirements]
- [x] CHK054 - Does the table include: feature name, minimum version, fallback behavior, platform restrictions? [data-model.md §Version-Specific Features - includes all columns]
- [x] CHK055 - Is the table consistent with all individual feature documentation? [Verified - consistent]
- [x] CHK056 - Are all 5 version-specific features included in the matrix? [Verified - all 5+ features in tables]

---

## Summary

| Category | Item Count | Satisfied |
|----------|-----------|-----------|
| v4.7+ Feature Documentation | 5 | 5/5 |
| v4.7.1+ Feature Documentation | 4 | 4/4 |
| v3.x Feature Documentation | 5 | 5/5 |
| plannedDate Read Fallback | 5 | 5/5 |
| plannedDate Filter Fallback | 3 | 3/3 |
| Platform-Specific Fallback | 3 | 3/3 |
| Version Check Implementation | 4 | 4/4 |
| Error Message Specification | 4 | 4/4 |
| Database Migration Warning | 5 | 5/5 |
| Schema Version Handling | 6 | 6/6 |
| Cross-Tool Consistency | 4 | 4/4 |
| Research Document Alignment | 4 | 4/4 |
| Version Feature Matrix Summary | 4 | 4/4 |
| **Total** | **56** | **56/56 (100%)** |

---

## Validation Status

**All 56 checklist items have been satisfied.**

### Remediation Summary (2025-12-11)

The following specifications were added/verified to resolve gaps:

1. **spec.md** - Added:
   - §Database Migration Handling section with error handling and user guidance
   - Migration required error message in Error Message Standards table
   - §Version Requirements table with source reference to research.md
   - Notes column in Version Requirements table for database migration caveat

2. **data-model.md** - Added:
   - Enhanced Version-Specific Features table with Platform and Fallback columns
   - §Platform Detection section (estimatedMinutes macOS-only)
   - §Inheritance Behavior section (effectivePlannedDate computation)

3. **quickstart.md** - Enhanced:
   - §Version Checking section with complete migration error handling example
   - Try-catch pattern showing migration error detection

4. **contracts/shared/task.ts** - Verified:
   - All version-conditional fields marked nullable
   - Version notes in field descriptions
