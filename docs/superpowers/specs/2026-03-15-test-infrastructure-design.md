# Test Infrastructure Design

## Summary

Add Vitest test infrastructure to the OmniFocus MCP server. Export `generateAppleScript` functions from primitives for direct unit testing. Write thorough structural tests for new/changed code and smoke tests for existing primitives. Add a `prepare` script to `package.json` so TypeScript compiles on install.

## Motivation

The codebase has zero tests. Recent improvements (task project moves, folder path disambiguation, AppleScript fixes) generate complex AppleScript strings that are easy to get wrong and hard to manually verify. Pure function testing catches regressions without needing OmniFocus running.

## Framework

**Vitest** — native ESM and TypeScript support, zero-config for this project shape, fast execution.

## Test Strategy

**Structural assertions** — tests assert that generated AppleScript contains (or doesn't contain) specific commands and patterns. This tests intent rather than exact formatting, making tests resilient to whitespace or ordering changes.

**Co-located test files** — `*.test.ts` files sit next to the source files they test.

## Source Changes

Export `generateAppleScript` from these primitives (function is currently private in each):

- `src/tools/primitives/editItem.ts`
- `src/tools/primitives/addProject.ts`
- `src/tools/primitives/addOmniFocusTask.ts`
- `src/tools/primitives/removeItem.ts`

Note: `batchAddItems.ts` is excluded — it is an orchestrator that delegates to `addOmniFocusTask`/`addProject` and has no `generateAppleScript` function of its own.

No other source logic changes. The functions are internal server modules, not a public library API.

## Test Files

### `src/utils/appleScriptHelpers.test.ts` — Thorough

Tests for `generateFolderLookupScript`:

- Single-name folder lookup (e.g., `"Work"`) — generates `first flattened folder where name =`
- Multi-segment path (e.g., `"Work/Engineering"`) — generates ancestor chain walk
- Three-level path (e.g., `"A/B/C"`) — correct component count and leaf name
- Special characters in folder name (quotes, backslashes) — properly escaped
- Empty/whitespace input — returns `missing value` assignment
- Error return JSON — embedded correctly in `return` statement

### `src/tools/primitives/editItem.test.ts` — Thorough (new code)

Tests for `generateAppleScript`:

- `newProjectName` set to a project name — contains `move foundItem to destProject` and project lookup loop
- `newProjectName` set to empty string — contains `set assigned container of foundItem to missing value`
- `newProjectName` set to `"inbox"` — same inbox behavior as empty string
- `newStatus: "dropped"` — contains `mark dropped foundItem`, does NOT contain `set dropped of`
- `newStatus: "incomplete"` — contains `mark incomplete foundItem`, does NOT contain `set completed of foundItem to false`
- `newStatus: "completed"` — contains `mark complete foundItem` (existing, unchanged)
- `newFolderName` with path — contains ancestor chain walk (from `generateFolderLookupScript`)
- Tag add/remove/replace — generates correct AppleScript (smoke level)
- Requires either `id` or `name` — error return when both missing

### `src/tools/primitives/addProject.test.ts` — Thorough (changed code)

Tests for `generateAppleScript`:

- No folder — contains `make new project with properties` at root
- Simple folder name — contains folder lookup
- Nested folder path — contains ancestor chain walk
- Special characters in project name — properly escaped
- Note with quotes — properly escaped
- Tags — generates tag lookup/creation blocks
- Sequential flag — generates `set sequential of newProject to true/false`

### `src/tools/primitives/addOmniFocusTask.test.ts` — Smoke

- Basic task (name only) — generates `make new inbox task`
- Task with project — generates project lookup and `make new task ... at end of tasks of theProject`

### `src/tools/primitives/removeItem.test.ts` — Smoke

- Remove task by name — generates task search loop

## Configuration

### `vitest.config.ts` (project root)

Minimal config pointing at `src/`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

### `tsconfig.json`

Exclude test files from compilation output (they shouldn't end up in `dist/`):

```json
"exclude": ["node_modules", "dist", "src/**/*.test.ts"]
```

### `package.json` changes

```json
"scripts": {
  "test": "vitest run",
  "prepare": "npm run build",   # replaces existing prepublishOnly
  ...existing scripts...
},
"devDependencies": {
  "vitest": "^3.1.0",
  ...existing deps...
}
```

## What Is NOT In Scope

- Integration tests that require OmniFocus running
- Tests for the JXA/OmniJS query scripts (`queryOmnifocus`, `dumpDatabase`, `listPerspectives`, etc.) — these generate JavaScript, not AppleScript, and would need a different testing approach
- Tests for MCP resource handlers or server registration
- Mocking `execAsync` for end-to-end primitive testing
