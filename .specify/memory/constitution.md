<!--
SYNC IMPACT REPORT
==================
Version: 1.0.0 (RATIFIED)
Last Updated: 2025-12-08
Changes in this revision:
  - FIXED: Tool registration method (server.tool() or registerTool())
  - FIXED: Script execution architecture (AppleScript + OmniJS + JXA wrapper)
  - FIXED: OmniJS script return patterns (flexible success structure)
  - FIXED: SDK version claim (removed false minimum requirement)
  - FIXED: Perspective switching limitation (clarified actual constraint)
  - FIXED: RequestHandlerExtra documentation (only for low-level handlers)
  - FIXED: moduleResolution rationale (Zod conflicts are primary cause)
  - ADDED: Node.js version requirement (>=24.0.0)
  - ADDED: ES Module requirements (.js extensions)
  - ADDED: TypeScript 5.7+ requirement for ES2024 target
  - ADDED: Zod 4 breaking changes note
  - ADDED: Two execution functions documentation
  - ADDED: evaluateJavascript method name note (lowercase 's')
  - NOTED: dumpDatabase exception to definitions/primitives pattern
Sections:
  - I. Type-First Development
  - II. Separation of Concerns
  - III. Script Execution Safety
  - IV. Structured Data Contracts
  - V. Defensive Error Handling
  - VI. Build Discipline
  - VII. KISS (Keep It Simple, Stupid)
  - VIII. YAGNI (You Aren't Gonna Need It)
  - IX. SOLID Principles
  - MCP Integration Standards
  - Script Execution Architecture
  - Platform Constraints
Templates requiring updates:
  - plan-template.md: ✅ Aligned (Constitution Check references principles)
  - spec-template.md: ✅ Compatible (MUST/SHOULD language maintained)
  - tasks-template.md: ✅ Compatible (phase structure supports principles)
Follow-up TODOs: None (ratified 2025-12-08)
-->

# OmniFocus MCP Server Constitution

## Core Principles

### I. Type-First Development

All code MUST leverage TypeScript's type system to prevent runtime errors.
Schema validation is the first line of defense; if TypeScript compiles and
Zod validates, the foundation is solid.

**Non-Negotiable Rules:**

- Every tool input MUST be validated via Zod schemas before processing
- Every function MUST have explicit parameter types (no implicit `any`)
- OmniFocus object model states (Task.Status, Project.Status) MUST use
  TypeScript enums
- Interfaces MUST be minimal—only include fields actually consumed by the
  system
- `"strict": true` in tsconfig.json is mandatory and MUST NOT be disabled

**Rationale:** Script errors often fail silently, producing empty results
rather than thrown exceptions. Strong typing catches mismatches at compile
time, preventing runtime surprises in a system where debugging is inherently
difficult.

### II. Separation of Concerns

Tool architecture MUST maintain clean separation between MCP protocol
concerns and OmniFocus business logic. This enables testability,
maintainability, and evolution.

**Non-Negotiable Rules:**

- Tool definitions (`src/tools/definitions/`) handle schema, MCP interface,
  and response formatting
- Tool primitives (`src/tools/primitives/`) contain core business logic and
  script generation
- Pre-built OmniJS scripts (`src/utils/omnifocusScripts/`) handle complex
  OmniFocus queries
- New tools MUST follow the existing definitions/primitives pattern
- Cross-cutting utilities (script execution, date handling) live in `src/utils/`

**Known Exception:** `dumpDatabase` exists at `src/tools/dumpDatabase.ts`
(not in primitives) due to its unique data transformation requirements. This
exception is documented, not a pattern to follow.

**Rationale:** Separation allows testing primitives without MCP overhead,
swapping script execution strategies, and evolving the protocol layer
independently of automation logic.

### III. Script Execution Safety

OmniFocus automation uses multiple scripting technologies with different
failure modes. All script code MUST be treated as untrusted until verified.

**Non-Negotiable Rules:**

- Every OmniJS script MUST be wrapped in try-catch that returns JSON error
  structure
- OmniJS scripts MUST be tested in OmniFocus Console or Script Editor before
  integration
- Date comparisons MUST use `.getTime()` for millisecond timestamp comparison
- Template literal interpolation in scripts MUST escape backticks, quotes,
  and special characters
- Pre-built scripts MUST NOT be modified without verification in OmniFocus

**OmniJS Error Return Pattern (required for pre-built scripts):**

```javascript
(() => {
  try {
    // OmniJS logic accessing flattenedTasks, Task.Status, etc.
    return JSON.stringify({ success: true, /* result fields */ });
  } catch (error) {
    return JSON.stringify({ success: false, error: error.toString() });
  }
})()
```

**AppleScript Error Handling (required for write operations):**

```applescript
try
  tell application "OmniFocus"
    -- AppleScript logic
  end tell
  return "{\"success\": true, \"id\": \"...\"}"
on error errMsg
  return "{\"success\": false, \"error\": \"" & errMsg & "\"}"
end try
```

**Rationale:** Silent failures are common across all scripting methods.
Defensive patterns ensure failures surface as structured data rather than
disappearing into void.

### IV. Structured Data Contracts

All data crossing boundaries (MCP ↔ Server ↔ Scripts ↔ OmniFocus) MUST be
structured JSON. Raw strings, untyped objects, and implicit conversions are
prohibited at boundaries.

**Non-Negotiable Rules:**

- MCP tool inputs MUST be validated via Zod schemas
- Scripts MUST return `JSON.stringify()` results (never raw strings)
- Date values MUST use ISO 8601 format when crossing boundaries
- Batch operation results MUST include per-item success/failure status at
  original indices
- Error responses MUST include actionable context (operation type, item IDs,
  failure reason)

**Rationale:** Structured contracts make debugging tractable. When something
fails, the failure data contains enough context to diagnose without
reproducing the exact scenario.

### V. Defensive Error Handling

Errors MUST be caught, logged, and transformed into user-actionable responses.
Exceptions MUST NOT bubble up unhandled to MCP clients.

**Non-Negotiable Rules:**

- All script execution calls MUST be wrapped in error handling
- Partial failures in batch operations MUST NOT fail the entire batch
- Error messages MUST include sufficient context (item IDs, operation type,
  timestamps)
- Validation errors MUST identify the specific field and constraint violated
- Script timeout errors MUST be distinguishable from logic errors

**Rationale:** MCP clients (AI assistants) cannot debug cryptic failures.
Clear error messages enable the assistant to explain problems and suggest
remediation to users.

### VI. Build Discipline

The server runs from `dist/`, not `src/`. Build artifacts are the source of
truth for execution. Build verification is mandatory before testing.

**Non-Negotiable Rules:**

- `npm run build` MUST be executed after any source changes before testing
- OmniJS scripts MUST be copied from `src/utils/omnifocusScripts/` to
  `dist/utils/omnifocusScripts/`
- Build MUST make `dist/server.js` executable
- Watch mode (`npm run dev`) recompiles TypeScript but DOES NOT copy OmniJS
  scripts
- Full build MUST be run if OmniJS scripts change (not just watch mode)

**Rationale:** The build step is not optional. Skipping it leads to testing
stale code while editing fresh code, creating invisible divergence between
expectation and reality.

### VII. KISS (Keep It Simple, Stupid)

Complexity is the enemy of reliability. Every solution MUST be the simplest
approach that correctly solves the problem. Clever code is a liability;
boring code is an asset.

**Non-Negotiable Rules:**

- Choose the obvious, straightforward solution over the elegant or clever
  one
- If code requires extensive comments to explain, it is too complex—refactor it
- One function does one thing; one tool solves one problem
- Avoid nested conditionals deeper than 3 levels; extract to separate functions
- Prefer explicit code paths over implicit behavior or magic

**Rationale:** Script debugging is already difficult due to silent failures.
Adding unnecessary complexity compounds the problem. Simple code is easier
to verify, easier to debug when failures occur, and easier for future
maintainers to understand.

### VIII. YAGNI (You Aren't Gonna Need It)

Do not build for hypothetical future requirements. Implement only what is
explicitly needed for the current task. Premature abstraction creates
maintenance burden without benefit.

**Non-Negotiable Rules:**

- Do NOT add features, parameters, or capabilities beyond what was requested
- Do NOT create abstractions for one-time operations
- Do NOT add "just in case" error handling for scenarios that cannot occur
- Do NOT design for flexibility that has no current use case
- Three similar lines of code is better than a premature utility function

**Rationale:** Every abstraction, feature flag, and configuration option adds
cognitive load and potential failure points. In an MCP server where tools
are discovered dynamically, unused capabilities create confusion for AI
clients trying to understand available functionality.

### IX. SOLID Principles

Object-oriented design principles MUST guide architectural decisions, adapted
for TypeScript and the MCP server context.

**Non-Negotiable Rules:**

- **Single Responsibility (S)**: Each module, class, or function MUST have
  one reason to change. Tool definitions handle MCP concerns only; primitives
  handle business logic only.

- **Open-Closed (O)**: Code MUST be open for extension but closed for
  modification. Add new tools by creating new definition/primitive pairs, not
  by modifying existing tools.

- **Liskov Substitution (L)**: Derived types MUST be substitutable for their
  base types. All tool handlers MUST conform to the MCP handler signature
  without exception.

- **Interface Segregation (I)**: Clients MUST NOT depend on interfaces they
  do not use. Tool input schemas MUST include only parameters the tool
  actually processes.

- **Dependency Inversion (D)**: High-level modules MUST NOT depend on
  low-level modules; both MUST depend on abstractions. Primitives depend on
  script execution abstractions, not direct `osascript` invocation.

**Rationale:** SOLID principles prevent the codebase from becoming a tangled
monolith. The definitions/primitives architecture already embodies these
principles; this codifies them to ensure future development maintains the
separation.

## MCP Integration Standards

These standards ensure compatibility with the Model Context Protocol
TypeScript SDK and proper integration with MCP clients.

**Protocol Compliance:**

- Server MUST use `StdioServerTransport` for stdio-based MCP communication
- Tool registration MUST use `server.tool()` or `server.registerTool()` with
  Zod input schemas
- Use `registerTool()` when dynamic tool lifecycle management
  (enable/disable/update) is needed
- Tool handlers MUST return
  `{ content: [{ type: 'text', text: string }] }` format
- `RequestHandlerExtra<ServerRequest, ServerNotification>` type parameters
  are required only for low-level `setRequestHandler()` calls; high-level
  `server.tool()` auto-types the `extra` parameter
- Module resolution MUST use `"moduleResolution": "NodeNext"` for proper ESM
  resolution; note that Zod version conflicts (multiple versions in
  dependency tree) are the primary cause of TS2589 type recursion errors—use
  `npm ls zod` to diagnose and `overrides`/`resolutions` to fix

**Package Distribution:**

- `cli.cjs` wrapper handles npm invocation via `npx -y omnifocus-mcp-pro`
- Entry point MUST be compiled `dist/server.js`
- `@modelcontextprotocol/sdk` current version is 1.24.x (no documented
  minimum requirement)
- Zod 4.0+ is the required validation dependency (has breaking changes from
  Zod 3; see migration guide)

**Runtime Requirements:**

- Node.js version 24.0.0 or higher is required (`"node": ">=24.0.0"`,
  LTS "Krypton")
- ES modules are used (`"type": "module"` in package.json)
- All local imports MUST include `.js` extension (mandatory per Node.js ESM
  specification)
- TypeScript 5.7+ is required for ES2024 target support
- TypeScript target is ES2024 with strict mode enabled

## Script Execution Architecture

OmniFocus automation uses a **three-tier scripting architecture**.
Understanding this is critical for debugging and extending the server.

### Tier 1: AppleScript (Write Operations)

Used for: Creating, editing, and deleting tasks/projects.

```text
Primitive → Generates AppleScript string → osascript executes → JSON result
```

- Files: `addOmniFocusTask.ts`, `addProject.ts`, `editItem.ts`, `removeItem.ts`
- Execution: Direct `osascript <tempfile>` or `osascript -e '<script>'`
- Why: AppleScript is more stable for OmniFocus object manipulation

### Tier 2: OmniJS via JXA Wrapper (Read Operations)

Used for: Querying tasks, projects, perspectives, database dumps.

```text
Primitive → Generates OmniJS code → executeOmniFocusScript() wraps in JXA
→ JXA calls app.evaluateJavascript() → OmniJS runs inside OmniFocus → JSON result
```

- Files: `queryOmnifocus.ts`, pre-built scripts in `omnifocusScripts/`
- Execution: `executeOmniFocusScript('@scriptName.js')` from `scriptExecution.ts`
- Why: OmniJS has access to OmniFocus's internal JavaScript object model
  (`flattenedTasks`, `Task.Status`, etc.)
- **Note:** Method name is `evaluateJavascript` (lowercase 's'), not `evaluateJavaScript`

### Tier 3: Direct JXA (Currently Unused)

- Function: `executeJXA(script)` in `scriptExecution.ts`
- Status: Available but not currently used by any primitives
- Use case: Reserved for potential future JXA-only operations

**Script Execution Functions** (both in `src/utils/scriptExecution.ts`):

- `executeOmniFocusScript(path)` - Wraps OmniJS in JXA, executes via osascript
- `executeJXA(script)` - Direct JXA execution (currently unused)

## Platform Constraints

These are platform limitations that cannot be worked around and MUST be
documented to users.

**Known Limitations:**

- `get_perspective_view` reads items from the currently displayed
  perspective; it cannot query a perspective's filtered items without first
  switching to that perspective in the UI. Note: OmniJS CAN switch
  perspectives programmatically (`document.windows[0].perspective = ...`),
  but this changes the user's view, which may not be desirable
- `dump_database` may timeout on very large OmniFocus databases
- Date handling: OmniFocus interprets dates as local time, not UTC
- OmniJS object model uses `flattenedTasks`, `Task.Status` syntax (not
  SQL-style queries)
- AppleScript uses `tell application` blocks with different object model
  than OmniJS

**Batch Operation Constraints:**

- Cyclic `tempId` → `parentTempId` references MUST be detected and rejected
  before processing
- Items MUST be processed in topological order (parents before children)
- `tempId` → real OmniFocus ID mapping MUST be maintained during batch
  execution
- Per-item results MUST be stored at original array indices for client
  correlation

## Governance

This constitution supersedes all other development practices for the
OmniFocus MCP Server project. Deviations require explicit justification
documented in code comments or PR descriptions, with explanation of why the
principle cannot apply.

**Amendment Process:**

1. Propose amendment with rationale in GitHub issue or PR description
2. Document the specific principle affected and the proposed change
3. Explain impact on existing code and whether migration is required
4. Obtain approval before implementation
5. Update version according to semantic versioning (see below)

**Versioning Policy:**

- MAJOR: Backward-incompatible governance changes, principle removal, or redefinition
- MINOR: New principle or section added, material guidance expansion
- PATCH: Clarifications, wording improvements, non-semantic refinements

**Compliance Review:**

- All PRs MUST verify alignment with Core Principles before merge
- Code reviews SHOULD reference specific principles when requesting changes
- Complexity additions MUST justify why simpler alternatives are insufficient

**Runtime Guidance:**

- `CLAUDE.md` provides agent-specific development guidance and is
  authoritative for day-to-day development decisions within the bounds of
  this constitution
- This constitution provides the foundational, non-negotiable rules

**Version**: 1.0.0 | **Status**: RATIFIED | **Last Updated**: 2025-12-08
