# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

OmniFocus MCP Server bridges AI assistants with OmniFocus task management on
macOS. It uses pure **Omni Automation JavaScript** (OmniJS) to interact with
OmniFocus, providing tools to view, create, edit, and remove tasks, projects,
and folders. All operations use OmniJS execution for consistency and
reliability.

## Development Philosophy

### Core Principles

- **Learn before changing** - Read existing implementations before modifying
- **Incremental progress** - Small changes that compile and pass
- **OmniJS is fragile** - Syntax errors fail silently; test in Script Editor first
- **Type safety first** - Trust TypeScript; if it compiles, you're halfway there
- **Explicit over implicit** - Clear data flow, obvious dependencies

### Simplicity

- **Single responsibility** - One function does one thing
- **Avoid premature abstractions** - Don't create utilities for one-time operations
- **No clever tricks** - Choose the boring, obvious solution

## Critical Rules

### NEVER

- Open PRs against `themotionmachine/OmniFocus-MCP` (upstream fork)
- Use `--no-verify` to bypass commit hooks
- Skip the build step - server runs from `dist/`, not `src/`
- Test OmniJS only through the MCP server - always test in Script Editor first
- Add new tools without the definitions/primitives separation
- Silently swallow exceptions in OmniJS
- Use type assertions (`as Type`) - use Zod or type narrowing instead

### ALWAYS

- Run `pnpm build` after any source changes
- Use Zod schemas for all tool input validation
- Return structured JSON from OmniJS scripts (never raw strings)
- Handle partial failures in batch operations
- Follow existing patterns - find a similar tool and mirror its structure
- End all text files with a newline
- Use the `logger` utility for all diagnostic output (never `console.error`)

