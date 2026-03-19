# API Contracts Checklist: Attachments & Linked Files

**Purpose**: Validate that API contract schemas (Zod), input/output definitions, and data-model specifications are complete, unambiguous, and consistent across spec, plan, data-model, and contract artifacts
**Created**: 2026-03-18
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [data-model.md](../data-model.md)
**Domain**: api-contracts
**Depth**: Standard
**Audience**: Reviewer (PR)

## Requirement Completeness -- Output Schemas

- [ ] CHK001 - Are all four fields of AttachmentInfo (index, filename, type, size) documented with exact types and resolution logic in the data model? [Completeness, Spec FR-001, Data Model AttachmentInfo]
- [ ] CHK002 - Are all three fields of LinkedFileInfo (url, filename, extension) documented with the OmniJS property each maps to (absoluteString, lastPathComponent, pathExtension)? [Completeness, Spec FR-004, Data Model LinkedFileInfo]
- [ ] CHK003 - Is the AttachmentInfo `type` field's enum definition (`File | Directory | Link`) consistent between the shared contract schema (`FileWrapperTypeSchema`), the data model, and the spec (FR-001)? [Consistency]
- [ ] CHK004 - Is the filename resolution chain (`preferredFilename || filename || 'unnamed'`) specified consistently across spec FR-001, data model AttachmentInfo, and the Zod schema description? [Consistency]
- [ ] CHK005 - Is the size field defined as `wrapper.contents.length` (bytes, integer) consistently in the spec (FR-001), data model, and the contract schema? [Consistency]

## Requirement Completeness -- Input Schemas

- [ ] CHK006 - Does the `add_attachment` input contract include all three required fields (id, filename, data) with minimum-length validation matching the spec (FR-002, FR-008)? [Completeness, Spec FR-002]
- [ ] CHK007 - Is base64 string validation documented in the spec as a server-side TypeScript responsibility, and does the contract schema's `data` field description mention this validation requirement? [Completeness, Spec FR-002]
- [ ] CHK008 - Does the `remove_attachment` input contract define `index` as `z.number().int().min(0)` matching the data model's "non-negative integer" requirement? [Consistency, Spec FR-003]
- [ ] CHK009 - Does the `add_linked_file` input contract enforce the `file://` scheme prefix as documented in the spec (FR-005)? [Completeness, Spec FR-005]
- [ ] CHK010 - Are all 5 tool input schemas consistent in requiring a non-empty `id` field (min 1 character) as specified in FR-008? [Consistency, Spec FR-008]

## Requirement Completeness -- Response Schemas

- [ ] CHK011 - Does the `list_attachments` success response include an `attachments` array typed as `AttachmentInfo[]` with indices usable for removal, as required by FR-001 and User Story 3? [Completeness, Spec FR-001]
- [ ] CHK012 - Does the `add_attachment` success response include an `attachmentCount` field (integer, min 1) as specified in User Story 2, Scenario 1 ("confirms success with the new attachment count")? [Completeness, Spec US-2]
- [ ] CHK013 - Does the `add_attachment` success response include an optional `warning` field for the >10 MB size threshold as required by FR-007? [Completeness, Spec FR-007]
- [ ] CHK014 - Does the `remove_attachment` success response include `remainingAttachments` array with updated indices as specified in User Story 3, Scenario 1? [Completeness, Spec US-3]
- [ ] CHK015 - Does the `remove_attachment` success response include a `removedFilename` field so the caller can confirm which attachment was deleted? [Completeness]
- [ ] CHK016 - Do all 5 tool response schemas use `z.discriminatedUnion('success', ...)` with `success: z.literal(true)` and `success: z.literal(false)` variants, matching the project's established pattern? [Consistency]
- [ ] CHK017 - Does each success response include both `id` (resolved task ID) and `name` fields for caller context, consistent with existing tool patterns? [Consistency]

## Requirement Clarity -- Base64 Validation

