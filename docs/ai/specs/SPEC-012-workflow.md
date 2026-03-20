# SpecKit Workflow: SPEC-012 — TaskPaper Import/Export

**Created**: 2026-03-20
**Purpose**: Track SPEC-012 through all 7 SpecKit phases with review gates.

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ✅ Complete | 10 FRs, 3 user stories, 14 scenarios, 7 edge cases |
| Clarify | `/speckit.clarify` | ✅ Complete | 2 sessions, 10 questions answered; null param, moveTasks placement, parsed validator, status filter, sync-only confirmed |
| Plan | `/speckit.plan` | ✅ Complete | 8 ADs, 8 RTs, 8 contract files, 10/10 constitution pass |
| Checklist | `/speckit.checklist` | ⏳ Pending | Run for each domain |
| Tasks | `/speckit.tasks` | ⏳ Pending | |
| Analyze | `/speckit.analyze` | ⏳ Pending | |
| Implement | `/speckit.implement` | ⏳ Pending | |

**Status Legend:** ⏳ Pending | 🔄 In Progress | ✅ Complete | ⚠️ Blocked

### Phase Gates

| Gate | Checkpoint | Approval Criteria |
|------|------------|-------------------|
| G1 | After Specify | All user stories clear, no `[NEEDS CLARIFICATION]` markers |
| G2 | After Clarify | Ambiguities resolved, decisions documented (especially parse_transport_text scope and export strategy) |
| G3 | After Plan | Architecture approved, constitution gates pass |
| G4 | After Checklist | All `[Gap]` markers addressed |
| G5 | After Tasks | Task coverage verified, dependencies ordered |
| G6 | After Analyze | No `CRITICAL` issues |
| G7 | After Implement | Tests pass, manual verification complete |

---

## Prerequisites

### Constitution Validation

**Before starting any workflow phase**, verify alignment with the project constitution (`.specify/memory/constitution.md` v2.0.0):

| Principle | Requirement | Verification | Status |
|-----------|-------------|--------------|--------|
| I. Type-First Development | All functions typed, Zod contracts | `pnpm typecheck` | ✅ Pass |
| II. Separation of Concerns | definitions/ + primitives/ split | Code review | ✅ 65 definitions, 65 primitives |
| III. Script Execution Safety | OmniJS-only, try-catch + JSON | Script Editor test | ✅ Existing patterns verified |
| IV. Structured Data Contracts | Zod schemas for all inputs | Contract tests | ✅ 15 contract dirs |
| V. Defensive Error Handling | Structured errors, no swallowed exceptions | Unit tests | ✅ 4021 tests pass |
| VI. Build Discipline | `pnpm build` after changes | `pnpm build` | ✅ Pass (ESM + CJS) |
| VII. KISS | Simple, boring solutions | Code review | ✅ Verified |
| VIII. YAGNI | No premature abstractions | Code review | ✅ Verified |
| IX. SOLID | Single responsibility | Code review | ✅ Verified |
| X. TDD | Red-Green-Refactor cycle | Test-first workflow | ✅ 203 test files |

**Constitution Check:** ✅ Verified 2026-03-20 — Constitution v2.0.0 (RATIFIED), all principles satisfied

**Baseline Snapshot:**

- Typecheck: clean
- Tests: 4021 passing / 203 files
- Build: clean (ESM + CJS)
- Lint: 586 files, 0 errors (1 warning, 3 infos)
- Branch: `012-taskpaper` (worktree)

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-012 |
| **Name** | TaskPaper Import/Export |
| **Branch** | `012-taskpaper` |
| **Dependencies** | None (Phases 0-5 complete, all Tier 1-3 specs complete) |
| **Enables** | Clears path to SPEC-016-017, 018-019, then SPEC-020/021 |
| **Priority** | P2 |
| **Tier** | 3 (parallel with SPEC-010, SPEC-014 — both already complete) |

### Success Criteria Summary

