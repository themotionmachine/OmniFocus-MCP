# API Workaround & Calendar API Requirements Checklist

**Purpose**: Validates that critical API constraints and Calendar/DateComponents
API requirements are documented throughout ALL specification documents.

**Created**: 2025-12-30
**Last Validated**: 2026-03-16

---

## Critical API Constraints (from Research)

### Constraint 1: NO `markReviewed()` Method

| Location | Documented | Notes |
|----------|------------|-------|
| research.md "API Limitations Confirmed" | ✅ Yes | Explicit statement with workaround |
| spec.md "Critical API Discovery" | ✅ Yes | Listed as constraint #1 |
| requirements.md "API Constraints" | ✅ Yes | Section header + explanation |
| data-model.md | ✅ Yes | Now documented |
| plan.md | ✅ Yes | Now documented |
| quickstart.md | ✅ Yes | Now documented |

### Constraint 2: `lastReviewDate` is READ-ONLY

| Location | Documented | Notes |
|----------|------------|-------|
| research.md "API Limitations Confirmed" | ✅ Yes | Clear statement, explains UI vs API |
| research.md Key API Findings table | ✅ Yes | "❌ No" in Writable column |
| spec.md "Critical API Discovery" | ✅ Yes | Listed as constraint #2 |
| spec.md "Review Date Properties" | ✅ Yes | "(READ-ONLY)" annotation |
| spec.md API Reference | ✅ Yes | Comment in code block |
| requirements.md "API Constraints" | ✅ Yes | Explicit subsection |
| data-model.md | ✅ Yes | Read-only status documented |
| plan.md | ✅ Yes | Constraint referenced |

### Constraint 3: `nextReviewDate` is WRITABLE (Workaround Mechanism)

| Location | Documented | Notes |
|----------|------------|-------|
| research.md Key API Findings table | ✅ Yes | "✅ Yes" in Writable column |
| research.md "No markReviewed() Method" | ✅ Yes | 2-step workaround documented |
| spec.md "Critical API Discovery" | ✅ Yes | Listed as constraint #3 |
| spec.md "Review Date Properties" | ✅ Yes | "(WRITABLE)" annotation |
| spec.md API Reference code | ✅ Yes | Shows `project.nextReviewDate =` |
| requirements.md "API Constraints" | ✅ Yes | Shows workaround steps 1-2 |
| data-model.md | ✅ Yes | Writable status documented |
| quickstart.md code examples | ✅ Yes | Uses setter, not method |

### Constraint 4: ReviewInterval Uses Value Object Semantics

| Location | Documented | Notes |
|----------|------------|-------|
| research.md Key API Findings | ✅ Yes | "Critical" note with code example |
| spec.md "Key Entities" | ✅ Yes | "Semantics: Value object" |
| spec.md "Important Constraints" | ✅ Yes | Listed as constraint #3 |
| requirements.md "API Constraints" | ✅ Yes | WRONG vs CORRECT code example |
| data-model.md | ✅ Yes | Value object semantics documented |

---

## Calendar/DateComponents API Requirement

### Explicit Requirement Documentation

| Location | Documented | Notes |
|----------|------------|-------|
| research.md "Date Calculation API (Critical)" | ✅ Yes | Full API reference with table |
| research.md "Why Calendar API > Millisecond Math" | ✅ Yes | Comparison table |
| research.md "Correct Date Calculation Pattern" | ✅ Yes | Complete function example |
| spec.md "Date Calculation Pattern (Critical)" | ✅ Yes | DO and DO NOT examples |
| spec.md "DateComponents Unit Mapping" | ✅ Yes | Table with all 4 units |
| requirements.md "Date Calculation" section | ✅ Yes | CORRECT vs WRONG patterns |
| requirements.md DateComponents table | ✅ Yes | Unit mapping table |
| data-model.md | ✅ Yes | Calendar API patterns documented |
| plan.md | ✅ Yes | Calendar API approach specified |
| quickstart.md | ✅ Yes | All examples use Calendar API |
| Contracts/TSDoc | ✅ Yes | Calendar API patterns documented |

### DateComponents Unit Mapping

