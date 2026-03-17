# Data Model: Review System

**Feature**: Phase 5 - Review System
**Date**: 2025-12-30
**Source**: [spec.md](./spec.md), [research.md](./research.md)

## Overview

This document defines the data entities, relationships, and validation rules
for the Review System tools. All entities map to OmniFocus Omni Automation
API objects.

---

## Entity Definitions

### ReviewInterval (Value Object)

Represents the cadence for project reviews. This is a **value object** with
special semantics in OmniJS.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `steps` | number | Integer, >= 1 | Count of time units |
| `unit` | string | Enum: 'days', 'weeks', 'months', 'years' | Time unit type |

**Value Object Semantics:**

```javascript
// ❌ WRONG - Modifying properties doesn't affect OmniFocus
project.reviewInterval.steps = 2;  // Local copy only

// ✅ CORRECT - Must reassign entire object
project.reviewInterval = { steps: 2, unit: 'weeks' };
```

**Null Handling:**
- `reviewInterval: null` indicates project has no review schedule
- Projects with `null` reviewInterval are excluded from review queries

**Zod Schema:** Reuse `ReviewIntervalSchema` from `project-tools/shared/project.ts`

---

### ReviewProjectSummary (Projection)

Optimized projection for review list responses. Contains only fields needed
for review workflow decisions.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | No | Project's unique identifier (primaryKey) |
| `name` | string | No | Project's display name |
| `status` | ProjectStatus | No | Current project status |
| `flagged` | boolean | No | Flagged indicator for high-priority projects |
| `reviewInterval` | ReviewInterval | Yes | Configured review schedule |
| `lastReviewDate` | string (ISO 8601) | Yes | When last reviewed (READ-ONLY) |
| `nextReviewDate` | string (ISO 8601) | Yes | When next review is due |
| `remainingCount` | number | No | Count of incomplete tasks in project |

**Field Notes:**

- `nextReviewDate`: WRITABLE via scripts. This is the mechanism for "marking reviewed"
- `lastReviewDate`: READ-ONLY. OmniFocus updates this automatically when user marks
  reviewed in the app UI. Scripts cannot set this value.
- `status`: One of 'Active', 'OnHold', 'Done', 'Dropped'

**Sort Order:**
Results sorted by `nextReviewDate` ascending (most overdue first), then by `name`
alphabetically as secondary sort.

---

### ProjectIdentifier (Input)

Identifies a project for single or batch operations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Conditional | Project's OmniFocus ID (preferred — direct lookup) |
| `name` | string | Conditional | Project's display name (fallback — may require disambiguation) |

**Validation Rules:**

1. At least one of `id` or `name` must be a non-empty string
2. If both provided, `id` takes precedence
3. Name lookups that match multiple projects return disambiguation error

---

### ReviewBatchItemResult (Output)

Per-item result for batch operations.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `projectId` | string | No | Resolved project ID (or input if lookup failed) |
| `projectName` | string | No | Project name (empty string if lookup failed) |
| `success` | boolean | No | Whether operation succeeded for this item |
| `error` | string | Yes | Error message (only when `success: false`) |
| `code` | string | Yes | Error code (see table below) |
| `candidates` | Array<{id, name}> | Yes | Matching projects for disambiguation |
| `previousNextReviewDate` | string (ISO 8601) | Yes | Previous nextReviewDate (mark_reviewed success only) |
| `newNextReviewDate` | string (ISO 8601) | Yes | New nextReviewDate (mark_reviewed success only) |
| `previousInterval` | ReviewInterval | Yes | Previous interval (set_review_interval success only) |
| `newInterval` | ReviewInterval | Yes | New interval (set_review_interval success only) |

**Error Codes:**

| Code | Meaning |
|------|---------|
| `NOT_FOUND` | Project ID or name not found |
| `DISAMBIGUATION_REQUIRED` | Name matches multiple projects |
| `NO_REVIEW_INTERVAL` | Project has no review interval configured (mark_reviewed) |
| `INVALID_INTERVAL` | Invalid interval parameters (set_review_interval) |

---

## State Transitions

### Project Review States

```text
┌─────────────┐    mark_reviewed()    ┌─────────────┐
│   Overdue   │ ─────────────────────>│   Upcoming  │
│ (past date) │                       │ (future)    │
└─────────────┘                       └─────────────┘
       ▲                                     │
       │                                     │
       │         time passes                 │
       └─────────────────────────────────────┘

┌─────────────────┐
│   No Schedule   │  ← reviewInterval: null
│ (excluded)      │
└─────────────────┘
       │
       │ set_review_interval(interval)
       ▼
┌─────────────────┐
│   Scheduled     │  ← Has reviewInterval
│ (in workflow)   │
└─────────────────┘
```

### Review Date Calculation

When `mark_reviewed` is called:

```text
today = Calendar.current.startOfDay(new Date())
nextReviewDate = today + reviewInterval

Example:
  today = 2025-12-30
  reviewInterval = { steps: 2, unit: 'weeks' }
  nextReviewDate = 2026-01-13
```

**Edge Cases (Calendar API handles automatically):**

