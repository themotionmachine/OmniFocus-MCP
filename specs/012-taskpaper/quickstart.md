# Quickstart: TaskPaper Import/Export

**Branch**: `012-taskpaper` | **Date**: 2026-03-20

## What This Feature Does

Adds 3 MCP tools for TaskPaper transport text handling:

1. **import_taskpaper** - Import transport text to create tasks/projects in OmniFocus
2. **export_taskpaper** - Export projects, folders, or tasks to transport text format
3. **validate_transport_text** - Parse and validate transport text without modifying OmniFocus

## Architecture Overview

```text
src/contracts/taskpaper-tools/     # Zod schemas (3 tool contracts + shared types)
src/tools/definitions/              # MCP tool handlers (3 files)
src/tools/primitives/               # Business logic (3 files)
tests/contract/taskpaper-tools/     # Contract tests
tests/unit/taskpaper-tools/         # Unit tests
```

### Tool → Primitive → OmniJS Flow

| Tool | Primitive | Execution |
|------|-----------|-----------|
| import_taskpaper | importTaskpaper.ts | OmniJS: `byParsingTransportText` + recursive ID walk + optional `moveTasks` |
| export_taskpaper | exportTaskpaper.ts | OmniJS: Custom serializer reads properties, builds transport text |
| validate_transport_text | validateTransportText.ts | **Pure TypeScript** (no OmniJS, no temp file) |

## Key Design Decisions

1. **validate_transport_text is pure TypeScript** -- no OmniJS dependency, no temp file, no executeOmniFocusScript. Just a function that parses text and returns structured data.

2. **Import uses two-phase approach** for target project placement: create in inbox via `byParsingTransportText(text, null)`, then `moveTasks()` to target.

3. **Export uses custom OmniJS serializer** -- no built-in serialization API exists. Recursively walks task trees building transport text with proper indentation.

4. **Export scope is mutually exclusive** -- exactly one of `projectId`, `folderId`, or `taskIds` must be provided (Zod `.refine()` validation).

## File Inventory

### Contracts (src/contracts/taskpaper-tools/)

| File | Purpose |
|------|---------|
| index.ts | Barrel exports |
| import-taskpaper.ts | Import input/response schemas |
| export-taskpaper.ts | Export input/response schemas |
| validate-transport-text.ts | Validation input/response schemas |
| shared/index.ts | Shared type barrel |
| shared/import-types.ts | CreatedItem, ImportSummary |
| shared/export-types.ts | TaskpaperStatusFilter, ExportSummary |
| shared/validation-types.ts | ParsedItem, ValidationSummary, ValidationWarning |

### Definitions (src/tools/definitions/)

| File | Purpose |
|------|---------|
| importTaskpaper.ts | MCP handler for import_taskpaper |
| exportTaskpaper.ts | MCP handler for export_taskpaper |
| validateTransportText.ts | MCP handler for validate_transport_text |

### Primitives (src/tools/primitives/)

| File | Purpose |
|------|---------|
| importTaskpaper.ts | OmniJS script generation + execution for import |
| exportTaskpaper.ts | OmniJS script generation + execution for export |
| validateTransportText.ts | Pure TypeScript transport text parser |

### Tests

| Directory | Purpose |
|-----------|---------|
| tests/contract/taskpaper-tools/ | Schema validation tests |
| tests/unit/taskpaper-tools/ | Primitive business logic tests |

## Build & Test

```bash
pnpm build        # Compile TypeScript
pnpm test         # Run all tests
pnpm typecheck    # Type checking
pnpm lint         # Biome lint
```

## Transport Text Format Reference

```text
- Buy groceries @errands @due(2026-03-25) @flagged
	- Milk @estimate(5m)
	- Eggs
	- Bread //whole wheat preferred
Project Name:
	- First task @defer(2026-03-21) @due(2026-03-28)
	- Second task @done(2026-03-20)
```

### Recognized Tokens

| Token | Meaning | Example |
|-------|---------|---------|
| `- Task name` | Task | `- Buy groceries` |
| `Project Name:` | Project header | `My Project:` |
| `@tag` | Tag | `@errands` |
| `@due(date)` | Due date | `@due(2026-03-25)` |
| `@defer(date)` | Defer date | `@defer(2026-03-21)` |
| `@done(date)` | Completion date | `@done(2026-03-20)` |
| `@estimate(dur)` | Estimated duration | `@estimate(30m)` |
| `@flagged` | Flagged status | `@flagged` |
| `//note` | Note text | `//whole wheat preferred` |
| Tab indent | Subtask hierarchy | `\t- Subtask` |
| `@autodone` | Auto-complete (recognized, not exported) | `@autodone(true)` |
| `@parallel` | Parallel (recognized, not exported) | `@parallel(true)` |
| `@repeat-method` | Repeat method (recognized, not exported) | `@repeat-method(fixed)` |
| `@repeat-rule` | Repeat rule (recognized, not exported) | `@repeat-rule(FREQ=WEEKLY)` |
