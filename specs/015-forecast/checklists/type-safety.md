# Type Safety Checklist: Forecast Tools

**Purpose**: Validate that all type-safety requirements -- Zod 4.x schemas, absence of type assertions, date validation, enum definitions, discriminated union patterns, and shared schema reuse -- are completely, clearly, and consistently specified across the spec, plan, contracts, and data model.
**Created**: 2026-03-19
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)
**Depth**: Standard
**Audience**: Reviewer (PR) / Implementer
**Focus Areas**: Zod 4.x schemas for all 3 tool inputs/outputs, no `as Type` assertions, date input validation (ISO 8601 format + range limits), ForecastDay output schema with enums, discriminatedUnion patterns for success/failure, shared schema reuse

## Requirement Completeness: Zod 4.x Schema Coverage

- [ ] CHK001 - Is a Zod input schema explicitly defined for all 3 tools (get_forecast_range, get_forecast_day, select_forecast_days)? [Completeness, Contracts]
- [ ] CHK002 - Is a Zod output success schema explicitly defined for all 3 tools? [Completeness, Contracts]
- [ ] CHK003 - Is a Zod output error schema explicitly defined for all 3 tools? [Completeness, Contracts]
- [ ] CHK004 - Is a Zod discriminated union response schema explicitly defined for all 3 tools combining success and error variants? [Completeness, Contracts]
- [x] CHK005 - Are Zod `z.infer<typeof Schema>` type exports specified for each schema to derive TypeScript types without manual duplication? [Completeness, RESOLVED: Added z.infer type exports to all 3 contract docs (get-forecast-range.md, get-forecast-day.md, select-forecast-days.md) for input, success, error, and response schemas; documented convention in plan.md Type Safety Design Decisions]
- [ ] CHK006 - Is the Zod version requirement specified as 4.x (specifically 4.2.x per plan.md) in the contracts and plan? [Completeness, Plan Technical Context]

## Requirement Completeness: Shared Schema Definitions

- [ ] CHK007 - Is a shared ForecastDayOutput schema defined and documented for reuse across get_forecast_range and get_forecast_day? [Completeness, Data Model, Contracts]
- [ ] CHK008 - Is the shared ForecastDayKind enum schema defined as z.enum() with all 5 values (Day, Today, Past, FutureMonth, DistantFuture)? [Completeness, Spec FR-003, Data Model]
- [ ] CHK009 - Is the shared ForecastDayStatus enum schema defined as z.enum() with all 4 values (Available, DueSoon, NoneAvailable, Overdue)? [Completeness, Spec FR-004, Data Model]
- [ ] CHK010 - Is the file organization for shared schemas specified (shared/ subdirectory with barrel exports via index.ts)? [Completeness, Plan Project Structure]
- [ ] CHK011 - Are the shared enum schemas documented as reusable across multiple contract files (not duplicated per tool)? [Consistency, Plan Project Structure]
- [ ] CHK012 - Is the ForecastDayOutput schema composition specified (which fields, which types, which are required)? [Clarity, Data Model]

## Requirement Clarity: Date Input Validation

- [ ] CHK013 - Is the expected date input format specified as ISO 8601 date-only (YYYY-MM-DD), not full datetime? [Clarity, Spec FR-008, Contracts]
- [x] CHK014 - Is a Zod validation pattern specified or recommended for validating YYYY-MM-DD format (e.g., regex refinement, z.string().date(), or custom validation)? [RESOLVED: Added plan.md Type Safety Design Decisions -- Date Validation Approach: plain z.string().optional() with .describe() text, no regex/z.string().date(); follows codebase convention from task-tools, review-tools, status-tools]
- [ ] CHK015 - Is the behavior specified for malformed date strings that partially parse (e.g., "2026-13-01", "2026-02-30")? [Coverage, Spec FR-009]
- [x] CHK016 - Is it specified at which layer date validation occurs -- Zod schema level, primitive level, or OmniJS level? [Clarity, RESOLVED: Added plan.md Type Safety Design Decisions -- Validation Layer: 3-layer model (Zod=structural, primitive=semantic with INVALID_DATE/INVALID_RANGE/RANGE_TOO_LARGE codes, OmniJS=runtime safety net)]
- [ ] CHK017 - Is the maximum date range limit (90 days) specified as a Zod refinement or as server-side validation logic? [Clarity, Spec FR-011, Research 8]
- [ ] CHK018 - Is the start-before-end validation for get_forecast_range specified at the Zod level or as separate server-side logic? [Clarity, Contract Validation Rules]

## Requirement Clarity: No Type Assertions Policy

- [x] CHK019 - Is the prohibition on `as Type` assertions explicitly stated in the plan or contracts for this feature? [Completeness, RESOLVED: Added plan.md Type Safety Design Decisions -- OmniJS Result Narrowing: documents the tension between CLAUDE.md NEVER rule and universal codebase pattern; `result as XResponse` is the established convention for executeOmniJS results]
- [x] CHK020 - Is Zod narrowing or type guards specified as the alternative to type assertions for discriminating success/error responses? [Clarity, RESOLVED: plan.md Discriminated Union Pattern section documents that z.discriminatedUnion('success', [...]) provides TypeScript control-flow narrowing on the parsed response; `as Type` applies only to the executeOmniJS boundary, not to consumer-side response handling]
- [x] CHK021 - Is the approach for safely narrowing OmniJS script results (parsed JSON) specified without using `as Type`? [Clarity, RESOLVED: Added plan.md Type Safety Design Decisions -- OmniJS Result Narrowing: documents `result as XResponse` as established pattern with null guard recommendation; notes this is a known CLAUDE.md tension with rationale]

