# API Contracts Checklist: Forecast Tools

**Purpose**: Validate that API contract requirements -- discriminated union consistency, shared schema reuse, UI side-effect acknowledgment, error code completeness, and cross-tool consistency -- are completely, clearly, and consistently specified across the spec, plan, contracts, and data model.
**Created**: 2026-03-19
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)
**Depth**: Standard
**Audience**: Reviewer (PR) / Implementer
**Focus Areas**: Consistent success/failure discriminated unions for all 3 tools, ForecastDayOutput shared schema reuse, select_forecast_days UI side-effect acknowledgment, error code consistency (INVALID_DATE_RANGE, NO_WINDOW, PERSPECTIVE_SWITCH_FAILED), get_forecast_day vs get_forecast_range output schema reuse

## Requirement Completeness: Discriminated Union Consistency

- [ ] CHK001 - Is the discriminated union pattern (`z.discriminatedUnion('success', [...])`) explicitly specified for all 3 tools (get_forecast_range, get_forecast_day, select_forecast_days) in their contract documents? [Completeness, Contracts]
- [ ] CHK002 - Are the success schemas for all 3 tools defined with `success: z.literal(true)` as the discriminator field? [Consistency, Contracts]
- [ ] CHK003 - Are the error schemas for all 3 tools defined with `success: z.literal(false)` as the discriminator field? [Consistency, Contracts]
- [ ] CHK004 - Is the choice of `z.discriminatedUnion` (over `z.union`) justified in the plan for all 3 forecast tools, given each has exactly 2 response variants? [Clarity, Plan Discriminated Union Pattern]
- [ ] CHK005 - Are paired `z.infer<typeof Schema>` TypeScript type exports specified for every schema (input, success, error, response) across all 3 tools? [Completeness, Plan Type Export Convention]

## Requirement Completeness: ForecastDayOutput Shared Schema Reuse

- [ ] CHK006 - Is the ForecastDayOutput schema explicitly defined as a shared schema in a `shared/` subdirectory with import path documented? [Completeness, Plan Project Structure, Data Model]
- [ ] CHK007 - Does the get_forecast_range success schema reference `ForecastDayOutputSchema` (via import) rather than inlining the fields? [Consistency, Contracts get-forecast-range.md]
- [ ] CHK008 - Does the get_forecast_day success schema reference the same `ForecastDayOutputSchema` rather than defining a separate schema? [Consistency, Contracts get-forecast-day.md]
- [x] CHK009 - Is it explicitly specified that get_forecast_day reuses the exact same ForecastDayOutput schema as get_forecast_range (no extended detail fields)? [Clarity, RESOLVED: Added "Shared Schema Reuse Decision" section to get-forecast-day.md contract, "ForecastDayOutput Shared Schema Reuse" design decision to plan.md, and "Shared Schema Reuse" note to data-model.md ForecastDayOutput entity]
- [ ] CHK010 - Are all 6 fields of ForecastDayOutput (date, name, kind, badgeCount, badgeStatus, deferredCount) documented with their types in the data model? [Completeness, Data Model]
- [ ] CHK011 - Are the ForecastDayKind and ForecastDayStatus enum schemas documented as z.enum() with their exact values in the shared schema files? [Completeness, Data Model, Contracts]

## Requirement Completeness: select_forecast_days UI Side-Effect Acknowledgment

- [ ] CHK012 - Is the `warning` field in the select_forecast_days success schema specified as always-present (not optional)? [Completeness, Contracts select-forecast-days.md, Spec FR-007]
- [ ] CHK013 - Is the exact warning text specified in the contract document, and does it explicitly state that the visible OmniFocus Forecast perspective was changed? [Clarity, Contracts select-forecast-days.md]
- [ ] CHK014 - Does SC-006 align with the contract's warning field -- are both the success criterion and the contract in agreement that the warning is always present? [Consistency, Spec SC-006, Contracts]
- [ ] CHK015 - Is the warning field's purpose documented as informing AI assistants about the UI side effect (not just a generic warning)? [Clarity, Spec FR-007, Contracts]

## Requirement Consistency: Error Codes Across All 3 Tools

- [ ] CHK016 - Is the error `code` field specified as `z.string().optional()` (not `z.enum()`) for all 3 tools, consistent with the established codebase pattern? [Consistency, Plan Error Code Typing, Contracts]
- [ ] CHK017 - Are the documented error codes for get_forecast_range complete: INVALID_DATE, INVALID_RANGE, RANGE_TOO_LARGE, NO_WINDOW, PERSPECTIVE_SWITCH_FAILED? [Completeness, Contracts get-forecast-range.md]
- [ ] CHK018 - Are the documented error codes for get_forecast_day complete: INVALID_DATE, NO_WINDOW, PERSPECTIVE_SWITCH_FAILED? [Completeness, Contracts get-forecast-day.md]
- [ ] CHK019 - Are the documented error codes for select_forecast_days complete: INVALID_DATE, NO_WINDOW, PERSPECTIVE_SWITCH_FAILED, EMPTY_DATES? [Completeness, Contracts select-forecast-days.md]
- [x] CHK020 - Is the INVALID_DATE_RANGE error code from the user prompt reconciled with the contracts, which use separate INVALID_RANGE and RANGE_TOO_LARGE codes instead? [Clarity, RESOLVED: Added "Error Code Rationale" section to get-forecast-range.md contract explaining that INVALID_DATE_RANGE maps to two distinct codes (INVALID_RANGE for logical constraint, RANGE_TOO_LARGE for size constraint) following the codebase convention of one code per distinct validation condition; includes validation layer table]
- [ ] CHK021 - Are the error codes that appear in multiple tools (NO_WINDOW, PERSPECTIVE_SWITCH_FAILED, INVALID_DATE) defined consistently with the same semantics across all 3 tools? [Consistency, Contracts]
- [ ] CHK022 - Is it specified when each error code is produced (which validation layer triggers it -- Zod schema, primitive, or OmniJS script)? [Clarity, Plan Validation Layer]

