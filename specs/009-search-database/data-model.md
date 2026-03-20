# Data Model: Search & Database

**Feature**: Phase 9 - Search & Database
**Date**: 2026-03-18
**Source**: [spec.md](./spec.md), [research.md](./research.md)

## Overview

This document defines the data entities, relationships, and validation rules
for the Search & Database tools. Search tools share a common result shape per
item type. Database tools are independent with no shared schemas.

---

## Search Tool Entities

### SearchTaskResult (Output)

A task matched by search, with enough context for identification.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | No | Task's unique identifier (`task.id.primaryKey`) |
| `name` | string | No | Task's display name |
| `status` | string | No | Task status: "available", "blocked", "completed", "dropped", "dueSoon", "next", "overdue" |
| `projectName` | string | Yes | Containing project name, "Inbox" if in inbox, null if orphaned |
| `flagged` | boolean | No | Whether the task is flagged |

**Notes:**
- Status is derived from `task.taskStatus` enum, mapped to lowercase strings
- `projectName` uses `task.containingProject.name` or "Inbox" via `task.inInbox`

---

### SearchProjectResult (Output)

A project matched by search, with folder context.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | No | Project's unique identifier |
| `name` | string | No | Project's display name |
| `status` | string | No | Project status: "active", "done", "dropped", "onHold" |
| `folderName` | string | Yes | Parent folder name, null if root-level |

**Notes:**
- Status is derived from `project.status` enum, mapped to strings
- `folderName` uses `project.parentFolder.name`

---

### SearchFolderResult (Output)

A folder matched by search, with parent context.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | No | Folder's unique identifier |
| `name` | string | No | Folder's display name |
| `parentFolderName` | string | Yes | Parent folder name, null if root-level |

---

### SearchTagResult (Output)

A tag matched by search, with parent context.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | string | No | Tag's unique identifier |
| `name` | string | No | Tag's display name |
| `status` | string | No | Tag status: "active", "onHold", "dropped" |
| `parentTagName` | string | Yes | Parent tag name, null if root-level |

---

### SearchInput (Shared Pattern)

All four search tools share the same input shape.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | string | required | Search string (min 1 character) |
| `limit` | number | 50 | Maximum results to return (1-1000) |

**Validation Rules:**
1. `query` must be a non-empty string (min length 1)
2. `limit` must be a positive integer between 1 and 1000 (default 50)

---

### SearchTaskInput (Extended)

Task search adds a status filter to the shared search input.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | string | required | Search string (min 1 character) |
| `limit` | number | 50 | Maximum results to return (1-1000) |
| `status` | enum | "active" | Status filter: "active", "completed", "dropped", "all" |

**Status Filter Mapping (to Task.Status enum):**
- `"active"` → Available, Blocked, DueSoon, Next, Overdue
- `"completed"` → Completed
- `"dropped"` → Dropped
- `"all"` → no filter applied

---

### SearchSuccessResponse (Shared Pattern)

All four search tools return the same response envelope.

| Field | Type | Description |
|-------|------|-------------|
| `success` | true | Literal true |
| `results` | Array | Array of result items (type varies by tool) |
| `totalMatches` | number | Total number of matches before limit applied |

---

### SearchErrorResponse (Shared Pattern)

| Field | Type | Description |
|-------|------|-------------|
| `success` | false | Literal false |
| `error` | string | Error message |

---

## Database Tool Entities

### DatabaseStatsResult (Output)

Aggregate statistics about the OmniFocus database.

| Field | Type | Description |
|-------|------|-------------|
| `tasks` | TaskStats | Task counts by status |
| `projects` | ProjectStats | Project counts by status |
| `folders` | number | Total folder count |
| `tags` | number | Total tag count |
| `inbox` | number | Number of items in inbox |

#### TaskStats

| Field | Type | Description |
|-------|------|-------------|
| `available` | number | Available + DueSoon + Next + Overdue |
| `blocked` | number | Blocked tasks |
| `completed` | number | Completed tasks |
| `dropped` | number | Dropped tasks |
| `total` | number | Sum of all categories |

#### ProjectStats

| Field | Type | Description |
|-------|------|-------------|
| `active` | number | Active projects |
| `onHold` | number | On Hold projects |
| `completed` | number | Completed (Done) projects |
| `dropped` | number | Dropped projects |
| `total` | number | Sum of all categories |

---

### InboxCountResult (Output)

| Field | Type | Description |
|-------|------|-------------|
| `success` | true | Literal true |
| `count` | number | Number of inbox items |

---

### UndoRedoResult (Output)

| Field | Type | Description |
|-------|------|-------------|
| `success` | true | Literal true |
| `performed` | boolean | True if operation was executed, false if stack was empty |
| `canUndo` | boolean | Post-operation undo availability |
| `canRedo` | boolean | Post-operation redo availability |

When `performed` is false, the operation was a no-op because the stack was empty.
This is a success response, not an error — matches FR-012.

---

### SimpleSuccessResult (Output)

Used by `save_database` and `cleanup_database`.

| Field | Type | Description |
|-------|------|-------------|
| `success` | true | Literal true |

---

### SimpleErrorResult (Output)

Used by all database tools on failure.

| Field | Type | Description |
|-------|------|-------------|
| `success` | false | Literal false |
| `error` | string | Error message |

---

## Tool-to-Entity Mapping

| Tool | Input Entity | Success Output Entity |
|------|-------------|----------------------|
| `search_tasks` | SearchTaskInput | SearchSuccessResponse<SearchTaskResult> |
| `search_projects` | SearchInput | SearchSuccessResponse<SearchProjectResult> |
| `search_folders` | SearchInput | SearchSuccessResponse<SearchFolderResult> |
| `search_tags` | SearchInput | SearchSuccessResponse<SearchTagResult> |
| `get_database_stats` | (none) | DatabaseStatsResult |
| `get_inbox_count` | (none) | InboxCountResult |
| `save_database` | (none) | SimpleSuccessResult |
| `cleanup_database` | (none) | SimpleSuccessResult |
| `undo` | (none) | UndoRedoResult |
| `redo` | (none) | UndoRedoResult |
