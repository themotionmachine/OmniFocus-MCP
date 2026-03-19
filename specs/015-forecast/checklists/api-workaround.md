# API Workaround Checklist: Forecast Tools

**Purpose**: Validate that all OmniJS API workarounds, calling conventions, and non-obvious behaviors are clearly and completely documented in the spec and plan, ensuring implementers have unambiguous guidance for the fragile Forecast API surface.
**Created**: 2026-03-18
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)
**Depth**: Standard
**Audience**: Reviewer (PR) / Implementer
**Focus Areas**: ForecastDay iteration, calling conventions, enum serialization, perspective switching, Timer.once/evaluateJavascript incompatibility

## Requirement Completeness: ForecastDay Iteration Pattern

- [ ] CHK001 - Is the complete date range iteration pattern documented with explicit OmniJS API calls (Calendar.current, DateComponents, dateByAddingDateComponents)? [Completeness, Spec Clarification 1.2, Research 3]
- [ ] CHK002 - Is it specified that each date in a range must be queried individually via forecastDayForDate() (no batch API exists)? [Completeness, Spec Clarification 1.1]
- [ ] CHK003 - Is the loop termination condition specified: should the loop use `i < dayCount` (where dayCount is inclusive count)? [Clarity, Research 3, Spec Clarification 1.2]
- [x] CHK004 - Is the dayCount calculation formula documented (how to compute the number of days between startDate and endDate)? [Clarity, RESOLVED: Added to Spec Clarification 1.2 and Research 12 -- uses Math.round on midnight-normalized getTime() difference plus 1]
- [ ] CHK005 - Is Calendar.current.startOfDay() specified as the normalization step for input dates before iteration begins? [Completeness, Spec Clarification 1.2]

## Requirement Completeness: Calling Conventions

- [ ] CHK006 - Is it explicitly documented that badgeKind() is a function call requiring parentheses, not a property access? [Clarity, Spec Clarification 1.3, Data Model]
- [ ] CHK007 - Is it documented that forecastDayForDate() is a DocumentWindow method requiring a window reference (not a static/global method)? [Clarity, Spec Clarification 1.1]
- [ ] CHK008 - Is the window acquisition pattern specified (document.windows[0])? [Completeness, Spec Clarification 1.1]
- [ ] CHK009 - Is it documented that selectForecastDays() accepts an array of ForecastDay objects (not Date objects), requiring prior forecastDayForDate() calls? [Clarity, Spec Clarification 1.6]
- [x] CHK010 - Is the badgeCountsIncludeDeferredItems class property documented, and is the spec clear on whether it should be read, set, or ignored? [RESOLVED: Added to Spec Clarification 1.3 and Research 13 -- MUST NOT be read or set; documented for completeness only; falls under out-of-scope "Forecast preferences"]

## Requirement Completeness: Enum Parsing and Serialization

- [ ] CHK011 - Is the OmniJS enum serialization strategy documented (explicit equality comparison mapping, not .toString() or .enumName())? [Clarity, Research 5]
- [ ] CHK012 - Is the complete ForecastDay.Kind enum mapping specified with all 5 values (Day, Today, Past, FutureMonth, DistantFuture)? [Completeness, Spec Clarification 2.4, Research 5]
- [ ] CHK013 - Is the complete ForecastDay.Status enum mapping specified with all 4 values (Available, DueSoon, NoneAvailable, Overdue)? [Completeness, Spec Clarification 2.4, Research 5]
- [ ] CHK014 - Is the fallback/unknown value handling specified for enum serialization if an unrecognized enum value is encountered? [Edge Case, Research 5]
- [ ] CHK015 - Are the Zod z.enum() definitions for ForecastDayKind and ForecastDayStatus specified with exact string values matching the OmniJS serialization? [Consistency, Data Model]

## Requirement Completeness: forecastDay.date Return Type

- [ ] CHK016 - Is it explicitly documented that forecastDay.date returns a JavaScript Date object (not DateComponents)? [Clarity, Spec Clarification 1.5]
- [ ] CHK017 - Is the spec clear that the output date field uses the queried input date, NOT the forecastDay.date property (which returns distant dates for aggregate nodes)? [Clarity, Spec Clarification 2.3, Data Model]
- [ ] CHK018 - Is the aggregate node behavior for Past and DistantFuture kinds documented (date may be years from current time, badge count reflects ALL items in that category)? [Completeness, Spec Clarification 2.3]

## Requirement Completeness: Perspective Switching and Execution Model

