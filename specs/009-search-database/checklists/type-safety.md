# Type Safety Checklist: Search & Database (SPEC-009)

**Purpose**: Validate requirements quality for type-safety concerns: Zod 4.x schema completeness, `as Type` prohibition enforcement, type discriminators on search results, numeric types for stats, and shared search result schema reuse across the four search tools
**Created**: 2026-03-18
**Feature**: [spec.md](../spec.md) | [search-tools.ts](../contracts/search-tools.ts) | [database-tools.ts](../contracts/database-tools.ts) | [data-model.md](../data-model.md)
**Domain**: type-safety
**Depth**: Standard
**Audience**: Reviewer (PR)

## Requirement Completeness -- Zod 4.x Schema Coverage

- [ ] CHK001 - Are Zod input schemas specified for all 10 tools, including the 6 parameterless database tools that require explicit empty-object schemas? [Completeness, Spec §FR-001 through §FR-016] -- The contract defines `z.object({})` for parameterless tools (save, cleanup, undo, redo, stats, inbox count), but the spec does not mention whether parameterless tools should have formal input schemas or be omitted.
- [ ] CHK002 - Are Zod output schemas specified for both success and error variants of all 10 tools? [Completeness] -- The contracts define discriminated unions for all 10 tools, but the spec only describes success-path outputs narratively. Is the error-path schema (`{ success: false, error: string }`) a documented requirement or an implicit convention?
- [ ] CHK003 - Is the Zod version requirement (4.x) explicitly stated in the spec or plan as a constraint on schema definitions? [Clarity, Plan §Technical Context] -- The plan states "Zod 4.2.x" but the spec has no Zod version constraint. Are there Zod 4.x-specific features (e.g., `z.discriminatedUnion` behavior) that the requirements depend on?
- [ ] CHK004 - Are the `.describe()` annotations on schema fields documented as a requirements-level concern (e.g., for MCP tool documentation generation), or are they purely implementation detail? [Clarity, Gap] -- Contracts use `.describe()` on every field, but no requirement mandates self-documenting schemas.
- [ ] CHK005 - Is the `z.number().int().min(0)` constraint pattern for all count/stats fields documented as a requirement (non-negative integers)? [Completeness, Spec §FR-014] -- FR-014 says "task counts" and "project counts" but never specifies the numeric type constraints (integer, non-negative). The data model and contracts enforce this, but is it a requirement?

## Requirement Completeness -- Type Assertion Prohibition

- [ ] CHK006 - Is the prohibition of `as Type` assertions documented as a cross-cutting requirement applicable to SPEC-009 tools? [Gap] -- CLAUDE.md states "NEVER use type assertions (`as Type`) -- use Zod or type narrowing instead" but no functional requirement in the spec references this constraint. Is this a project-wide rule or should each spec explicitly incorporate it?
- [ ] CHK007 - Are type narrowing alternatives specified for scenarios where OmniJS returns untyped data? [Completeness, Gap] -- The OmniJS scripts return `JSON.stringify(...)` results parsed as unknown. The spec does not specify how these untyped results should be validated into typed schemas without `as Type`.
- [ ] CHK008 - Is the requirement to use Zod `.parse()` or `.safeParse()` for runtime validation explicitly stated for OmniJS script results? [Gap] -- The prohibition of `as Type` implies Zod parsing is the alternative, but neither spec nor plan explicitly requires Zod runtime parsing of OmniJS return values.
- [ ] CHK009 - Are requirements defined for how type narrowing should handle the discriminated union responses (success true vs. false) at the definition layer? [Gap] -- The contracts define `z.discriminatedUnion('success', [...])` but the spec does not describe how callers narrow the response type after parsing.

## Requirement Clarity -- Search Result Type Discriminators

