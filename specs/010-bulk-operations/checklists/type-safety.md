# Type Safety Checklist: Bulk Operations

**Purpose**: Validate requirements quality for type safety across all 6 bulk operation tools -- Zod 4.x schema completeness, no `as Type` assertions, conditional types, discriminated unions, and shared schema reuse patterns.
**Created**: 2026-03-18
**Domain**: type-safety
**Depth**: Standard
**Audience**: Reviewer (PR)
**Focus**: Zod 4.x schemas for all 6 tool inputs/outputs, no `as Type` assertions, Position type conditionals, batch_update_tasks refinements, BatchItemResult discriminated unions, shared schema reuse from status-tools patterns

---

## Requirement Completeness

- [ ] CHK001 - Are Zod schemas explicitly specified for all 6 tool input types (MoveTasksInputSchema, DuplicateTasksInputSchema, BatchUpdateTasksInputSchema, ConvertTasksToProjectsInputSchema, MoveSectionsInputSchema, DuplicateSectionsInputSchema) with field-level type annotations? [Completeness, Spec FR-001 through FR-006 + Contracts]
- [ ] CHK002 - Are Zod schemas explicitly specified for all 6 tool output types (success and error variants) using `z.discriminatedUnion('success', [...])` pattern? [Completeness, Contracts move-tasks.ts through duplicate-sections.ts]
- [ ] CHK003 - Are all shared type schemas (ItemIdentifierSchema, BulkBatchItemResultSchema, SummarySchema, TaskPositionSchema, SectionPositionSchema, PropertyUpdateSetSchema) documented with their field types and constraints? [Completeness, Contracts shared.ts]
- [ ] CHK004 - Is the `warning` field on `BulkBatchItemResultSchema` documented as a type-level requirement -- is its type (optional string), presence condition (success=true only), and purpose (non-fatal concerns) specified in the spec? [Completeness, Spec Edge Cases line 126 + Contracts shared.ts line 79-84]
- [ ] CHK005 - Are all 4 mutual exclusion constraints in `PropertyUpdateSetSchema` documented as Zod `.refine()` requirements with explicit error messages (dueDate vs clearDueDate, deferDate vs clearDeferDate, estimatedMinutes vs clearEstimatedMinutes, plannedDate vs clearPlannedDate)? [Completeness, Contracts shared.ts lines 313-324 + Data Model]
- [ ] CHK006 - Is the `addTags`/`removeTags` array `.min(1)` constraint documented in the spec -- does the spec state that empty arrays are invalid when provided, or is this only specified in the contracts? [Completeness, Spec Edge Cases line 137 + Contracts shared.ts lines 281-287]
- [ ] CHK007 - Are the inferred TypeScript types (via `z.infer<>`) documented for all shared schemas -- does the spec or plan specify that implementations must use inferred types rather than manually defined interfaces? [Completeness, Plan Constitution Check I. Type-First]

## Requirement Clarity

- [ ] CHK008 - Is the `as Type` prohibition clearly documented as a requirement for all 6 tool implementations -- does the spec or plan explicitly reference the CLAUDE.md "NEVER use type assertions (`as Type`)" rule as applicable to bulk-tools? [Clarity, CLAUDE.md Critical Rules + Spec implied via Constitution I]
- [ ] CHK009 - Is the `TaskPositionSchema` `relativeTo` conditional requirement clearly specified as a Zod `.refine()` (not a TypeScript conditional type or Zod `.superRefine()`) -- does the spec define the validation mechanism? [Clarity, Contracts shared.ts lines 184-196]
- [ ] CHK010 - Is it clear that `clearX: false` does NOT count as a specified property for the "at least one property" refinement in `PropertyUpdateSetSchema` -- is the distinction between `undefined`, `false`, and `true` for clearX flags unambiguously specified? [Clarity, Spec Edge Cases line 138 + Contracts shared.ts lines 296-308]
- [ ] CHK011 - Is the `z.discriminatedUnion('success', [...])` pattern specified as the required Zod 4.x approach for response types -- does the spec reference Zod 4.x discriminated union syntax specifically (vs `z.union()`)? [Clarity, Contracts move-tasks.ts line 64 + Plan Technical Context Zod 4.2.x]
- [ ] CHK012 - Is the `inbox` field type (`z.literal(true)`) clearly specified in the `TaskPositionSchema` -- does the spec define that `inbox: false` is not valid (only `true` or absent)? [Clarity, Contracts shared.ts line 136 + Spec Key Entities - Position]
- [ ] CHK013 - Are date string fields (`dueDate`, `deferDate`, `plannedDate`) clearly specified as `z.string()` without `.datetime()` format validation -- and is the rationale (delegation to OmniJS layer) documented? [Clarity, Spec Key Entities - Property Update Set + Data Model - Date Format Validation]

