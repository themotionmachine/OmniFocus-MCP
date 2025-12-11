# Key Implementation Details

## JXA Script Execution

See `.claude/rules/jxa-development.md` for detailed JXA patterns.

Key flow: `executeJXA()` writes script to temp file → executes via osascript → parses JSON → cleans up.

## Two Query Strategies

### 1. Dynamic Query Generation (`query_omnifocus`)
- Builds JXA scripts dynamically based on filters
- Fast and targeted for specific queries
- Supports filtering, sorting, field selection
- Used for: "Show me flagged tasks due this week"

### 2. Pre-built Scripts (`dump_database`)
- Uses pre-built `omnifocusDump.js` script
- Comprehensive full database export
- Can timeout on large databases
- Used for: Complete analysis or when you need everything

## Batch Operations Architecture

### Cycle Detection (batchAddItems)
Batch operations detect cycles in parent-child relationships:

1. Build dependency graph from `tempId` → `parentTempId` references
2. Run DFS to detect cycles
3. Mark cyclic items as failed before processing
4. Process remaining items in topological order (parents before children)
5. Map `tempId` → real OmniFocus ID for within-batch references

### Hierarchy Establishment
- `parentTaskId`: Reference existing task by real ID
- `parentTaskName`: Find existing task by name (fallback)
- `parentTempId`: Reference task being created in same batch
- `hierarchyLevel`: Optional ordering hint (0=root, 1=child, etc.)

## Date Handling Chain

1. **Input**: ISO 8601 strings from MCP tools (e.g., "2024-12-25T00:00:00Z")
2. **JXA**: Convert to JavaScript Date objects: `new Date("2024-12-25T00:00:00Z")`
3. **OmniFocus**: Stores as native Date objects
4. **Comparison**: Use `.getTime()` for millisecond timestamp comparison
5. **Output**: Convert back to ISO 8601 for MCP response

## Type System Pattern

### Enums for OmniFocus States
```typescript
namespace Task {
  enum Status { Available, Blocked, Completed, Dropped, DueSoon, Next, Overdue }
}
namespace Project {
  enum Status { Active, Done, Dropped, OnHold }
}
```

### Minimal Interfaces
- `TaskMinimal`, `ProjectMinimal`, `FolderMinimal`, `TagMinimal`
- Only include fields actually used by the system
- Extend `DatabaseObject` for ID structure

## Perspective Limitations

**Cannot programmatically switch perspectives** due to OmniJS API limitations:
- `list_perspectives`: Lists all available perspectives ✅
- `get_perspective_view`: Returns items in **current** perspective ⚠️
- User must manually switch to desired perspective in OmniFocus UI
- Tool reflects whatever perspective is currently active

## Build Process Details

1. TypeScript compilation: `tsc` (src/ → dist/)
2. Copy JXA scripts: `cp src/utils/omnifocusScripts/*.js dist/utils/omnifocusScripts/`
3. Make executable: `chmod 755 dist/server.js`

**Important**: Watch mode (`npm run dev`) only recompiles TypeScript, doesn't copy JXA scripts. Must run full build if JXA scripts change.

## MCP Integration

Server uses stdio transport for MCP communication:
```typescript
const server = new McpServer({ name: "OmniFocus MCP", version: "1.0.0" });
const transport = new StdioServerTransport();
await server.connect(transport);
```

Invoked via npm: `npx -y omnifocus-mcp` (handled by `cli.cjs` wrapper)