| reviewInterval.unit | DateComponents | research.md | spec.md | requirements.md |
|---------------------|----------------|-------------|---------|-----------------|
| `'days'` | `dc.day` | ✅ | ✅ | ✅ |
| `'weeks'` | `dc.day = steps * 7` | ✅ | ✅ | ✅ |
| `'months'` | `dc.month` | ✅ | ✅ | ✅ |
| `'years'` | `dc.year` | ✅ | ✅ | ✅ |

### Calendar API Methods Used

| Method | Purpose | Documented |
|--------|---------|------------|
| `Calendar.current.startOfDay(date)` | Normalize to midnight | ✅ research.md, spec.md |
| `Calendar.current.dateByAddingDateComponents(date, dc)` | Add interval | ✅ research.md, spec.md |
| `new DateComponents()` | Create components | ✅ research.md, spec.md |

---

## Calendar API vs Millisecond Math

### Comparison Table Present

| Location | Has Table | Shows Consequences |
|----------|-----------|-------------------|
| research.md | ✅ Yes | Month boundaries, leap years, DST |
| spec.md | ✅ Partial | Lists what Calendar handles |
| requirements.md | ✅ Yes | WRONG vs CORRECT examples |

### Edge Cases Requiring Calendar API

| Scenario | Documented | Location |
|----------|------------|----------|
| Jan 31 + 1 month | ✅ Explicit | spec.md "Month Boundary Edge Cases" table |
| Feb 29 + 1 year (leap) | ✅ Explicit | spec.md "Leap Year Edge Cases" table |
| DST transitions | ✅ Yes | research.md table, spec.md |
| Months with 28-31 days | ✅ Explicit | spec.md test case tables |
| Year boundary crossing | ✅ Explicit | spec.md "Year Boundary Edge Cases" table |

### Prohibition of Millisecond Math

| Location | Explicitly Prohibits | Shows WRONG Example |
|----------|---------------------|---------------------|
| spec.md "DO NOT use" | ✅ Yes | ✅ Yes - with comment |
| requirements.md | ✅ Yes | ✅ Yes - labeled "WRONG" |
| research.md | ✅ Implied | Table shows failures |

---

## Workaround Pattern Clarity

### Tool Name vs Implementation

| Aspect | Documented | Location |
|--------|------------|----------|
| `mark_reviewed` is semantic name | ✅ Implied | spec.md User Story 2 |
| Implementation uses `nextReviewDate` setter | ✅ Yes | spec.md API Reference |
| Distinction explicit | ✅ Yes | spec.md Important Constraints #8 |

### No Attempts to Call `markReviewed()`

| Location | Verified |
|----------|----------|
| research.md code examples | ✅ All use `nextReviewDate =` |
| spec.md code examples | ✅ All use `nextReviewDate =` |
| requirements.md code examples | ✅ All use `nextReviewDate =` |

---

## Version Requirements

| Feature | Version | research.md | spec.md | requirements.md |
|---------|---------|-------------|---------|-----------------|
| `reviewInterval` property | OmniFocus 3.11+ | ✅ | ✅ | ✅ |
| Calendar/DateComponents API | OmniFocus 3.0+ | ✅ | ✅ | ✅ |
| `flattenedProjects.filter()` | OmniFocus 3.0+ | ✅ | ✅ | ✅ |

### Gaps Identified

- [x] **GAP-V01**: spec.md should mention OmniFocus 3.0+ for Calendar API ✅ Fixed
- [x] **GAP-V02**: requirements.md should note version requirements ✅ Fixed
- [x] **GAP-V03**: spec.md should mention `flattenedProjects.filter()` requires OmniFocus 3.0+ ✅ Fixed
- [x] **GAP-WPC-01**: spec.md should explicitly distinguish tool name vs implementation mechanism ✅ Fixed

---

## Code Example Quality

### Complete Examples Present

| Example Type | research.md | spec.md | requirements.md |
|--------------|-------------|---------|-----------------|
| `calculateNextReviewDate()` function | ✅ Complete | ⚠️ Inline | ❌ No |
| `mark_reviewed` primitive | ✅ Complete | ❌ No | ❌ No |
| `get_projects_for_review` primitive | ✅ Complete | ❌ No | ❌ No |
| Unit mapping switch statement | ✅ Yes | ⚠️ Comment only | ❌ No |