## Requirement Consistency

- [ ] CHK014 - Is the `BulkBatchItemResultSchema.itemType` enum (`['task', 'project', 'folder']`) consistent with the intent of each tool -- do move_tasks/duplicate_tasks/batch_update_tasks/convert_tasks_to_projects schemas correctly limit to tasks only at the type level, or does the shared schema's 3-value enum create a type-safety gap? [Consistency, Contracts shared.ts line 62]
- [ ] CHK015 - Is the `ItemIdentifierSchema` `.refine()` validation (at least one of id/name non-empty) structurally identical between the bulk-tools and status-tools versions -- are the refinement functions, error messages, and describe strings consistent? [Consistency, Contracts shared.ts lines 28-38 vs status-tools/shared/item-identifier.ts lines 19-29]
- [ ] CHK016 - Is the `SummarySchema` structurally identical between bulk-tools and status-tools -- are all three fields (total, succeeded, failed) typed identically with the same `.int().min(0)` constraints? [Consistency, Contracts shared.ts lines 97-103 vs status-tools/shared/batch.ts lines 40-46]
- [ ] CHK017 - Is the `BulkBatchItemResultSchema.candidates` array element type (`{ id: string, name: string, type: enum }`) consistent with the status-tools `StatusBatchItemResultSchema.candidates` element type? [Consistency, Contracts shared.ts lines 72-75 vs status-tools/shared/batch.ts lines 26-29]
- [ ] CHK018 - Is the `SectionPositionSchema` (placement required, no default) consistent with the existing `PositionSchema` from `src/contracts/folder-tools/shared/position.ts` -- are the refinements identical? [Consistency, Data Model - SectionPosition + Contracts shared.ts lines 218-243]
- [x] CHK019 - Does the quickstart.md pattern code (`return result as MoveTasksResponse` at line 106) contradict the `as Type` prohibition -- is this documented as a placeholder to be replaced with Zod parsing or type narrowing in the actual implementation? [Consistency, Quickstart.md line 106 vs CLAUDE.md "NEVER use type assertions"] [Gap remediated: quickstart.md updated to use `MoveTasksResponseSchema.parse(result)` pattern]

## Scenario Coverage

- [ ] CHK020 - Are requirements specified for how Zod validation errors from `.refine()` are surfaced to MCP clients -- does the spec define that Zod validation errors become top-level `VALIDATION_ERROR` responses (not per-item errors)? [Coverage, Spec FR-009 + FR-013 + Edge Cases]
- [x] CHK021 - Are requirements defined for type narrowing after `z.discriminatedUnion` parsing -- does the spec state that implementations should use the discriminator (`success`) for type narrowing rather than type assertions? [Coverage, Constitution I. Type-First + CLAUDE.md] [Gap remediated: plan.md AD-10 added specifying discriminated union narrowing in definitions]
- [ ] CHK022 - Are requirements specified for how the `code` field on error responses maps to a finite set of string literals -- is `code` typed as `z.string()` (open-ended) or should it use `z.enum([...])` for type-safe error code matching? [Coverage, Contracts shared.ts line 65-70 + Data Model Error Codes]
- [x] CHK023 - Are requirements specified for how primitives return typed responses -- must the OmniJS script result be parsed through the response Zod schema (e.g., `MoveTasksResponseSchema.parse(result)`) before being returned, or is unvalidated JSON acceptable? [Coverage, Constitution IV. Structured Data Contracts] [Gap remediated: plan.md AD-09 added requiring Zod .parse() at primitive boundary; quickstart.md updated with correct pattern]
- [ ] CHK024 - Are requirements defined for the type of `estimatedMinutes` when it crosses the OmniJS boundary -- does the spec clarify that JSON parsing may return a float even though the schema specifies `.min(0)`, and whether `.int()` constraint is needed? [Coverage, Contracts shared.ts line 269 + Data Model - Numeric Constraints]

## Edge Case Coverage

