# Type Safety & Schema Consistency Checklist: Folder Management Tools

**Purpose**: Validate requirements clarity, completeness, and consistency across three type layers: Zod schemas, TypeScript types, and OmniJS script data structures
**Created**: 2025-12-10
**Verified**: 2025-12-10 (Auto-verified against contracts/ and data-model.md)
**Feature**: [spec.md](../spec.md) | [data-model.md](../data-model.md) | [contracts/](../contracts/)

## Zod Schema Requirements

### Position Schema Conditional Validation

- [x] CHK001 - Is the conditional `relativeTo` requirement (required for before/after, optional for beginning/ending) explicitly documented with validation rules? [Completeness, Spec §FR-010/FR-023]
- [x] CHK002 - Are the error messages for missing `relativeTo` when placement is before/after explicitly specified? [Clarity, contracts/add-folder.ts]
- [x] CHK003 - Is the behavior when `relativeTo` is provided with an empty string defined? (Schema checks `length > 0` but spec doesn't address empty strings explicitly) [Edge Case, Gap]
- [x] CHK004 - Are the Zod refinement rules for Position schema consistent between add-folder.ts and move-folder.ts? [Consistency]

### Folder Identification Patterns

- [x] CHK005 - Is the precedence rule (id over name) explicitly documented in the spec for all tools that support dual identification? [Clarity, Spec §15]
- [x] CHK006 - Is the case-sensitivity requirement for name matching explicitly stated in the Zod schema descriptions? [Completeness, Spec §4 clarification]
- [x] CHK007 - Are the disambiguation response requirements (code, matchingIds array) specified for ALL name-based operations? (list_folders lacks disambiguation) [Consistency, Spec §FR-027]
- [x] CHK008 - Is the validation error message format for "folder not found" explicitly defined? [Clarity, Gap]

### Response Type Discriminated Unions

- [x] CHK009 - Are all response schemas using consistent discriminated union structure with `success` as discriminator? [Consistency, contracts/*]
- [x] CHK010 - Is the edit_folder response schema correctly using `z.union` vs `z.discriminatedUnion`? (Current uses `z.union` for 3-way split with disambiguation) [Clarity, contracts/edit-folder.ts]
- [x] CHK011 - Is the lack of disambiguation response in list_folders intentional and documented? [Gap, Spec §FR-027]
- [x] CHK012 - Are the `code` literal values for disambiguation errors consistently `'DISAMBIGUATION_REQUIRED'` across all tools? [Consistency, contracts/*]

### Input Transformation Logic

- [x] CHK013 - Is the whitespace trimming requirement (`.transform((val) => val.trim())`) consistently applied to all name inputs? [Consistency, contracts/add-folder.ts vs edit-folder.ts]
- [x] CHK014 - Is the post-trim validation (`.refine((val) => val.length > 0)`) documented as a separate step from the min(1) check? [Clarity, Spec §17 clarification]
- [x] CHK015 - Are default values (e.g., `includeChildren: true`) explicitly documented in the spec FR requirements? [Completeness, Spec §FR-006]
- [x] CHK016 - Is the default position behavior (`{ placement: "ending" }`) explicitly specified as Zod schema default or implementation default? [Clarity, Spec §FR-010]

## TypeScript Type Inference

### Primitive Function Signatures

- [x] CHK017 - Are the expected primitive function parameter types defined using Zod-inferred types (`z.infer<typeof Schema>`)? [Coverage, plan.md]
- [x] CHK018 - Are primitive function return types specified to match the response schema union types? [Coverage, Gap]
- [x] CHK019 - Is the relationship between definition-layer handlers and primitive functions explicitly documented? [Completeness, plan.md]

### Response Type Alignment

- [x] CHK020 - Is the response type export pattern (`export type X = z.infer<typeof XSchema>`) consistent across all contract files? [Consistency, contracts/*]
- [x] CHK021 - Are intermediate types (e.g., `Folder` entity) exported for use in both request and response contexts? [Completeness, contracts/list-folders.ts]
- [x] CHK022 - Is the `Position` type exported from a single source or duplicated across add-folder and move-folder? [Consistency, contracts/*]

### Type Assertion Restrictions

- [x] CHK023 - Is the prohibition against manual type assertions (`as`) when bypassing schema validation explicitly documented as a coding standard? [Gap, CLAUDE.md]
- [x] CHK024 - Are the expected TypeScript strict mode settings that prevent unsafe type operations documented? [Coverage, tsconfig.json reference]

### Type Export Consistency

- [x] CHK025 - Are all input types exported (`export type XInput = ...`) for use in primitive function signatures? [Completeness, contracts/*]
- [x] CHK026 - Are all response types exported for use in definition layer return types? [Completeness, contracts/*]
- [x] CHK027 - Is there a barrel export file (`index.ts`) specified for the contracts directory? [Gap, plan.md structure]

## OmniJS Script Data Structures

### Position Resolution

- [x] CHK028 - Is the position-to-OmniJS mapping (`library.beginning`, `folder.before`, etc.) explicitly documented with all 6 variations? [Completeness, data-model.md §Position Mapping]
- [x] CHK029 - Are the Omni Automation API method names (`Folder.byIdentifier()`, `moveSections()`) accurately referenced in the spec? [Accuracy, Spec §32 clarification]
- [x] CHK030 - Is the error handling for invalid `relativeTo` folder ID specified at the OmniJS layer? [Coverage, Spec §11 clarification]
- [x] CHK031 - Is the position resolution logic for "beginning/ending without relativeTo" explicitly documented as mapping to `library.beginning/ending`? [Clarity, data-model.md]

### Folder Entity Mapping

- [x] CHK032 - Are all four Folder fields (`id`, `name`, `status`, `parentId`) consistently specified across Zod schema and OmniJS output? [Consistency, contracts/list-folders.ts vs data-model.md]
- [x] CHK033 - Is the `id` field source (`folder.id.primaryKey`) explicitly documented for OmniJS script generation? [Clarity, data-model.md]
- [x] CHK034 - Is the `parentId` null handling (`folder.parent?.id.primaryKey`) specified for root-level folders? [Completeness, data-model.md]
- [x] CHK035 - Are any additional Folder properties (e.g., `effectiveActive`) explicitly excluded from the schema? [Scope, Spec §7 clarification]

### Error Response JSON Structure

- [x] CHK036 - Is the OmniJS try-catch wrapper pattern with JSON.stringify error return explicitly specified? [Coverage, plan.md §Execution Pattern]
- [x] CHK037 - Are error message formats for OmniJS-level failures (syntax errors, missing objects) distinguished from validation errors? [Clarity, Gap]
- [x] CHK038 - Is the disambiguation error JSON structure (`{success, error, code, matchingIds}`) specified for OmniJS-generated responses? [Completeness, Spec §FR-027]
- [x] CHK039 - Is the error response for Library operations ("Cannot delete/move library: not a valid folder target") specified at OmniJS layer? [Coverage, Spec §28 clarification]

### Status Enum Mapping

- [x] CHK040 - Is the bidirectional mapping between MCP status (`'active'|'dropped'`) and Omni Automation (`Folder.Status.Active|Dropped`) explicitly documented? [Completeness, data-model.md §Folder.Status]
- [x] CHK041 - Is the status comparison logic in OmniJS scripts specified (ternary vs enum comparison)? [Clarity, plan.md §Execution Pattern]
- [x] CHK042 - Are there only 2 valid status values documented (no `onHold`, `done` like Project.Status)? [Accuracy, Spec §Folder.Status]

## Cross-Layer Validation

### Field Name Consistency

- [x] CHK043 - Is `relativeTo` used consistently across all three layers (not `siblingId` or other variants)? [Consistency, Spec §26 clarification]
- [x] CHK044 - Is `parentId` field naming consistent across list input filter, folder entity output, and OmniJS access patterns? [Consistency]
- [x] CHK045 - Is the `newName`/`newStatus` prefix pattern for edit operations consistent with existing codebase conventions? [Consistency, Spec §31 clarification]
- [x] CHK046 - Is `id` (not `folderId`) used consistently as the primary key field name per Spec §24 clarification? [Consistency]

### Optional vs Required Consistency

- [x] CHK047 - Is the `position` field requirement asymmetry (optional for add, required for move) explicitly documented across all three layers? [Completeness, Spec §29 clarification]
- [x] CHK048 - Are all optional fields marked with `?` in TypeScript and `.optional()` in Zod consistently? [Consistency, contracts/*]
- [x] CHK049 - Is the "at least one of" validation requirement (id/name, newName/newStatus) documented at schema level with clear error messages? [Clarity, contracts/edit-folder.ts]

### Array vs Single Object Consistency

- [x] CHK050 - Is the `folders` response field always an array (even for single results)? [Consistency, contracts/list-folders.ts]
- [x] CHK051 - Is the `matchingIds` disambiguation field always an array (even for 2 matches)? [Consistency, contracts/edit-folder.ts]
- [x] CHK052 - Is the OmniJS `moveSections([folder], position)` array parameter documented correctly? [Accuracy, data-model.md]

### Null vs Undefined Handling

- [x] CHK053 - Is `parentId: null` (not `undefined`) specified for root-level folders in response schema? [Clarity, contracts/list-folders.ts]
- [x] CHK054 - Is the distinction between omitting `relativeTo` (library root) vs passing `null` explicitly documented? [Clarity, Gap]
- [x] CHK055 - Are optional input fields handled as `undefined` (Zod `.optional()`) not `null`? [Consistency, contracts/*]
- [x] CHK056 - Is the OmniJS null handling for `folder.parent` (ternary with `?.` operator) explicitly specified? [Clarity, data-model.md]

## Schema Sharing and Reuse

- [x] CHK057 - Is the Position schema defined once and imported, or duplicated across add-folder and move-folder contracts? [Consistency, contracts/*]
- [x] CHK058 - Is the FolderSchema entity defined in a shared location for reuse across tools? [Coverage, Gap]
- [x] CHK059 - Are the disambiguation error schemas factored into a shared definition? [DRY, Gap]
- [x] CHK060 - Is there a requirement for a shared types/contracts module documented in the plan? [Completeness, plan.md]

## Notes

- Check items off as completed: `[x]`
- Items marked `[Gap]` indicate potential missing requirements that should be added to spec
- Items marked `[Consistency]` require verification across multiple files
- Reference the `/speckit.clarify` command if ambiguities need resolution
- Total items: 60