### No Misleading Examples

| Check | Status |
|-------|--------|
| No millisecond math in working examples | ✅ Verified |
| All examples use `Calendar.current` | ✅ Verified |
| All examples use `DateComponents` | ✅ Verified |
| No examples call `markReviewed()` | ✅ Verified |
| No examples try to set `lastReviewDate` | ✅ Verified |

---

## Cross-Tool Consistency

### `mark_reviewed` Tool

- [x] Uses Calendar API for date calculation
- [x] Sets `nextReviewDate` (not `markReviewed()`)
- [x] Does NOT attempt to set `lastReviewDate`
- [x] Uses DateComponents unit mapping

### `set_review_interval` Tool

- [x] When `recalculateNextReview: true`, uses Calendar API
- [x] Uses DateComponents for date calculation
- [x] Does NOT attempt to set `lastReviewDate`
- [x] Consistent unit mapping with `mark_reviewed`

### Both Tools

- [x] Same Calendar API pattern
- [x] Same DateComponents usage
- [x] Neither calls non-existent method
- [x] Neither writes to read-only property

---

## Error Prevention

### Explicit Warnings

| Warning | research.md | spec.md | requirements.md |
|---------|-------------|---------|-----------------|
| No `markReviewed()` method | ✅ | ✅ | ✅ |
| `lastReviewDate` read-only | ✅ | ✅ | ✅ |
| Don't use millisecond math | ✅ | ✅ | ✅ |
| Value object semantics | ✅ | ✅ | ✅ |

### Consequences Shown

| Consequence | Documented |
|-------------|------------|
| Millisecond math: wrong dates for months | ✅ research.md |
| Millisecond math: leap year errors | ✅ research.md |
| Millisecond math: DST off-by-one | ✅ research.md |
| Direct property modification: no effect | ✅ requirements.md |

---

## Concrete Test Cases (Added 2025-12-30)

spec.md now includes explicit test case tables with concrete dates:

### Standard Calculations

| Today | Interval | Expected | Documented |
|-------|----------|----------|------------|
| 2025-12-30 | 7 days | 2026-01-06 | ✅ spec.md |
| 2025-12-30 | 1 week | 2026-01-06 | ✅ spec.md |
| 2025-12-30 | 2 months | 2026-02-28 | ✅ spec.md |
| 2025-06-15 | 1 year | 2026-06-15 | ✅ spec.md |
| 2025-12-30 | 3 weeks | 2026-01-20 | ✅ spec.md |

### Month Boundary Edge Cases

| Today | Interval | Expected | Notes | Documented |
|-------|----------|----------|-------|------------|
| 2025-01-31 | 1 month | 2025-02-28 | Clamps to last day | ✅ spec.md |
| 2025-01-30 | 1 month | 2025-02-28 | Feb has no 30th | ✅ spec.md |
| 2025-03-31 | 1 month | 2025-04-30 | April has 30 days | ✅ spec.md |
| 2025-01-31 | 2 months | 2025-03-31 | March has 31st | ✅ spec.md |
| 2025-05-31 | 1 month | 2025-06-30 | June has 30 days | ✅ spec.md |

### Leap Year Edge Cases

| Today | Interval | Expected | Notes | Documented |
|-------|----------|----------|-------|------------|
| 2024-02-29 | 1 year | 2025-02-28 | 2025 not leap | ✅ spec.md |
| 2024-02-29 | 4 years | 2028-02-29 | 2028 is leap | ✅ spec.md |
| 2025-02-28 | 1 year | 2026-02-28 | Normal year to year | ✅ spec.md |
| 2024-01-31 | 1 month | 2024-02-29 | Leap year Feb | ✅ spec.md |

### Year Boundary Edge Cases

| Today | Interval | Expected | Notes | Documented |
|-------|----------|----------|-------|------------|
| 2025-12-15 | 1 month | 2026-01-15 | Year boundary | ✅ spec.md |
| 2025-11-30 | 2 months | 2026-01-30 | Crosses year | ✅ spec.md |
| 2025-12-31 | 1 day | 2026-01-01 | New Year boundary | ✅ spec.md |

---

## Error Handling (Added 2025-12-30)

spec.md now includes error handling documentation:

### New Functional Requirements

| Requirement | Description | Documented |
|-------------|-------------|------------|
| FR-034 | Wrap Calendar API calls in try-catch | ✅ spec.md |
| FR-035 | Surface Calendar API exceptions as structured errors | ✅ spec.md |
| FR-036 | Validate steps is positive integer (≥1) | ✅ spec.md |

### Input Validation (Before Calendar API)

| Scenario | Action | Documented |
|----------|--------|------------|
| `reviewInterval` is null | Return error before Calendar API call | ✅ spec.md |
| `steps` ≤ 0 | Return validation error (FR-036) | ✅ spec.md |
| `unit` not in enum | Return validation error | ✅ spec.md |
| Project not found | Return error before Calendar API call | ✅ spec.md |

### Calendar API Behavior

| Input | Behavior | Documented |
|-------|----------|------------|
| Negative DateComponents (dc.day = -5) | Calendar API handles (subtracts) | ✅ spec.md |
| Zero DateComponents | Returns same date | ✅ spec.md |
| Overflow (far future dates) | JavaScript Date limits apply | ✅ spec.md |

### Code Pattern

```javascript
// Required error handling pattern - now documented in spec.md
try {
  var today = Calendar.current.startOfDay(new Date());
  var dc = new DateComponents();
  // ... set DateComponents ...
  var nextDate = Calendar.current.dateByAddingDateComponents(today, dc);
  project.nextReviewDate = nextDate;
} catch (e) {
  return JSON.stringify({
    success: false,
    error: "Date calculation failed: " + (e.message || String(e))
  });
}
```

---

## Summary

### Current Documentation Status

| Category | Status | Coverage |
|----------|--------|----------|
| API Constraints in research.md | ✅ Complete | 100% |
| API Constraints in spec.md | ✅ Complete | 100% |
| API Constraints in requirements.md | ✅ Complete | 100% |
| Calendar API in research.md | ✅ Complete | 100% |
| Calendar API in spec.md | ✅ Complete | 100% |
| Calendar API in requirements.md | ✅ Complete | 100% |
| Cross-tool consistency | ✅ Complete | 100% |
| Error prevention | ✅ Complete | 100% |
| **Concrete Test Cases in spec.md** | ✅ Complete | 100% |
| **Error Handling in spec.md** | ✅ Complete | 100% |

### Files Now Complete

| File | API Constraints | Calendar API |
|------|-----------------|--------------|
| data-model.md | ✅ Documented | ✅ Documented |
| plan.md | ✅ Documented | ✅ Documented |
| quickstart.md | ✅ Documented | ✅ Documented |
| contracts/*.ts | ✅ Documented | ✅ Documented |

### Gaps Addressed

1. ~~**GAP-V01**: Add OmniFocus 3.0+ version note for Calendar API to spec.md~~ ✅ Fixed
2. ~~**GAP-V02**: Add version requirements to requirements.md~~ ✅ Fixed
3. ~~**GAP-V03**: Add `flattenedProjects.filter()` version requirement to spec.md~~ ✅ Fixed
4. ~~**GAP-WPC-01**: Add explicit tool naming vs implementation distinction to spec.md~~ ✅ Fixed
5. ~~**GAP-TC01**: Add concrete test case examples with specific dates~~ ✅ Fixed (2025-12-30)
6. ~~**GAP-EH01**: Document error handling for Calendar API operations~~ ✅ Fixed (2025-12-30)
7. ~~**GAP-EH02**: Add new functional requirements FR-034, FR-035, FR-036~~ ✅ Fixed (2025-12-30)
8. ~~**Future**: Ensure all pending files include API constraints and Calendar API patterns~~ ✅ Complete (2026-03-16) - All files now document API constraints and Calendar API patterns

### Validation Result

**PASS** ✅ - All documentation comprehensively covers both:

- Critical API constraints (no `markReviewed()`, read-only `lastReviewDate`, workaround pattern)
- Calendar/DateComponents API requirement (with prohibition of millisecond math)

All previously pending files (data-model.md, plan.md, quickstart.md, contracts/*.ts) now exist and include the required Calendar API content. An implementer reading any specification document will understand both constraints clearly.

**Last Validated**: 2026-03-16