- [ ] 3 MCP tools implemented: `import_taskpaper`, `export_taskpaper`, `validate_transport_text`
- [ ] Zod contracts in `src/contracts/taskpaper-tools/`
- [ ] `import_taskpaper`: calls `Task.byParsingTransportText(text, false)` — creates ALL tasks from transport text, returns created task IDs
- [ ] `export_taskpaper`: generates transport text from existing tasks/projects — custom serializer (OmniJS has no built-in per-item export)
- [ ] `validate_transport_text`: pure TypeScript validator — checks transport text format WITHOUT creating tasks (replaces the originally proposed parse_transport_text dry-run, which is impossible in OmniJS)
- [ ] Import supports optional target project/folder placement
- [ ] Export accepts project ID, folder ID, or array of task IDs to scope export
- [ ] Full TDD with contract + unit tests
- [ ] OmniJS scripts verified in Script Editor

---

## Research Findings (Pre-Loaded from API Research — 2026-03-20)

The following findings were researched from official OmniAutomation docs (omni-automation.com), the OmniJS API reference, and community examples BEFORE the SpecKit workflow began. They inform the Specify and Clarify phases.

### CONFIRMED: Task.byParsingTransportText() API

```javascript
// Signature (from omni-automation.com/omnifocus/task.html and omni-automation.com/omnifocus/OF-API.html):
Task.byParsingTransportText(text: String, singleTask: Boolean or null) → Array of Task

// singleTask=false or null → creates ALL tasks described in the text, returns all as array
// singleTask=true → creates ONLY the FIRST task, returns it inside a single-element array
// This is NOT a dry-run — tasks are created in the OmniFocus database immediately

// Example: Create all tasks from transport text
var tasks = Task.byParsingTransportText("Task A\nTask B", null);
// tasks[0], tasks[1] are the created Task objects

// Example: Create from transport text with project, flag, tag, date, estimate, note
var txt = "New Task!::Existing Project Title #12/12/26 8.30a $3h @existing-tag-name//This is the task note";
var newTasks = Task.byParsingTransportText(txt, true);
var taskID = newTasks.id.primaryKey;
```

**Key constraint:** There is NO dry-run / parse-only parameter. Task creation is always immediate.
**Placement:** Controlled via transport text content (:: notation for project, indentation for nesting), NOT via a separate API parameter.

### CONFIRMED: No Built-In Export for Specific Tasks/Projects

`document.makeFileWrapper(baseName, "com.omnigroup.omnifocus2.export-filetype.plain-text")` exports the **entire document** as TaskPaper text, not specific tasks or projects.

The "Export Selected Projects" Shortcuts example validates selection but still exports the full document:
```javascript
// This exports the WHOLE document (selection guard only):
var wrapper = await document.makeFileWrapper(baseName, typeID);
var wrapperContents = wrapper.contents.toString();
```

**IMPORTANT: makeFileWrapper is ASYNC** — returns a Promise and requires `await` / `.then()`. Our standard sync IIFE pattern must use `async function()` when calling this API.

For scoped export (specific tasks/projects), the Shortcuts API uses a pasteboard approach:
```javascript
// "Export Selected Tasks to Craft as TaskPaper" (from omni-automation.com):
var tasks = selection.tasks;
var clipboard = Pasteboard.makeUnique();
copyTasksToPasteboard(tasks, clipboard);   // <-- copyTasksToPasteboard() needs verification
var data = Data.fromString(clipboard.string);
```

**UNVERIFIED:** Whether `copyTasksToPasteboard(tasks, clipboard)` is a built-in OmniJS function available in automation scripts (not just Shortcuts integration). Must verify in Script Editor.

**DESIGN DECISION NEEDED (Clarify phase):** For `export_taskpaper`, choose one of:
- (A) Custom TypeScript serializer — reads Task/Project properties, generates transport text string manually (fully controllable, no async issues)
- (B) `document.makeFileWrapper` full-document export (returns everything, AI must filter client-side)
- (C) Pasteboard approach via `copyTasksToPasteboard` (if verified to work in non-Shortcuts context)

The master plan (SPEC-012 section) says: "Export is a custom implementation since OmniJS doesn't provide task-to-transport-text serialization." → Option A is the planned approach.

### CONFIRMED: parse_transport_text → Redesign as validate_transport_text

The original master plan noted: "There is NO dry-run capability in OmniJS." Research confirms this.

**Recommended redesign:** `validate_transport_text` — a **pure TypeScript function** that:
- Parses the transport text format using regex/string parsing
- Identifies what WOULD be created (task count, project assignments, tags, dates)
- Returns a validation report without touching OmniJS or the OmniFocus database
- Gives AI agents a way to check their generated text before calling `import_taskpaper`

This is safer, faster, and more testable than any OmniJS-based approach.