- [ ] CHK025 - Is the type behavior defined when `items` is an empty array (`[]`) -- does the `.min(1)` constraint produce a Zod error that is distinct from the `.max(100)` overflow case, and are both mapped to `VALIDATION_ERROR`? [Edge Case, Contracts move-tasks.ts line 32 + Spec FR-009]
- [ ] CHK026 - Is the type behavior defined when `placement` is omitted from `TaskPositionSchema` -- does the `.default('ending')` produce the correct inferred TypeScript type (always present after parsing), and is this documented? [Edge Case, Contracts shared.ts line 142]
- [ ] CHK027 - Is the type behavior defined when both `id` and `name` are provided in an `ItemIdentifier` -- does the spec state which takes precedence at the type level, and is this consistent with status-tools precedence (id wins)? [Edge Case, Spec Key Entities + Data Model - ItemIdentifier]
- [ ] CHK028 - Is the type behavior defined when `convert_tasks_to_projects` specifies both `targetFolderId` and `targetFolderName` -- is the precedence rule (id wins) enforced at the Zod schema level or only at runtime? [Edge Case, Spec Edge Cases line 139 + Contracts convert-tasks-to-projects.ts]
- [x] CHK029 - Is it specified whether the `BulkBatchItemResult` discriminated on `success` at the per-item level -- can implementations use `if (result.success)` for type narrowing of optional fields (error, code, newId, newName), or is additional narrowing needed? [Edge Case, Contracts shared.ts lines 59-85] [Gap remediated: data-model.md BulkBatchItemResult section updated with Type Narrowing note explaining flat object vs discriminated union semantics]

## Non-Functional Requirements

- [ ] CHK030 - Are Zod 4.x-specific requirements documented -- does the spec or plan reference any Zod 4.x breaking changes from Zod 3.x that affect schema definitions (e.g., `z.discriminatedUnion` API changes, `z.infer` behavior)? [Non-Functional, Plan Technical Context Zod 4.2.x + Constitution MCP Integration Standards]
- [ ] CHK031 - Is the `.js` extension requirement for all local imports documented as applicable to contract barrel exports (`index.ts` exporting from `./shared.js`, `./move-tasks.js`, etc.)? [Non-Functional, Constitution MCP Integration Standards + Contracts index.ts]
- [ ] CHK032 - Are the TypeScript strict mode implications documented for the bulk-tools contracts -- does the spec acknowledge that `strictNullChecks` affects how optional fields (`error?`, `code?`, `newId?`, `newName?`, `warning?`) must be handled by consumers? [Non-Functional, Constitution I. Type-First + CLAUDE.md tsconfig strict]

## Dependencies & Assumptions

- [ ] CHK033 - Is the per-domain contract ownership decision (AD-02: bulk-tools owns its own copies of ItemIdentifier, Summary, etc.) documented with the type-safety rationale -- does the plan explain why shared schemas are copied rather than imported, and the risk of schema drift between domains? [Dependencies, Plan AD-02]
- [ ] CHK034 - Is it documented that `BulkBatchItemResultSchema` is not a TypeScript `extends` of `StatusBatchItemResultSchema` but a new schema with additional fields -- and is the structural compatibility between them specified? [Dependencies, Plan AD-02 + Data Model - BulkBatchItemResult]
- [ ] CHK035 - Are the Zod version requirements (4.2.x) consistent across all contract files and the plan -- do all contract file headers reference the same Zod version? [Dependencies, Contracts file headers + Plan Technical Context]

## Ambiguities & Conflicts

- [x] CHK036 - Does the quickstart.md code example `return result as MoveTasksResponse` (line 106) create an ambiguity about whether type assertions are acceptable in bulk-tools primitives -- should this example be corrected to use Zod `.parse()` or type narrowing to avoid contradicting the `as Type` prohibition? [Ambiguity, Quickstart.md line 106 vs CLAUDE.md] [Gap remediated: quickstart.md updated to use `MoveTasksResponseSchema.parse(result)` with comment explaining the pattern]
- [ ] CHK037 - Is there an ambiguity in `BulkBatchItemResultSchema` where `code` is typed as `z.string().optional()` rather than `z.enum([...]).optional()` -- does this weaken type safety by allowing arbitrary error code strings, contradicting the finite error code taxonomy in AD-08? [Ambiguity, Contracts shared.ts lines 65-70 + Plan AD-08]
- [ ] CHK038 - Is there a conflict between the `BulkBatchItemResultSchema` being a flat object (all fields always present in the schema) and the semantic requirement that `newId`/`newName` are only meaningful for duplicate/convert operations -- should per-tool result schemas narrow the `BulkBatchItemResult` type to exclude `newId`/`newName` where not applicable? [Ambiguity, Contracts shared.ts + Spec Key Entities - Batch Result]

---

## Notes

- Check items off as completed: `[x]`
- Items marked `[Gap]` indicate missing or underspecified requirements that need remediation
- All items reference specific spec sections, contract files, or plan decisions for traceability
- Items are numbered sequentially (CHK001-CHK038) for easy reference