| Today | Interval | Result | Notes |
|-------|----------|--------|-------|
| Jan 31 | 1 month | Feb 28 | Clamps to last day of month |
| Feb 29 | 1 year | Feb 28 (non-leap) | Clamps to Feb 28 |
| Dec 30 | 7 days | Jan 6 | Year boundary handled |

---

## Validation Rules

### get_projects_for_review Input

| Field | Type | Default | Validation | Error |
|-------|------|---------|------------|-------|
| `includeFuture` | boolean | `false` | - | - |
| `futureDays` | number | `7` | >= 1, integer | "Invalid futureDays: {value}. Must be >= 1" |
| `includeAll` | boolean | `false` | - | - |
| `includeInactive` | boolean | `false` | - | - |
| `folderId` | string | - | Must exist if provided | "Folder not found: {folderId}" |
| `folderName` | string | - | Exact match, must exist if provided | "Folder not found: {folderName}" |
| `limit` | number | `100` | 1-1000, integer | "Invalid limit: {value}. Must be between 1 and 1000" |

**Filter descriptions:**

- `includeFuture`: When true, also includes projects due within `futureDays`. Ignored when `includeAll=true`.
- `futureDays`: Look-ahead window in days (only used when `includeFuture=true`). Boundary is inclusive.
- `includeAll`: Return all reviewable projects regardless of review date. Overrides date-based filtering (`includeFuture`/`futureDays` ignored). Folder and status filters still apply.
- `includeInactive`: When false (default), excludes projects with status Done or Dropped. On Hold is always included (not considered inactive).
- `folderId`/`folderName`: Restricts to projects within a specific folder (includes nested subfolders recursively). `folderId` takes precedence if both provided.

### mark_reviewed Input

| Field | Validation | Error |
|-------|------------|-------|
| `projects` | Array of ProjectIdentifier, min 1, max 100 | - |
| Each item `.id` | Must exist if provided | "Project not found: {identifier}" |
| Each item `.name` | Must be unique if used | "Multiple projects match '{name}'. Use ID for precision." |
| Project state | Must have reviewInterval | "Project '{name}' has no review interval configured" |

### set_review_interval Input

| Field | Validation | Error |
|-------|------------|-------|
| `interval.steps` | >= 1, <= 365, integer | "Invalid interval steps: must be a positive integer (1-365)" |
| `interval.unit` | Enum member | "Invalid interval unit: '{unit}'. Must be one of: days, weeks, months, years" |
| `interval` | null allowed | (No error - disables reviews) |

---

## Relationships

```text
┌──────────────────────┐
│       Project        │
├──────────────────────┤
│ id: string           │
│ name: string         │
│ status: ProjectStatus│
│ reviewInterval?      │──────┐
│ nextReviewDate?      │      │
│ lastReviewDate?      │      │
│ parentFolder?        │      │
└──────────────────────┘      │
         │                    │
         │ contains           │ 1:1
         ▼                    ▼
┌──────────────────────┐  ┌──────────────────────┐
│       Folder         │  │   ReviewInterval     │
├──────────────────────┤  ├──────────────────────┤
│ id: string           │  │ steps: number        │
│ name: string         │  │ unit: ReviewUnit     │
└──────────────────────┘  └──────────────────────┘
```

---

## API Response Formats

### get_projects_for_review Response

```typescript
// Success
{
  success: true,
  projects: ReviewProjectSummary[],
  totalCount: number,      // Count BEFORE limit applied
  dueCount: number,        // Projects where nextReviewDate <= today
  upcomingCount: number    // Projects where nextReviewDate > today
}

// Error
{
  success: false,
  error: string
}
```

### mark_reviewed Response

```typescript
// Success (batch — always returns array)
{
  success: true,
  results: MarkReviewedItemResult[],  // Per-project results at original indices
  summary: {
    total: number,
    succeeded: number,
    failed: number
  }
}

// Error (catastrophic — e.g., OmniFocus unreachable)
{
  success: false,
  error: string
}
```

### set_review_interval Response

```typescript
// Success (batch — always returns array)
{
  success: true,
  results: SetReviewIntervalItemResult[],  // Per-project results at original indices
  summary: {
    total: number,
    succeeded: number,
    failed: number
  }
}

// Error (catastrophic — e.g., OmniFocus unreachable)
{
  success: false,
  error: string
}
```

---

## OmniJS Object Mapping

| TypeScript Type | OmniJS Property | Notes |
|-----------------|-----------------|-------|
| `ReviewProjectSummary.id` | `project.id.primaryKey` | UUID string |
| `ReviewProjectSummary.name` | `project.name` | String |
| `ReviewProjectSummary.nextReviewDate` | `project.nextReviewDate?.toISOString()` | Date or null |
| `ReviewProjectSummary.lastReviewDate` | `project.lastReviewDate?.toISOString()` | READ-ONLY |
| `ReviewProjectSummary.reviewInterval` | `project.reviewInterval` | Value object |
| `ReviewProjectSummary.status` | `project.status.name` | Enum name |
| `ProjectStatus` | `Project.Status.*` | Active, OnHold, Done, Dropped |