### CONFIRMED: Transport Text Syntax (OmniFocus)

Full reference from official docs and community examples:

```
Task name                     → basic task name
Task name!                    → flagged task (! at end or inline)
::Project Name                → assign to project (inline shorthand)
Project Name:                 → project header on its own line (TaskPaper style)
    Subtask name              → child task (indented under project or parent)
@tagname                      → assign tag/context
#2026-03-20                   → date (first # = defer, second # = due when both present)
#12/25/26 10:00a              → date with time
$3h or $30m                   → estimated duration ($ token)
~90m                          → estimated duration (~ token, community variant)
//This is a note              → note text (// starts note)

Full example:
"Buy groceries!::Errands #2026-03-21 $30m @home //Pick up items from list"
→ Creates "Buy groceries", flagged, in project "Errands", defer date 2026-03-21, 30min estimate, tag "home", note "Pick up items from list"

Project with nested tasks (TaskPaper style):
"Project Alpha:\n\tTask 1 @work\n\tTask 2 #2026-03-25 //details"
```

**Known ambiguities** (flag for Clarify):
- Date parsing: ISO yyyy-mm-dd vs locale formats — ISO is safer for programmatic use
- Duration: `$` vs `~` notation — `$` appears more common in official examples
- `singleTask: true` vs `null` — some forum posts recommend `null`; official docs say Boolean or null
- Whether `::` or trailing `:` is canonical for project assignment

### CONFIRMED: Async Support Needed

`document.makeFileWrapper` requires `async/await`. If Option B or C is used for export:
```javascript
// ASYNC OmniJS pattern (if needed):
(async function() {
  try {
    var wrapper = await document.makeFileWrapper("Export", "com.omnigroup.omnifocus2.export-filetype.plain-text");
    var text = wrapper.contents.toString();
    return JSON.stringify({ success: true, data: text });
  } catch(e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

**Question for Clarify:** Does `executeOmniFocusScript()` (our utility) support async IIFE scripts? Check `src/utils/` for how script output is captured. If Option A (custom serializer) is used, this is moot.

---

## Phase 1: Specify

**Output:** `specs/012-taskpaper/spec.md`

### Specify Prompt

```bash
/speckit.specify

## Feature: TaskPaper Import/Export

### Problem Statement
OmniFocus users working with AI assistants need a way to create tasks from structured
text (transport text / TaskPaper format) and export existing tasks back to text format
for sharing, archiving, or processing in other tools. Transport text is OmniFocus's
native plaintext interchange format — concise, human-readable, and machine-generatable.

### Users
GTD practitioners using AI assistants to bulk-create tasks from meeting notes, project
outlines, or structured text; and to export task lists for reporting or archiving.

### User Stories
1. As a GTD practitioner, I want to import a transport text string to create tasks/projects
   so an AI can generate a complete project structure from a single text description
2. As a GTD practitioner, I want to export specific tasks or a project to transport text
   so I can share, archive, or process the data in other tools
3. As a GTD practitioner, I want to validate transport text format before importing
   so I can catch syntax errors without accidentally creating junk tasks in OmniFocus

### Technical Context
- 3 MCP tools: import_taskpaper, export_taskpaper, validate_transport_text
- Zod contracts in src/contracts/taskpaper-tools/
- import_taskpaper uses Task.byParsingTransportText(text, false) — OmniJS API that
  creates ALL tasks from transport text and returns an Array of Task objects. There is
  NO dry-run parameter. Tasks are created immediately in the OmniFocus database.
- export_taskpaper is a CUSTOM IMPLEMENTATION in TypeScript/OmniJS — OmniJS has no
  built-in method to serialize a specific task or project to transport text. We must read
  task properties (name, tags, dates, note, flagged, estimate, subtasks) and build the
  transport text string ourselves.
  - document.makeFileWrapper("name", "com.omnigroup.omnifocus2.export-filetype.plain-text")
    exports the WHOLE document (not scoped) and is async (Promise-based). Avoid this
    unless full-document export is explicitly the use case.
- validate_transport_text is a PURE TYPESCRIPT VALIDATOR — no OmniJS, no OmniFocus
  database access. Parses the transport text format string and returns a dry-run report
  of what would be created (task count, project names, tag names, date fields) without
  touching the database. This is the safe alternative to the impossible "dry-run" approach.
