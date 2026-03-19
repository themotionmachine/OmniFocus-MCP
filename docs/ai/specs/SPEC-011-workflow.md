# SpecKit Workflow: SPEC-011 — Attachments & Linked Files

**Created**: 2026-03-18
**Purpose**: Track SPEC-011 through all 7 SpecKit phases with review gates.

---

## Workflow Overview

| Phase | Command | Status | Notes |
|-------|---------|--------|-------|
| Specify | `/speckit.specify` | ✅ Complete | 10 FRs, 5 user stories, 21 scenarios, 0 clarifications |
| Clarify | `/speckit.clarify` | ✅ Complete | 2 sessions, 10 questions; FileWrapper.Type confirmed, project support added, 50MB limit, preferredFilename |
| Plan | `/speckit.plan` | ✅ Complete | 5 tools, 7 contracts, 7 research tasks, 5 ADs, 10/10 constitution pass |
| Checklist | `/speckit.checklist` | ✅ Complete | 3 domains (118 items), 17 gaps remediated |
| Tasks | `/speckit.tasks` | ✅ Complete | 52 tasks, 8 phases, 25 parallel, 5/5 US covered |
| Analyze | `/speckit.analyze` | ✅ Complete | 9 findings (0C, 1H, 6M, 2L), all remediated |
| Implement | `/speckit.implement` | ⏳ Pending | |

**Status Legend:** ⏳ Pending | 🔄 In Progress | ✅ Complete | ⚠️ Blocked

### Phase Gates

| Gate | Checkpoint | Approval Criteria |
|------|------------|-------------------|
| G1 | After Specify | All user stories clear, no `[NEEDS CLARIFICATION]` markers |
| G2 | After Clarify | Ambiguities resolved, decisions documented |
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
| II. Separation of Concerns | definitions/ + primitives/ split | Code review | ✅ 50 definitions, 50 primitives |
| III. Script Execution Safety | OmniJS-only, try-catch + JSON | Script Editor test | ✅ Existing patterns verified |
| IV. Structured Data Contracts | Zod schemas for all inputs | Contract tests | ✅ 8 contract dirs |
| V. Defensive Error Handling | Structured errors, no swallowed exceptions | Unit tests | ✅ 2823 tests pass |
| VI. Build Discipline | `pnpm build` after changes | `pnpm build` | ✅ Pass (ESM + CJS) |
| VII. KISS | Simple, boring solutions | Code review | ✅ Verified |
| VIII. YAGNI | No premature abstractions | Code review | ✅ Verified |
| IX. SOLID | Single responsibility | Code review | ✅ Verified |
| X. TDD | Red-Green-Refactor cycle | Test-first workflow | ✅ 125 test files |

**Constitution Check:** ✅ Verified 2026-03-18 — Constitution v2.0.0 (RATIFIED), all principles satisfied

---

## Specification Context

### Basic Information

| Field | Value |
|-------|-------|
| **Spec ID** | SPEC-011 |
| **Name** | Attachments & Linked Files |
| **Branch** | `011-attachments` |
| **Dependencies** | None (Phases 0-5 complete) |
| **Enables** | None directly (SPEC-020 requires all specs complete) |
| **Priority** | P3 |
| **Tier** | 2 (parallel with SPEC-008, SPEC-009) |

### Success Criteria Summary

- [ ] 5 MCP tools implemented: `list_attachments`, `add_attachment`, `remove_attachment`, `list_linked_files`, `add_linked_file`
- [ ] Zod contracts in `src/contracts/attachment-tools/`
- [ ] `list_attachments` reads `task.attachments` and returns FileWrapper metadata (name, size, type)
- [ ] `add_attachment` creates a FileWrapper from base64-encoded data or file path
- [ ] `remove_attachment` uses index-based removal via `task.removeAttachmentAtIndex(index)`
- [ ] `list_linked_files` reads `task.linkedFileURLs` and returns external file bookmark URLs
- [ ] `add_linked_file` adds macOS file bookmark via `task.addLinkedFileURL(url)` (macOS only)
- [ ] Base64 encoding/decoding for attachment data transfer over MCP JSON protocol
- [ ] Size warnings for attachments > 10MB
- [ ] Full TDD with contract + unit tests
- [ ] OmniJS Script Editor verification (manual step)

---

