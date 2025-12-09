# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Development Philosophy

### Core Principles

- **Learn before changing** - Read existing implementations before modifying.
  Find similar tools and follow their patterns.
- **Incremental progress over big bangs** - Small changes that compile and
  pass. Commit working code frequently.
- **JXA is fragile** - Syntax errors fail silently. Test scripts in isolation
  before integrating.
- **Type safety prevents runtime surprises** - Trust TypeScript. If it
  compiles, you're halfway there.
- **Explicit over implicit** - Clear data flow, obvious dependencies, boring solutions.

### Simplicity

- **Single responsibility** - One function does one thing. One tool solves one problem.
- **Avoid premature abstractions** - Don't create utilities for one-time operations.
- **No clever tricks** - Choose the boring, obvious solution every time.
- **If you need to explain it, it's too complex** - Refactor until the code is self-documenting.

### JXA-Specific Mindset

JXA (JavaScript for Automation) is the critical path for all OmniFocus
interactions. Approach it with caution:

- **Silent failures are the norm** - JXA errors often produce empty results,
  not error messages
- **Test in Script Editor first** - Never trust JXA until you've run it manually
- **String building is error-prone** - Template literals inside generated JXA
  need careful escaping
- **OmniFocus has its own object model** - Learn `.tasks.whose()` syntax;
  it's not SQL

### When to Ask vs. Proceed

**Stop and ask** when:

- Unsure which architectural pattern to follow
- A change would affect multiple tools
- Adding a new dependency
- Modifying JXA script execution logic
- After 3 failed attempts at the same problem

**Proceed confidently** when:

- Following an existing tool's implementation pattern
- The change is isolated to one primitive
- Build and type checks pass
- You've tested JXA scripts independently

## Important Reminders

### NEVER

- Open PRs against `themotionmachine/OmniFocus-MCP` — this is the upstream
  fork, not our repo
- Use `--no-verify` to bypass commit hooks
- Skip the build step - server runs from `dist/`, not `src/`
- Test JXA only through the MCP server - always test in Script Editor first
- Disable TypeScript strict mode or ignore type errors
- Add new tools without the definitions/primitives separation
- Silently swallow exceptions in JXA - always use try-catch with JSON error returns
- Assume dates are UTC - OmniFocus interprets local time
- Make changes without reading similar existing implementations first
- Introduce new tools/dependencies without strong justification
- Disable tests instead of fixing them

### ALWAYS

- Run `npm run build` after any source changes
- Verify JXA scripts are copied to `dist/utils/omnifocusScripts/`
- Use Zod schemas for all tool input validation
- Return structured JSON from JXA scripts (never raw strings)
- Handle partial failures in batch operations
- Include context in error messages for debugging
- Follow existing patterns - find a similar tool and mirror its structure
- Commit working code incrementally
- Update documentation (CLAUDE.md, README) when adding new tools
- End all text files with a newline

## Project Integration

### Tooling Discipline

- Use the project's existing build system (`npm run build`)
- Use the project's existing linter settings (ESLint, TypeScript strict mode)
- Don't introduce new dependencies without strong justification
- If a utility exists in the codebase, use it; don't create a new one

### Code Style

- Follow existing conventions in the project
- Refer to `.eslintrc`, `tsconfig.json`, and `.editorconfig` if present
- Text files should always end with an empty line
- Use consistent naming: camelCase for functions, PascalCase for types

## MCP Tool Usage (For Development)

When developing this MCP server, use these tools effectively:

- **Context7** - Validate current MCP SDK documentation, check for API changes
- **Tavily** - Research JXA patterns, OmniFocus automation techniques,
  AppleScript/JXA conversion
- **Serena** - Navigate large refactorings with semantic code understanding
- **Web Search** - Debug obscure JXA errors, find OmniGroup forum discussions

### Serena MCP Tools - Detailed Guide

Serena provides semantic code understanding tools that are essential for
efficient codebase navigation and manipulation. **Use Serena tools instead of
reading entire files whenever possible.**

#### Memory Tools (CRITICAL for Long Conversations)