- Transport text syntax: task name (optionally flagged with !), project assignment (::),
  project header lines (name:), nested tasks (indentation), tags (@tag), dates (#date),
  estimates ($3h), notes (//)
- import_taskpaper accepts optional target project ID for placement (if not specified in
  transport text itself; note: OmniJS byParsingTransportText placement is determined by
  the transport text content — a target project can be prepended to the text if needed)
- export_taskpaper accepts: projectId, folderId, OR array of taskIds to scope export
- Return created item IDs from import; return transport text string from export

### Constraints
- Follow definitions/primitives/contracts architecture
- All OmniJS scripts use IIFE + try-catch + JSON.stringify pattern
- validate_transport_text: NO OmniJS — pure TypeScript implementation in primitives/
- Zod 4.x for all input validation
- Transport text scope: OmniFocus transport text (a subset of full TaskPaper spec)
- Round-trip fidelity is limited: some OmniFocus properties (review interval, repetition
  rules, etc.) have no transport text representation — document this clearly

### Out of Scope
- Full TaskPaper application format compatibility (we target OmniFocus transport text only)
- Round-trip fidelity for all OmniFocus properties (review interval, repetition, etc.)
- Importing from a file path (text string input only — file I/O is out of scope)
- Async export using document.makeFileWrapper full-document export (too broad for MCP use)
```

### Specify Results

| Metric | Value |
|--------|-------|
| Functional Requirements | FR-001 through FR-010 (10 total) |
| User Stories | 3 (Import P1, Export P2, Validate P3) |
| Acceptance Criteria | 14 scenarios, 7 edge cases |

### Files Generated

- [ ] `specs/012-taskpaper/spec.md`
- [ ] `specs/012-taskpaper/checklists/requirements.md`

---

## Phase 2: Clarify (Recommended)

**Purpose:** Resolve the specific API ambiguities surfaced by research before design is locked.

### Clarify Prompts

#### Session 1: Import API and Placement

```bash
/speckit.clarify Focus on import_taskpaper implementation details:
- How should the optional target project parameter work? Should we prepend "ProjectName:\n\t"
  to the transport text before calling byParsingTransportText? Or use a different approach?
- What happens when byParsingTransportText encounters an invalid transport text string — does
  it throw, return an empty array, or create partial results?
- Should the returned task IDs include both top-level tasks AND subtasks created in a single
  import call? Or only root-level tasks?
- If transport text contains a project name that doesn't exist in OmniFocus, does
  byParsingTransportText create a new project automatically?
- Should we use singleTask=false or singleTask=null? Official docs show both as equivalent
  but community posts prefer null. Which is safer?
```

#### Session 2: Export Design and validate_transport_text Scope

```bash
/speckit.clarify Focus on export_taskpaper and validate_transport_text:
- For export_taskpaper: should we build a full custom TypeScript serializer (reads task
  properties, generates transport text string) or use document.makeFileWrapper for full-doc
  export? Custom serializer is more controllable but more code. makeFileWrapper is simpler
  but exports the whole database and requires async OmniJS.
- What task properties should export_taskpaper include? At minimum: name, flagged, tags,
  deferDate, dueDate, estimatedMinutes, note, subtasks (recursively). What about: project
  assignment (when exporting by task ID), completionDate?
- For validate_transport_text: should it return a parsed structure (task list with fields
  parsed from text) or just a pass/fail with error messages? A parsed structure is more
  useful to AI agents (they can confirm what they're about to create).
- Does our executeOmniFocusScript() utility support async IIFE scripts (async function(){})?
  Check src/utils/ — this matters if we use document.makeFileWrapper in any tool.
- Should export_taskpaper support exporting completed/dropped tasks, or only active items?
```

### Clarify Results

| Session | Focus Area | Questions | Key Outcomes |
|---------|------------|-----------|--------------|
| 1 | Import API and Placement | 5 | |
| 2 | Export Design and Validation Scope | 5 | |

---

## Phase 3: Plan

**Output:** `specs/012-taskpaper/plan.md`

### Plan Prompt

```bash
/speckit.plan

## Tech Stack
- Runtime: Node.js 24+
- Language: TypeScript 5.9+ (strict mode, ES2024 target)
- Build: tsup 8.5+ (ESM + CJS dual output)
- Test: Vitest 4.0+
- Lint: Biome 2.4+
- MCP SDK: @modelcontextprotocol/sdk 1.27.x
- Validation: Zod 4.2.x
- OmniJS: Pure Omni Automation JavaScript executed via executeOmniFocusScript()

## Constraints
- Follow existing definitions/primitives/contracts architecture (mirror notification-tools or
  search-tools patterns — search-tools is the closest in complexity)
- Contracts in src/contracts/taskpaper-tools/
- Definitions in src/tools/definitions/
- Primitives in src/tools/primitives/
- Tests in tests/unit/taskpaper-tools/ and tests/contract/taskpaper-tools/
- OmniJS scripts use IIFE + try-catch + JSON.stringify pattern
- validate_transport_text: NO OmniJS — pure TypeScript in the primitive file. No temp file,
  no executeOmniFocusScript call. Just a TypeScript function that parses the text.
- Use logger utility for all diagnostics (never console.error)
- All text files end with newline

## Architecture Notes
- 3 tools: import_taskpaper (OmniJS), export_taskpaper (OmniJS custom serializer),
  validate_transport_text (pure TypeScript, no OmniJS)
- Mirror the database-tools pattern for the primitive/definition split
- Shared schemas: ParsedTask (used by validate_transport_text response), CreatedItem (used by
  import response), ExportedText (used by export response)
- export_taskpaper custom serializer approach: OmniJS script reads task/project properties
  and builds transport text string manually. Recursively handles subtasks with indentation.
  Does NOT use document.makeFileWrapper (whole-doc export, async complexity).
- import_taskpaper: Task.byParsingTransportText(text, false) — confirmed creates immediately.
  Script wraps in try-catch, returns JSON with created task IDs and names.
- Transport text tokens (canonical set from research): task name, !, ::project, @tag,
  #date (ISO 8601 preferred), $duration, //note, indentation for subtasks

## Key Research Decisions (pre-researched 2026-03-20)
- byParsingTransportText(text, false/null) creates ALL tasks — no dry run possible
- document.makeFileWrapper is async and exports full document — NOT used for export_taskpaper
- validate_transport_text = pure TypeScript regex/string parser, returns parsed task tree
- No built-in Task.toTransportText() or equivalent — must serialize manually
- copyTasksToPasteboard() seen in Shortcuts context — UNVERIFIED for standalone OmniJS;
  do NOT rely on this in our implementation (use custom serializer instead)
```

### Plan Results

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ⏳ | Architecture decisions, constitution gates |
| `research.md` | ⏳ | API decisions documented |
| `data-model.md` | ⏳ | ParsedTask, CreatedItem, ExportedText schemas |
| `contracts/` | ⏳ | 3 tool contracts + shared schemas |
| `quickstart.md` | ⏳ | OmniJS patterns for import and export |

---

## Phase 4: Domain Checklists

### Recommended Domains

| Signal in Spec/Plan | Recommended Domain | Justification |
|---|---|---|
| byParsingTransportText unverified edge cases, custom serializer | **api-workaround** | Two unverified OmniJS behaviors: error handling on bad text, subtask recursion |
| Zod contracts for 3 tools, ParsedTask schema, shared types | **type-safety** | New contracts + complex response shapes (task tree for validate) |
| All 3 user stories, round-trip limitations, edge cases | **requirements** | Ensure no-dry-run constraint and round-trip limitations are documented |

### Checklist Prompts

#### 1. api-workaround Checklist

Why: byParsingTransportText creates immediately (no rollback), and our custom export serializer is hand-built (not validated against OmniJS API).

```bash
/speckit.checklist api-workaround

Focus on TaskPaper Import/Export requirements:
- byParsingTransportText() error handling — what happens on malformed input? Does it throw or
  silently create partial tasks?
- Custom export serializer — property mapping: task.name, task.flagged, task.tags, task.deferDate,
  task.dueDate, task.estimatedMinutes, task.note, task.children (subtasks). Verify property names
  match OmniJS Task API.
- Subtask recursion in export — does task.children or task.tasks give direct children only?
  (Answer: task.tasks gives DIRECT children; flattenedTasks gives ALL descendants)
- Date formatting in transport text — ISO 8601 vs locale. Which format does byParsingTransportText
  accept reliably? (Research indicates ISO yyyy-mm-dd is safest for programmatic use)
- Pay special attention to: what happens when the target project in transport text does not exist
  in the OmniFocus database — does byParsingTransportText create a new project or fail?
```

#### 2. type-safety Checklist

Why: validate_transport_text returns a complex ParsedTask tree; import_taskpaper returns created IDs; all need strict Zod schemas.

```bash
/speckit.checklist type-safety

Focus on TaskPaper Import/Export requirements:
- Zod 4.x schemas for all 3 tool inputs and outputs
- ParsedTask tree schema for validate_transport_text response (recursive? or flat list with
  parentId? Flat list is simpler for Zod + MCP serialization)
- CreatedItem schema: taskId, taskName, parentTaskId? for import_taskpaper response
- ExportedText schema: transport text string + item count + warnings for export_taskpaper response
- Shared token-to-property mapping (used by both validate and export) — keep as TypeScript types
  not runtime Zod schemas to avoid duplication
- Pay special attention to: null vs undefined handling for optional task properties (deferDate,
  dueDate, estimatedMinutes) in the export serializer
```

#### 3. requirements Checklist

Why: 3 user stories with an unusual constraint (US3 validate_transport_text can't use OmniJS).

```bash
/speckit.checklist requirements

Focus on TaskPaper Import/Export requirements:
- US1 (import): covers partial failure cases — what if some tasks in the transport text can't
  be created? Does byParsingTransportText create all-or-nothing or partial?
- US2 (export): scope parameter — must support projectId, folderId, OR taskIds array.
  Edge case: project with no tasks, folder with many nested projects.
- US3 (validate): pure TypeScript constraint is documented. Validator must be useful to AI
  agents — returns enough parsed info (task count, project names, dates found) to reason about.
- Round-trip fidelity limitations: document which OmniFocus properties have no transport text
  representation (repetition rules, review intervals, notifications, attachments).
- Pay special attention to: the tool description for import_taskpaper must clearly warn that
  import CANNOT be undone atomically (each task is a separate undo step in OmniFocus).
```

### Checklist Results

| Checklist | Items | Gaps | Spec References |
|-----------|-------|------|-----------------|
| api-workaround | | | |
| type-safety | | | |
| requirements | | | |
| **Total** | | | |

---

## Phase 5: Tasks

**Output:** `specs/012-taskpaper/tasks.md`

### Tasks Prompt

```bash
/speckit.tasks

## Task Structure
- Small, testable chunks (1-2 hours each)
- Clear acceptance criteria referencing FR-xxx
- Dependency ordering: contracts → primitives → definitions → integration
- Mark parallel-safe tasks explicitly with [P]
- Organize by user story

## Implementation Phases
1. Foundation (shared schemas, contracts infrastructure, Zod types)
2. import_taskpaper (US1) — OmniJS primitive + definition + tests
3. export_taskpaper (US2) — Custom TypeScript/OmniJS serializer + definition + tests
4. validate_transport_text (US3) — Pure TypeScript primitive + definition + tests
5. Server registration, integration, and polish

## Constraints
- Contracts in src/contracts/taskpaper-tools/
- Definitions in src/tools/definitions/
- Primitives in src/tools/primitives/
- Tests in tests/contract/taskpaper-tools/ and tests/unit/taskpaper-tools/
- validate_transport_text primitive has NO executeOmniFocusScript call — pure TypeScript only
- TDD: Red→Green→Refactor for every task
- Register all 3 tools in src/server.ts
```

### Tasks Results

| Metric | Value |
|--------|-------|
| **Total Tasks** | |
| **Phases** | 5 |
| **Parallel Opportunities** | |
| **User Stories Covered** | 3/3 |

---

## Phase 6: Analyze

### Analyze Prompt

```bash
/speckit.analyze

Focus on:
1. Constitution alignment — Zod validation, TDD, OmniJS-first (except validate_transport_text)
2. Coverage gaps — all 3 user stories and all FRs have tasks
3. File path consistency with project structure
4. Verify validate_transport_text has NO executeOmniFocusScript call
5. Verify export_taskpaper does NOT use document.makeFileWrapper (wrong approach)
6. Verify import_taskpaper uses singleTask=false or null (not true)
7. Verify round-trip limitation documentation is present in spec.md
```

### Analysis Results

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| | | | |

---

## Phase 7: Implement

### Implement Prompt

```bash
/speckit.implement

## Approach: TDD-First

For each task:
1. RED: Write failing test
2. GREEN: Implement minimum code to pass
3. REFACTOR: Clean up
4. VERIFY: pnpm build && pnpm test

### Pre-Implementation Setup
1. Verify worktree: git branch → shows 012-taskpaper
2. Verify baseline: pnpm test — all tests pass
3. Verify build: pnpm build — clean
4. Verify lint: pnpm lint — clean
5. Create spec output dir: specs/012-taskpaper/

### Key Implementation Patterns

#### import_taskpaper primitive (OmniJS)
```javascript
(function() {
  try {
    var newTasks = Task.byParsingTransportText(text, false); // false = create ALL tasks
    var result = newTasks.map(function(t) {
      return { id: t.id.primaryKey, name: t.name };
    });
    return JSON.stringify({ success: true, created: result, count: result.length });
  } catch(e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();
```

#### export_taskpaper primitive (OmniJS custom serializer)
Build OmniJS script that:
- Looks up items by ID (Task.byIdentifier, Project.byIdentifier, Folder.byIdentifier)
- Reads: task.name, task.flagged, task.tags, task.deferDate, task.dueDate,
  task.estimatedMinutes, task.note, task.tasks (direct children for recursion)
- Serializes to transport text: "task name! @tag #defer-date #due-date $Xm //note"
- Recursively indents subtasks
- Returns JSON with transportText string and itemCount

#### validate_transport_text primitive (pure TypeScript — NO OmniJS)
Pure TypeScript function (no generateOmniScript, no executeOmniFocusScript):
- Parses transport text line by line
- Extracts: task names, project assignments (::), tags (@), dates (#), estimates ($), notes (//)
- Returns: { valid: boolean, taskCount: number, parsed: ParsedTask[], warnings: string[] }

### Implementation Notes
- Mirror src/tools/primitives/searchTasks.ts pattern for the OmniJS tool structure
- Mirror src/tools/primitives/getInboxCount.ts for the simplest OmniJS tool structure
- For validate_transport_text: look at how existing TypeScript-only utilities are structured
- Register all 3 tools in src/server.ts
- Run pnpm build after every source change
- Test OmniJS scripts in Script Editor before integrating
```

### Implementation Progress

| Phase | Tasks | Completed | Notes |
|-------|-------|-----------|-------|
| 1 - Foundation | | 0 | Contracts, shared schemas |
| 2 - import_taskpaper (US1) | | 0 | OmniJS primitive |
| 3 - export_taskpaper (US2) | | 0 | Custom serializer |
| 4 - validate_transport_text (US3) | | 0 | Pure TypeScript |
| 5 - Integration & Polish | | 0 | Server registration |

---

## Post-Implementation Checklist

- [ ] All tasks marked complete in tasks.md
- [ ] `pnpm lint` passes (0 errors)
- [ ] `pnpm typecheck` passes (clean)
- [ ] `pnpm test` passes (all tests)
- [ ] `pnpm build` succeeds (ESM + CJS)
- [ ] All 3 tools registered in `src/server.ts`
- [ ] OmniJS scripts verified in Script Editor (import_taskpaper, export_taskpaper)
- [ ] Manual OmniFocus verification (import a transport text string, export a project)
- [ ] PR created: https://github.com/fgabelmannjr/omnifocus-mcp-pro/pull/XXX
- [ ] Master plan progress tracking updated

---

## Lessons Learned

### What Worked Well

-

### Challenges Encountered

-

### Patterns to Reuse

-

---

## Project Structure Reference

```text
omnifocus-mcp/
├── src/
│   ├── server.ts                         # MCP server entry point (register 3 new tools)
│   ├── contracts/taskpaper-tools/        # NEW: Zod contracts for 3 tools + shared schemas
│   ├── tools/
│   │   ├── definitions/                  # NEW: 3 tool definition files
│   │   └── primitives/                   # NEW: 3 primitive files (2 OmniJS, 1 TypeScript-only)
│   └── utils/
│       ├── omnifocusScripts/             # Pre-built OmniJS patterns
│       └── logger.ts                     # MCP-compliant logger
├── tests/
│   ├── unit/taskpaper-tools/             # NEW: Unit tests (including validate TS parser tests)
│   └── contract/taskpaper-tools/         # NEW: Contract tests
└── specs/012-taskpaper/                  # Spec artifacts (NEW)
```