- [ ] CHK018 - Is the base64 validation mechanism specified clearly (regex pattern vs. `Buffer.from()` roundtrip) in the spec or plan, or is it left ambiguous for implementation to decide? [Clarity, Spec FR-002]
- [ ] CHK019 - Are the two size thresholds (>10 MB warning, >50 MB rejection) documented with their exact calculation method (`Buffer.from(data, 'base64').length`) in the spec? [Clarity, Spec FR-007, FR-007a]
- [x] CHK020 - Is the `add_attachment` error response `code` field's enum of possible values (e.g., INVALID_BASE64, SIZE_EXCEEDED) fully enumerated in the spec or data model? ~~[Gap]~~ Resolved: FR-011 enumerates INVALID_BASE64, SIZE_EXCEEDED, NOT_FOUND; data-model.md AddAttachmentError Codes table added; contract updated to `z.enum([...]).optional()`. Source: `src/contracts/status-tools/shared/disambiguation.ts` (precedent); Constitution Principle V.
- [x] CHK021 - Does the spec define whether the base64 `data` field should accept or reject strings with whitespace/newlines (common in multi-line base64 encoding)? ~~[Gap]~~ Resolved: Edge Cases section and Clarifications session document permissive handling -- whitespace stripped via `/\s+/g` before validation. Source: RFC 4648 Section 3.1; RFC 2045 (MIME base64 line wrapping).

## Requirement Clarity -- Size Warning Threshold

- [ ] CHK022 - Is the 10 MB warning threshold's exact warning message text or template specified, or is it left to implementation? [Clarity, Spec FR-007]
- [x] CHK023 - Does the `warning` field in the `add_attachment` success response have its format documented (e.g., "Attachment size (X MB) exceeds 10 MB; may impact OmniFocus Sync performance")? ~~[Gap]~~ Resolved: FR-012 specifies template `"Attachment size ({size} MB) exceeds 10 MB; may impact OmniFocus Sync performance"` with size rounded to one decimal place; data-model.md validation rules updated; contract `warning` field description updated. Source: Constitution Principle IV (Structured Data Contracts).
- [ ] CHK024 - Is the 50 MB hard rejection limit documented in FR-007a with the exact error response structure (success: false + error message + code)? [Clarity, Spec FR-007a]

## Requirement Consistency -- Cross-Artifact Alignment

- [ ] CHK025 - Does the data model's LinkedFileInfo use field name `extension` while the spec (FR-004) refers to it as `pathExtension`? Are these reconciled with a single canonical field name? [Consistency, Spec FR-004, Data Model]
- [ ] CHK026 - Does the contract schema's LinkedFileInfo use `filename` (from `lastPathComponent`) while the spec (FR-004) refers to it as `lastPathComponent`? Are user-facing field names consistent? [Consistency, Spec FR-004]
- [x] CHK027 - Is the `add_attachment` error schema's optional `code` field documented in the spec or data model, or does it only appear in the contract file? ~~[Consistency, Gap]~~ Resolved: FR-011 in spec.md enumerates the 3 error codes; data-model.md AddAttachmentError Codes table documents Code/Meaning/When; plan.md AD-006 documents the architectural decision. Source: `specs/013-task-status/data-model.md` (error codes table format precedent).
- [ ] CHK028 - Does the plan's AD-001 (Base64 Data Flow) align with the spec's FR-002 description of base64 validation happening server-side before OmniJS? [Consistency, Plan AD-001]

## Scenario Coverage -- Error Responses

- [ ] CHK029 - Is the error response format for NOT_FOUND (task/project not found) specified with enough detail for all 5 tools, matching FR-006? [Coverage, Spec FR-006]
- [ ] CHK030 - Does the `remove_attachment` error response specify that the valid index range must be included (FR-010), and is this constraint reflected in the error schema's `error` field description? [Coverage, Spec FR-010]
- [x] CHK031 - Are error codes enumerated for the `add_attachment` error response (INVALID_BASE64, SIZE_EXCEEDED, NOT_FOUND), or is the `code` field underdefined? ~~[Coverage, Gap]~~ Resolved: FR-011 enumerates all 3 codes; contract uses `z.enum(['INVALID_BASE64', 'SIZE_EXCEEDED', 'NOT_FOUND']).optional()`; data-model.md Error Codes table provides full detail. Source: `src/contracts/status-tools/shared/disambiguation.ts` (typed code precedent).
- [ ] CHK032 - Does the spec define what error structure is returned when OmniJS script execution returns empty output (silent failure edge case)? [Coverage, Edge Cases]