## Requirement Clarity: get_forecast_day vs get_forecast_range Output Design

- [x] CHK023 - Is the decision to reuse the same ForecastDayOutput for both tools (no extended detail fields for get_forecast_day) explicitly documented and justified? [Clarity, RESOLVED: Added "ForecastDayOutput Shared Schema Reuse" design decision to plan.md with rationale (OmniJS API returns identical objects; User Story 2 "detailed" means full 6-field shape, not extended fields); cross-referenced in get-forecast-day.md and data-model.md]
- [ ] CHK024 - Does User Story 2 ("detailed forecast for a specific day") imply any additional fields beyond what ForecastDayOutput provides, and is this gap (if any) addressed? [Completeness, Spec User Story 2]
- [ ] CHK025 - Is the difference between get_forecast_range and get_forecast_day clearly specified as being about scope (range vs single day) rather than detail level? [Clarity, Contracts]
- [ ] CHK026 - Is the get_forecast_day success schema shape (`{ success, day }`) documented as distinct from get_forecast_range shape (`{ success, days, totalDays, startDate, endDate }`)? [Completeness, Contracts]

## Requirement Completeness: Input Schema Contracts

- [ ] CHK027 - Are default values for get_forecast_range inputs (startDate defaults to today, endDate defaults to startDate + 7 days) specified in both the contract and the spec? [Completeness, Spec FR-001, Contracts get-forecast-range.md]
- [ ] CHK028 - Is the default value for get_forecast_day input (date defaults to today) specified in both the contract and the spec? [Completeness, Contracts get-forecast-day.md]
- [ ] CHK029 - Is the `dates` array in select_forecast_days specified with both min (1) and max (90) constraints? [Completeness, Contracts select-forecast-days.md, Spec FR-010]
- [ ] CHK030 - Is the 90-day maximum range limit for get_forecast_range specified in the contract, and is it consistent with the spec's FR-011? [Completeness, Spec FR-011, Contracts]

## Scenario Coverage: Error and Edge Case Flows

- [ ] CHK031 - Are requirements specified for what happens when `forecastDayForDate()` throws despite the perspective being set (race condition scenario)? [Coverage, Spec Clarifications Session 3 item 4]
- [ ] CHK032 - Is the PERSPECTIVE_SWITCH_FAILED error code specified to include the underlying OmniJS exception text per Spec Clarifications Session 3 item 4? [Completeness, Spec Clarifications]
- [ ] CHK033 - Are requirements specified for when OmniFocus has no open windows (NO_WINDOW)? [Coverage, Contracts OmniJS Pattern]
- [ ] CHK034 - Are requirements specified for the Past/DistantFuture aggregate node behavior in get_forecast_range -- that multiple dates may return the same aggregate data? [Coverage, Research item 6, Spec Clarifications Session 2 item 3]
- [x] CHK035 - Is the date input/output format asymmetry (local input YYYY-MM-DD, UTC output toISOString) documented in the contracts or data model? [Clarity, RESOLVED: Added "Date Input/Output Format Asymmetry" note to data-model.md ForecastDayOutput entity; added "Date Format Asymmetry" sections to get-forecast-range.md and get-forecast-day.md contracts; references Spec Clarifications Session 3 item 2 and src/contracts/task-tools/shared/task.ts Date Handling pattern]

## Requirement Consistency: Cross-Document Alignment

- [ ] CHK036 - Do the plan's Post-Design Constitution Re-Check error codes (INVALID_DATE, INVALID_RANGE, RANGE_TOO_LARGE, NO_WINDOW, PERSPECTIVE_SWITCH_FAILED, EMPTY_DATES) align with the individual contract documents? [Consistency, Plan Post-Design Gate]
- [ ] CHK037 - Does the data model's validation rules table align with the contract validation rules sections for all 3 tools? [Consistency, Data Model, Contracts]
- [ ] CHK038 - Does the quickstart.md example responses match the contract success schema shapes (field names, types, presence of warning field)? [Consistency, Quickstart, Contracts]

## Traceability: FR Coverage

- [ ] CHK039 - Does each contract document list the FR numbers it covers, and do the listed FRs match the actual contract content? [Traceability, Contracts]
- [ ] CHK040 - Is FR-012 (chronological ordering) reflected in the get_forecast_range contract (e.g., in the `days` array description)? [Traceability, Spec FR-012, Contracts get-forecast-range.md]
