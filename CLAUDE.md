# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OmniFocus MCP Server is a Model Context Protocol (MCP) server that bridges AI assistants with OmniFocus task management. It uses JXA (JavaScript for Automation) via AppleScript to interact with OmniFocus on macOS.

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

**MCP Server** (`src/server.ts`)
- Entry point that registers all tools with the MCP SDK
- Uses `StdioServerTransport` for stdio-based communication
- Each tool is registered with its schema and handler

**Tool Organization**
- `src/tools/definitions/`: Tool schemas and MCP-facing handlers (defines tool interface)
- `src/tools/primitives/`: Core business logic for each tool (actual implementation)
- Separation allows clean MCP registration while keeping logic testable

**Script Execution** (`src/utils/scriptExecution.ts`)
- `executeJXA()`: Writes JXA scripts to temp files and executes via `osascript -l JavaScript`
- All OmniFocus interactions go through JXA, not direct AppleScript
- Returns parsed JSON results

**Pre-built JXA Scripts** (`src/utils/omnifocusScripts/*.js`)
- `omnifocusDump.js`: Full database dump (used by `dump_database`)
- `listPerspectives.js`: Lists all perspectives
- `getPerspectiveView.js`: Gets items in current perspective view
- These are copied during build to `dist/utils/omnifocusScripts/`

### Key Architectural Patterns

**Query vs Dump Strategy**
- `query_omnifocus`: Generates JXA dynamically for targeted queries with filters
- `dump_database`: Uses pre-built `omnifocusDump.js` for full database export
- Query is faster for specific lookups; dump is better for comprehensive analysis

**Batch Operations**
- `batchAddItems`: Processes items in dependency order using topological sort
- Detects cycles in `tempId` → `parentTempId` references
- Maps temporary IDs to real OmniFocus IDs for within-batch parent-child relationships
- Supports `hierarchyLevel` for ordering hints

**Hierarchy Management**
- Tasks can reference parents via `parentTaskId` (existing ID) or `parentTaskName` (name lookup)
- Batch operations support `parentTempId` to reference items being created in same batch
- Cycle detection prevents infinite loops in parent-child relationships

**Type System** (`src/omnifocustypes.ts`)
- Defines TypeScript enums matching OmniFocus object model (Task.Status, Project.Status, etc.)
- Minimal interfaces for core objects (TaskMinimal, ProjectMinimal, FolderMinimal, TagMinimal)
- Used for type safety when building JXA queries and parsing results

### Tool Categories

**Query Tools**
- `query_omnifocus`: Targeted queries with filters, sorting, field selection
- `dump_database`: Full database export (warning: can timeout on large databases)
- `list_perspectives`: List available perspectives
- `get_perspective_view`: Get items in a perspective (requires perspective to be open)

**Single Item Operations**
- `add_omnifocus_task`: Create one task
- `add_project`: Create one project
- `edit_item`: Modify task or project by ID or name
- `remove_item`: Delete task or project by ID or name

**Batch Operations**
- `batch_add_items`: Create multiple tasks/projects with hierarchy support
- `batch_remove_items`: Delete multiple items at once

## Important Implementation Details

### JXA Script Generation

When modifying query logic, the JXA is built as a string in `src/tools/primitives/queryOmnifocus.ts`. Key considerations:
- Use template literals carefully (backticks inside JXA need escaping)
- OmniFocus object model uses methods like `.tasks.whose()`, not SQL
- Date comparisons in JXA use `.getTime()` for milliseconds since epoch
- Always wrap JXA in try-catch and return JSON

### Date Handling

- Dates from tools come as ISO 8601 strings
- JXA converts to JavaScript Date objects: `new Date("2024-12-25T00:00:00Z")`
- OmniFocus stores dates as Date objects
- When querying, compare using `.getTime()` for timestamp comparison

### Perspective Limitations

`get_perspective_view` cannot programmatically switch perspectives due to OmniJS limitations. The user must manually switch to the desired perspective before calling the tool, or the tool will return items from whatever perspective is currently active.

### Database Size Issues

The `dump_database` tool can timeout on very large OmniFocus databases. For large databases:
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
- Remember: `parentTaskId` is for existing tasks, `parentTempId` is for batch-local references

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

1. **Build before test**: Always `npm run build` after changes - the server runs from `dist/`, not `src/`
2. **JXA syntax errors**: Missing quotes or improper escaping in generated JXA causes silent failures
3. **Date timezones**: Be explicit with ISO 8601 format; OmniFocus interprets local time
4. **Perspective state**: `get_perspective_view` reflects current UI state, not a named perspective lookup
5. **Batch failures**: One invalid item doesn't fail the batch - check individual result statuses