## Phase 1: Specify

**Output:** `specs/011-attachments/spec.md`

### Specify Prompt

```bash
/speckit.specify

## Feature: Attachments & Linked Files

### Problem Statement
OmniFocus tasks can have embedded attachments (images, PDFs, documents) and
linked file bookmarks (references to files on the local filesystem). Currently,
there is no way to manage these through the MCP server. AI assistants need to
list, add, and remove attachments for tasks — for example, attaching reference
documents to project tasks, cleaning up old attachments, or listing what files
are associated with specific tasks. Linked files provide lightweight references
to macOS files without embedding them in the database.

### Users
GTD practitioners using AI assistants to manage task-associated documents,
reference materials, and file links within their OmniFocus databases.

### User Stories
1. As a GTD practitioner, I want to list all attachments on a task so I can see what reference materials are associated with it
2. As a GTD practitioner, I want to add an attachment to a task (from base64 data or a file path) so I can associate reference documents with tasks
3. As a GTD practitioner, I want to remove an attachment from a task by index so I can clean up outdated or incorrect attachments
4. As a GTD practitioner, I want to list linked files on a task so I can see what external file references exist
5. As a GTD practitioner, I want to add a linked file reference to a task so I can associate local files without embedding them in the database

### Technical Context from Master Plan
- 5 MCP tools: `list_attachments`, `add_attachment`, `remove_attachment`, `list_linked_files`, `add_linked_file`
- `list_attachments` reads `task.attachments` — returns FileWrapper metadata (name, size, type)
- `add_attachment` creates a FileWrapper from base64-encoded data or file path and calls `task.addAttachment()`
- `remove_attachment` calls `task.removeAttachmentAtIndex(index)` — index-based removal
- `list_linked_files` reads `task.linkedFileURLs` — returns external file bookmark URLs
- `add_linked_file` calls `task.addLinkedFileURL(url)` — adds macOS file bookmark. **macOS only** — throws error on iOS per official docs. URL must use `file://` scheme.
- Base64 encoding/decoding for attachment data transfer over MCP JSON protocol
- Size limits: Warn for attachments > 10MB (OmniFocus Sync performance concern)

### Constraints
- All operations must use OmniJS execution via `executeOmniFocusScript()`
- Follow existing definitions/primitives/contracts architecture (50+ tools already established)
- Contracts go in `src/contracts/attachment-tools/`
- Definitions in `src/tools/definitions/`, primitives in `src/tools/primitives/`
- All OmniJS scripts must use the IIFE + try-catch + JSON.stringify pattern
- `remove_attachment` uses index, not name, since multiple attachments can share the same filename
- Base64 data transfer is necessary because MCP uses JSON text protocol
- `add_linked_file` is macOS-only — URL must use `file://` scheme
- Use Zod 4.x for all input validation, no `as Type` assertions
- Attachments > 10MB should trigger a warning (OmniFocus Sync performance)

### Key OmniJS APIs (from master plan)
- `task.attachments` — array of FileWrapper objects on a task
- `task.addAttachment(fileWrapper)` — adds a FileWrapper attachment to a task
- `task.removeAttachmentAtIndex(index)` — removes attachment by index
- `task.linkedFileURLs` — array of URL objects referencing local files
- `task.addLinkedFileURL(url)` — adds a linked file bookmark (macOS only)
- `FileWrapper.withContents(name, data)` — creates a FileWrapper from data
- `Data.fromBase64(string)` — decodes base64 string to Data object for FileWrapper creation
- FileWrapper properties: `filename`, `type` (UTI), `contents` (Data object)