## Requirement Consistency: Discriminated Union Patterns

- [ ] CHK022 - Do all 3 tool response schemas use z.discriminatedUnion('success', [...]) consistently? [Consistency, Contracts]
- [ ] CHK023 - Is the discriminator field ('success') documented as the standard pattern consistent with existing tools (review-tools, repetition-tools)? [Consistency, Contracts, Constitution IV]
- [ ] CHK024 - Is the rationale documented for using z.discriminatedUnion vs z.union for the forecast tool responses (all 3 tools have simple success:true/false discrimination)? [Clarity, Contracts]
- [ ] CHK025 - Are the error schemas consistent in structure across all 3 tools (success: literal(false), error: string, code: string.optional)? [Consistency, Contracts]
- [x] CHK026 - Is the error `code` field typed as z.string().optional() consistently, or should it use z.enum() with the known error codes for stricter typing? [Clarity, RESOLVED: Added plan.md Type Safety Design Decisions -- Error Code Typing: z.string().optional() with codes in .describe() text, following codebase convention from review-tools/status-tools; z.enum() rejected because OmniJS runtime may return unexpected codes]

## Requirement Completeness: ForecastDayOutput Schema Fields

- [ ] CHK027 - Is the `date` field typed as z.string() with ISO 8601 format requirement? [Completeness, Data Model]
- [ ] CHK028 - Is the `name` field typed as z.string()? [Completeness, Data Model]
- [ ] CHK029 - Is the `kind` field typed using the shared ForecastDayKind z.enum() schema? [Completeness, Data Model]
- [ ] CHK030 - Is the `badgeCount` field typed as z.number().int().min(0)? [Completeness, Data Model]
- [ ] CHK031 - Is the `badgeStatus` field typed using the shared ForecastDayStatus z.enum() schema? [Completeness, Data Model]
- [ ] CHK032 - Is the `deferredCount` field typed as z.number().int().min(0)? [Completeness, Data Model]

## Requirement Completeness: Tool-Specific Input Schemas

- [ ] CHK033 - Is get_forecast_range's startDate typed as z.string().optional() with appropriate description? [Completeness, Contract get-forecast-range]
- [ ] CHK034 - Is get_forecast_range's endDate typed as z.string().optional() with appropriate description? [Completeness, Contract get-forecast-range]
- [ ] CHK035 - Is get_forecast_day's date typed as z.string().optional() with appropriate description? [Completeness, Contract get-forecast-day]
- [ ] CHK036 - Is select_forecast_days' dates typed as z.array(z.string()).min(1).max(90) with appropriate description? [Completeness, Contract select-forecast-days, Spec FR-010]
- [ ] CHK037 - Are default values for optional date parameters documented (today for startDate/date, startDate + 7 days for endDate)? [Completeness, Spec FR-001, Contract Validation Rules]

## Requirement Completeness: Tool-Specific Output Schemas

- [ ] CHK038 - Does get_forecast_range success schema include days (array of ForecastDayOutput), totalDays, startDate, and endDate? [Completeness, Contract get-forecast-range]
- [ ] CHK039 - Does get_forecast_day success schema include a single day (ForecastDayOutput)? [Completeness, Contract get-forecast-day]
- [ ] CHK040 - Does select_forecast_days success schema include selectedDates, selectedCount, and warning? [Completeness, Contract select-forecast-days, Spec FR-007]
- [ ] CHK041 - Is the warning field in select_forecast_days typed as z.string() (always present, not optional)? [Completeness, Contract select-forecast-days, Spec FR-007]

## Scenario Coverage: Validation Edge Cases

- [ ] CHK042 - Are requirements specified for how the system handles a date string that is syntactically valid ISO 8601 but semantically invalid (e.g., "9999-12-31")? [Coverage, Edge Case]
- [ ] CHK043 - Are requirements specified for empty string date inputs? [Coverage, Edge Case]
- [ ] CHK044 - Is the behavior specified when both startDate and endDate are omitted vs when only one is provided? [Coverage, Contract Validation Rules]
- [ ] CHK045 - Is the exact error code mapping specified for each validation failure type (INVALID_DATE vs INVALID_RANGE vs RANGE_TOO_LARGE)? [Clarity, Contract error schemas]

## Non-Functional: Type Safety Alignment with Constitution

- [ ] CHK046 - Is the spec/plan aligned with Constitution Principle I (Type-First Development) requiring Zod schemas for all tool inputs before processing? [Consistency, Constitution I]
- [ ] CHK047 - Is the spec/plan aligned with Constitution Principle IV (Structured Data Contracts) requiring all data crossing boundaries to be structured JSON validated by Zod? [Consistency, Constitution IV]
- [ ] CHK048 - Are contract files specified in the correct directory structure (src/contracts/forecast-tools/) consistent with other tool groups? [Consistency, Plan Project Structure, Constitution II]

## Notes

- Check items off as completed: `[x]`
- Items marked [RESOLVED] were gap items that have been remediated with spec/plan edits
- Items referencing [Spec FR-XXX] refer to Functional Requirements in spec.md
- Items referencing [Contract xxx] refer to the contract markdown files in specs/015-forecast/contracts/
- Items referencing [Constitution X] refer to Constitution principles in .specify/memory/constitution.md
- Items referencing [Data Model] refer to specs/015-forecast/data-model.md
- Items referencing [Gap] indicate missing requirements that need remediation