**IMPORTANT**: As context window approaches compaction, actively use memory
tools to preserve critical information.

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `list_memories` | List all available memory files | At conversation start to see what context exists |
| `read_memory` | Read a specific memory file | When memory name suggests relevance to current task |
| `write_memory` | Save information for future sessions | After discovering important patterns, completing analysis, or before context compaction |
| `edit_memory` | Update existing memory content | When information needs correction or augmentation |
| `delete_memory` | Remove outdated memory | Only when user explicitly requests |

**Available Project Memories:**

- `codebase_structure` - Directory layout and file organization
- `project_overview` - High-level architecture and purpose
- `key_implementation_details` - Critical implementation patterns and gotchas
- `suggested_commands` - Common development commands
- `code_style_conventions` - Coding standards and patterns
- `task_completion_checklist` - Steps to verify work is complete

**Memory Best Practices:**

1. **Read relevant memories early** - Check `list_memories` at conversation start
2. **Write before compaction** - If working on complex task and context is
   large, save findings to memory
3. **Be specific in memory names** - Use descriptive names like
   `authentication_flow` not `notes`
4. **Update memories when patterns change** - Use `edit_memory` to keep
   information current
5. **Never read same memory twice** - Serena tracks what you've read in the conversation

#### Code Navigation Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `get_symbols_overview` | High-level view of file symbols | First step when exploring a new file |
| `find_symbol` | Find symbols by name pattern | When you know symbol name but not location |
| `find_referencing_symbols` | Find all references to a symbol | Before modifying a symbol to understand impact |
| `list_dir` | List directory contents | Understanding project structure |
| `find_file` | Find files by name pattern | Locating specific files |
| `search_for_pattern` | Regex search across codebase | Finding arbitrary patterns, non-code files |

**Navigation Best Practices:**

1. **Use `get_symbols_overview` before reading files** - Understand structure first
2. **Use `find_symbol` with `include_body=False` first** - Get locations
   before reading bodies
3. **Use `depth` parameter wisely** - `depth=1` gets immediate children
   (e.g., class methods)
4. **Prefer symbolic tools over `search_for_pattern`** - Faster and more
   accurate for code

#### Code Editing Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `replace_symbol_body` | Replace entire symbol definition | Rewriting functions, methods, classes |
| `insert_after_symbol` | Insert code after a symbol | Adding new methods, functions |
| `insert_before_symbol` | Insert code before a symbol | Adding imports, new symbols at file start |
| `rename_symbol` | Rename symbol across codebase | Refactoring names consistently |

**Editing Best Practices:**

1. **Always call `think_about_task_adherence` before editing** - Required by Serena
2. **Use `find_referencing_symbols` before modifying** - Understand impact
3. **Prefer symbolic editing over file-based** - More precise, less error-prone
4. **Don't use symbolic editing for partial changes** - Use file-based
   editing for small inline changes

#### Thinking Tools (Required Checkpoints)

| Tool | When to Call |
|------|--------------|
| `think_about_collected_information` | After completing a search/exploration sequence |
| `think_about_task_adherence` | Before any code insertion, replacement, or deletion |
| `think_about_whether_you_are_done` | When you believe the task is complete |

#### Example Workflows

**Exploring a new tool implementation:**

```text
1. read_memory("codebase_structure") - understand layout
2. get_symbols_overview("src/tools/definitions/toolName.ts") - see structure
3. find_symbol("toolName", include_body=True) - read the definition
4. find_symbol("toolNamePrimitive", include_body=True) - read the primitive
5. think_about_collected_information() - verify you have enough context
```

**Modifying a function:**

```text
1. find_symbol("functionName", include_body=True) - read current implementation
2. find_referencing_symbols("functionName") - check all usages
3. think_about_task_adherence() - verify this is the right change
4. replace_symbol_body("functionName", newBody) - make the change
5. think_about_whether_you_are_done() - verify completion
```

**Preserving context before compaction:**

```text
1. write_memory("current_task_progress", "Summary of what's been done and what remains...")
2. write_memory("discovered_patterns", "Key patterns found during investigation...")
```

