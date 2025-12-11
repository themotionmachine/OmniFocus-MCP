# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

OmniFocus MCP Server bridges AI assistants with OmniFocus task management on
macOS. It uses **Omni Automation JavaScript** (OmniJS) executed via JXA wrapper
to interact with OmniFocus, providing tools to view, create, edit, and remove
tasks, projects, and folders.

## Development Philosophy

### Core Principles

- **Learn before changing** - Read existing implementations before modifying
- **Incremental progress** - Small changes that compile and pass
- **JXA is fragile** - Syntax errors fail silently; test in Script Editor first
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
- Test JXA only through the MCP server - always test in Script Editor first
- Add new tools without the definitions/primitives separation
- Silently swallow exceptions in JXA
- Use type assertions (`as Type`) - use Zod or type narrowing instead

### ALWAYS

- Run `pnpm build` after any source changes
- Use Zod schemas for all tool input validation
- Return structured JSON from JXA scripts (never raw strings)
- Handle partial failures in batch operations
- Follow existing patterns - find a similar tool and mirror its structure
- End all text files with a newline

## Build Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm build` | Compile TypeScript and copy JXA scripts |
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
| `src/utils/omnifocusScripts/` | Pre-built JXA scripts |
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
- **Tag**: `flattenedTags.byName()`, `new Tag(name)`, `task.addTag()`, `task.clearTags()`
- **Status**: `task.markComplete()`, `task.markIncomplete()`, `task.active = false` (drop)
- **Delete**: `deleteObject(item)` - works for tasks, projects, folders

## Modular Rules

Domain-specific rules in `.claude/rules/` load automatically:

**Always loaded:**

- `security.md` - Security policies, input validation
- `error-handling.md` - Error patterns, partial failures
- `git-workflow.md` - Commit conventions, PR rules
- `research-workflow.md` - Research patterns and tools

**Path-scoped (load when working with matching files):**

- `jxa-development.md` - JXA scripts, primitives
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
- Modifying JXA script execution logic
- After 3 failed attempts at the same problem

**Proceed confidently:**

- Following an existing tool's implementation pattern
- The change is isolated to one primitive
- Build and type checks pass
- You've tested JXA scripts independently

## Recent Changes

- **002-folder-tools**: Adding folder management tools (in progress)
  - Migrated all primitives from AppleScript to Omni Automation JavaScript
  - addProject, addOmniFocusTask, editItem, removeItem now use OmniJS
- **001-tooling-modernization**: Migrated to tsup, Vitest, Biome, Node 24+