### Out of Scope
- Attachment content extraction/preview (beyond scope of MCP text protocol)
- Linked file URL resolution/validation (file system access beyond OmniJS scope)
- Project-level attachments (focus on task attachments only, unless trivially supported)
- Removing linked files (no `removeLinkedFileURL` API documented — verify in clarify)
```

### Specify Results

<!-- Fill in after running the command -->

| Metric | Value |
|--------|-------|
| Functional Requirements | 10 (FR-001 through FR-010) |
| User Stories | 5 (P1-P3 priority) |
| Acceptance Criteria | 21 scenarios |

### Files Generated

- [x] `specs/011-attachments/spec.md`
- [x] `specs/011-attachments/checklists/requirements.md`

---

## Phase 2: Clarify

**When to run:** After Specify — OmniJS FileWrapper and LinkedFile APIs need verification.

### Clarify Prompts

#### Pre-Answered (from master plan — do not re-ask)

- `task.attachments` returns an array of FileWrapper objects
- `task.removeAttachmentAtIndex(index)` is index-based (not name-based) because multiple attachments can share filenames
- Base64 is the transfer format because MCP uses JSON text protocol
- `add_linked_file` is macOS-only per official OmniJS docs
- 10MB warning threshold is a project convention for sync performance

#### Session 1: OmniJS FileWrapper API Behavior

```bash
/speckit.clarify Focus on OmniJS FileWrapper and attachment APIs:
- Does `FileWrapper.withContents(name, data)` exist? Or is the constructor `new FileWrapper.withContents()`? What are the exact parameters?
- How is `Data.fromBase64(string)` used — does it exist in OmniJS? Or is there a different method to convert base64 to Data?
- What properties does a FileWrapper expose? (`filename`, `type`, `contents`, `preferredFilename`?) — verify exact property names
- Does `task.removeAttachmentAtIndex(index)` actually exist, or is the method named differently (e.g., `removeAttachment`)?
- Can we read the byte size of an attachment from FileWrapper? (for the >10MB warning)
- What UTI types does `fileWrapper.type` return? (e.g., "public.png", "com.adobe.pdf")
```

#### Session 2: Linked Files API Behavior

```bash
/speckit.clarify Focus on OmniJS linked file APIs:
- Does `task.linkedFileURLs` return URL objects or strings? What properties do the URL objects have?
- Is there a `task.removeLinkedFileURL(url)` or `task.removeLinkedFileURLAtIndex(index)` method? If not, linked file removal is out of scope.
- Does `task.addLinkedFileURL(url)` accept a string or require a URL object? If URL object, how to construct: `URL.fromString()`?
- What happens if `addLinkedFileURL` is called with a non-`file://` URL (e.g., `https://`)?
- Are linked file URLs available on projects as well as tasks, or tasks only?
```

### Clarify Results

| Session | Focus Area | Questions | Key Outcomes |
|---------|------------|-----------|--------------|
| 1 | FileWrapper APIs | 5 | FileWrapper.Type is enum (not UTI), Data.fromBase64 confirmed, preferredFilename fallback, removeAttachmentAtIndex confirmed, contents.length for size |
| 2 | Linked Files APIs | 5 | linkedFileURLs returns URL objects, removeLinkedFileWithURL exists (URL-based not index), project support added, 50MB hard limit, base64 pass-through to OmniJS |

---

## Phase 3: Plan

**Output:** `specs/011-attachments/plan.md`

### Plan Prompt

```bash
/speckit.plan

## Tech Stack
- Runtime: Node.js 24+ with TypeScript 5.9+ strict mode (ES2024 target)
- Build: tsup 8.5+ (ESM + CJS dual output)
- Testing: Vitest 4.0+ with TDD Red→Green→Refactor
- Validation: Zod 4.2.x for all contracts
- MCP SDK: @modelcontextprotocol/sdk 1.27.x
- Lint: Biome 2.4+
- OmniJS: Pure Omni Automation JavaScript executed via `executeOmniFocusScript()`

## Constraints
- Follow existing definitions/primitives/contracts architecture (50+ tools established)
- Contracts go in `src/contracts/attachment-tools/`
- Definitions in `src/tools/definitions/`, primitives in `src/tools/primitives/`
- All OmniJS scripts use the IIFE + try-catch + JSON.stringify pattern
- Base64 encoding for MCP JSON protocol compatibility
- Index-based attachment removal (not name-based)
- macOS-only constraint for `add_linked_file`
- Use logger utility for all diagnostics (never console.error)