- [ ] CHK019 - Is it documented that BOTH forecastDayForDate() AND selectForecastDays() throw if Forecast is not the active perspective? [Completeness, Spec Assumption, Clarification 2.1-2.2]
- [x] CHK020 - Is the Timer.once(1, callback) pattern documented as incompatible with the MCP server's evaluateJavascript execution model, and is the synchronous IIFE alternative specified? [Completeness, RESOLVED: Added to Spec Clarification 2.6, Session 3.1, Research 11 -- Timer.once returns are discarded in JXA; all scripts use synchronous IIFE]
- [ ] CHK021 - Is it specified that ALL three forecast tool OmniJS scripts must include the perspective auto-switch pattern (not just select_forecast_days)? [Consistency, Spec Assumption]
- [x] CHK022 - Is the error handling pattern documented for the synchronous execution model (single try-catch wrapping both perspective switch and API calls)? [Completeness, RESOLVED: Contracts updated to use single try-catch without Timer.once; inner try-catch no longer needed since there is no async callback]
- [x] CHK023 - Is the Timer.once delay value (1 second) context documented, with explanation that it applies to plugin/URL-scheme contexts only, not to evaluateJavascript? [Clarity, RESOLVED: Added to Spec Clarification 2.6 and Session 3.1 -- 1-second delay is from official examples for plugin context; not applicable to this MCP server]
- [x] CHK024 - Is the error code PERSPECTIVE_SWITCH_FAILED defined and is it clear what conditions trigger this error vs. a general script failure? [Clarity, RESOLVED: Added to Spec Session 3.4 -- covers race condition, UI state issues, and requirement to include underlying exception text]

## Requirement Clarity: Date Handling

- [ ] CHK025 - Is the ISO 8601 date input format specified with explicit examples (YYYY-MM-DD vs full datetime string)? [Clarity, Spec FR-008]
- [ ] CHK026 - Is it clear that dates are interpreted as local time, consistent with OmniFocus date handling? [Clarity, Spec FR-008, Assumption]
- [ ] CHK027 - Is the date serialization format for output specified (toISOString() producing UTC strings)? [Clarity, Quickstart response examples]
- [x] CHK028 - Is the potential mismatch between local-time input interpretation and UTC output serialization acknowledged and documented? [RESOLVED: Added to Spec Session 3.2 -- intentional asymmetry; AI assistants warned about timezone offset in output]

## Requirement Consistency: Cross-Artifact Alignment

- [ ] CHK029 - Are the error codes consistent across all three contract docs (get-forecast-range, get-forecast-day, select-forecast-days)? [Consistency, Contracts]
- [x] CHK030 - Is the OmniJS pattern in each contract doc consistent with the patterns documented in research.md? [Consistency, RESOLVED: All three contracts updated to synchronous IIFE pattern matching Research 11]
- [ ] CHK031 - Are the enum string values consistent between data-model.md, research.md, and the contract OmniJS patterns? [Consistency, Data Model, Research 5]
- [ ] CHK032 - Does the quickstart.md response format match the contract output schemas? [Consistency, Quickstart, Contracts]

## Scenario Coverage: Edge Cases and Error States

- [ ] CHK033 - Is it specified what happens if document.windows[0] is null/undefined (no OmniFocus window open)? [Coverage, Contracts - NO_WINDOW error code]
- [x] CHK034 - Is it specified what happens if the perspective switch succeeds but forecastDayForDate() still throws (race condition in synchronous execution)? [Coverage, RESOLVED: Added to Spec Session 3.1 and 3.4 -- synchronous approach catches all errors in single try-catch; PERSPECTIVE_SWITCH_FAILED code with underlying exception text]
- [x] CHK035 - Is it specified that Timer.once MUST NOT be used as a return mechanism in this MCP server's execution model, and that the synchronous IIFE pattern is required instead? [RESOLVED: Added to Spec Session 3.1, Research 11 -- evaluateJavascript is synchronous; Timer.once callback returns are discarded; all contracts updated]
- [x] CHK036 - Is there guidance on what badgeKind() returns for a day that has only deferred items (no due items)? [Coverage, RESOLVED: Added to Data Model ForecastDayStatus note and Research 14 -- returns NoneAvailable with badgeCount=0, deferredCount>0]

## Notes

- Check items off as completed: `[x]`
- Items marked [RESOLVED] were gap items that have been remediated with spec/plan edits
- Items referencing [Spec Clarification X.Y] refer to Clarification Session sections in spec.md
- Items referencing [Research N] refer to numbered sections in research.md
- Critical finding: Timer.once pattern from official OmniJS examples is incompatible with this MCP server's JXA evaluateJavascript execution model (see CHK020, CHK022, CHK023, CHK035)