- [ ] CHK010 - Does each search result schema include a type discriminator field (e.g., `type: "task"`, `type: "project"`) to distinguish result items across tools? [Gap, Spec §Key Entities] -- The spec defines a "Search Result" entity with "parent context is type-specific" but no explicit `type` field exists on any result schema. If a consumer receives mixed results, how are item types distinguished?
- [ ] CHK011 - Is the absence of a unified search-across-all-types tool (which would require type discriminators) documented as a deliberate scoping decision? [Completeness, Spec §Out of Scope] -- The four separate search tools return type-specific results, making discriminators less critical. But is this separation documented as the reason discriminators are not needed?
- [ ] CHK012 - Are the structural differences between the four result types (tasks have `projectName` + `flagged` + `status`; folders lack `status`; tags have `parentTagName`) documented as type-distinguishing characteristics? [Clarity, Spec §Key Entities] -- The spec describes "parent context is type-specific" but does not enumerate how the differing field sets serve as implicit type markers.
- [ ] CHK013 - If a future unified search tool is planned (SPEC-020), are the current result schemas designed to be forward-compatible with a type discriminator field? [Gap, Spec §Out of Scope] -- SPEC-020 is mentioned for "optimization phase" but no forward-compatibility requirements are defined for adding a discriminator later.

## Requirement Clarity -- Database Stats Numeric Types

- [ ] CHK014 - Are database statistics fields explicitly required to be integer types (not floating-point)? [Clarity, Spec §FR-014] -- FR-014 says "task counts" implying integers, but the word "integer" never appears. The contract enforces `z.number().int()`, but is this requirement-level or implementation-level?
- [ ] CHK015 - Is the constraint that stats values must be non-negative (`min(0)`) documented as a requirement? [Clarity, Spec §FR-014] -- Counts cannot logically be negative, but the spec does not state this constraint. Is it assumed or should it be explicit?
- [ ] CHK016 - Is the `total` computed field in TaskStats and ProjectStats specified as the sum of its component counts? [Clarity, Gap] -- The data model says "Sum of all categories" for `total`, but the spec's FR-014 does not mention a `total` field at all. Is this an addition beyond requirements?
- [ ] CHK017 - Are the inbox count and database stats inbox field required to return consistent values (i.e., `get_inbox_count().count === get_database_stats().inbox`)? [Consistency, Spec §FR-014/FR-015] -- Both tools return inbox counts, but no requirement mandates consistency between them.
- [ ] CHK018 - Is the OmniJS `inbox.length` return type documented as a guaranteed integer (not a potentially floating-point value from the JavaScript runtime)? [Assumption] -- OmniJS runs in a JavaScript context where `.length` is always an integer, but is this assumption documented?

## Requirement Consistency -- Shared Search Result Schema Reuse

- [ ] CHK019 - Is the shared response envelope pattern (`{ success, results, totalMatches }`) documented as a cross-cutting requirement for all four search tools? [Consistency, Spec §FR-007/FR-008] -- FR-007 and FR-008 describe behavior common to "all search operations" but do not mandate a shared schema. Is schema reuse a requirement or a DRY implementation choice?
- [ ] CHK020 - Is the shared input schema pattern (`query` + `limit`) for the three non-task search tools documented as a requirement? [Consistency, Gap] -- The data model defines "SearchInput (Shared Pattern)" but the spec's FRs define each tool independently. Is schema sharing an explicit requirement?
- [ ] CHK021 - Are the field names in the shared response envelope (`results`, `totalMatches`) specified as requirements, or could implementors use alternative names (e.g., `items`, `total`)? [Clarity, Spec §FR-008] -- FR-008 says "total number of matches alongside the limited result set" but does not mandate field names.
- [ ] CHK022 - Is the reuse of `SearchTaskResultSchema`, `SearchProjectResultSchema`, etc. from a `shared/` module documented as an architectural requirement? [Gap] -- The plan defines a `shared/search-result.ts` file, but no requirement mandates this specific file organization. Is the shared module a requirement or a convenience?
- [ ] CHK023 - Are the type-specific result schemas (task, project, folder, tag) required to share any common fields (e.g., all have `id` and `name`)? [Consistency, Gap] -- All four result schemas happen to include `id` and `name`, but no requirement mandates a base shape. Should there be a documented common interface?

## Requirement Consistency -- Status Enum Type Safety

