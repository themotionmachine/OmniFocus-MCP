# OmniFocus MCP Server — Remaining Phases Master Plan

**Complete the OmniFocus MCP Server from 28 to 86 tools by implementing Phases 6-20.**

This document defines the specification roadmap for all remaining work. Each specification is executed end-to-end through the SpecKit workflow (specify → clarify → plan → checklist → tasks → analyze → implement) before moving to the next.

**Branch:** Feature branches per spec (`006-notifications`, `007-repetition`, etc.)
**Tracker:** [README Roadmap](../../README.md#development-roadmap)

---

## Table of Contents

1. [Roadmap Overview](#roadmap-overview)
2. [Dependency Graph](#dependency-graph)
3. [Progress Tracking](#progress-tracking)
4. [Specification Sections](#specification-sections)
5. [Environment & Deployment Context](#environment--deployment-context)

---

## Roadmap Overview

The remaining work is decomposed into **15 specifications** across **5 dependency tiers**:

| Tier | Specs | Purpose | Parallelization |
|------|-------|---------|-----------------|
| **1** | SPEC-006, SPEC-007, SPEC-013 | Task/project property extensions (notifications, repetition, status) | All 3 parallel |
| **2** | SPEC-008, SPEC-009, SPEC-011 | Data access & views (perspectives, search, attachments) | All 3 parallel |
| **3** | SPEC-010, SPEC-012, SPEC-014 | Bulk ops, interop, UI control | All 3 parallel |
| **4** | SPEC-015, SPEC-016-017, SPEC-018-019 | App-level features (forecast, settings, URLs, pasteboard, sync) | All 3 parallel |
| **5** | SPEC-020, SPEC-021 | Server optimization + plugin packaging | Sequential — SPEC-020 depends on ALL above, SPEC-021 depends on SPEC-020 |

**Total:** 59 new tools + plugin architecture across 14 specs (28 existing → 87 total tools + skills + hooks)

> **Note on tool count**: The v2 plan lists 86 tools total. However, 6 legacy tools (`query_omnifocus`, `dump_database`, `add_omnifocus_task`, `add_project`, `remove_item`, `edit_item`) were not counted in phases 0-5 but exist in the codebase. SPEC-020 was revised from 8 to 3 tools after discovering that Claude Code's built-in Tool Search makes custom discovery tools redundant (see SPEC-020 revision notes).

**Execution Order:** Tiers 1-4 are all independent of each other. The recommended order below is based on value, risk, and logical grouping — not strict dependencies. Within each tier, all specs can run in parallel.

**Dependency Constraints:**

- SPEC-006 through SPEC-019: All depend only on Phases 0-5 (complete). No cross-spec dependencies.
- SPEC-020: Depends on ALL other specs (must know the final tool set to optimize).
- SPEC-021: Depends on SPEC-020 (plugin packages the optimized server). However, plugin scaffolding (directory structure, manifest) can begin earlier.
- Phase 8 (Perspectives) has 2 existing legacy tools (`list_perspectives`, `get_perspective_view`) that will be enhanced — not created from scratch.

---

## Dependency Graph

```text
═══════════════════════════════════════════════════════════════════
  FOUNDATION (Complete: Phases 0-5 + 7 + 13, 39 tools)
  Folders │ Tags │ Tasks │ Projects │ Review │ Repetition │ Status
═══════════════════════════════════════════════════════════════════
    │
    ├──► TIER 1 (All parallel — Task/Project Property Extensions)
    │    ├── SPEC-006: Notifications (5 tools)
    │    ├── SPEC-007: Repetition (5 tools)
    │    └── SPEC-013: Task Status & Completion (6 tools)
    │
    ├──► TIER 2 (All parallel — Data Access & Views)
    │    ├── SPEC-008: Perspectives (5 tools)
    │    ├── SPEC-009: Search & Database (10 tools)
    │    └── SPEC-011: Attachments & Linked Files (5 tools)
    │
    ├──► TIER 3 (All parallel — Bulk, Interop, UI)
    │    ├── SPEC-010: Bulk Operations (6 tools)
    │    ├── SPEC-012: TaskPaper Import/Export (3 tools)
    │    └── SPEC-014: Window & UI Control (8 tools, OF4+)
    │
    ├──► TIER 4 (All parallel — App-Level Features)
    │    ├── SPEC-015: Forecast (3 tools)
    │    ├── SPEC-016-017: Settings & Deep Links (5 tools)
    │    └── SPEC-018-019: Pasteboard & Document/Sync (7 tools)
    │
    └──► TIER 5 (Sequential — Optimization + Plugin Packaging)
         ├── SPEC-022: OmniJS Response Validation (0 new tools, refactor)
         │      │  Can run in parallel with SPEC-020
         ├── SPEC-020: Server Optimization (3 tools + infrastructure)
         │      │
         └── SPEC-021: Plugin & Skills Architecture (0 MCP tools,
                │       6+ skills, 2 agents, hooks, plugin manifest)
                │
         ═══ PROJECT COMPLETE (87 tools + GTD skill suite) ═══
```

> **Why tiers if everything is parallel?** Tiers represent recommended execution order based on value and risk. Tier 1 tools (status, notifications, repetition) are the most commonly needed by GTD users. Tier 5 must genuinely be last.
>
> **Why SPEC-021 after SPEC-020?** The plugin packages the optimized server. SPEC-020 implements toolset grouping and response optimization that make the MCP server context-efficient. SPEC-021 then wraps it in a plugin with GTD workflow skills that orchestrate the MCP tools. However, plugin scaffolding (directory structure, manifest) can begin in parallel with SPEC-020.

---

## Progress Tracking

| Spec | Name | Tools | Status | Spec Dir | Next Phase |
|------|------|-------|--------|----------|------------|
| SPEC-006 | Notifications | 5 | ✅ Complete | `specs/006-notifications/` | Merged ([PR #40](https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/40)) |
| SPEC-007 | Repetition | 5 | ✅ Complete | `specs/007-repetition-rules/` | Merged ([PR #38](https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/38)) |
| SPEC-013 | Task Status & Completion | 6 | ✅ Complete | `specs/013-task-status/` | Merged ([PR #39](https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/39)) |
| SPEC-008 | Perspectives | 5 | ⏳ Pending | `specs/008-perspectives/` | Specify |
| SPEC-009 | Search & Database | 10 | ⏳ Pending | `specs/009-search-database/` | Specify |
| SPEC-011 | Attachments & Linked Files | 5 | ✅ Complete | `specs/011-attachments/` | Merged ([PR #43](https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/43)) |
| SPEC-010 | Bulk Operations | 6 | ✅ Complete | `specs/010-bulk-operations/` | Merged ([PR #44](https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/44)) |
| SPEC-012 | TaskPaper Import/Export | 3 | ⏳ Pending | `specs/012-taskpaper/` | Specify |
| SPEC-014 | Window & UI Control | 8 | 🔄 In Progress | `specs/014-window-ui/` | PR Review ([PR #45](https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/45)) |
| SPEC-015 | Forecast | 3 | ⏳ Pending | `specs/015-forecast/` | Specify |
| SPEC-016-017 | Settings & Deep Links | 5 | ⏳ Pending | `specs/016-settings-deeplinks/` | Specify |
| SPEC-018-019 | Pasteboard & Document/Sync | 7 | ⏳ Pending | `specs/018-pasteboard-sync/` | Specify |
| SPEC-020 | Server Optimization | 3 | ⏳ Pending | `specs/020-server-optimization/` | Blocked by all |
| SPEC-021 | Plugin & Skills Architecture | 0 tools + 6 skills | ⏳ Pending | `specs/021-plugin-skills/` | Depends on SPEC-020 |
| SPEC-022 | OmniJS Response Validation | 0 (refactor) | ⏳ Pending | `specs/022-response-validation/` | Parallel with SPEC-020 |

**Status Legend:** ⏳ Pending | 🔄 In Progress | ✅ Complete | ⚠️ Blocked

---

## Specification Sections

### SPEC-006: Notifications ✅ COMPLETE

**Priority:** P2 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None

**Goal:** Provide full notification management for OmniFocus tasks — list, add (absolute/relative), remove, preset-based, and snooze.

**Scope:**

- 5 MCP tools: `list_notifications`, `add_notification`, `remove_notification`, `add_standard_notifications`, `snooze_notification`
- Zod contracts in `src/contracts/notification-tools/` for all 5 tools with shared schemas (TaskIdentifier, NotificationOutput discriminated union)
- OmniJS primitives accessing `task.notifications`, `task.addNotification(dateOrOffset)`, `task.removeNotification(notificationObject)`
- `add_notification` supports both absolute dates (ISO 8601) and relative offsets (seconds before due). **Note:** `relativeFireOffset` and `addNotification(Number)` both use **seconds** (confirmed via e2e integration tests against live OmniFocus).
- `add_standard_notifications` provides presets: `day_before` (-86400s), `hour_before` (-3600s), `15_minutes` (-900s), `week_before` (-604800s), `standard` (day + hour)
- `snooze_notification` sets `absoluteFireDate` on Absolute notifications only; pre-validates dates at TypeScript and OmniJS layers
- `list_notifications` returns `NotificationKind` (Absolute, DueRelative, DeferRelative, Unknown) with kind-conditional fields, fire dates, snooze status, repeat interval
- Full TDD: 240 contract + unit tests, 21 e2e integration tests against live OmniFocus

**Out of Scope:**

- Notification repeat interval editing (complex; defer to future enhancement)
- Push notification integration (platform limitation — OmniJS controls in-app alerts only)
- Creating DeferRelative notifications (OmniFocus manages these internally)

**Key Decisions:**

- `remove_notification` takes an index in the MCP contract, but internally must retrieve the notification object via `task.notifications[index]` and pass it to `task.removeNotification(notificationObject)`. The OmniJS API does NOT accept an index directly.
- Relative notifications use negative **seconds** offset from due date (OmniFocus convention). Confirmed via e2e tests: `-3600` = 1 hour before due.
- `Task.Notification.Kind` has 4 values: `Absolute`, `DueRelative`, `DeferRelative`, `Unknown`. DeferRelative exists at runtime but is NOT in official enum listing — defensive runtime detection used.
- Invalid Date pre-validation at both TypeScript (`Number.isNaN(date.getTime())`) and OmniJS layers, since the JSC→NSDate bridge doesn't validate Date validity.

**Key Files:**

- `src/contracts/notification-tools/` — Zod contracts (5 files + shared schemas)
- `src/tools/primitives/` — 5 primitives with OmniJS script generation
- `src/tools/definitions/` — 5 MCP tool handlers
- `tests/contract/notification-tools/` — 6 contract test files
- `tests/unit/notification-tools/` — 5 unit test files
- `tests/integration/notification-tools/notification-workflow.integration.test.ts` — 21 e2e tests

---

### SPEC-007: Repetition ✅ COMPLETE

**Priority:** P2 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None
**Completed:** 2026-03-17 | **PR:** [#38](https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/38) | **Branch:** `worktree-007-repetition`

**Goal:** Provide full repetition rule management using ICS (iCalendar) format rules with OmniFocus v4.7+ enhanced schedule types.

**Delivered:**

- 5 MCP tools: `get_repetition`, `set_repetition`, `clear_repetition`, `set_common_repetition`, `set_advanced_repetition`
- 16 new source files (5 contracts + 3 shared schemas + 5 primitives + 5 definitions)
- 292 new tests (contract + unit) + 12 integration tests
- Total: 2216 tests across 101 test files (was 1924 across 90)
- Full TDD red-green-refactor across 8 phases (58 tasks)

**Key Implementation Details:**

- ICS rules are opaque pass-through strings — OmniFocus is the validation authority
- Legacy 2-param `Task.RepetitionRule` constructor for basic tools (all versions)
- 5-param constructor for `set_advanced_repetition` (v4.7+ only, version-gated)
- Read-then-merge pattern for advanced tool (c-command.com proven pattern)
- `set_common_repetition` generates ICS strings server-side in TypeScript (8 presets)
- OmniJS enums parsed via `enumName()` helper (`.name` undefined for repetition enums; `String()` returns `"EnumType: Value]"`)
- `z.union()` for get_repetition response (Zod 4.x dual-discriminator workaround)

**Key Files:**

- `src/contracts/repetition-tools/` — Zod contracts (5 files + shared schemas)
- `src/tools/primitives/getRepetition.ts`, `setRepetition.ts`, `clearRepetition.ts`, `setCommonRepetition.ts`, `setAdvancedRepetition.ts`
- `src/tools/definitions/` — matching definition files
- `tests/unit/repetition-tools/`, `tests/contract/repetition-tools/`, `tests/integration/repetition-tools/`

---

### SPEC-013: Task Status & Completion ✅

**Priority:** P1 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None | **Status:** Complete ([PR #39](https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/39))

**Goal:** Provide explicit task/project lifecycle operations — complete, incomplete, drop, project type configuration, next task retrieval, and timezone handling.

**Scope:**

- 6 MCP tools: `mark_complete`, `mark_incomplete`, `drop_items`, `set_project_type`, `get_next_task`, `set_floating_timezone`
- Zod contracts in `src/contracts/status-tools/`
- `mark_complete` calls `task.markComplete(date?)` or `project.markComplete()` — optional completion date parameter
- `mark_incomplete` calls `task.markIncomplete()` — reopens completed/dropped items
- `drop_items` calls OmniJS v3.8+ `drop(allOccurrences)` — distinct from delete (preserves item, marks as dropped)
- `set_project_type` configures `sequential`, `containsSingletonActions` flags — handles mutual exclusion (containsSingletonActions wins, matching Phase 4 pattern)
- `get_next_task` reads `project.nextTask` — returns next available task in sequential project
- `set_floating_timezone` sets `shouldUseFloatingTimeZone` on tasks/projects — controls whether dates follow device timezone
- Batch support for `mark_complete`, `mark_incomplete`, `drop_items` (1-100 items per call, following Phase 5 batch pattern)
- Per-item success/failure results with structured error codes

**Out of Scope:**

- Task status querying (already handled by `list_tasks` status filter from Phase 3)
- Project status changes (already handled by `edit_project` from Phase 4)

**Key Decisions:**

- `drop_items` uses v3.8+ API. Version detection required with clear error for older OmniFocus.
- `set_project_type` follows the Phase 4 mutual exclusion pattern: if both sequential and containsSingletonActions are true, containsSingletonActions wins.

**Key Files:**

- `src/contracts/status-tools/` — Zod contracts (6 files + shared batch schemas)
- `src/tools/primitives/markComplete.ts`, `markIncomplete.ts`, `dropItems.ts`, `setProjectType.ts`, `getNextTask.ts`, `setFloatingTimezone.ts`
- `src/tools/definitions/` — matching definition files
- `tests/unit/status-tools/`, `tests/contracts/status-tools/`

---

### SPEC-008: Perspectives

**Priority:** P2 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None

**Goal:** Provide full perspective management — list (built-in + custom), get details with filter rules, switch active perspective, export configuration, and set icon color.

**Scope:**

- 5 MCP tools: `list_perspectives` (enhanced), `get_perspective` (enhanced), `switch_perspective`, `export_perspective`, `set_perspective_icon`
- Zod contracts in `src/contracts/perspective-tools/`
- `list_perspectives` enhances existing legacy tool — adds `Perspective.Custom.all` enumeration with identifier, filter rules
- `get_perspective` enhances existing `get_perspective_view` — uses `Perspective.Custom.all` filtered by name (no `byName()` method exists), returns perspective metadata + filter rule configuration (`archivedFilterRules` JSON, `archivedTopLevelFilterAggregation`)
- `switch_perspective` sets `document.windows[0].perspective` — changes the active perspective in the UI (platform warning: this changes what the user sees)
- `export_perspective` calls `fileWrapper()` on custom perspectives — returns exportable config. Also has `writeFileRepresentationIntoDirectory(parentURL)` for direct file save.
- `set_perspective_icon` sets `iconColor` property — **UNVERIFIED**: `iconColor` is not documented in official OmniAutomation docs. Must verify existence in OmniFocus Script Editor before implementing. May need to be dropped from scope.
- **Migration**: Deprecate or redirect legacy `list_perspectives`/`get_perspective_view` definitions to new implementations
- Built-in perspectives: Inbox, Projects, Tags, Forecast, Flagged, Review, Nearby (iOS), Search

**Out of Scope:**

- Creating custom perspectives programmatically (OmniJS limitation — perspectives are created via UI only)
- Editing perspective filter rules (complex JSON format, defer to future enhancement)

**Key Decisions:**

**Legacy Tool Migration Decision (2026-03-17):** The existing `list_perspectives` and `get_perspective_view` tools in `src/tools/definitions/` and `src/tools/primitives/` predate the definitions/primitives/contracts architecture. They will be replaced with new implementations following the current architecture pattern, and the old files will be removed.
Alternatives considered: Wrapping old implementations in new contracts was rejected because the old code doesn't follow current patterns and would create maintenance debt.

**Key Files:**

- `src/contracts/perspective-tools/` — Zod contracts (5 files + shared schemas)
- `src/tools/primitives/listPerspectives.ts` (new, replaces legacy), `getPerspective.ts`, `switchPerspective.ts`, `exportPerspective.ts`, `setPerspectiveIcon.ts`
- `src/tools/definitions/` — matching definition files (replace legacy)
- `tests/unit/perspective-tools/`, `tests/contracts/perspective-tools/`

---

### SPEC-009: Search & Database

**Priority:** P1 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None

**Goal:** Provide smart search across all item types (Quick Open-style matching) and essential database operations (cleanup, undo/redo, save, stats, inbox count).

**Scope:**

- 10 MCP tools split into two groups:
  - **Search** (4): `search_tasks`, `search_projects`, `search_folders`, `search_tags`
  - **Database** (6): `cleanup_database`, `undo`, `redo`, `save_database`, `get_database_stats`, `get_inbox_count`
- Zod contracts in `src/contracts/search-tools/` and `src/contracts/database-tools/`
- Search tools use iteration + string matching (OmniJS has `projectsMatching(query)` for projects but no universal search API) — implement consistent fuzzy/substring matching across all item types
- `cleanup_database` calls `cleanUp()` — processes inbox items
- `undo`/`redo` use `document.undo()`, `document.redo()` with `canUndo`/`canRedo` checks
- `save_database` calls `document.save()` — triggers sync
- `get_database_stats` returns comprehensive counts (tasks by status, projects by status, folder count, tag count, inbox count)
- `get_inbox_count` is a lightweight `inbox.length` call for quick checks
- Search results include relevance scoring and limit parameter (default 50)

**Out of Scope:**

- Full-text search in notes (performance concern for large databases — defer to Phase 20 optimization)
- Semantic/vector search (no embedding infrastructure)

**Key Decisions:**

- Search matching strategy: Substring match (case-insensitive) rather than fuzzy matching. OmniJS `projectsMatching()` already does this for projects; replicate pattern for tasks/folders/tags using `flattenedX.filter()`.
- `undo`/`redo` are destructive operations. Tool descriptions must clearly warn AI assistants about irreversibility.

**Key Files:**

- `src/contracts/search-tools/` — Zod contracts for 4 search tools
- `src/contracts/database-tools/` — Zod contracts for 6 database tools
- `src/tools/primitives/searchTasks.ts`, `searchProjects.ts`, `searchFolders.ts`, `searchTags.ts`
- `src/tools/primitives/cleanupDatabase.ts`, `undo.ts`, `redo.ts`, `saveDatabase.ts`, `getDatabaseStats.ts`, `getInboxCount.ts`
- `src/tools/definitions/` — matching definition files
- `tests/unit/search-tools/`, `tests/unit/database-tools/`, `tests/contracts/`

---

### SPEC-011: Attachments & Linked Files

**Priority:** P3 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None

**Goal:** Provide attachment and linked file management for tasks — list embedded attachments, add/remove attachments via FileWrapper, and manage external file bookmarks.

**Scope:**

- 5 MCP tools: `list_attachments`, `add_attachment`, `remove_attachment`, `list_linked_files`, `add_linked_file`
- Zod contracts in `src/contracts/attachment-tools/`
- `list_attachments` reads `task.attachments` — returns FileWrapper metadata (name, size, type)
- `add_attachment` creates a FileWrapper from base64-encoded data or file path and calls `task.addAttachment()`
- `remove_attachment` calls `task.removeAttachmentAtIndex(index)` — index-based removal
- `list_linked_files` reads `task.linkedFileURLs` — returns external file bookmark URLs
- `add_linked_file` calls `task.addLinkedFileURL(url)` — adds macOS file bookmark. **macOS only** — throws error on iOS per official docs. URL must use `file://` scheme.
- Base64 encoding/decoding for attachment data transfer over MCP JSON protocol
- Size limits: Warn for attachments > 10MB (OmniFocus Sync performance concern)

**Out of Scope:**

- Attachment content extraction/preview (beyond scope of MCP text protocol)
- Linked file URL resolution/validation (file system access beyond OmniJS scope)

**Key Decisions:**

- Attachment data transfers as base64 over MCP. This is necessary because MCP uses JSON text, but limits practical attachment size.
- `remove_attachment` uses index, not name, since multiple attachments can share the same filename.

**Key Files:**

- `src/contracts/attachment-tools/` — Zod contracts (5 files + shared schemas)
- `src/tools/primitives/listAttachments.ts`, `addAttachment.ts`, `removeAttachment.ts`, `listLinkedFiles.ts`, `addLinkedFile.ts`
- `src/tools/definitions/` — matching definition files
- `tests/unit/attachment-tools/`, `tests/contracts/attachment-tools/`

---

### SPEC-010: Bulk Operations ✅ COMPLETE

**Priority:** P2 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None

**Goal:** Provide powerful bulk operations — move/duplicate tasks and sections, convert tasks to projects, and batch update task properties.

**Scope:**

- 6 MCP tools: `move_tasks`, `duplicate_tasks`, `convert_tasks_to_projects`, `move_sections`, `duplicate_sections`, `batch_update_tasks`
- Zod contracts in `src/contracts/bulk-tools/`
- `move_tasks` calls `moveTasks(tasks, position)` — moves multiple tasks to a target location (project, inbox, or parent task) with position control
- `duplicate_tasks` calls `duplicateTasks(tasks, position)` — copies tasks with all properties to a new location
- `convert_tasks_to_projects` calls `convertTasksToProjects(tasks, folder)` — promotes tasks to top-level projects, preserving subtasks as project tasks
- `move_sections` calls `moveSections(sections, position)` — moves folders/projects in the hierarchy
- `duplicate_sections` calls `duplicateSections(sections, position)` — duplicates folders/projects with all contents
- `batch_update_tasks` iterates tasks and sets multiple properties (flagged, dueDate, deferDate, tags, etc.) in a single operation
- All tools accept arrays of IDs (1-100 items) with per-item success/failure results
- Position parameter follows established pattern: `{ placement: 'beginning'|'ending'|'before'|'after', relativeTo?: string }`

**Out of Scope:**

- Cross-database operations (single OmniFocus database only)
- Undo grouping for bulk operations (OmniJS limitation — each item modification is a separate undo step)

**Key Decisions:**

- `batch_update_tasks` is a "wide" tool — accepts any combination of updatable properties. This is intentional to minimize round-trips for AI assistants doing bulk updates.
- Conversion from task to project is one-way. The inverse (project to task) is not supported by OmniJS.

**Key Files:**

- `src/contracts/bulk-tools/` — Zod contracts (6 files + shared schemas)
- `src/tools/primitives/moveTasks.ts`, `duplicateTasks.ts`, `convertTasksToProjects.ts`, `moveSections.ts`, `duplicateSections.ts`, `batchUpdateTasks.ts`
- `src/tools/definitions/` — matching definition files
- `tests/unit/bulk-tools/`, `tests/contracts/bulk-tools/`

---

### SPEC-012: TaskPaper Import/Export

**Priority:** P2 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None

**Goal:** Provide TaskPaper format interoperability — import transport text to create tasks, export existing tasks/projects to transport text format, and parse without creating.

**Scope:**

- 3 MCP tools: `import_taskpaper`, `export_taskpaper`, `parse_transport_text`
- Zod contracts in `src/contracts/taskpaper-tools/`
- `import_taskpaper` calls `Task.byParsingTransportText(text, false)` — parses and creates tasks from transport text format. The `singleTask` parameter is `false` or `null` to parse all tasks.
- `export_taskpaper` generates transport text from existing tasks/projects — custom implementation (OmniJS has no built-in export). Uses the plain-text FileWrapper format (`com.omnigroup.omnifocus2.export-filetype.plain-text`) as reference.
- `parse_transport_text` — **CORRECTED**: The `singleTask: true` parameter in `Task.byParsingTransportText(text, true)` means "parse only the first task", NOT "dry run without creating." There is NO dry-run capability in OmniJS. This tool must be reimagined: either (a) parse via pasteboard URL scheme with validation, (b) create then immediately delete (unsafe), or (c) drop this tool and add validation in `import_taskpaper` instead.
- Transport text syntax: `-- Task name ! :: Project @tag #date $duration // Note`
  - `--` new task, `!` flagged, `::` project, `@` tag, `#` date, `$` estimate, `//` note
- `import_taskpaper` accepts target project/folder for placement
- `export_taskpaper` accepts project ID, folder ID, or task IDs to scope export
- Return created/parsed item IDs for import, transport text string for export

**Out of Scope:**

- Full TaskPaper format compatibility (we support OmniFocus transport text, which is a subset)
- Round-trip fidelity for all OmniFocus properties (some properties like review interval have no transport text representation)

**Key Decisions:**

- Export is a custom implementation since OmniJS doesn't provide task-to-transport-text serialization. We generate the format based on the documented syntax.
- Import uses OmniFocus's built-in parser which handles the format natively.

**Key Files:**

- `src/contracts/taskpaper-tools/` — Zod contracts (3 files)
- `src/tools/primitives/importTaskpaper.ts`, `exportTaskpaper.ts`, `parseTransportText.ts`
- `src/tools/definitions/` — matching definition files
- `tests/unit/taskpaper-tools/`, `tests/contracts/taskpaper-tools/`

---

### SPEC-014: Window & UI Control

**Priority:** P3 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None

**Goal:** Provide UI navigation and control — reveal items in outline, expand/collapse nodes and notes, focus on projects/folders, and select items. Requires OmniFocus 4+.

**Scope:**

- 8 MCP tools: `reveal_item`, `expand_items`, `collapse_items`, `expand_notes`, `collapse_notes`, `focus_items`, `unfocus`, `select_items`
- Zod contracts in `src/contracts/window-tools/`
- All tools operate on `document.windows[0]` (primary window)
- `reveal_item` uses `tree.reveal(nodes)` — navigates outline to show the specified item
- `expand_items`/`collapse_items` use `node.expand(completely?)`/`node.collapse(completely?)` — toggle outline disclosure
- `expand_notes`/`collapse_notes` use `node.expandNote(completely?)`/`node.collapseNote(completely?)` — toggle note visibility
- `focus_items` sets `window.focus = [projects/folders]` — focuses view on specific items
- `unfocus` sets `window.focus = []` (empty array) — clears focus, returns to full view. **Note:** Official docs specify empty array `[]`, NOT `null`.
- `select_items` uses `window.selectObjects(items)` — selects items in the current view
- **Version requirement**: All tools require OmniFocus 4+ (node tree API). Version detection with clear error message for OF3.
- **Platform requirement**: `content` property on DocumentWindow is **macOS only**. All content tree operations (reveal, expand, collapse) are macOS only.
- **UI side-effect warning**: All tools in this spec change the user's visible UI state. Tool descriptions must clearly communicate this.

**Out of Scope:**

- Sidebar/inspector visibility toggling (low value, high risk of user confusion)
- Multi-window management (complexity with minimal benefit)
- Reading selection state (add in future if needed)

**Key Decisions:**

**OF4+ Requirement Decision (2026-03-17):** These tools require OmniFocus 4+ for the ContentTree/node API. No fallback for OF3 — tools return a version error. The OmniFocus user base has largely migrated to OF4.
Alternatives considered: Feature detection with graceful degradation was rejected because the OF3 API surface is fundamentally different (no tree/node model).

**Key Files:**

- `src/contracts/window-tools/` — Zod contracts (8 files + shared schemas)
- `src/tools/primitives/revealItem.ts`, `expandItems.ts`, `collapseItems.ts`, `expandNotes.ts`, `collapseNotes.ts`, `focusItems.ts`, `unfocus.ts`, `selectItems.ts`
- `src/tools/definitions/` — matching definition files
- `tests/unit/window-tools/`, `tests/contracts/window-tools/`

---

### SPEC-015: Forecast

**Priority:** P3 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None

**Goal:** Provide forecast data access — get forecast overview for date ranges, get single day details, and navigate to specific forecast days.

**Scope:**

- 3 MCP tools: `get_forecast`, `get_forecast_day`, `select_forecast_days`
- Zod contracts in `src/contracts/forecast-tools/`
- `get_forecast` takes a date range and returns `ForecastDay[]` — each with date, name, kind (Day/Today/Past/FutureMonth/DistantFuture), badgeCount, deferredCount. **Note:** `badgeKind()` is a **function call** (not a property) returning `ForecastDay.Status` (Available/DueSoon/NoneAvailable/Overdue)
- `get_forecast_day` returns detailed `ForecastDay` properties for a single date
- `select_forecast_days` calls `window.selectForecastDays(dates)` — navigates the Forecast perspective to show specific days (UI side-effect warning required)
- Date parameters use ISO 8601 format
- `get_forecast` supports configurable range (default: today + 7 days)
- Requires Forecast perspective to be accessible (works in any perspective but data reflects global forecast)

**Out of Scope:**

- Modifying forecast data (forecast is derived from task dates — modify via task tools)
- Calendar event integration (OmniJS does not expose calendar data)

**Key Files:**

- `src/contracts/forecast-tools/` — Zod contracts (3 files)
- `src/tools/primitives/getForecast.ts`, `getForecastDay.ts`, `selectForecastDays.ts`
- `src/tools/definitions/` — matching definition files
- `tests/unit/forecast-tools/`, `tests/contracts/forecast-tools/`

---

### SPEC-016-017: Settings & Deep Links

**Priority:** P3 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None

**Goal:** Provide OmniFocus settings access (read/write database preferences) and deep link URL operations (get/resolve/open OmniFocus URLs). Combined spec for two small, independent feature sets.

**Scope:**

**Settings (2 tools):**

- `get_settings` reads `settings.objectForKey(key)` — returns values for known settings keys
- `set_setting` calls `settings.setObjectForKey(value, key)` — modifies setting value
- Supported keys: `DefaultStartTime`, `DefaultDueTime`, `DueSoonGranularity`, `DueSoonDays`, `InboxIsActive`, `NewTasksAreFlagged`, `CompletedTasksDaysToKeep`
- Type-safe value validation per key (some are numbers, some booleans, some strings)
- `get_settings` with no key returns all known settings as a map

**Deep Links (3 tools):**

- `get_item_url` reads `item.url` (v4.5+) — returns the `omnifocus:///` URL for any database object
- `get_item_by_url` calls `objectForURL(url)` (v4.5+) — a Database-level function that resolves an OmniFocus URL to the database object
- `open_url` calls `URL.fromString(urlStr).open()` — creates a URL object then opens it. **Note:** There is no static `URL.open()` method; must construct URL first via `URL.fromString()`.
- URL format: `omnifocus:///task/{id}`, `omnifocus:///project/{id}`, `omnifocus:///folder/{id}`, `omnifocus:///tag/{id}`, `omnifocus:///inbox`, `omnifocus:///forecast`
- **Version requirement**: Deep link tools require OmniFocus v4.5+

**Shared:**

- Zod contracts in `src/contracts/settings-tools/` and `src/contracts/deeplink-tools/`
- Full TDD with contract + unit tests

**Out of Scope:**

- Custom settings keys (only the documented OmniFocus settings keys are supported)
- URL scheme actions beyond read/resolve/open (e.g., creating items via URL is handled by `add_omnifocus_task`)

**Key Files:**

- `src/contracts/settings-tools/`, `src/contracts/deeplink-tools/` — Zod contracts
- `src/tools/primitives/getSettings.ts`, `setSetting.ts`, `getItemUrl.ts`, `getItemByUrl.ts`, `openUrl.ts`
- `src/tools/definitions/` — matching definition files
- `tests/unit/settings-tools/`, `tests/unit/deeplink-tools/`, `tests/contracts/`

---

### SPEC-018-019: Pasteboard & Document/Sync

**Priority:** P3 | **Depends On:** None (Phases 0-5 complete) | **Enables:** None

**Goal:** Provide clipboard operations (copy/paste tasks between apps) and document-level operations (sync, windows, tabs, export). Combined spec for two small, related app-level feature sets.

**Scope:**

**Pasteboard (3 tools):**

- `copy_tasks` calls `copyTasksToPasteboard(tasks, pasteboard)` — **requires Pasteboard parameter** (use `Pasteboard.general` for system clipboard or `Pasteboard.makeUnique()` for temporary). Copies selected tasks in OmniFocus format.
- `can_paste_tasks` calls `canPasteTasks(pasteboard)` — **requires Pasteboard parameter**. Checks if pasteboard contains pasteable task data.
- `paste_tasks` calls `pasteTasksFromPasteboard(pasteboard)` — **requires Pasteboard parameter**. Returns `Array of Task` which must then be moved to desired destination via `moveTasks()`.
- Tasks are identified by ID array (1-100 items)
- Paste position requires a separate `moveTasks()` call after pasting (paste returns tasks in inbox by default)

**Document/Sync (4 tools):**

- `sync_database` calls `save()` — **CORRECTED**: There is no `document.sync()` method. The `save()` function "saves any unsaved changes to disk. If sync is enabled and there were unsaved changes, this also triggers a sync request."
- `new_window` calls `document.newWindow()` — creates a new document window. **Returns a Promise** (async, must be `await`-ed).
- `new_tab` calls `document.newTabOnWindow(window)` — creates a new tab in existing window (macOS only). **Returns a Promise** (async, must be `await`-ed).
- `export_database` calls `document.makeFileWrapper(baseName, type)` — **takes TWO parameters** (baseName string + type string or null). Returns a **Promise** (async). Type example: `"com.omnigroup.omnifocus.filetype.ofocus"`.
- `export_database` supports format parameter (OmniFocus backup format)

**Shared:**

- Zod contracts in `src/contracts/pasteboard-tools/` and `src/contracts/document-tools/`
- Full TDD with contract + unit tests

**Out of Scope:**

- Cross-application pasteboard format negotiation (we use OmniFocus's native pasteboard format)
- Database import (risk of data corruption — read-only export only)

**Key Files:**

- `src/contracts/pasteboard-tools/`, `src/contracts/document-tools/` — Zod contracts
- `src/tools/primitives/copyTasks.ts`, `canPasteTasks.ts`, `pasteTasks.ts`, `syncDatabase.ts`, `newWindow.ts`, `newTab.ts`, `exportDatabase.ts`
- `src/tools/definitions/` — matching definition files
- `tests/unit/pasteboard-tools/`, `tests/unit/document-tools/`, `tests/contracts/`

---

### SPEC-020: Server Optimization (Revised 2026-03-17)

**Priority:** P1 | **Depends On:** ALL other specs (SPEC-006 through SPEC-019) | **Enables:** SPEC-021

**Goal:** Optimize the MCP server for context efficiency via toolset grouping, response format optimization, Tool Search compatibility, and protocol-native logging. Target: 75-95% token reduction for direct MCP consumers.

> **Revision Note (2026-03-17):** Original SPEC-020 planned 8 custom discovery tools (`search_tools`, `describe_tool`, `list_tool_categories`, `expand_schema`, etc.). Deep research into Anthropic's architecture revealed that **Claude Code's built-in Tool Search** already provides automatic deferred tool loading with 85%+ token reduction. Custom discovery tools are redundant and would actually conflict with Tool Search. SPEC-020 has been refocused on server-side optimization that complements (rather than replaces) client-side Tool Search. The plugin/skills packaging has been moved to a new SPEC-021.

**Scope:**

- 3 MCP tools: `set_response_format`, `set_verbosity`, `get_stats_summary`
- Server infrastructure: toolset grouping, dynamic tool registration, `serverInstructions`, tool description audit
- Zod contracts in `src/contracts/optimization-tools/`

**Toolset Grouping & Dynamic Registration (P0 — Server Infrastructure):**

- Implement GitHub MCP Server-style toolset grouping with `notifications/tools/list_changed`
- Define logical toolsets: `tasks` (10 tools), `projects` (9 tools), `folders` (5 tools), `tags` (6 tools), `reviews` (3 tools), `notifications` (5 tools), `repetition` (5 tools), `search` (4 tools), `database` (6 tools), `perspectives` (5 tools), `bulk` (6 tools), `taskpaper` (3 tools), `attachments` (5 tools), `window-ui` (8 tools), `forecast` (3 tools), `settings` (2 tools), `deeplinks` (3 tools), `pasteboard` (3 tools), `document` (4 tools)
- Support `--toolsets tasks,projects,reviews` CLI flag to load only specified groups
- Support `OMNIFOCUS_TOOLSETS=tasks,projects` environment variable
- Dynamic toolset mode: Start with core toolsets (tasks, projects, folders, tags), enable others on demand via `notifications/tools/list_changed`
- Declare `"tools": { "listChanged": true }` capability during `initialize`

**Tool Search Compatibility (P1 — Description Audit):**

- Audit all 87 tool descriptions for Tool Search discoverability — names, descriptions, parameter names, parameter descriptions are all indexed
- Enforce max 100-character tool descriptions with keyword-rich content
- Add `serverInstructions` to `initialize` response — explains OmniFocus MCP capabilities, tool categories, and when to search for specific tools
- Use consistent naming convention: `verb_noun` (e.g., `list_tasks`, `get_project`, `mark_reviewed`) for regex-based Tool Search
- Verify all tools work correctly with `defer_loading: true` for Anthropic API consumers

**Response Optimization (P2 — 3 MCP Tools):**

- `set_response_format` switches between JSON (default), TOON (Token-Oriented Object Notation, 40-60% reduction for list responses), and minimal (IDs only) formats
- `set_verbosity` controls detail level: `ids` (just identifiers), `summary` (key fields), `full` (complete objects) — applies to all list operations
- `get_stats_summary` returns lightweight counts without full object lists (task counts by status, project counts, inbox count, review queue size)
- TOON encoding implemented as opt-in response wrapper — existing JSON responses remain default for backwards compatibility

**Protocol-Native Logging (P3):**

- Migrate from stderr-based logging (`logger` utility) to MCP `server.sendLoggingMessage()` API
- Refactor from `McpServer` high-level class to low-level `Server` class for logging capability
- Add `logging: {}` capability declaration for client negotiation
- Structured log levels: debug/info/warning/error/critical
- Enables client-visible logging in MCP Inspector and other debugging tools

**Out of Scope:**

- Custom tool discovery/search UI (handled by Claude Code Tool Search)
- Lazy schema loading (handled by Claude Code Tool Search `defer_loading`)
- Embedding/vector infrastructure (Tool Search uses BM25/regex, not embeddings)
- Backwards-incompatible changes to existing tool response formats (TOON is opt-in)

**Key Decisions:**

**Tool Search Delegation Decision (2026-03-17):** Custom discovery tools (`search_tools`, `describe_tool`, `list_tool_categories`, `expand_schema`) were removed after research confirmed Claude Code's built-in Tool Search automatically activates at >10% context threshold, providing 85%+ token reduction with BM25 and regex search. Custom tools would conflict with this mechanism and add maintenance burden. Instead, SPEC-020 focuses on making the server optimally discoverable BY Tool Search.
Alternatives considered: Keeping custom discovery tools as a fallback for non-Claude-Code clients was rejected because the MCP protocol itself is moving toward client-side discovery (GitHub Discussion #532), and toolset grouping provides a better server-side optimization.

**Server Class Migration Decision (2026-03-17):** Phase 20 requires migrating from `McpServer` (high-level) to `Server` (low-level) for protocol-native logging. This is a significant refactor that touches `src/server.ts` and all tool registrations. It must happen AFTER all tools are implemented to avoid disrupting active development.

**Key Files:**

- `src/contracts/optimization-tools/` — Zod contracts (3 files)
- `src/tools/primitives/setResponseFormat.ts`, `setVerbosity.ts`, `getStatsSummary.ts`
- `src/tools/definitions/` — matching definition files
- `src/server.ts` — Major refactor: Server class migration, toolset grouping, dynamic registration, `serverInstructions`
- `src/toolsets/` — New directory for toolset definitions and grouping logic
- `tests/unit/optimization-tools/`, `tests/contracts/optimization-tools/`

---

### SPEC-021: Plugin & Skills Architecture (New 2026-03-17)

**Priority:** P1 | **Depends On:** SPEC-020 (optimized server) | **Enables:** Project completion as distributable product

**Goal:** Package the OmniFocus MCP server as a Claude Code Plugin with GTD workflow Skills that orchestrate MCP tools. Transform the project from a raw tool server into an intelligent GTD assistant. Skills provide procedural workflow knowledge (~100 tokens each at rest) that teaches Claude when and how to call MCP tools — the "MCP Enhancement" pattern from Anthropic's official skill-building guide.

> **Strategic Rationale (2026-03-17):** With 87 tools, dumping all schemas into context costs ~50k-120k tokens. Claude Code's Tool Search reduces this to ~5k tokens, but users still need to know WHICH tools to call and in WHAT order for GTD workflows. Skills solve this: a "weekly review" skill costs ~100 tokens at rest, ~2k when active, and teaches Claude the exact 4-5 tool sequence for a GTD weekly review. The plugin bundles the MCP server (raw capabilities) with skills (workflow expertise) into one installable package.

**Scope:**

- 0 new MCP tools (skills are markdown instructions, not tools)
- Plugin manifest (`plugin.json`) and directory structure
- 6+ GTD workflow skills with MCP orchestration
- 2 specialized agents for interactive GTD sessions
- Hook configurations for validation and automation
- Distribution via plugin marketplace

**Plugin Structure:**

```text
omnifocus-mcp-pro/
├── .claude-plugin/
│   └── plugin.json               # Manifest: name, version, components
├── skills/
│   ├── weekly-review/            # GTD weekly review workflow
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── gtd-review-checklist.md
│   ├── inbox-processing/         # Process inbox to zero
│   │   └── SKILL.md
│   ├── project-planning/         # Natural planning model
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── planning-triggers.md
│   ├── daily-review/             # Quick morning review
│   │   └── SKILL.md
│   ├── context-work/             # Find next actions by context/tag
│   │   └── SKILL.md
│   └── horizon-mapping/          # GTD horizons of focus review
│       ├── SKILL.md
│       └── references/
│           └── horizons-framework.md
├── agents/
│   ├── gtd-coach.md              # Interactive GTD methodology guidance
│   └── review-assistant.md       # Guided step-by-step review sessions
├── hooks/
│   └── hooks.json                # Pre-tool validation, post-review summaries
├── .mcp.json                     # OmniFocus MCP server definition
├── settings.json                 # Default plugin settings
└── README.md                     # Installation and usage guide
```

**GTD Skills (P0 — Core Deliverable):**

Each skill follows the "MCP Enhancement" pattern: skill provides procedural GTD knowledge, MCP server provides tool access. **Skills are designed to tightly mirror OmniFocus's native GTD architecture** — OmniFocus is purpose-built for GTD, and the skills leverage its specific affordances rather than implementing generic productivity workflows.

**OmniFocus GTD Architecture → Skill Mapping:**

| OmniFocus Concept | GTD Concept | How OmniFocus Implements It |
|-------------------|-------------|----------------------------|
| Inbox | Capture/Collect | Unprocessed items land here; processing means clarifying + organizing |
| Projects | Outcomes (multi-step) | `Project.status`, `sequential`/`parallel`/`single-actions` types |
| Folders | Areas of Responsibility | Hierarchical grouping for Horizons 2+ |
| Tags | Contexts / Resources | Who, where, what tool, energy level — filter for engagement |
| Review Perspective | GTD Weekly Review | Built-in review queue with `nextReviewDate`, `reviewInterval` |
| Forecast Perspective | Calendar/Hard Landscape | Due dates + defer dates on a timeline |
| Perspectives (Custom) | Custom Views | Saved filters for contexts, energy, time available |
| Flagged | "Do Today" / Priority | Quick-access flag for current commitments |

| Skill | OmniFocus Feature | GTD Workflow | MCP Tools Orchestrated |
|-------|-------------------|-------------|----------------------|
| `weekly-review` | Review Perspective | Weekly Review — the cornerstone GTD habit | `get_projects_for_review` (review queue), `get_project` (examine each), `edit_project` (update status/dates), `mark_reviewed` (advance review date), `get_inbox_count` (verify inbox clear) |
| `inbox-processing` | Inbox | Capture → Clarify → Organize | `list_tasks` (inbox filter), `edit_task` (set project/dates/tags), `create_project` (for multi-step outcomes), `move_tasks` (to project/folder) |
| `project-planning` | Projects + Sequential/Parallel | Natural Planning Model — purpose, vision, brainstorm, organize, next actions | `get_project`, `list_tasks` (existing actions), `create_task` (brainstorm actions), `edit_task` (sequence/dates), `set_review_interval` (set review cadence) |
| `daily-review` | Forecast + Flagged | Morning Orientation — what's due, what's flagged, any overdue reviews | `list_tasks` (due today + flagged), `get_projects_for_review` (overdue only), `get_inbox_count`, `get_forecast` (today + tomorrow) |
| `context-work` | Tags + Perspectives | Engage — choose next action by context, energy, time available | `list_tasks` (filter by tag + available status), `list_tags` (show contexts), `get_task` (examine candidates), `mark_complete` (done) |
| `horizon-mapping` | Folders (Areas) + Projects | Horizons of Focus — ground to sky review of commitments | `list_folders` (Areas of Responsibility), `list_projects` (active outcomes per area), `get_project` (health check), `get_database_stats` (system overview) |

**Skill Implementation Patterns:**

- Frontmatter declares `metadata.mcp-server: omnifocus` for dependency declaration
- Each skill includes: prerequisites check (MCP server connected), step-by-step workflow matching OmniFocus's native GTD flow, error handling guidance, summary format
- Skills reference MCP tools by exact name (e.g., "Call `get_projects_for_review` with `includeFuture: true`")
- Skills use OmniFocus-specific vocabulary: "Review Perspective", "Inbox", "Forecast", "Flagged", not generic terms
- Supporting `references/` files provide OmniFocus-specific GTD methodology context (how OmniFocus implements each GTD concept)
- Skills designed for composability: `weekly-review` can trigger `inbox-processing` mid-workflow, mirrors how OmniFocus's Review perspective naturally leads to inbox processing
- Skills respect OmniFocus project types: `sequential` (ordered next actions), `parallel` (all available), `single-actions` (list of independent tasks)

**Agents (P1):**

- `gtd-coach`: Interactive GTD methodology agent. Answers "how should I organize this?", "what's the GTD approach to...?", "help me set up my system". Uses `get_database_stats`, `list_folders`, `list_projects` to understand current system state before advising.
- `review-assistant`: Guided review agent with `context: fork`. Walks user through review step-by-step, presents each project, asks for decisions, executes changes. Uses `get_projects_for_review`, `get_project`, `mark_reviewed`, `edit_project`.

**Hooks (P2):**

- `PreToolUse` hook for destructive operations: Warn before `delete_project`, `delete_task`, `remove_folder` in review context
- `PostToolUse` hook for `mark_reviewed`: Log review decisions for session summary
- `SessionStart` hook: Check OmniFocus MCP server connectivity, display review queue count

**Plugin Manifest (P3):**

```json
{
  "name": "omnifocus-mcp-pro",
  "version": "1.0.0",
  "description": "GTD-powered OmniFocus integration with workflow skills",
  "author": {
    "name": "Racecraft",
    "url": "https://github.com/fgabelmannjr/omnifocus-mcp-pro"
  },
  "keywords": ["omnifocus", "gtd", "productivity", "task-management"],
  "skills": "./skills/",
  "agents": "./agents/",
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./.mcp.json",
  "settings": "./settings.json"
}
```

**Distribution (P4):**

- Publish to Claude Code plugin marketplace
- Installation: `claude plugin install omnifocus-mcp-pro@marketplace-name`
- Support user/project/local installation scopes
- Document prerequisites: macOS, OmniFocus 4+, Node.js 24+

**Out of Scope:**

- Skills for non-Claude-Code platforms (cross-platform portability is a future enhancement via Agent Skills standard)
- Custom MCP server features in skills (skills orchestrate existing tools, not add new ones)
- Mobile/iOS workflows (OmniJS execution requires macOS)

**Key Decisions:**

**Skill-as-Orchestrator Decision (2026-03-17):** Skills do not execute code that calls MCP tools directly. Instead, they provide procedural instructions that Claude reads and follows, causing Claude to make the MCP tool calls. This is the "MCP Enhancement" pattern from Anthropic's official guide. It is MORE powerful than direct code execution because Claude can adapt workflows based on intermediate results, handle errors intelligently, and compose multiple skills dynamically.
Evidence: Anthropic's 32-page "Complete Guide to Building Skills for Claude" documents 5 patterns for skill+MCP integration. The Linear Sprint Planner skill is a direct precedent — it teaches Claude to orchestrate Linear MCP tools for sprint planning.

**Plugin vs Standalone Decision (2026-03-17):** The MCP server remains a standalone server that the plugin wraps via `.mcp.json`. This preserves vendor neutrality — the MCP server works with any MCP-compatible client (Cursor, VS Code, ChatGPT, etc.), while the plugin adds Claude-Code-specific skills, agents, and hooks. Users who don't use Claude Code can still use the MCP server directly.

**Key Files:**

- `.claude-plugin/plugin.json` — Plugin manifest
- `skills/*/SKILL.md` — 6+ GTD workflow skills
- `skills/*/references/*.md` — Supporting GTD methodology reference material
- `agents/gtd-coach.md`, `agents/review-assistant.md` — Specialized agents
- `hooks/hooks.json` — Hook configurations
- `.mcp.json` — MCP server definition for plugin bundling
- `settings.json` — Default plugin settings
- `tests/skills/` — Skill integration tests (verify MCP tool orchestration flows)

---

### SPEC-022: OmniJS Response Validation

**Priority:** P2 | **Depends On:** None (all tool phases complete or in progress) | **Enables:** Improved runtime safety for SPEC-020 Server class migration

**Goal:** Replace all `as Type` assertions on `executeOmniJS()` return values with Zod runtime validation across every primitive, enforcing the project's own "NEVER use type assertions" rule and catching OmniJS script bugs at the boundary.

**Scope:**

- 0 new MCP tools (cross-cutting refactor of ~43 existing primitives)
- Replace every `return result as FooResponse` with `FooResponseSchema.parse(result)` or a lightweight wrapper
- Decide on error strategy: `parse()` (throws `ZodError`) vs `safeParse()` (returns error object that can be wrapped in a structured MCP error)
- Add a shared validation utility if warranted (e.g., `validateOmniJSResponse<T>(result, schema)`) to standardize error wrapping across all primitives
- Update unit tests that mock `executeOmniJS` — mocks must now return schema-compliant objects or tests will fail at the parse boundary
- Update CLAUDE.md to document the new pattern as the canonical way to handle `executeOmniJS` results

**Motivation:**

Currently, `executeOmniJS()` returns `Promise<unknown>` and every primitive casts the result with `as FooResponse`. This means:
- If an OmniJS script has a typo in its JSON output (e.g., `sucess` instead of `success`), the cast silently lets it through
- The Zod schemas exist for every response type but are only used in contract tests, never at the actual runtime boundary
- The project's CLAUDE.md rule "NEVER use type assertions (`as Type`) — use Zod or type narrowing instead" is violated 43 times

**Out of Scope:**

- Changing `executeOmniJS` itself (its `Promise<unknown>` return type is correct)
- Adding new Zod schemas (all response schemas already exist in `src/contracts/`)
- Performance optimization of Zod parsing (Zod 4.x is fast enough for this use case)
- Changing OmniJS script output formats (scripts remain unchanged)

**Key Decisions:**

**parse vs safeParse Decision (TBD):** Must decide whether OmniJS returning unexpected JSON should throw (crashing the tool call) or return a structured error. `parse()` is simpler — the MCP SDK catches thrown errors and returns them to the client. `safeParse()` allows custom error formatting but adds boilerplate to every primitive. Recommendation: Start with `parse()` for simplicity; the MCP SDK's error handling is sufficient.

**Key Files:**

- `src/tools/primitives/*.ts` — All ~43 primitive files need the `as Type` → `.parse()` change
- `src/contracts/*/` — Import schemas (already exist, just need importing in primitives)
- `tests/unit/*/` — Update mocks to return schema-compliant objects
- `CLAUDE.md` — Document the new canonical pattern

---

## Environment & Deployment Context

### Existing Infrastructure (No Changes Needed)

| Resource | Detail |
|----------|--------|
| Runtime | Node.js 24+ (LTS "Krypton") |
| Language | TypeScript 5.9+ with strict mode, ES2024 target |
| Build | tsup 8.5+ (ESM + CJS, sourcemaps, types) |
| Test | Vitest 4.0+ with V8 coverage |
| Lint | Biome 2.3+ (lint + format) |
| MCP SDK | @modelcontextprotocol/sdk 1.27.x |
| Validation | Zod 4.x |
| Hooks | Husky + lint-staged |
| Transport | StdioServerTransport (stdio-based, no HTTP) |

### Changes Required

| Change | Where | Detail |
|--------|-------|--------|
| `Server` class migration | `src/server.ts` | SPEC-020 only — migrate from `McpServer` to `Server` for logging |
| Toolset grouping | `src/toolsets/` | SPEC-020 — new directory for toolset definitions |
| New contract directories | `src/contracts/` | 13 new subdirectories for tool contracts |
| New primitive files | `src/tools/primitives/` | ~55 new primitive files |
| New definition files | `src/tools/definitions/` | ~55 new definition files |
| New test files | `tests/` | ~110 new test files (unit + contract) |
| Tool registration | `src/server.ts` | Register ~59 new tools + dynamic toolset support |
| Legacy tool migration | `src/tools/definitions/` | Phase 8 replaces 2 legacy perspective tools |
| Plugin structure | `.claude-plugin/`, `skills/`, `agents/`, `hooks/` | SPEC-021 — plugin packaging |
| GTD skills | `skills/*/SKILL.md` | SPEC-021 — 6+ workflow skills |
| Agents | `agents/*.md` | SPEC-021 — 2 specialized agents |
| Plugin MCP config | `.mcp.json` | SPEC-021 — server definition for plugin bundling |

### Local Development Setup

| Requirement | How |
|-------------|-----|
| OmniFocus 4+ | Required for Window/UI (SPEC-014), Forecast (SPEC-015) tools |
| OmniFocus 4.5+ | Required for Deep Links (SPEC-016-017) `url` property |
| OmniFocus 4.7+ | Required for advanced repetition (SPEC-007) `RepetitionScheduleType` |
| OmniFocus Script Editor | `Cmd-Ctrl-O` — test all OmniJS scripts before integration |
| pnpm | `npm install -g pnpm` — package manager |

---

## Recommended Execution Schedule

The following order maximizes value delivery while respecting dependencies (SPEC-020 → SPEC-021 last):

| Priority | Spec | Deliverables | Rationale |
|----------|------|-------------|-----------|
| 1 | SPEC-013 | 6 tools | Task lifecycle ops are fundamental — most requested |
| 2 | SPEC-009 | 10 tools | Search + DB utilities have highest tool count and broadest value |
| 3 | SPEC-007 | 5 tools | Repetition is core GTD — frequently needed after review system |
| 4 | SPEC-006 | 5 tools | Notifications complete the task scheduling story |
| 5 | SPEC-010 | 6 tools | Bulk ops are power-user essentials |
| 6 | SPEC-008 | 5 tools | Perspectives enhance existing tools + replace legacy code |
| 7 | SPEC-012 | 3 tools | TaskPaper interop unlocks data portability |
| 8 | SPEC-011 | 5 tools | Attachments round out task properties |
| 9 | SPEC-014 | 8 tools | Window/UI is high tool count but niche (power users) |
| 10 | SPEC-015 | 3 tools | Forecast is read-only, lower risk |
| 11 | SPEC-016-017 | 5 tools | Settings + Deep Links are small utilities |
| 12 | SPEC-018-019 | 7 tools | Pasteboard + Sync are app-level operations |
| 13 | SPEC-022 | 0 (refactor) | OmniJS Response Validation — replace `as Type` with Zod parse |
| 14 | SPEC-020 | 3 tools + infra | Server Optimization — toolsets, TOON, logging, Tool Search compat |
| 15 | SPEC-021 | 6 skills + 2 agents | Plugin & Skills — the user-facing product, wraps everything above |

---

## References

- **Complete Plan v2:** `docs/ai/omnifocus-mcp-complete-plan-v2.md`
- **Constitution:** `.specify/memory/constitution.md` (v2.0.0)
- **Project Standards:** `CLAUDE.md`
- **SpecKit Workflow:** `specify → clarify → plan → checklist → tasks → analyze → implement`
- **Existing Specs:** `specs/000-tooling-setup/` through `specs/005-review-system/`

### Research Sources (SPEC-020/021 Architecture Decisions)

- **Anthropic Tool Search:** [Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use) — 85%+ token reduction, automatic at >10% context threshold
- **Anthropic Skills Guide:** [Complete Guide to Building Skills for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) — 32-page guide, 5 MCP+skill patterns
- **Claude Code Skills Docs:** [Extend Claude with Skills](https://code.claude.com/docs/en/skills) — progressive disclosure, `allowed-tools`, `metadata.mcp-server`
- **Claude Code Plugins Docs:** [Plugins Reference](https://code.claude.com/docs/en/plugins-reference) — manifest schema, `.mcp.json`, auto-discovery
- **GitHub MCP Server Toolsets:** [github/github-mcp-server](https://github.com/github/github-mcp-server) — 91-tool server with dynamic toolset grouping
- **MCP Spec — Tools:** [modelcontextprotocol.io/specification/server/tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) — `notifications/tools/list_changed`, pagination
- **Linear Sprint Planner Skill:** [SKILL.md Pattern](https://bibek-poudel.medium.com/the-skill-md-pattern-how-to-write-ai-agent-skills-that-actually-work-72a3169dd7ee) — MCP Enhancement pattern precedent
