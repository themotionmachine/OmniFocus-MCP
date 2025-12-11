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
| `.claude/rules/` | Modular Claude rules |

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Node.js | 24+ |
| Language | TypeScript | 5.9+ |
| Build | tsup | 8.5+ |
| Test | Vitest | 4.0+ |
| Lint/Format | Biome | 2.3+ |
| MCP SDK | @modelcontextprotocol/sdk | 1.24.3 |
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

- **Phase 2 Tags**: Completed tag management tools (2025-12-11)
  - `list_tags`, `create_tag`, `edit_tag`, `delete_tag`, `assign_tags`, `remove_tags`
  - Full hierarchy support with parent/child relationships
  - Batch operations with per-item results for assign/remove
  - Disambiguation support for name-based lookups
  - Full TDD implementation with 150+ tests
- **Phase 1 Folders**: Completed folder management tools (2025-12-10)
  - `list_folders`, `add_folder`, `edit_folder`, `remove_folder`, `move_folder`
  - All primitives use pure Omni Automation JavaScript (OmniJS)
  - Established OmniJS-first architecture pattern for future tools
- **Constitution v2.0.0**: Migrated to pure OmniJS execution model
  - Removed AppleScript tier (Tier 1) - all write operations now use OmniJS
  - Removed direct JXA tier (Tier 3) - unused execution path eliminated
  - All operations (read AND write) now use consistent OmniJS execution
- **Phase 0.5 SDK Upgrade**: Upgraded to MCP SDK 1.24.3 and Zod 4.x
- **Phase 0 Tooling**: Migrated to tsup, Vitest, Biome, Node 24+

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
