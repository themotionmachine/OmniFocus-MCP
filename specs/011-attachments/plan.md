# Implementation Plan: Attachments & Linked Files

**Branch**: `011-attachments` | **Date**: 2026-03-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-attachments/spec.md`

## Summary

5 new MCP tools for managing embedded file attachments and linked file references on OmniFocus tasks and projects. Attachments use base64 encoding to bridge binary data over MCP's JSON text protocol. Linked files are lightweight macOS filesystem bookmarks. All tools follow the established definitions/primitives/contracts architecture with TDD.

## Technical Context

**Language/Version**: TypeScript 5.9+ strict mode (ES2024 target)
**Primary Dependencies**: @modelcontextprotocol/sdk 1.27.x, Zod 4.2.x, tsup 8.5+
**Storage**: N/A (OmniFocus internal database via OmniJS)
**Testing**: Vitest 4.0+ with TDD Red-Green-Refactor
**Target Platform**: macOS (OmniJS via osascript)
**Project Type**: Single (MCP server)
**Performance Goals**: N/A (single-item operations, not batch)
**Constraints**: Base64 payloads up to ~67 MB (50 MB decoded limit); script execution via OmniJS stdin piping
**Scale/Scope**: 5 new tools, ~5 new contract files, ~5 new primitives, ~5 new definitions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type-First Development | PASS | All inputs validated via Zod schemas; explicit types throughout |
| II. Separation of Concerns | PASS | definitions/ for MCP, primitives/ for logic, contracts/ for schemas |
| III. Script Execution Safety | PASS | All OmniJS scripts use IIFE + try-catch + JSON.stringify pattern |
| IV. Structured Data Contracts | PASS | JSON responses with success/error discriminator; per-item metadata |
| V. Defensive Error Handling | PASS | Server-side base64 validation; size limits; index bounds checking |
| VI. Build Discipline | PASS | No OmniJS script files to copy (scripts generated in primitives) |
| VII. KISS | PASS | Single-item operations, simple CRUD, no abstractions beyond shared schemas |
| VIII. YAGNI | PASS | Only 5 tools per spec; no batch, no content extraction, no MIME inference |
| IX. SOLID | PASS | One tool = one definition + one primitive; shared schemas for DRY |
| X. TDD | PASS | Contract tests then unit tests before implementation |

**Post-Phase 1 Re-check**: All gates still pass. No complexity violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/011-attachments/
├── plan.md              # This file
├── research.md          # Phase 0 output (complete)
├── data-model.md        # Phase 1 output (complete)
├── quickstart.md        # Phase 1 output (complete)
├── contracts/           # Phase 1 output (complete)
│   ├── index.ts
│   ├── shared.ts
│   ├── list-attachments.ts
│   ├── add-attachment.ts
│   ├── remove-attachment.ts
│   ├── list-linked-files.ts
│   └── add-linked-file.ts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/contracts/attachment-tools/
├── index.ts                    # Re-exports all contracts
├── shared/
│   └── index.ts                # AttachmentInfo, LinkedFileInfo, FileWrapperType schemas
├── list-attachments.ts
├── add-attachment.ts
├── remove-attachment.ts
├── list-linked-files.ts
└── add-linked-file.ts

src/tools/primitives/
├── listAttachments.ts          # OmniJS script generation + execution
├── addAttachment.ts            # Base64 validation + OmniJS script
├── removeAttachment.ts         # Index bounds checking + OmniJS script
├── listLinkedFiles.ts          # OmniJS script generation + execution
└── addLinkedFile.ts            # URL validation + OmniJS script

src/tools/definitions/
├── listAttachments.ts          # MCP handler (schema + primitive call)
├── addAttachment.ts            # MCP handler with size validation
├── removeAttachment.ts         # MCP handler
├── listLinkedFiles.ts          # MCP handler
└── addLinkedFile.ts            # MCP handler

tests/contract/attachment-tools/
├── list-attachments.contract.test.ts
├── add-attachment.contract.test.ts
├── remove-attachment.contract.test.ts
├── list-linked-files.contract.test.ts
└── add-linked-file.contract.test.ts

tests/unit/primitives/
├── listAttachments.test.ts
├── addAttachment.test.ts
├── removeAttachment.test.ts
├── listLinkedFiles.test.ts
└── addLinkedFile.test.ts
```

