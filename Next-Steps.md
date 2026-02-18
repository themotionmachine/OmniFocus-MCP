# Next Steps

## Phase 1: Add Test Harness (separate session)

### Setup

- Install **Vitest** as dev dependency: `npm install --save-dev vitest`
- Add to `package.json` scripts: `"test": "vitest run"` and `"test:watch": "vitest"`
- No config file needed — Vitest works zero-config with this project's ESM + TypeScript setup
- Test files go next to source files as `*.test.ts` (Vitest convention)

### What to test

Cover the whole project

### Note on OmniFocus dependency

Most tests should NOT require OmniFocus to be running. The exported `editItem()`, `removeItem()`, etc. functions execute AppleScript via `osascript`, so they can't run in CI. Focus tests on the **script generation** and **pure logic** layers instead.

Do write a couple of end-to-end test, leveraging OmniFocus. But let the user run these manually. DO NOT INCLUDE them as part of the `npm test` suite.

---

## Phase 2: Fix Quote Escaping Bug (separate session, after Phase 1)

### The bug

When a task/project name contains double quotes (e.g., `Buy "special" items`) or other special characters, operations like edit, remove, add task, and add project fail with a JSON parse error. The AppleScript builds JSON by string concatenation and embeds the name directly without escaping, producing invalid JSON.