- [ ] CHK024 - Are the task status values in search results (`available`, `blocked`, `completed`, `dropped`, `dueSoon`, `next`, `overdue` -- lowercase) consistent with existing task-tools contracts (`Available`, `Blocked`, etc. -- PascalCase)? [Consistency] -- The existing `TaskStatusSchema` in `src/contracts/task-tools/shared/task.ts` uses PascalCase values matching OmniJS `Task.Status.*`. The search contracts use lowercase. Is this inconsistency documented as intentional?
- [ ] CHK025 - Is the mapping from OmniJS PascalCase status values to the search result lowercase values documented as a requirement? [Clarity, Gap] -- The data model says "mapped to lowercase strings" but the spec does not mention casing. Is this a type-safety-relevant requirement?
- [ ] CHK026 - Is the project status inconsistency between search results ("done") and database stats ("completed") for completed projects documented and resolved? [Consistency, Spec §FR-014 vs contract] -- `ProjectStatusValueSchema` uses "done" while `ProjectStatsSchema` uses "completed" for the same concept. Is this a type-safety gap?
- [ ] CHK027 - Are the tag status enum values ("active", "onHold", "dropped") specified as a requirement? [Completeness, Gap] -- Tags have a status field in the search result schema, but the spec's FR-004 only says "matching tags with ID, name, and parent tag" -- no mention of tag status.
- [ ] CHK028 - Is the task status filter enum ("active", "completed", "dropped", "all") required to be a separate Zod schema from the task result status enum (7 values)? [Clarity, Spec §FR-006] -- These are semantically different (filter is a user input, result status is OmniJS output). Is this distinction documented as a type-safety requirement?

## Edge Case Coverage -- Type-Related Boundaries

- [ ] CHK029 - Are requirements defined for how `null` parent context fields should be typed (nullable string vs. optional)? [Clarity, Spec §Key Entities] -- The spec says "null if top-level" for parent tags and parent folders. The contracts use `z.string().nullable()`. Is the distinction between nullable and optional documented?
- [ ] CHK030 - Is the `projectName` sentinel value "Inbox" specified as a string literal type or just a string? [Clarity, Spec §Edge Cases] -- The edge case says tasks in the inbox should show "Inbox" instead of null. Should this be a literal type `"Inbox"` for type safety, or a runtime convention?
- [ ] CHK031 - Are requirements defined for the response type when `totalMatches` equals zero? [Edge Case, Spec §FR-007] -- FR-007 says empty results are not errors. Should `results` be typed as an empty array `[]` with `totalMatches: 0`, or could it be undefined?
- [ ] CHK032 - Is the `limit` parameter type specified as integer-only (rejecting float values like 50.5)? [Clarity, Spec §FR-005] -- The contract enforces `z.number().int()` but FR-005 only says "configurable result limit parameter" without integer constraint.
- [ ] CHK033 - Are requirements defined for how the `performed` boolean in undo/redo interacts with the `success` discriminator? [Edge Case, Spec §FR-012] -- Three states exist: success+performed, success+not-performed, error. Is this tri-state behavior documented as a type-safety consideration?

## Non-Functional Requirements -- Type Safety Enforcement

- [ ] CHK034 - Is there a requirement for compile-time type checking (e.g., TypeScript strict mode) to enforce schema conformance? [Gap] -- The plan says "TypeScript 5.9+ with strict mode" but the spec has no NFR for compile-time type safety.
- [ ] CHK035 - Is there a requirement for runtime schema validation (Zod `.parse()`) at the boundary between OmniJS results and TypeScript code? [Gap] -- The type-safety story requires runtime validation for untyped OmniJS output, but no NFR mandates this.
- [ ] CHK036 - Is the `z.infer<>` pattern for deriving TypeScript types from Zod schemas documented as a requirement (preventing type drift between schemas and code)? [Gap] -- Contracts consistently use `z.infer<typeof Schema>` but no requirement mandates this pattern.

## Dependencies & Assumptions

- [ ] CHK037 - Is the assumption that OmniJS `JSON.stringify()` output preserves JavaScript number types (integers remain integers, not strings) documented? [Assumption] -- If OmniJS serializes counts as strings, Zod `z.number()` would fail at runtime. Is this behavior verified?
- [ ] CHK038 - Is the assumption that `flattenedTasks.filter()` returns the same type structure as `*Matching()` methods documented? [Assumption] -- Both produce arrays, but the element types may differ. Are these return types equivalent from a schema perspective?
- [ ] CHK039 - Is the Zod 4.x `z.discriminatedUnion()` behavior for the `success` field documented as depending on literal types (`z.literal(true)` / `z.literal(false)`)? [Assumption] -- Zod 4.x requires exact literal discriminators. Is this API constraint documented as an assumption?
