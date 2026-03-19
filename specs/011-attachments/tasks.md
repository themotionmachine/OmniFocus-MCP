# Tasks: Attachments & Linked Files

**Input**: Design documents from `/specs/011-attachments/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**TDD Approach**: All tasks follow Red-Green-Refactor per Constitution Principle X. Tests are REQUIRED and come FIRST.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Contracts**: `src/contracts/attachment-tools/`
- **Primitives**: `src/tools/primitives/`
- **Definitions**: `src/tools/definitions/`
- **Contract tests**: `tests/contract/attachment-tools/`
- **Unit tests**: `tests/unit/attachment-tools/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization -- create shared contracts directory and schemas

- [ ] T001 Create shared schemas directory and file at `src/contracts/attachment-tools/shared/index.ts` with `FileWrapperTypeSchema`, `AttachmentInfoSchema`, and `LinkedFileInfoSchema` (copy from `specs/011-attachments/contracts/shared.ts`; adjust imports: spec uses flat sibling `'./shared.js'` but source uses subdirectory `'./shared/index.js'` -- update barrel re-exports in `index.ts` accordingly)
- [ ] T002 Create barrel export file at `src/contracts/attachment-tools/index.ts` that re-exports shared schemas (initially only shared; tool contracts added as each story is implemented)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Base64 validation utility and contract test infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 [P] Write contract tests for shared schemas in `tests/contract/attachment-tools/shared-schemas.contract.test.ts` -- test `AttachmentInfoSchema` (valid/invalid index, filename, type enum, size), `LinkedFileInfoSchema` (valid/invalid url, filename, extension), `FileWrapperTypeSchema` (all 3 enum values, invalid value) -- verify FAILS
- [ ] T004 [P] Write standalone base64 validation unit tests in `tests/unit/attachment-tools/base64-validation.test.ts` -- test valid base64 strings, strings with whitespace/newlines, invalid characters, empty strings, padding edge cases, size threshold calculations (>10 MB warning, >50 MB rejection) -- verify FAILS
- [ ] T005 Implement server-side TypeScript base64 validation helper (inline in `addAttachment.ts` primitive as a local function) -- this is distinct from the Zod schema-level validation (NFR-001 whitespace stripping + max length) which lives in the contract: regex validation (`/^[A-Za-z0-9+/]*={0,2}$/` on already-stripped string), size calculation via `Buffer.from(data, 'base64').length`, warning threshold (10 MB), rejection threshold (50 MB with `SIZE_EXCEEDED` code) -- base64 tests turn GREEN

**Checkpoint**: Foundation ready -- shared schemas exist, base64 validation is tested, user story implementation can now begin

---

## Phase 3: User Story 1 - List Task Attachments (Priority: P1) -- MVP

**Goal**: Users can list all attachment metadata for any task or project in a single tool call (FR-001, FR-006, FR-008, FR-009)