## Build Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm build` | Compile TypeScript and copy OmniJS scripts |
| `pnpm dev` | Watch mode (auto-recompile) |
| `pnpm test` | Run tests |
| `pnpm test:coverage` | Tests with V8 coverage |
| `pnpm lint` | Check code (Biome) |
| `pnpm lint:fix` | Fix lint issues |
| `pnpm typecheck` | TypeScript checking |

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/server.ts` | MCP server entry point |
| `src/tools/definitions/` | Tool schemas and MCP handlers |
| `src/tools/primitives/` | Core business logic |
| `src/utils/omnifocusScripts/` | Pre-built OmniJS scripts |
| `specs/` | Feature specifications |
| `.claude/rules/` | Modular Claude rules (including RepoPrompt MCP guide) |

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Node.js | 24+ |
| Language | TypeScript | 5.9+ |
| Build | tsup | 8.5+ |
| Test | Vitest | 4.0+ |
| Lint/Format | Biome | 2.3+ |
| MCP SDK | @modelcontextprotocol/sdk | 1.27.1 |
| Validation | Zod | 4.1.x |

## Common Gotchas

| Gotcha | Solution |
|--------|----------|
| Build before test | Server runs from `dist/`; use `pnpm dev` for watch mode |
| OmniJS syntax errors | Missing quotes/escaping causes silent failures; test in Script Editor |
| Date timezones | OmniFocus interprets local time; use explicit ISO 8601 |
| Empty script results | OmniJS errors produce empty output; wrap in try-catch with JSON |
| SDK type arguments | Use `RequestHandlerExtra<ServerRequest, ServerNotification>` |
| Module resolution | Use `"moduleResolution": "NodeNext"` in tsconfig |

## Omni Automation JavaScript Patterns

All primitives use **Omni Automation JavaScript** (OmniJS) via `executeOmniFocusScript()`:

```typescript
// Primitive pattern
const script = generateOmniScript(params);
const tempFile = writeSecureTempFile(script, 'tool_name', '.js');
const result = await executeOmniFocusScript(tempFile.path);
tempFile.cleanup();
```

### OmniJS Script Template

```javascript
(function() {
  try {
    // Find items
    var task = Task.byIdentifier(id);
    var project = Project.byIdentifier(id);
    var folder = Folder.byIdentifier(id);
    // Or by name
    var task = flattenedTasks.byName(name);
    var project = flattenedProjects.byName(name);
    var folder = flattenedFolders.byName(name);

    // Create items
    var task = new Task(name, inbox.ending);
    var project = new Project(name, folder);
    var folder = new Folder(name);

    // Delete items
    deleteObject(item);

    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

### Key OmniJS APIs

- **Task**: `Task.byIdentifier()`, `flattenedTasks.byName()`, `new Task(name, position)`
- **Project**: `Project.byIdentifier()`, `flattenedProjects.byName()`, `new Project(name, folder)`
- **Folder**: `Folder.byIdentifier()`, `flattenedFolders.byName()`, `new Folder(name)`
- **Tag**: `Tag.byIdentifier()`, `flattenedTags.byName()`, `new Tag(name, parent)`
  - Status: `tag.active = true/false`, `tag.status = Tag.Status.Active/OnHold/Dropped`
  - Properties: `tag.allowsNextAction`, `tag.name`, `tag.parent`, `tag.children`
  - Task operations: `task.addTag(tag)`, `task.removeTag(tag)`, `task.clearTags()`
- **Status**: `task.markComplete()`, `task.markIncomplete()`, `task.active = false` (drop)
- **Delete**: `deleteObject(item)` - works for tasks, projects, folders, tags

## Modular Rules

Domain-specific rules in `.claude/rules/` load automatically:

**Always loaded:**

- `security.md` - Security policies, input validation
- `error-handling.md` - Error patterns, partial failures
- `git-workflow.md` - Commit conventions, PR rules
- `research-workflow.md` - Research patterns and tools
- `repoprompt-mcp.md` - RepoPrompt MCP context management and editing

**Path-scoped (load when working with matching files):**

- `omnijs-development.md` - OmniJS scripts, primitives
- `mcp-development.md` - MCP SDK patterns
- `tool-architecture.md` - Tool definitions/primitives
- `typescript-standards.md` - All TypeScript files
- `testing.md` - Test files
- `batch-operations.md` - Batch processing logic
- `documentation.md` - README, CLAUDE.md, docs
- `specs-workflow.md` - Specification artifacts

## Serena Usage Tips

- Use `get_symbols_overview` before reading full files
- Use `find_symbol` with `include_body=False` first
- Call `think_about_task_adherence` before code edits
- Use `write_memory` to preserve findings before context compaction
- Prefer symbolic editing over file-based for precision

## RepoPrompt MCP Usage Tips

- Use `manage_selection` with absolute paths to curate context efficiently
- Use `apply_edits` with `verbose=true` to see diffs before committing
- Use `workspace_context` to check token counts before adding more files
- Use `mode=codemap_only` for reference files you won't edit (saves tokens)
- Use `slices` for large files - only include relevant line ranges
- Use `chat_send` to delegate to specialized models (Planner, Engineer, etc.)
- See `.claude/rules/repoprompt-mcp.md` for comprehensive patterns

## When to Ask vs. Proceed

**Stop and ask:**

- Unsure which architectural pattern to follow
- A change would affect multiple tools
- Adding a new dependency
- Modifying OmniJS script execution logic
- After 3 failed attempts at the same problem

**Proceed confidently:**

- Following an existing tool's implementation pattern
- The change is isolated to one primitive
- Build and type checks pass
- You've tested OmniJS scripts independently

## Recent Changes
- 011-attachments: Added TypeScript 5.9+ strict mode (ES2024 target) + @modelcontextprotocol/sdk 1.27.x, Zod 4.2.x, tsup 8.5+
- 010-bulk-operations: Added TypeScript 5.9+ with strict mode (ES2024 target) + @modelcontextprotocol/sdk 1.27.x, Zod 4.2.x, tsup 8.5+
- 007-repetition-rules: TypeScript 5.9+ with strict mode (ES2024 target) + @modelcontextprotocol/sdk 1.27.x, Zod 4.x, tsup 8.5+

- **Phase 7 Repetition Rules (Implementation Complete)**: Repetition Rule Management fully implemented (2026-03-17)
  - 5 new tools: `get_repetition`, `set_repetition`, `clear_repetition`, `set_common_repetition`, `set_advanced_repetition`
  - `get_repetition`: Read ICS rule string, schedule type (v4.7+), anchor date (v4.7+), catch-up (v4.7+), deprecated method
  - `set_repetition`: Set repetition via raw ICS string using legacy 2-param constructor (all versions)
  - `clear_repetition`: Remove repetition rule (idempotent — succeeds on already-cleared tasks)
  - `set_common_repetition`: Set from 8 named presets (daily, weekdays, weekly, biweekly, monthly, monthly_last_day, quarterly, yearly) with optional day/dayOfMonth modifiers; ICS generated server-side in TypeScript
  - `set_advanced_repetition`: Configure v4.7+ params (scheduleType, anchorDateKey, catchUpAutomatically) with read-then-merge pattern; version-gated via `app.userVersion.atLeast(new Version('4.7'))`
  - All tools accept task OR project IDs — projects resolve to root task
  - Dual-discriminator response for get_repetition: `success: true/false` + `hasRule: true/false`
  - Zod 4.x: `z.union()` for get_repetition response (dual success variants share `success: true`); `z.discriminatedUnion('success', [...])` for other 4 tools
  - Full TDD implementation with 292 new tests (contract + unit)
  - Total: 2216 tests across 101 test files (was 1924 across 90)
  - Contracts in `src/contracts/repetition-tools/` with shared schemas (enums, RepetitionRuleData)

- 005-review-system: Added TypeScript 5.9+ with strict mode (ES2024 target) + @modelcontextprotocol/sdk 1.27.x, Zod 4.x, tsup 8.5+

- **Phase 13 Task Status & Completion (Implementation Complete)**: 6 status tools implemented (2026-03-17)
  - 6 new tools: `mark_complete`, `mark_incomplete`, `drop_items`, `set_project_type`, `get_next_task`, `set_floating_timezone`
  - `mark_complete`: Batch complete tasks/projects (1-100) with optional backdating
  - `mark_incomplete`: Batch reopen completed/dropped items with auto-state detection
  - `drop_items`: Batch drop tasks/projects with v3.8+ version detection; tasks use `drop(allOccurrences)`, projects use status assignment
  - `set_project_type`: Set sequential/parallel/single-actions with mutual exclusion
  - `get_next_task`: Query next available task with distinct reasons (NO_AVAILABLE_TASKS, SINGLE_ACTIONS_PROJECT)
  - `set_floating_timezone`: Enable/disable floating timezone on tasks and projects
  - All batch tools follow Phase 5 pattern: per-item results, partial failures, disambiguation
  - Idempotent no-op codes: ALREADY_COMPLETED, ALREADY_ACTIVE, ALREADY_DROPPED
  - Full TDD implementation with 367 new tests (contract + unit)
  - Total: 2291 tests across 103 test files (was 1924 across 90)
  - Contracts in `src/contracts/status-tools/` with shared schemas (ItemIdentifier, StatusBatchItemResult, Summary, Disambiguation)
  - Integration test scaffold for OmniFocus round-trip verification

- **Phase 5 Review System (Implementation Complete)**: Review System fully implemented (2026-03-16)
  - 3 new tools: `get_projects_for_review`, `mark_reviewed`, `set_review_interval`
  - `get_projects_for_review`: Query overdue/upcoming reviews with 6 filter params, pagination, sort
  - `mark_reviewed`: Batch mark projects reviewed, advancing nextReviewDate via Calendar API
  - `set_review_interval`: Configure review frequency or disable reviews; value object semantics
  - All date calculations use Calendar/DateComponents API (no millisecond math)
  - Critical constraint: No `markReviewed()` method — sets `nextReviewDate` directly
  - `lastReviewDate` is READ-ONLY; `nextReviewDate` is WRITABLE
  - Full TDD implementation with 214 new tests (contract + unit)
  - Total: 1922 tests across 90 test files (was 1708 across 83)
  - Contracts in `src/contracts/review-tools/` with shared schemas
  - Integration test scaffold for OmniFocus round-trip verification

- **Test Coverage (2025-12-12)**: Test coverage gaps filled with 10 new test files
  - Total: 1708 tests across 83 test files
  - Added 9 missing unit tests (moveProject, editProject, createProject, getProject, deleteProject, listProjects, appendNote, getTask, listTasks)
  - Added 1 integration test (deleteProject cascade deletion verification)
  - All integration tests passing with recent bug fixes


  - `list_projects`: Comprehensive filtering (folder, status, review status, dates)
  - `get_project`: Full project details with 30 properties
  - `create_project`: Create with folder placement, type settings, review intervals
  - `edit_project`: Modify all properties with auto-clear for conflicting types
  - `delete_project`: Remove with cascade deletion of child tasks
  - `move_project`: Move to folder, root, or relative to siblings
  - Contracts in `src/contracts/project-tools/` with shared schemas
  - Full TDD implementation with 356+ tests (contract + unit)
  - Review status filtering for GTD workflows ('due', 'upcoming', 'any')
  - Project type mutual exclusion: containsSingletonActions wins over sequential

  - `list_tasks`: Comprehensive task filtering (project, folder, tags, status, dates)
  - `get_task`: Full task details by ID or name with disambiguation
  - `set_planned_date`: Set/clear planned dates (OmniFocus v4.7+ feature)
  - `append_note`: Append text to task notes without overwriting
  - Contracts in `src/contracts/task-tools/` with shared schemas
  - Full TDD implementation with 325+ tests (contract + unit)
  - Server-side OmniJS filtering for performance

  - `list_tags`, `create_tag`, `edit_tag`, `delete_tag`, `assign_tags`, `remove_tags`
  - Full hierarchy support with parent/child relationships
  - Batch operations with per-item results for assign/remove
  - Disambiguation support for name-based lookups
  - Full TDD implementation with 150+ tests
  - `list_folders`, `add_folder`, `edit_folder`, `remove_folder`, `move_folder`
  - All primitives use pure Omni Automation JavaScript (OmniJS)
  - Established OmniJS-first architecture pattern for future tools
  - Removed AppleScript tier (Tier 1) - all write operations now use OmniJS
  - Removed direct JXA tier (Tier 3) - unused execution path eliminated
  - All operations (read AND write) now use consistent OmniJS execution

## Logging

Use the MCP-compliant logger utility for all diagnostic output:

```typescript
import { logger } from './utils/logger.js';

// Log levels: debug, info, warning, error
logger.error('Operation failed', 'functionName', { taskId: 'abc123' });
logger.warning('Unexpected state', 'functionName', { details });
logger.info('Processing started', 'functionName');
logger.debug('Verbose info', 'functionName', { data });
```

### Why stderr logging is MCP-compliant

Per [MCP stdio transport spec](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports):

> "Servers MAY send UTF-8 strings to their stderr stream. These are NOT
> protocol messages and SHOULD NOT be parsed as JSON-RPC."

- **stdout**: Reserved for JSON-RPC protocol messages only
- **stderr**: Allowed for logging (captured by Claude Desktop)

This is also compatible with OmniJS execution - script results flow through
stdout as JSON-RPC, while diagnostic logs stay on stderr.

**Never use `console.error` directly** - always use the logger utility.

### Future: Protocol-Native Logging (Phase 20)

Phase 20 will migrate to `server.sendLoggingMessage()` for client-visible logs.
This requires refactoring from `McpServer` to the low-level `Server` class.
See [MCP logging spec](https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/logging).

## Active Technologies
- TypeScript 5.9+ with strict mode (ES2024 target) + @modelcontextprotocol/sdk 1.27.x, Zod 4.x, tsup 8.5+ (005-review-system)
- N/A (OmniFocus internal database via OmniJS) (005-review-system)
- TypeScript 5.9+ strict mode (ES2024 target) + @modelcontextprotocol/sdk 1.27.x, Zod 4.2.x, tsup 8.5+ (011-attachments)
- TypeScript 5.9+ with strict mode (ES2024 target) + @modelcontextprotocol/sdk 1.27.x, Zod 4.2.x, tsup 8.5+ (010-bulk-operations)

- TypeScript 5.9+ with strict mode (`ES2024` target) (003-tasks)
- N/A (interfaces with OmniFocus via OmniJS execution) (003-tasks)