## Edge Case Coverage

- [x] CHK033 - Is the behavior for adding an attachment with a filename containing path separators (e.g., `../../etc/passwd`) addressed in the spec or contract validation? ~~[Edge Case, Gap]~~ Resolved: Edge Cases section documents rejection of `/`, `\`, `..` in filenames; Clarifications session documents the decision; contract `filename` field uses `.refine()` with path separator check. Source: Constitution Principle V (Defensive Error Handling); macOS APFS filename constraints.
- [x] CHK034 - Is the maximum filename length specified or bounded in the contract schema or spec? ~~[Edge Case, Gap]~~ Resolved: Edge Cases section documents 255-character limit; Clarifications session documents the macOS APFS/HFS+ rationale; contract `filename` field uses `.max(255)`. Source: macOS APFS specification (255 UTF-8 characters per filename); https://superuser.com/questions/1561484.
- [ ] CHK035 - Does the spec define whether `list_attachments` on a project resolves to the root task transparently, and whether the response `id` reflects the task ID or project ID? [Clarity, Spec FR-006]
- [ ] CHK036 - Is the behavior for `remove_attachment` with a floating-point index (e.g., 1.5) specified? The Zod schema uses `.int()` but the spec does not mention this constraint explicitly. [Edge Case, Spec FR-003]

## Non-Functional Requirements

- [x] CHK037 - Are there performance requirements or guidance for handling large base64 payloads (up to ~67 MB encoded for 50 MB decoded) in the spec or plan? ~~[Non-Functional, Gap]~~ Resolved: NFR-001 specifies Zod-level max string length of 69,905,068 characters; NFR-002 documents latency trade-off for 10-50 MB payloads; plan.md AD-001 updated with Zod max step. Source: Constitution Principle V (Defensive Error Handling); NFR-001/NFR-002 in spec.md.
- [x] CHK038 - Does the spec address memory implications of embedding a full base64 string as a JavaScript string literal inside the OmniJS script template? ~~[Non-Functional, Gap]~~ Resolved: NFR-001 explicitly documents that the Zod-level check prevents oversized payloads from reaching `app.evaluateJavascript()`; Clarifications session documents the memory concern and mitigation. Source: NFR-001 in spec.md; Clarifications session 2026-03-18 (API Contracts Checklist).

## Dependencies & Assumptions

- [ ] CHK039 - Is the assumption that `Data.fromBase64()` exists and works correctly documented with its source (Omni Automation docs) and fallback behavior (server-side validation catches failures)? [Assumption, Spec Assumptions]
- [ ] CHK040 - Is the assumption that `task.removeAttachmentAtIndex()` uses zero-based indexing documented with its source? [Assumption, Spec Assumptions]
- [ ] CHK041 - Is the assumption that `FileWrapper.withContents()` is a class function (not constructor) documented, and is this critical distinction captured in the plan's AD-001? [Assumption, Spec Assumptions]

## Notes

- Domain: api-contracts -- focused on schema definitions, input/output shapes, validation rules, and cross-artifact consistency
- Depth: Standard -- covers completeness, clarity, consistency, coverage, and edge cases
- Actor: Reviewer (PR) -- items phrased for someone reviewing contract schemas against spec requirements
- User-specified must-haves incorporated: AttachmentInfo output schema fields, LinkedFileInfo output schema fields, add_attachment base64 input, remove_attachment index input, list_attachments array with indices, base64 validation in Zod, size warning threshold in response metadata
