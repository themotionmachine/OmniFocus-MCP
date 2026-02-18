# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OmniFocus MCP Server — a Model Context Protocol server that lets AI assistants interact with OmniFocus on macOS via AppleScript/JXA. Published to npm as `omnifocus-mcp`.

## Build & Development Commands

```bash
npm run build        # TypeScript compile + copy OmniJS scripts + chmod dist/server.js
npm run dev          # TypeScript watch mode (tsc -w)
npm start            # Run the server (node dist/server.js)
```

The build step copies `src/utils/omnifocusScripts/*.js` into `dist/utils/omnifocusScripts/` since these are raw JS files executed inside OmniFocus, not TypeScript.

There are no tests or linting configured.

## Architecture

### Two-Layer Tool Pattern

Every tool follows a **definitions → primitives** split:

- **`src/tools/definitions/*.ts`** — MCP interface layer. Declares Zod schemas for parameters, handles request/response formatting, returns `{content: [{type: "text", text: "..."}]}` for Claude.
- **`src/tools/primitives/*.ts`** — Business logic. Talks to OmniFocus, returns raw `{success, error, ...}` result objects.

When adding a new tool: create both files, then register the tool in `src/server.ts`.

### OmniFocus Integration (`src/utils/`)

- **`scriptExecution.ts`** — Two execution modes:
  - `executeJXA(script)`: runs raw JXA via `osascript`
  - `executeOmniFocusScript(scriptPath, args)`: loads an OmniJS script from `src/utils/omnifocusScripts/`, wraps it in JXA, executes in OmniFocus context
- **`omnifocusScripts/*.js`** — OmniJS scripts that run inside OmniFocus's JS automation context (not Node.js). These are plain JS, not TypeScript.
- **`dateFormatting.ts`** — Workarounds for AppleScript date construction restrictions. Dates must be created outside `tell` blocks.
- **`cacheManager.ts`** — Singleton in-memory LRU cache (5min TTL, 50MB max) with checksum-based invalidation.

### Type System

- **`src/types.ts`** — OmniJS enum mappings (Task.Status, Project.Status, etc.)
- **`src/omnifocustypes.ts`** — TypeScript interfaces for OmniFocus objects (OmnifocusTask, OmnifocusProject, OmnifocusFolder, OmnifocusTag, OmnifocusPerspective)

### Entry Points

- `src/server.ts` — MCP server setup, tool registration
- `cli.cjs` — npm binary entry point, spawns `node dist/server.js`

## Key Conventions

- **ESM modules** throughout (`"type": "module"` in package.json)
- **Strict TypeScript** targeting ES2022
- **Zod** for all tool parameter validation
- **Error pattern**: primitives return `{success: boolean, error?: string, ...}`, definitions wrap in MCP response format
- **AppleScript escaping**: be careful with special characters (apostrophes, quotes) in strings passed to JXA
- **Batch operations** (`batchAddItems.ts`): support `tempId`/`parentTempId` for within-batch parent references, with cycle detection via DFS

## Dependencies

Only two production dependencies: `@modelcontextprotocol/sdk` and `zod`. OmniFocus communication uses Node.js built-in `child_process` to run `osascript`.