**Independent Test**: Call `list_attachments` with a task ID and verify the returned metadata array contains correct filename, type, size, and index per entry

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T006 [P] [US1] Write contract tests for `list_attachments` schemas in `tests/contract/attachment-tools/list-attachments.contract.test.ts` -- test `ListAttachmentsInputSchema` (valid id, empty id rejection), `ListAttachmentsSuccessSchema` (with attachments array, empty array), `ListAttachmentsErrorSchema` (error string), `ListAttachmentsResponseSchema` discriminated union -- copy schema from `specs/011-attachments/contracts/list-attachments.ts` into `src/contracts/attachment-tools/list-attachments.ts` first, then verify tests FAIL (no primitive yet)
- [ ] T007 [P] [US1] Write unit tests for `listAttachments` primitive in `tests/unit/attachment-tools/listAttachments.test.ts` -- mock `executeOmniFocusScript` -- test: task with multiple attachments returns correct metadata, task with no attachments returns empty array, task with duplicate filenames returns distinct indices, project ID resolves to root task, ID not found returns error, empty OmniJS output returns error, **edge case: completed/dropped task returns attachments normally (spec Edge Cases)** -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T008 [US1] Copy `ListAttachmentsInputSchema`, `ListAttachmentsSuccessSchema`, `ListAttachmentsErrorSchema`, `ListAttachmentsResponseSchema` from `specs/011-attachments/contracts/list-attachments.ts` into `src/contracts/attachment-tools/list-attachments.ts` and add re-exports to `src/contracts/attachment-tools/index.ts` -- contract tests turn GREEN
- [ ] T009 [US1] Implement `listAttachments` primitive in `src/tools/primitives/listAttachments.ts` -- OmniJS script: task/project resolution (Task.byIdentifier then Project.byIdentifier with project.task fallback per AD-002), iterate `task.attachments`, extract index/filename/type/size per `AttachmentInfoSchema`, filename resolution (`preferredFilename || filename || 'unnamed'`), size from `contents.length` -- unit tests turn GREEN
- [ ] T010 [US1] Implement `listAttachments` definition in `src/tools/definitions/listAttachments.ts` -- Zod schema for MCP tool registration, call `listAttachments` primitive, format MCP response -- mirror `listNotifications.ts` pattern
- [ ] T011 [US1] Register `list_attachments` tool in `src/server.ts`

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T012 [US1] Run `pnpm build && pnpm test && pnpm typecheck && pnpm lint` -- all green
- [ ] T013 [US1] Manual verification: test OmniJS script in Script Editor with a task that has attachments

**Checkpoint**: User Story 1 fully functional -- `list_attachments` works independently

---

## Phase 4: User Story 2 - Add Attachment to Task (Priority: P1) -- MVP

**Goal**: Users can add a file attachment via base64-encoded data in a single tool call (FR-002, FR-006, FR-007, FR-007a, FR-008, FR-009, FR-011, FR-012)