## Project Overview

OmniFocus MCP Server is a Model Context Protocol (MCP) server that bridges AI
assistants with OmniFocus task management. It uses JXA (JavaScript for
Automation) via AppleScript to interact with OmniFocus on macOS.

## Build and Development Commands

```bash
# Build the project (compiles TypeScript and copies JXA scripts)
npm run build

# Start the server (must be built first)
npm run start

# Watch mode for development (auto-recompile on changes)
npm run dev
```

The build process:

1. Compiles TypeScript from `src/` to `dist/`
2. Copies JXA scripts from `src/utils/omnifocusScripts/*.js` to `dist/utils/omnifocusScripts/`
3. Makes `dist/server.js` executable

## Architecture Overview

### Core Components

#### MCP Server (`src/server.ts`)

- Entry point that registers all tools with the MCP SDK
- Uses `StdioServerTransport` for stdio-based communication
- Each tool is registered with its schema and handler

#### Tool Organization

- `src/tools/definitions/`: Tool schemas and MCP-facing handlers (defines tool interface)
- `src/tools/primitives/`: Core business logic for each tool (actual implementation)
- Separation allows clean MCP registration while keeping logic testable

#### Script Execution (`src/utils/scriptExecution.ts`)

- `executeJXA()`: Writes JXA scripts to temp files and executes via
  `osascript -l JavaScript`
- All OmniFocus interactions go through JXA, not direct AppleScript
- Returns parsed JSON results

#### Pre-built JXA Scripts (`src/utils/omnifocusScripts/*.js`)

- `omnifocusDump.js`: Full database dump (used by `dump_database`)
- `listPerspectives.js`: Lists all perspectives
- `getPerspectiveView.js`: Gets items in current perspective view
- These are copied during build to `dist/utils/omnifocusScripts/`

### Key Architectural Patterns

#### Query vs Dump Strategy

- `query_omnifocus`: Generates JXA dynamically for targeted queries with filters
- `dump_database`: Uses pre-built `omnifocusDump.js` for full database export
- Query is faster for specific lookups; dump is better for comprehensive analysis

#### Batch Operations

- `batchAddItems`: Processes items in dependency order using topological sort
- Detects cycles in `tempId` → `parentTempId` references
- Maps temporary IDs to real OmniFocus IDs for within-batch parent-child relationships
- Supports `hierarchyLevel` for ordering hints

#### Hierarchy Management

- Tasks can reference parents via `parentTaskId` (existing ID) or
  `parentTaskName` (name lookup)
- Batch operations support `parentTempId` to reference items being created in
  same batch
- Cycle detection prevents infinite loops in parent-child relationships

#### Type System (`src/omnifocustypes.ts`)

- Defines TypeScript enums matching OmniFocus object model (Task.Status,
  Project.Status, etc.)
- Minimal interfaces for core objects (TaskMinimal, ProjectMinimal,
  FolderMinimal, TagMinimal)
- Used for type safety when building JXA queries and parsing results

### Tool Categories

#### Query Tools

- `query_omnifocus`: Targeted queries with filters, sorting, field selection
- `dump_database`: Full database export (warning: can timeout on large databases)
- `list_perspectives`: List available perspectives
- `get_perspective_view`: Get items in a perspective (requires perspective to
  be open)

#### Single Item Operations

- `add_omnifocus_task`: Create one task
- `add_project`: Create one project
- `edit_item`: Modify task or project by ID or name
- `remove_item`: Delete task or project by ID or name

#### Batch Tools

- `batch_add_items`: Create multiple tasks/projects with hierarchy support
- `batch_remove_items`: Delete multiple items at once

## Important Implementation Details

### JXA Script Generation

When modifying query logic, the JXA is built as a string in
`src/tools/primitives/queryOmnifocus.ts`. Key considerations:

- Use template literals carefully (backticks inside JXA need escaping)
- OmniFocus object model uses methods like `.tasks.whose()`, not SQL
- Date comparisons in JXA use `.getTime()` for milliseconds since epoch
- Always wrap JXA in try-catch and return JSON