**Structure Decision**: Single project, following the existing `src/contracts/{domain}-tools/`, `src/tools/primitives/`, `src/tools/definitions/` layout established by 8 prior feature phases.

## Complexity Tracking

No violations. All 10 constitution principles pass. No complexity justifications needed.

## Key Architectural Decisions

### AD-001: Base64 Data Flow

Base64 string passes through TypeScript (validation) into OmniJS script (decoding):
1. Zod schema strips all whitespace via `.transform((val) => val.replace(/\s/g, ''))` (accommodates multi-line base64 from MIME/transport wrapping)
2. Zod schema enforces max stripped string length of 67,108,864 characters (~50 MB decoded) via `.refine((val) => val.length <= 67108864, ...)` (Pattern B: `.transform()` then `.refine()`, matching `add-folder.ts` precedent)
3. Zod schema validates non-empty via `.refine((val) => val.length > 0, ...)`
4. TypeScript validates base64 format (regex `/^[A-Za-z0-9+/]*={0,2}$/` on stripped string)
5. TypeScript checks decoded size (warning >10 MB with message template, reject >50 MB with `SIZE_EXCEEDED` code)
6. Base64 string embedded in OmniJS script as string literal
7. OmniJS decodes via `Data.fromBase64(base64String)`
8. OmniJS creates FileWrapper via `FileWrapper.withContents(name, data)`

### AD-006: Error Codes for add_attachment

The `add_attachment` error response includes an optional `code` field with an explicit
`z.enum(['INVALID_BASE64', 'SIZE_EXCEEDED', 'NOT_FOUND'])`. This follows the precedent
set by `DisambiguationErrorSchema` in status-tools, which adds a typed `code` field to
a single-item error response when programmatic differentiation is needed. Other
single-item tools (repetition-tools) use flat errors because they have fewer distinct
failure modes.

### AD-002: Task/Project Resolution

All 5 tools accept a single `id` parameter. Resolution order:
1. `Task.byIdentifier(id)` -- if found, use directly
2. `Project.byIdentifier(id)` -- if found, resolve to `project.task`
3. Neither found -- return `{ success: false, error: "... not found ..." }`

This matches the repetition tools pattern used in 5+ existing tools.

### AD-003: Shared Output Schemas

`AttachmentInfoSchema` and `LinkedFileInfoSchema` are shared schemas in `src/contracts/attachment-tools/shared/`. They are used by multiple tool contracts (list returns arrays of these, remove returns remaining array).

### AD-004: Index-Based Attachment Removal

`remove_attachment` takes a zero-based index. The `list_attachments` response includes the index for each attachment. This is unambiguous even when multiple attachments share the same filename.

### AD-005: No Batch Operations

All tools operate on a single task/project per call. Batch attachment operations (across multiple items) are out of scope per the feature spec, following YAGNI.

### AD-007: OmniJS Defensive Checks for Undocumented API Behavior

Several OmniJS APIs used by attachment tools have undocumented error behavior.
The following defensive patterns are required, based on codebase precedent:

1. **`Data.fromBase64()` null check** (add_attachment): After decoding, check
   `if (!data)` and return explicit error. `Data.fromBase64()` returns `null`
   on invalid input rather than throwing. Precedent: server-side validation in
   `addNotification.ts` (TypeScript pre-validation + OmniJS verification).

2. **Index bounds checking** (remove_attachment): Before calling
   `task.removeAttachmentAtIndex(index)`, validate `attachments.length === 0`
   (empty error) and `index >= attachments.length` (out-of-bounds with valid
   range). Precedent: `removeNotification.ts` lines 97-112.

3. **`URL.fromString()` null check** (add_linked_file): After parsing, check
   `if (!url)` and return explicit error. May return `null` for malformed
   input. Server-side `file://` scheme validation (FR-005) prevents most
   malformed URLs from reaching OmniJS.

4. **Read-back verification** (add_attachment): After calling
   `task.addAttachment(wrapper)`, read `task.attachments` and verify the count
   increased. `addAttachment()` may fail silently on invalid input. Precedent:
   `addNotification.ts` lines 137-145.