## Architecture Notes
- FileWrapper is the OmniJS abstraction for embedded files — wraps binary data with metadata
- Base64 is the bridge between binary attachment data and MCP's JSON text protocol
- Linked files are lightweight bookmarks (URL references) vs. embedded attachments (binary data)
- Size validation (>10MB warning) happens at TypeScript layer before OmniJS execution
- Consider shared schemas for AttachmentInfo, LinkedFileInfo output types
- `remove_attachment` takes an index — the list_attachments response should include indices
- All tools should accept task ID (and optionally task name with disambiguation)
```

### Plan Results

| Artifact | Status | Notes |
|----------|--------|-------|
| `plan.md` | ✅ | 5 tools, 5 ADs, constitution gates |
| `research.md` | ✅ | 7 research tasks resolved |
| `data-model.md` | ✅ | AttachmentInfo, LinkedFileInfo, FileWrapperType |
| `contracts/` | ✅ | 7 files (5 tools + shared + index) |
| `quickstart.md` | ✅ | Implementation guide |

---

## Phase 4: Domain Checklists

### Recommended Domains

| Signal in Spec/Plan | Recommended Domain | Justification |
|---|---|---|
| 5 tool contracts, FileWrapper schemas, base64 encoding | **api-contracts** | Complex data transfer patterns (base64), FileWrapper metadata schemas |
| Zod 4.x, no `as Type`, base64 validation | **type-safety** | Base64 string validation, index bounds checking, UTI type handling |
| OmniJS FileWrapper API, Data.fromBase64, linkedFileURLs | **api-workaround** | FileWrapper construction, base64-to-Data conversion, macOS-only constraints |

#### 1. api-contracts Checklist

Why: 5 tools with base64 data transfer, FileWrapper metadata schemas, and index-based operations requiring careful contract design.

```bash
/speckit.checklist api-contracts

Focus on Attachments & Linked Files requirements:
- AttachmentInfo output schema (filename, type/UTI, size, index)
- LinkedFileInfo output schema (url, filename if derivable)
- add_attachment input: base64 data field, filename, optional MIME/UTI type
- remove_attachment input: task identifier + attachment index
- list_attachments response: array with indices for removal reference
- Base64 string validation in Zod (valid base64 characters, reasonable length limits)
- Pay special attention to: size warning threshold in response metadata
```

#### 2. type-safety Checklist

Why: Base64 encoding introduces string-typed binary data that needs validation. Index-based operations need bounds checking patterns.

```bash
/speckit.checklist type-safety

Focus on Attachments & Linked Files requirements:
- Zod 4.x schemas for all 5 tool inputs and outputs
- No `as Type` assertions anywhere
- Base64 string validation (Zod `.regex()` or `.refine()` for valid base64)
- Index type: non-negative integer validation for attachment removal
- FileWrapper property types (filename: string, type: string UTI, size: number bytes)
- URL validation for linked file paths (`file://` scheme required)
- Pay special attention to: discriminated union for task identifier (id vs name)
```

#### 3. api-workaround Checklist

Why: OmniJS FileWrapper and Data APIs have specific construction patterns. Base64-to-binary conversion in OmniJS needs verification.

```bash
/speckit.checklist api-workaround

Focus on Attachments & Linked Files requirements:
- `FileWrapper.withContents(name, data)` — exact constructor signature and usage
- `Data.fromBase64(string)` — does this exist in OmniJS? Alternative methods?
- `task.attachments` — exact return type and FileWrapper property access
- `task.removeAttachmentAtIndex(index)` — exact method signature, error on out-of-bounds?
- `task.linkedFileURLs` — return type (URL[] or string[])
- `task.addLinkedFileURL(url)` — accepts URL object or string?
- macOS-only detection: how to detect platform in OmniJS for linked file operations
- Pay special attention to: FileWrapper binary data handling within OmniJS IIFE pattern
```

### Checklist Results

| Checklist | Items | Gaps | Spec References |
|-----------|-------|------|-----------------|
| api-contracts | 41 | 9 remediated | FR-011, FR-012, NFR-001/002, edge cases |
| type-safety | 38 | 1 remediated | Zod transform/refine ordering for base64 |
| api-workaround | 39 | 7 remediated | Data.fromBase64 edge cases, bounds check, URL.fromString null |
| **Total** | **118** | **17 remediated** | |

---

## Phase 5: Tasks

**Output:** `specs/011-attachments/tasks.md`

### Tasks Prompt

```bash
/speckit.tasks

## Task Structure
- Small, testable chunks (1-2 hours each)
- Clear acceptance criteria referencing FR-xxx
- Dependency ordering: foundation → individual tools → integration → validation
- Mark parallel-safe tasks explicitly with [P]
- Organize by user story, not by technical layer