**Independent Test**: Call `add_attachment` with base64 data and a filename, then verify via `list_attachments` that the attachment appears with the correct name and size

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T014 [P] [US2] Write contract tests for `add_attachment` schemas in `tests/contract/attachment-tools/add-attachment.contract.test.ts` -- test `AddAttachmentInputSchema` (valid input, empty id, empty filename, filename >255 chars, filename with path separators `/` `\` `..`, empty data, data with whitespace stripping, data exceeding max length, **NFR-001 Zod pipeline: verify `.transform()` strips whitespace before `.refine()` checks max length -- Pattern B**), `AddAttachmentSuccessSchema` (with/without warning field), `AddAttachmentErrorSchema` (with code enum: INVALID_BASE64, SIZE_EXCEEDED, NOT_FOUND), response discriminated union -- copy schema from `specs/011-attachments/contracts/add-attachment.ts` into `src/contracts/attachment-tools/add-attachment.ts` first, then verify tests FAIL
- [ ] T015 [P] [US2] Write unit tests for `addAttachment` primitive in `tests/unit/attachment-tools/addAttachment.test.ts` -- mock `executeOmniFocusScript` -- test: valid base64 adds attachment and returns count, invalid base64 returns INVALID_BASE64 code, size >10 MB returns success with warning (FR-012 template, **NFR-002 latency note covered by warning presence**), size >50 MB returns SIZE_EXCEEDED code, project ID resolves to root task, ID not found returns NOT_FOUND code, OmniJS silent failure (read-back verification fails) returns error, whitespace-containing base64 is accepted, filename with `/` rejected, filename with `..` rejected -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T016 [US2] Copy `AddAttachmentInputSchema`, `AddAttachmentSuccessSchema`, `AddAttachmentErrorSchema`, `AddAttachmentResponseSchema` from `specs/011-attachments/contracts/add-attachment.ts` into `src/contracts/attachment-tools/add-attachment.ts` and add re-exports to `src/contracts/attachment-tools/index.ts` -- contract tests turn GREEN
- [ ] T017 [US2] Implement `addAttachment` primitive in `src/tools/primitives/addAttachment.ts` -- server-side: strip whitespace from data, validate base64 regex, calculate decoded size via `Buffer.from(data, 'base64').length`, check >50 MB rejection (SIZE_EXCEEDED), check >10 MB warning (FR-012 template); OmniJS script: use `escapeForJS()` for embedding base64 string and filename as string literals in the script template (base64 contains `+`, `/`, `=` characters), task/project resolution (AD-002), `Data.fromBase64()` with null check (AD-007), `FileWrapper.withContents(filename, data)`, `task.addAttachment(wrapper)`, read-back verification (AD-007 pattern from addNotification.ts) -- unit tests turn GREEN
- [ ] T018 [US2] Implement `addAttachment` definition in `src/tools/definitions/addAttachment.ts` -- Zod schema for MCP tool registration, call `addAttachment` primitive, format MCP response -- mirror `addNotification.ts` pattern
- [ ] T019 [US2] Register `add_attachment` tool in `src/server.ts`

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T020 [US2] Run `pnpm build && pnpm test && pnpm typecheck && pnpm lint` -- all green
- [ ] T021 [US2] Manual verification: test OmniJS script in Script Editor with base64-encoded file data

**Checkpoint**: User Stories 1 AND 2 work -- full read-write cycle for attachments

---

## Phase 5: User Story 3 - Remove Attachment from Task (Priority: P2)

**Goal**: Users can remove a specific attachment by index without affecting other attachments (FR-003, FR-006, FR-008, FR-009, FR-010)

**Independent Test**: Add an attachment, note its index via `list_attachments`, call `remove_attachment`, then verify the attachment is gone and remaining indices are updated

**Dependency**: Requires US1 (`list_attachments`) for index verification workflow. Can start after Phase 2 (Foundational) is complete; US1 need not be fully finished for contract/unit work.

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T022 [P] [US3] Write contract tests for `remove_attachment` schemas in `tests/contract/attachment-tools/remove-attachment.contract.test.ts` -- test `RemoveAttachmentInputSchema` (valid, empty id, negative index, non-integer index), `RemoveAttachmentSuccessSchema` (removedFilename, remainingAttachments array with updated indices), `RemoveAttachmentErrorSchema` (error with valid range), response discriminated union -- copy schema from `specs/011-attachments/contracts/remove-attachment.ts` into `src/contracts/attachment-tools/remove-attachment.ts` first, then verify tests FAIL
- [ ] T023 [P] [US3] Write unit tests for `removeAttachment` primitive in `tests/unit/attachment-tools/removeAttachment.test.ts` -- mock `executeOmniFocusScript` -- test: remove middle attachment returns remaining with updated indices, remove last attachment returns empty array, remove from task with 1 attachment returns empty, out-of-bounds index returns error with valid range (FR-010), task with no attachments returns error, project ID resolves to root task, ID not found returns error -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T024 [US3] Copy `RemoveAttachmentInputSchema`, `RemoveAttachmentSuccessSchema`, `RemoveAttachmentErrorSchema`, `RemoveAttachmentResponseSchema` from `specs/011-attachments/contracts/remove-attachment.ts` into `src/contracts/attachment-tools/remove-attachment.ts` and add re-exports to `src/contracts/attachment-tools/index.ts` -- contract tests turn GREEN
- [ ] T025 [US3] Implement `removeAttachment` primitive in `src/tools/primitives/removeAttachment.ts` -- OmniJS script: task/project resolution (AD-002), bounds checking BEFORE calling native method (AD-007 pattern from removeNotification.ts): check empty attachments, check index >= length with valid range in error, capture removed filename, call `task.removeAttachmentAtIndex(index)`, read back remaining attachments with updated indices -- unit tests turn GREEN
- [ ] T026 [US3] Implement `removeAttachment` definition in `src/tools/definitions/removeAttachment.ts` -- Zod schema for MCP tool registration, call `removeAttachment` primitive, format MCP response -- mirror `removeNotification.ts` pattern
- [ ] T027 [US3] Register `remove_attachment` tool in `src/server.ts`

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T028 [US3] Run `pnpm build && pnpm test && pnpm typecheck && pnpm lint` -- all green
- [ ] T029 [US3] Manual verification: test OmniJS script in Script Editor with attachment removal and index re-numbering

**Checkpoint**: Attachment lifecycle complete (list, add, remove)

---

## Phase 6: User Story 4 - List Linked Files on Task (Priority: P2)

**Goal**: Users can list all linked file URL references for any task or project in a single tool call (FR-004, FR-006, FR-008, FR-009)

**Independent Test**: Call `list_linked_files` with a task ID and verify the returned array contains correct url, filename, and extension per entry

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T030 [P] [US4] Write contract tests for `list_linked_files` schemas in `tests/contract/attachment-tools/list-linked-files.contract.test.ts` -- test `ListLinkedFilesInputSchema` (valid id, empty id rejection), `ListLinkedFilesSuccessSchema` (with linked files array, empty array), `ListLinkedFilesErrorSchema` (error string), response discriminated union -- copy schema from `specs/011-attachments/contracts/list-linked-files.ts` into `src/contracts/attachment-tools/list-linked-files.ts` first, then verify tests FAIL
- [ ] T031 [P] [US4] Write unit tests for `listLinkedFiles` primitive in `tests/unit/attachment-tools/listLinkedFiles.test.ts` -- mock `executeOmniFocusScript` -- test: task with multiple linked files returns correct url/filename/extension, task with no linked files returns empty array, URL edge cases (trailing slash returns empty filename, no extension returns empty string), project ID resolves to root task, ID not found returns error -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T032 [US4] Copy `ListLinkedFilesInputSchema`, `ListLinkedFilesSuccessSchema`, `ListLinkedFilesErrorSchema`, `ListLinkedFilesResponseSchema` from `specs/011-attachments/contracts/list-linked-files.ts` into `src/contracts/attachment-tools/list-linked-files.ts` and add re-exports to `src/contracts/attachment-tools/index.ts` -- contract tests turn GREEN
- [ ] T033 [US4] Implement `listLinkedFiles` primitive in `src/tools/primitives/listLinkedFiles.ts` -- OmniJS script: task/project resolution (AD-002), iterate `task.linkedFileURLs`, extract `absoluteString` as url, `lastPathComponent` as filename, `pathExtension` as extension per `LinkedFileInfoSchema` -- unit tests turn GREEN
- [ ] T034 [US4] Implement `listLinkedFiles` definition in `src/tools/definitions/listLinkedFiles.ts` -- Zod schema for MCP tool registration, call `listLinkedFiles` primitive, format MCP response
- [ ] T035 [US4] Register `list_linked_files` tool in `src/server.ts`

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T036 [US4] Run `pnpm build && pnpm test && pnpm typecheck && pnpm lint` -- all green
- [ ] T037 [US4] Manual verification: test OmniJS script in Script Editor with a task that has linked files

**Checkpoint**: All read tools complete (list_attachments + list_linked_files)

---

## Phase 7: User Story 5 - Add Linked File to Task (Priority: P3)

**Goal**: Users can add a linked file reference via `file://` URL in a single tool call (FR-005, FR-006, FR-008, FR-009)

**Independent Test**: Call `add_linked_file` with a `file://` URL, then verify via `list_linked_files` that the URL appears

### RED Phase - Tests First (REQUIRED)

> **TDD RULE: Write these tests FIRST. Verify they FAIL before any implementation.**

- [ ] T038 [P] [US5] Write contract tests for `add_linked_file` schemas in `tests/contract/attachment-tools/add-linked-file.contract.test.ts` -- test `AddLinkedFileInputSchema` (valid file:// URL, empty id, empty URL, URL without file:// scheme, https:// URL rejection), `AddLinkedFileSuccessSchema` (linkedFileCount), `AddLinkedFileErrorSchema` (error string), response discriminated union -- copy schema from `specs/011-attachments/contracts/add-linked-file.ts` into `src/contracts/attachment-tools/add-linked-file.ts` first, then verify tests FAIL
- [ ] T039 [P] [US5] Write unit tests for `addLinkedFile` primitive in `tests/unit/attachment-tools/addLinkedFile.test.ts` -- mock `executeOmniFocusScript` -- test: valid file:// URL adds linked file and returns count, URL without file:// rejected at schema level, project ID resolves to root task, ID not found returns error, OmniJS `URL.fromString()` null return returns error (AD-007) -- verify FAILS

### GREEN Phase - Implementation

> **TDD RULE: Write MINIMUM code to make tests pass. No extras.**

- [ ] T040 [US5] Copy `AddLinkedFileInputSchema`, `AddLinkedFileSuccessSchema`, `AddLinkedFileErrorSchema`, `AddLinkedFileResponseSchema` from `specs/011-attachments/contracts/add-linked-file.ts` into `src/contracts/attachment-tools/add-linked-file.ts` and add re-exports to `src/contracts/attachment-tools/index.ts` -- contract tests turn GREEN
- [ ] T041 [US5] Implement `addLinkedFile` primitive in `src/tools/primitives/addLinkedFile.ts` -- OmniJS script: task/project resolution (AD-002), `URL.fromString(urlString)` with null check (AD-007), `task.addLinkedFileURL(url)`, return linkedFileCount -- unit tests turn GREEN
- [ ] T042 [US5] Implement `addLinkedFile` definition in `src/tools/definitions/addLinkedFile.ts` -- Zod schema for MCP tool registration, call `addLinkedFile` primitive, format MCP response
- [ ] T043 [US5] Register `add_linked_file` tool in `src/server.ts`

### REFACTOR Phase - Polish

> **TDD RULE: Improve code quality. Tests MUST stay GREEN.**

- [ ] T044 [US5] Run `pnpm build && pnpm test && pnpm typecheck && pnpm lint` -- all green
- [ ] T045 [US5] Manual verification: test OmniJS script in Script Editor with a `file://` URL

**Checkpoint**: All 5 tools functional -- complete attachment and linked file management

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, validation, and final quality checks across all tools

- [ ] T046 [P] Run full test suite: `pnpm test` -- all tests GREEN across all 5 tools
- [ ] T047 [P] Run coverage check: `pnpm test:coverage` -- verify coverage for new files
- [ ] T048 [P] Run `pnpm typecheck` -- zero TypeScript errors
- [ ] T049 [P] Run `pnpm lint` -- zero lint errors
- [ ] T050 Run `pnpm build` and verify `dist/` output includes all 5 new tools
- [ ] T051 Run quickstart.md validation -- manually exercise each tool scenario from `specs/011-attachments/quickstart.md`
- [ ] T052 Verify all 5 tools registered in `src/server.ts` and appear in MCP tool listing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion -- BLOCKS all user stories
- **US1 List Attachments (Phase 3)**: Depends on Phase 2; can start immediately after
- **US2 Add Attachment (Phase 4)**: Depends on Phase 2; can start in parallel with US1 [P]
- **US3 Remove Attachment (Phase 5)**: Depends on Phase 2; can start in parallel with US1/US2 [P]; integration testing benefits from US1 for index verification
- **US4 List Linked Files (Phase 6)**: Depends on Phase 2; can start in parallel with US1/US2/US3 [P]
- **US5 Add Linked File (Phase 7)**: Depends on Phase 2; can start in parallel with all other stories [P]
- **Polish (Phase 8)**: Depends on all 5 user story phases being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories -- fully independent
- **US2 (P1)**: No dependency on other stories -- fully independent (verification via US1 is a workflow enhancement, not a code dependency)
- **US3 (P2)**: Workflow dependency on US1 for index lookup; code is independently testable via mocked `executeOmniFocusScript`
- **US4 (P2)**: No dependency on other stories -- fully independent
- **US5 (P3)**: No dependency on other stories -- fully independent (verification via US4 is a workflow enhancement)

### TDD Order Within Each User Story (MANDATORY)

```text
1. RED: Write failing tests
   - Contract tests for schemas
   - Unit tests for primitives
   - Run `pnpm test` -> verify tests FAIL

2. GREEN: Implement minimum code
   - Contracts first (schemas)
   - Primitives second (business logic)
   - Definitions third (MCP interface)
   - Register in server.ts
   - Run `pnpm test` -> tests turn GREEN

3. REFACTOR: Clean up
   - Improve code quality
   - Run `pnpm test` -> tests stay GREEN
   - Manual OmniFocus verification (last)
```

### Parallel Opportunities

- **Phase 2**: T003, T004 can run in parallel (different test files)
- **Phase 3-7**: After Phase 2, ALL five user stories can run in parallel (different files, no code dependencies)
- **Within each story**: Contract test (RED) and unit test (RED) can run in parallel [P]
- **Phase 8**: T046-T049 can all run in parallel

---

## TDD Parallel Example: User Story 1 (List Attachments)

```bash
# RED: Launch both tests together (they will FAIL):
Task: "T006 [P] [US1] Write contract test -> verify FAILS"
Task: "T007 [P] [US1] Write unit test -> verify FAILS"

# GREEN: Implement to make tests pass:
Task: "T008 Copy contract schemas"
Task: "T009 Implement listAttachments primitive"
Task: "T010 Implement listAttachments definition"
Task: "T011 Register tool in server.ts"

# REFACTOR: Polish while green:
Task: "T012 Run full build/test/lint"
Task: "T013 Manual OmniFocus verification"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (shared schemas)
2. Complete Phase 2: Foundational (base64 validation, shared contract tests)
3. Complete Phase 3: US1 List Attachments (following TDD cycle)
4. Complete Phase 4: US2 Add Attachment (following TDD cycle)
5. **STOP and VALIDATE**: All tests GREEN, manual verification passes, read-write cycle works

### Incremental Delivery

1. Setup + Foundational -> Foundation ready
2. US1 List Attachments -> TDD cycle -> All tests GREEN (read-only MVP)
3. US2 Add Attachment -> TDD cycle -> All tests GREEN (read-write MVP)
4. US3 Remove Attachment -> TDD cycle -> All tests GREEN (full attachment lifecycle)
5. US4 List Linked Files -> TDD cycle -> All tests GREEN (linked file read)
6. US5 Add Linked File -> TDD cycle -> All tests GREEN (linked file write)
7. Each story adds value without breaking previous stories (tests catch regressions)

### Parallel Team Strategy

With multiple developers after Phase 2 is complete:

- Developer A: US1 (list_attachments) + US3 (remove_attachment)
- Developer B: US2 (add_attachment)
- Developer C: US4 (list_linked_files) + US5 (add_linked_file)

---

## FR Traceability

| FR | Covered by Tasks | User Story |
|----|-----------------|------------|
| FR-001 (list attachments) | T006-T013 | US1 |
| FR-002 (add attachment) | T014-T021 | US2 |
| FR-003 (remove attachment) | T022-T029 | US3 |
| FR-004 (list linked files) | T030-T037 | US4 |
| FR-005 (add linked file) | T038-T045 | US5 |
| FR-006 (task/project resolution) | T007, T009, T015, T017, T023, T025, T031, T033, T039, T041 | All |
| FR-007 (10 MB warning) | T004, T005, T015, T017 | US2 |
| FR-007a (50 MB rejection) | T004, T005, T014, T015, T017 | US2 |
| FR-008 (input validation) | T006, T014, T022, T030, T038 | All |
| FR-009 (structured responses) | All contract tests | All |
| FR-010 (index range in error) | T023, T025 | US3 |
| FR-011 (error codes) | T014, T015, T017 | US2 |
| FR-012 (warning template) | T004, T015, T017 | US2 |
| NFR-001 (Zod pipeline max length) | T014 (Pattern B pipeline test) | US2 |
| NFR-002 (latency warning 10-50 MB) | T015, T017 (covered by FR-007/FR-012) | US2 |

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD is mandatory** -- tests MUST fail before implementation begins
- Commit after each TDD cycle (RED verified, GREEN achieved, REFACTOR done)
- Stop at any checkpoint to validate story independently
- Mirror existing patterns: `listNotifications.ts` for list primitives, `addNotification.ts` for add primitives, `removeNotification.ts` for remove primitives
- All OmniJS scripts use IIFE + try-catch + JSON.stringify pattern
- All primitives use `escapeForJS()` for string embedding in scripts
