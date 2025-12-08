# Copilot Instructions

Repository-wide instructions for GitHub Copilot coding agent and code review.

## Project Overview

**omnifocus-mcp-pro** - Professional-grade Model Context Protocol (MCP) server providing comprehensive OmniFocus integration with 62 automation tools. Enables AI assistants (like Claude) to interact with OmniFocus task management through natural language.

**Key Features:** Perspectives management, Review system, TaskPaper import/export, Forecast, Window/UI control, advanced bulk operations, and query capabilities.

## Tech Stack

- **Runtime:** Node.js 22+
- **Language:** TypeScript 5.3+
- **MCP Framework:** @modelcontextprotocol/sdk ^1.8.0
- **Validation:** Zod ^3.22.4
- **Automation:** JXA (JavaScript for Automation) via AppleScript
- **Package Manager:** npm (NOT pnpm or yarn)
- **Platform:** macOS only (requires OmniFocus)

## Build & Development Commands

All commands run from project root:

```bash
npm install           # Install dependencies
npm run build         # Compile TypeScript + copy JXA scripts
npm run start         # Start the MCP server (requires build first)
npm run dev           # Watch mode (auto-recompile on changes)
```

**Important:** Always `npm run build` after code changes - the server runs from `dist/`, not `src/`

## Project Structure

```
omnifocus-mcp-pro/
├── src/
│   ├── server.ts                    # MCP server entry point
│   ├── tools/
│   │   ├── definitions/             # Tool schemas + MCP handlers
│   │   └── primitives/              # Core business logic
│   ├── utils/
│   │   ├── scriptExecution.ts       # JXA execution wrapper
│   │   └── omnifocusScripts/        # Pre-built JXA scripts
│   │       ├── omnifocusDump.js
│   │       ├── listPerspectives.js
│   │       └── getPerspectiveView.js
│   └── omnifocustypes.ts            # TypeScript type definitions
├── dist/                            # Compiled output (git-ignored)
├── cli.cjs                          # npm bin entry point
└── CLAUDE.md                        # Claude Code integration docs
```

## Code Style Requirements

### MCP Tool Definitions

Tools consist of two parts:
1. **Definition** (`src/tools/definitions/`) - Schema + MCP-facing handler
2. **Primitive** (`src/tools/primitives/`) - Core business logic

**Pattern:**
```typescript
// src/tools/definitions/myTool.ts
import { z } from 'zod';
import { myToolPrimitive } from '../primitives/myTool';

export const myToolSchema = z.object({
  taskId: z.string().describe('OmniFocus task ID'),
  newName: z.string().optional().describe('New name for the task'),
});

export async function myToolHandler(params: z.infer<typeof myToolSchema>) {
  try {
    const result = await myToolPrimitive(params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
}
```

### JXA Script Generation

When building JXA dynamically (e.g., in query tools):
- Use template literals carefully - backticks inside JXA need escaping
- Always wrap in IIFE: `(function() { ... })()`
- Return JSON: `return JSON.stringify({ success: true, data: result })`
- Include error handling: try-catch around all OmniFocus operations
- Use OmniFocus object model methods: `.tasks.whose()`, not SQL
- Date comparisons: `.getTime()` for milliseconds since epoch

**Example:**
```typescript
const jxaScript = `
(function() {
  const app = Application('OmniFocus');
  app.includeStandardAdditions = true;

  try {
    const doc = app.defaultDocument;
    const tasks = doc.flattenedTasks.whose({
      _and: [
        { completed: false },
        { effectiveDueDate: { _lessThan: new Date() } }
      ]
    });

    return JSON.stringify({
      success: true,
      data: tasks.map(t => ({ id: t.id(), name: t.name() }))
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
})();
`;
```

### TypeScript Patterns

- **Always use Zod schemas** for MCP tool parameters
- **Structured error handling** - Return objects, don't throw in handlers
- **Type safety** - Use `z.infer<typeof schema>` for parameter types
- **Date handling** - Accept ISO 8601 strings, convert to Date objects for JXA
- **Null safety** - Use optional chaining and nullish coalescing

### OmniFocus Domain Model

Follow the type definitions in `src/omnifocustypes.ts`:
- **Task.Status**: `available`, `completed`, `dropped`
- **Project.Status**: `active`, `done`, `dropped`, `onHold`
- **Hierarchy**: Tasks can have parent tasks, projects, or be top-level
- **Dates**: `dueDate`, `deferDate` (Date objects in JXA)
- **Tags**: Multiple tags per task/project

## Validation Steps

Before committing, ensure:

1. **TypeScript compiles:** `npm run build` succeeds
2. **No type errors:** Implicit via build (tsconfig.json has strict mode)
3. **JXA scripts copied:** Check `dist/utils/omnifocusScripts/` exists
4. **Server starts:** `npm run start` doesn't crash immediately

## Testing MCP Tools

Since this is an MCP server, testing requires an MCP client:

1. **Build the project:** `npm run build`
2. **Configure Claude Desktop:** Add to `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "omnifocus-pro-dev": {
         "command": "node",
         "args": ["/absolute/path/to/omnifocus-mcp-pro/dist/server.js"]
       }
     }
   }
   ```
3. **Restart Claude Desktop**
4. **Test in conversation:** Ask Claude to use the tool

**Note:** For local development, use absolute path to `dist/server.js` instead of `npx omnifocus-mcp-pro`

## Dependencies & Imports

- **MCP SDK:** `@modelcontextprotocol/sdk` - Server, tools, stdio transport
- **Validation:** `zod` - Schema definition and runtime validation
- **Built-in:** `child_process` - For executing osascript commands
- **Built-in:** `fs/promises` - For writing temp JXA files

**Import patterns:**
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { executeJXA } from './utils/scriptExecution.js';
```

## Common Gotchas

1. **Build before test** - Server runs from `dist/`, not `src/`
2. **JXA syntax errors** - Missing quotes or improper escaping causes silent failures
3. **Date timezones** - Be explicit with ISO 8601 format; OmniFocus interprets local time
4. **Perspective state** - `get_perspective_view` reflects current UI state, not programmatic switch
5. **Batch failures** - One invalid item doesn't fail entire batch; check individual statuses
6. **Large databases** - `dump_database` can timeout; use `query_omnifocus` with filters instead

## Batch Operations

When implementing batch tools:
- **Topological sort** - Process items in dependency order (parents before children)
- **Cycle detection** - Fail immediately if `tempId` references create cycles
- **Temp ID mapping** - Track `tempId` → real OmniFocus ID for within-batch references
- **Individual results** - Return success/failure for each item at original array index

## Error Messages

Provide actionable error messages:
- ✅ "Task with ID 'abc123' not found in OmniFocus"
- ✅ "Invalid date format '2024-13-45'. Use ISO 8601 (YYYY-MM-DD)"
- ❌ "Error in JXA script"
- ❌ "Operation failed"

## Documentation

- Update `CLAUDE.md` if adding new tools or changing behavior
- Update `README.md` for user-facing features
- Update `docs/RELEASE_PROCESS.md` if changing build/publish workflow
- Add tool descriptions in `.github/instructions/mcp-tools.instructions.md`

## Publishing

Releases are triggered by GitHub Releases:
1. Update `package.json` version: `npm version 1.2.4 --no-git-tag-version`
2. Commit to main branch
3. Create GitHub Release with tag `v1.2.4`
4. GitHub Actions automatically publishes to npm

See `docs/RELEASE_PROCESS.md` for complete process.