## Implementation Phases
1. Foundation (shared schemas, contracts infrastructure, attachment types)
2. List Attachments (US1) — independently testable [P]
3. Add Attachment (US2) — independently testable [P]
4. Remove Attachment (US3) — depends on List Attachments for index verification [P after US1]
5. List Linked Files (US4) — independently testable [P]
6. Add Linked File (US5) — independently testable [P]
7. Integration testing & polish

## Constraints
- Contracts in `src/contracts/attachment-tools/`
- Definitions in `src/tools/definitions/`
- Primitives in `src/tools/primitives/`
- Tests: `tests/contract/attachment-tools/`, `tests/unit/attachment-tools/`
- TDD: Red→Green→Refactor for every task
- Base64 encoding/decoding must be tested independently
- Mirror existing tool patterns (find list_notifications or list_tags and follow their structure)
```

### Tasks Results

| Metric | Value |
|--------|-------|
| **Total Tasks** | |
| **Phases** | |
| **Parallel Opportunities** | |
| **User Stories Covered** | |

---

## Phase 6: Analyze

### Analyze Prompt

```bash
/speckit.analyze

Focus on:
1. Constitution alignment — verify coding standards compliance
2. Coverage gaps — ensure all 5 user stories and all FRs have tasks
3. Consistency between task file paths and actual project structure
4. Verify base64 encoding/decoding is handled correctly at both TypeScript and OmniJS layers
5. Verify index-based removal is safe (bounds checking, race conditions)
6. Verify macOS-only constraint is properly documented and enforced for linked files
7. Verify attachment size warning threshold is implemented consistently
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

For each task, follow this cycle:

1. **RED**: Write failing test defining expected behavior
2. **GREEN**: Implement minimum code to make test pass
3. **REFACTOR**: Clean up while tests still pass
4. **VERIFY**: Manual verification of acceptance criteria

### Pre-Implementation Setup

1. Verify worktree: `git branch` shows `011-attachments`
2. Verify baseline: `pnpm test` — all existing tests pass
3. Verify build: `pnpm build` — clean
4. Verify lint: `pnpm lint` — clean
5. Create spec output dir: `specs/011-attachments/`

### Implementation Notes
- Mirror existing tool patterns (find list_notifications or get_task and follow their structure)
- Base64 handling: decode at TypeScript layer, pass binary-safe data to OmniJS
- FileWrapper construction: use OmniJS `FileWrapper.withContents()` or equivalent
- Index-based removal: validate index bounds in OmniJS before calling removeAttachmentAtIndex
- Linked files: construct URL via `URL.fromString()` in OmniJS, validate `file://` scheme
- Register all 5 tools in `src/server.ts`
- Run `pnpm build` after every source change
- Use logger utility for all diagnostics
```

### Implementation Progress

| Phase | Tasks | Completed | Notes |
|-------|-------|-----------|-------|
| 1 - Foundation | | | Shared schemas, contracts, attachment types |
| 2 - List Attachments | | | |
| 3 - Add Attachment | | | Base64 decoding, FileWrapper construction |
| 4 - Remove Attachment | | | Index-based removal |
| 5 - List Linked Files | | | |
| 6 - Add Linked File | | | macOS-only, file:// validation |
| 7 - Integration & Polish | | | Server registration, build, final tests |

---

## Post-Implementation Checklist

- [ ] All tasks marked complete in tasks.md
- [ ] Typecheck passes: `pnpm typecheck` (0 errors)
- [ ] Tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build` (ESM + CJS clean)
- [ ] Lint passes: `pnpm lint`
- [ ] All 5 tools registered in `src/server.ts`
- [ ] Manual OmniJS Script Editor verification
- [ ] PR created targeting `main`
- [ ] Merged to main branch
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
src/
├── server.ts                          # MCP server entry point (register 5 new tools here)
├── contracts/
│   └── attachment-tools/              # NEW: Zod contracts for 5 attachment tools + shared schemas
├── tools/
│   ├── definitions/                   # NEW: 5 tool definition files
│   └── primitives/                    # NEW: 5 primitive files
tests/
├── contract/
│   └── attachment-tools/              # NEW: Contract tests
├── unit/
│   └── attachment-tools/              # NEW: Unit tests
└── integration/
    └── attachment-tools/              # NEW: Integration tests (optional)
specs/
└── 011-attachments/                   # Spec artifacts
```
