# Type Safety Checklist: Attachments & Linked Files

**Purpose**: Validate that type safety requirements (Zod 4.x schemas, TypeScript strictness, discriminated unions, validation constraints) are complete, clear, and consistent across spec, plan, data-model, and contract artifacts
**Created**: 2026-03-18
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [data-model.md](../data-model.md)
**Domain**: type-safety
**Depth**: Standard
**Audience**: Reviewer (PR)

## Zod 4.x Schema Completeness -- All 5 Tools

- [ ] CHK001 - Are Zod input schemas defined for all 5 tools (list_attachments, add_attachment, remove_attachment, list_linked_files, add_linked_file) with explicit field types and constraints? [Completeness, Spec FR-008, Contracts]
- [ ] CHK002 - Are Zod output schemas (success + error variants) defined for all 5 tools, each with a `z.discriminatedUnion('success', ...)` response type? [Completeness, Spec FR-009, Contracts]
- [ ] CHK003 - Are TypeScript type aliases exported via `z.infer<typeof Schema>` for every input, success, error, and response schema (ensuring no manual type definitions diverge from Zod)? [Completeness, Contracts index.ts]
- [ ] CHK004 - Does the contracts barrel file (index.ts) re-export all schemas and types from all 5 tool contract files plus the shared module? [Completeness, Contracts index.ts]

## No `as Type` Assertions

- [ ] CHK005 - Does the spec or plan explicitly state the project prohibition against `as Type` assertions, consistent with CLAUDE.md's NEVER rules? [Completeness, CLAUDE.md]
- [ ] CHK006 - Is the alternative to `as Type` (Zod parsing or type narrowing via discriminated unions) specified as the required approach in the plan or spec? [Clarity, Constitution I]
- [ ] CHK007 - Are all response schemas designed as discriminated unions so that runtime narrowing replaces any need for type assertions? [Consistency, Contracts]

## Discriminated Unions -- Response Schemas

- [ ] CHK008 - Do all 5 response schemas use `z.discriminatedUnion('success', [SuccessSchema, ErrorSchema])` with `success: z.literal(true)` and `success: z.literal(false)` as discriminator values? [Consistency, Contracts]
- [ ] CHK009 - Is the `add_attachment` error schema's optional `code` field (`z.enum(['INVALID_BASE64', 'SIZE_EXCEEDED', 'NOT_FOUND']).optional()`) consistent with the spec's FR-011 enumeration of error codes? [Consistency, Spec FR-011, Contracts add-attachment.ts]
- [ ] CHK010 - Are the success/error variant field sets mutually exclusive (no ambiguous fields that appear in both variants with different types)? [Clarity, Contracts]

## Base64 String Validation

- [ ] CHK011 - Does the `add_attachment` input schema enforce a maximum string length of 67,108,864 characters via `z.string().max(67108864)` as required by NFR-001? [Completeness, Spec NFR-001, Contracts add-attachment.ts]
- [ ] CHK012 - Is the base64 validation approach (server-side regex `/^[A-Za-z0-9+/]*={0,2}$/` after whitespace stripping) specified in the spec, plan, or data model? [Clarity, Spec FR-002, Plan AD-001]
- [ ] CHK013 - Does the spec define that whitespace stripping (`/\s+/g`) occurs BEFORE both regex validation and Zod max-length checking, so the max-length constraint applies to the cleaned string? [Clarity, Spec Edge Cases, Plan AD-001]
- [x] CHK014 - Is it specified whether the Zod schema's `.max(67108864)` applies to the raw input string (with possible whitespace) or the stripped string? If the former, is there a gap where whitespace inflates the string past the limit? ~~[Gap]~~ Resolved: NFR-001 updated to specify `.transform()` then `.refine()` pattern (Pattern B from `add-folder.ts`); plan AD-001 reordered to strip-first; data-model.md validation rules clarified; contract `data` field updated to use `.transform((val) => val.replace(/\s/g, '')).refine((val) => val.length <= 67108864, ...)`. Source: `src/contracts/folder-tools/add-folder.ts` (Pattern B precedent); Zod 4.x docs (`.transform()` converts `ZodString` to `ZodEffects`, breaking `.max()` chain).

## Index Type -- Non-Negative Integer Validation

- [ ] CHK015 - Does the `remove_attachment` input schema define `index` as `z.number().int().min(0)` matching the data model's "non-negative integer" requirement? [Completeness, Spec FR-003, Data Model RemoveAttachmentParams]
- [ ] CHK016 - Does the spec explicitly state that floating-point index values (e.g., 1.5) are rejected, or is this only implicit via the Zod `.int()` constraint? [Clarity, Spec FR-003]
- [ ] CHK017 - Is there an upper bound specified for the attachment index, or is bounds checking deferred entirely to runtime OmniJS validation? [Clarity, Spec FR-003, FR-010]

## FileWrapper Property Types

- [ ] CHK018 - Is the `FileWrapperTypeSchema` (`z.enum(['File', 'Directory', 'Link'])`) consistent with the spec's description of `FileWrapper.Type` enum values in FR-001? [Consistency, Spec FR-001, Contracts shared.ts]
- [ ] CHK019 - Is the `AttachmentInfoSchema.size` field typed as `z.number().int().min(0)` (bytes, non-negative integer), matching the spec's "size in bytes" from `contents.length`? [Consistency, Spec FR-001, Data Model AttachmentInfo]
- [ ] CHK020 - Is the `AttachmentInfoSchema.filename` field typed as `z.string()` (not `.min(1)`) to accommodate the `'unnamed'` fallback when both `preferredFilename` and `filename` are null? [Clarity, Spec FR-001, Contracts shared.ts]