### Error Handling Standards

All JXA scripts must follow this pattern:

```javascript
try {
    // ... JXA logic ...
    JSON.stringify({ success: true, data: result });
} catch (e) {
    JSON.stringify({ success: false, error: e.message || String(e) });
}
```

For MCP tool handlers:

- Validate all inputs with Zod schemas before processing
- Return structured errors with actionable messages
- Never let exceptions bubble up unhandled
- Include enough context for debugging (item IDs, operation type, etc.)

### Date Handling

- Dates from tools come as ISO 8601 strings
- JXA converts to JavaScript Date objects: `new Date("2024-12-25T00:00:00Z")`
- OmniFocus stores dates as Date objects
- When querying, compare using `.getTime()` for timestamp comparison

### Perspective Limitations

`get_perspective_view` cannot programmatically switch perspectives due to
OmniJS limitations. The user must manually switch to the desired perspective
before calling the tool, or the tool will return items from whatever
perspective is currently active.

### Database Size Issues

The `dump_database` tool can timeout on very large OmniFocus databases. For
large databases:

- Use `query_omnifocus` with filters instead
- Enable `hideCompleted` and `hideRecurringDuplicates` options
- Consider pagination if implementing future enhancements

### Batch Operation Ordering

When using `batch_add_items`:

1. Items with cycles in `tempId` references fail immediately
2. Items with unknown `parentTempId` (not in batch, not real ID) fail immediately
3. Remaining items sorted by dependency (parents before children)
4. Items processed in order, building `tempId` → real ID map
5. Each item's result stored at original array index

### Task Hierarchy Best Practices

When creating nested tasks:

- Use `tempId` and `parentTempId` for within-batch hierarchy
- Use `hierarchyLevel` to provide ordering hints (0 for root, 1 for child, etc.)
- Validate that parent references exist before batch submission
- Remember: `parentTaskId` is for existing tasks, `parentTempId` is for
  batch-local references

## Testing Approach

Currently no automated tests. When adding tests:

- Mock `executeJXA()` to avoid requiring OmniFocus installation
- Test JXA string generation separately from execution
- Validate cycle detection in batch operations
- Test date parsing and formatting edge cases

## Claude Desktop Integration

The server is installed via npm and invoked with:

```json
{
  "mcpServers": {
    "omnifocus-pro": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp-pro"]
    }
  }
}
```

The `cli.cjs` wrapper handles npm invocation and starts the built server.

## Common Gotchas

| Gotcha | Why It Happens | How to Avoid |
|--------|----------------|--------------|
| Build before test | Server runs from `dist/`, not `src/` | Use `npm run dev` for watch mode |
| JXA syntax errors | Missing quotes or escaping causes silent failures | Test in Script Editor first |
| Date timezones | OmniFocus interprets local time | Always use explicit ISO 8601 format |
| Perspective state | OmniJS can't switch perspectives programmatically | Document limitation in tool description |
| Batch partial failures | One invalid item doesn't fail the whole batch | Always check individual result statuses |
| Empty JXA results | JXA errors often produce empty output, not errors | Wrap everything in try-catch with JSON returns |
| SDK type arguments | `RequestHandlerExtra` requires 2 type params in SDK 1.15.x+ | Use `RequestHandlerExtra<ServerRequest, ServerNotification>` in all handler signatures |
| Module resolution | Legacy `"moduleResolution": "node"` causes infinite type recursion | Use `"moduleResolution": "NodeNext"` and `"module": "NodeNext"` in tsconfig.json |

## Active Technologies
- TypeScript 5.9+ targeting ES2024 + @modelcontextprotocol/sdk 1.24.3, Zod 4.1.x (001-tooling-modernization)
- N/A (file-based JXA scripts only) (001-tooling-modernization)

## Recent Changes
- 001-tooling-modernization: Added TypeScript 5.9+ targeting ES2024 + @modelcontextprotocol/sdk 1.24.3, Zod 4.1.x
