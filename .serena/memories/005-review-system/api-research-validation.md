# Phase 5 Review System - API Research Validation (2026-03-16)

## Validated Against omni-automation.com

### Property Writability

- `nextReviewDate` (Date | null): **WRITABLE** - Confirmed. Primary mechanism for "marking reviewed"
- `lastReviewDate` (Date | null): **READ-ONLY** - Confirmed. OmniFocus updates automatically
- `reviewInterval` (Project.ReviewInterval | null): **WRITABLE** - Value object semantics

### No markReviewed() Method

Confirmed: No such method exists. Must set `nextReviewDate` directly.

### ReviewInterval Structure

- Type: `Project.ReviewInterval` or null
- Properties: `steps` (Number), `unit` (String: 'days'|'weeks'|'months'|'years')
- Value object: Must reassign entire object; property mutation on returned copy has no effect

### Calendar API: Fully Available

- `Calendar.current.startOfDay(date)` - returns midnight
- `Calendar.current.dateByAddingDateComponents(date, dc)` - adds components
- `new DateComponents()` with: day, month, year, hour, minute, second (NO week property; use day = steps * 7)

### flattenedProjects

- Returns ProjectArray (flat array of all projects)
- Supports `.filter()`, `.forEach()`, `.map()`, `.byName()`

### Project.Status Enum

- `Active`, `OnHold`, `Done`, `Dropped`
- `Project.Status.all` - array of all values

### Key Discrepancy: Phase 4 vs Phase 5 Research

Phase 4 research.md lists `nextReviewDate` as READ-ONLY (line 58).
Phase 5 research corrected this to WRITABLE. The official docs page may categorize it under read-only properties, but it IS settable via scripts.