## URL Validation for Linked Files

- [ ] CHK021 - Does the `add_linked_file` input schema enforce `file://` scheme via `z.string().startsWith('file://')` as required by FR-005? [Completeness, Spec FR-005, Contracts add-linked-file.ts]
- [ ] CHK022 - Is it specified whether `file://` validation is case-sensitive (e.g., `FILE://` rejected) or case-insensitive? [Clarity, Spec FR-005]
- [ ] CHK023 - Does the `LinkedFileInfoSchema.url` field in the output schema have any validation constraint (e.g., `.startsWith('file://')`) or is it a plain `z.string()` since data comes from OmniFocus? [Clarity, Contracts shared.ts]

## Task/Project Identifier Type

- [ ] CHK024 - Do all 5 input schemas use a consistent `id: z.string().min(1)` field for task/project identification, as required by FR-006 and FR-008? [Consistency, Spec FR-006, FR-008, Contracts]
- [ ] CHK025 - Does the spec explicitly state that these tools accept only ID-based lookup (not name-based), differentiating them from tools that support name disambiguation? [Clarity, Spec FR-006]
- [ ] CHK026 - Is the task/project resolution order (Task.byIdentifier first, then Project.byIdentifier, then NOT_FOUND) documented in the plan's AD-002 and consistent with the spec's FR-006? [Consistency, Plan AD-002, Spec FR-006]

## Shared Schema Reuse

- [ ] CHK027 - Are `AttachmentInfoSchema` and `LinkedFileInfoSchema` defined in a shared module and reused by consuming contracts (list-attachments, remove-attachment, list-linked-files) rather than duplicated? [Consistency, Constitution IX, Contracts shared.ts]
- [ ] CHK028 - Does the spec or plan document the decision to use shared schemas for output types, following the pattern established by status-tools (`ItemIdentifier`, `StatusBatchItemResult`, `Summary`)? [Completeness, Plan AD-003]
- [ ] CHK029 - Is the `FileWrapperTypeSchema` enum shared and reused rather than defined inline in each contract file? [Consistency, Contracts shared.ts]

## Batch Operations & Refinements (Scope Verification)

- [ ] CHK030 - Does the spec explicitly state that batch operations are out of scope (no `batch_update_tasks` tool), making Zod refinements for "at least one property" not applicable to this feature? [Completeness, Spec Scope Boundaries]
- [ ] CHK031 - Does the spec explicitly state that `BatchItemResult` discriminated unions are not applicable since all operations are single-item? [Completeness, Spec Scope Boundaries, Plan AD-005]
- [ ] CHK032 - Does the spec explicitly state that `Position` type with conditional `relativeTo` is not applicable to attachment tools (no ordering/positioning concept beyond index)? [Completeness, Spec Scope Boundaries]

## Filename Validation Refinement

- [ ] CHK033 - Does the `add_attachment` input schema use a Zod `.refine()` to reject filenames containing path separators (`/`, `\`) and directory traversal (`..`), as documented in the edge cases? [Completeness, Spec Edge Cases, Contracts add-attachment.ts]
- [ ] CHK034 - Is the filename max length of 255 characters enforced via `z.string().max(255)` in the contract, matching the macOS APFS/HFS+ constraint documented in the edge cases? [Completeness, Spec Edge Cases, Contracts add-attachment.ts]
- [ ] CHK035 - Is the Zod refinement error message for path separator rejection specified in the spec or data model, or only in the contract code? [Clarity, Spec Edge Cases]

## Type Safety Cross-Cutting Concerns

- [ ] CHK036 - Does the plan's Constitution Check confirm Principle I (Type-First Development) passes for this feature? [Completeness, Plan Constitution Check]
- [ ] CHK037 - Is strict TypeScript mode (`"strict": true`) documented as a requirement for this feature's implementation, consistent with the project's TypeScript 5.9+ ES2024 target? [Completeness, Plan Technical Context]
- [ ] CHK038 - Are all response schemas designed so that Zod `.parse()` or `.safeParse()` is sufficient for type narrowing at runtime, eliminating any need for manual type guards? [Clarity, Constitution I]

## Notes

- Domain: type-safety -- focused on Zod schema design, TypeScript type safety, validation constraints, and discriminated union correctness
- Depth: Standard -- covers completeness, clarity, consistency, coverage, and edge cases for type safety requirements
- Actor: Reviewer (PR) -- items phrased for someone reviewing type safety requirements quality
- User-specified must-haves incorporated: Zod 4.x schemas for all 5 tools, no `as Type` assertions, base64 validation, index validation, FileWrapper types, URL validation, discriminated unions, shared schema reuse
- Out-of-scope items verified: Position type with `relativeTo`, `batch_update_tasks` refinements, `BatchItemResult` discriminated union -- all confirmed not applicable to this feature per spec scope boundaries (CHK030-CHK032)
- Discriminated union for task identifier (id vs name): This feature uses ID-only lookup (no name disambiguation), verified in CHK025
