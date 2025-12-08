# Codebase Structure

## Directory Layout

```
omnifocus-mcp/
├── src/                          # TypeScript source files
│   ├── server.ts                 # Main MCP server entry point
│   ├── omnifocustypes.ts        # OmniFocus type definitions (enums, interfaces)
│   ├── types.ts                 # General type definitions
│   ├── tools/                   # MCP tools
│   │   ├── definitions/         # Tool schemas & MCP handlers (interface layer)
│   │   │   ├── addOmniFocusTask.ts
│   │   │   ├── addProject.ts
│   │   │   ├── batchAddItems.ts
│   │   │   ├── batchRemoveItems.ts
│   │   │   ├── editItem.ts
│   │   │   ├── removeItem.ts
│   │   │   ├── queryOmnifocus.ts
│   │   │   ├── dumpDatabase.ts
│   │   │   ├── listPerspectives.ts
│   │   │   └── getPerspectiveView.ts
│   │   └── primitives/          # Core business logic (implementation)
│   │       ├── addOmniFocusTask.ts
│   │       ├── addProject.ts
│   │       ├── batchAddItems.ts
│   │       ├── batchRemoveItems.ts
│   │       ├── editItem.ts
│   │       ├── removeItem.ts
│   │       ├── queryOmnifocus.ts
│   │       ├── queryOmnifocusDebug.ts
│   │       ├── listPerspectives.ts
│   │       └── getPerspectiveView.ts
│   ├── utils/                   # Utility functions
│   │   ├── scriptExecution.ts   # JXA execution wrapper
│   │   ├── dateFormatting.ts    # Date utilities
│   │   ├── cacheManager.ts      # Cache management
│   │   └── omnifocusScripts/    # Pre-built JXA scripts
│   │       ├── omnifocusDump.js       # Full database dump
│   │       ├── listPerspectives.js    # List perspectives
│   │       └── getPerspectiveView.js  # Get perspective items
├── dist/                        # Compiled JavaScript (generated)
├── docs/                        # Documentation
├── assets/                      # Images and assets
├── cli.cjs                      # npm CLI wrapper
├── package.json                 # npm configuration
├── tsconfig.json               # TypeScript configuration
├── CLAUDE.md                   # Claude Code guidance
├── README.md                   # User documentation
├── QUERY_TOOL_REFERENCE.md     # Query tool field reference
└── QUERY_TOOL_EXAMPLES.md      # Query tool examples
```

## Architectural Layers

### 1. MCP Server Layer (`src/server.ts`)
- Registers all tools with MCP SDK
- Uses StdioServerTransport for stdio communication
- Routes tool calls to handlers

### 2. Tool Definition Layer (`src/tools/definitions/`)
- Defines Zod schemas for tool parameters
- Exports MCP-facing handlers
- Validates input and formats output for MCP protocol

### 3. Business Logic Layer (`src/tools/primitives/`)
- Implements actual OmniFocus operations
- Generates dynamic JXA scripts or uses pre-built ones
- Handles error cases and response formatting

### 4. Execution Layer (`src/utils/scriptExecution.ts`)
- Executes JXA scripts via `osascript -l JavaScript`
- Manages temp file creation and cleanup
- Parses JSON responses

### 5. Type System (`src/omnifocustypes.ts`)
- Defines TypeScript enums matching OmniFocus object model
- Minimal interfaces for core objects
- Type safety for JXA query building
