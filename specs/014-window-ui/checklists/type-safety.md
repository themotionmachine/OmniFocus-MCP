# Type Safety Checklist: Window & UI Control

**Purpose**: Validate that type-safety requirements are complete, clear, consistent, and measurable for all 8 Window & UI Control tools -- covering Zod schemas, discriminated unions, shared patterns, and type assertion prohibitions.
**Created**: 2026-03-19
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [data-model.md](../data-model.md)

## Requirement Completeness -- Zod Schema Coverage

- [ ] CHK001 - Are Zod 4.x input schemas explicitly defined for all 8 tools (reveal_items, expand_items, collapse_items, expand_notes, collapse_notes, focus_items, unfocus, select_items)? [Completeness, Spec FR-001 through FR-008, Contracts]
- [ ] CHK002 - Are Zod 4.x output/response schemas explicitly defined for all 8 tools, covering both success and error variants? [Completeness, Spec FR-012, Contracts]
- [ ] CHK003 - Is the `WindowItemIdentifierSchema` requirement documented as supporting all 4 item types (task, project, folder, tag) with a refinement requiring at least one of id/name? [Completeness, Spec FR-009, data-model.md]
- [ ] CHK004 - Is the `FocusTargetSchema` requirement documented as a distinct schema accepting only projects and folders, separate from `WindowItemIdentifierSchema`? [Completeness, Spec FR-016, Contracts focus-items.ts]
- [ ] CHK005 - Are batch result schemas (`WindowBatchItemResultSchema`, `WindowBatchSummarySchema`) defined with all required fields (itemId, itemName, itemType, success, error, code, candidates)? [Completeness, Spec FR-012, data-model.md]
- [ ] CHK006 - Is the `DisambiguationCandidateSchema` requirement documented with id, name, and type fields? [Completeness, data-model.md]
- [ ] CHK007 - Are the shared schemas organized in a `shared/` subdirectory with an `index.ts` barrel export, consistent with the status-tools pattern? [Completeness, Plan "Project Structure"]

## Requirement Completeness -- Discriminated Unions

- [ ] CHK008 - Is every tool response schema defined as a `z.discriminatedUnion('success', [...])` with `z.literal(true)` for success and `z.literal(false)` for error? [Completeness, Plan "Constitution Check" row IV]
- [ ] CHK009 - Is the unfocus tool's success response schema documented as having only `{ success: true }` (no results/summary) since it takes no items parameter? [Completeness, Contracts unfocus.ts, data-model.md]
- [ ] CHK010 - Is the success variant for batch tools documented as containing `success: z.literal(true)`, `results: z.array(WindowBatchItemResultSchema)`, and `summary: WindowBatchSummarySchema`? [Completeness, Contracts reveal-items.ts pattern]

## Requirement Completeness -- Error Response Schemas

- [ ] CHK011 - Is a structured version error response requirement defined specifying the minimum version (4.0) in the error message when OmniFocus is older than OF4? [Completeness, Spec FR-010, quickstart.md Guard Pattern]
- [ ] CHK012 - Is a structured platform/content-tree error response requirement defined for when `document.windows[0].content` is not available? [Completeness, Spec FR-011, quickstart.md Guard Pattern]
- [ ] CHK013 - Is a structured "no window" error response requirement defined for when `document.windows[0]` is not available? [Completeness, Spec FR-014, quickstart.md Guard Pattern]
- [ ] CHK014 - Are the version, platform, and no-window guard error responses documented as reusable patterns applied consistently across all 8 tools (with focus/unfocus skipping the content tree guard)? [Consistency, Plan "Key Architecture Decisions" #2, #3, quickstart.md]
- [ ] CHK015 - Is the error response format for catastrophic failures (version/platform/window) specified as `{ success: false, error: string }` matching the `z.discriminatedUnion` error variant? [Clarity, Contracts *ErrorSchema pattern]
- [ ] CHK016 - Are the guard error messages specified with exact wording that distinguishes version errors, platform/content-tree errors, and no-window errors? [Clarity, Spec FR-010, FR-011, FR-014]

## Requirement Completeness -- Per-Item Error Codes

- [ ] CHK017 - Are all 4 error codes (NOT_FOUND, NODE_NOT_FOUND, DISAMBIGUATION_REQUIRED, INVALID_TYPE) documented with clear definitions and the tools to which each applies? [Completeness, data-model.md "Status Codes"]
- [ ] CHK018 - Are all 3 no-op success codes (ALREADY_EXPANDED, ALREADY_COLLAPSED, NO_NOTE) documented with which tools produce them? [Completeness, Spec FR-020]
- [ ] CHK019 - Is the `NODE_NOT_FOUND` error code requirement distinguished from `NOT_FOUND` with a clear definition: "item exists in database but is not visible in current perspective"? [Clarity, Spec FR-015]
- [ ] CHK020 - Is the `INVALID_TYPE` error code requirement documented as applying only to `focus_items` (when a task or tag is provided as a focus target)? [Clarity, Spec FR-016, Contracts focus-items.ts]

## Requirement Clarity -- Parameter Type Definitions

- [ ] CHK021 - Is the `completely` parameter requirement documented with its OmniJS type (`Boolean or null`), its Zod representation (`z.boolean().optional()`), and its default behavior (false/immediate level only vs true/recursive)? [Clarity, Spec FR-002, FR-003, FR-004, FR-005, Assumptions]
- [ ] CHK022 - Does the spec explain the mapping between `z.boolean().optional()` in TypeScript/Zod and `Boolean or null` in OmniJS for the `completely` parameter? [Clarity, Spec Assumptions, Contracts expand-items.ts]
- [ ] CHK023 - Is the `extending` parameter on `select_items` documented as `z.boolean().optional()` with default false, and does the spec clarify its behavior (false=replace selection, true=add to existing)? [Clarity, Spec FR-008, Contracts select-items.ts]
- [ ] CHK024 - Is the `extending` parameter's default behavior (false = replace selection) explicitly documented in both the spec and the contract schema's `.describe()` text? [Clarity, Spec FR-008, Contracts select-items.ts]

## Requirement Clarity -- Batch Limit Specifications

- [ ] CHK025 - Are the batch size limits explicitly specified with `.min()` and `.max()` constraints for each tool: reveal (1-10), expand/collapse/notes (1-50), focus (1-50), select (1-100)? [Clarity, Spec SC-001 through SC-003, Assumptions]
- [ ] CHK026 - Is the rationale for each batch limit documented (e.g., reveal limited to 10 because "revealing too many at once defeats the navigation purpose")? [Clarity, Spec FR-001]

## Requirement Consistency -- Cross-Tool Schema Patterns

- [ ] CHK027 - Are the 6 batch tools (reveal, expand, collapse, expand_notes, collapse_notes, select) consistent in using `WindowBatchItemResultSchema` and `WindowBatchSummarySchema` for their success responses? [Consistency, Contracts]
- [ ] CHK028 - Are the 4 tools accepting `completely` (expand_items, collapse_items, expand_notes, collapse_notes) consistent in their parameter definition (`z.boolean().optional()` with matching `.describe()` text)? [Consistency, Contracts]
- [ ] CHK029 - Is the `WindowItemIdentifierSchema` reused consistently across reveal, expand, collapse, expand_notes, collapse_notes, and select (6 tools), while focus uses the distinct `FocusTargetSchema`? [Consistency, Contracts]
- [ ] CHK030 - Are the error schemas across all 8 tools consistent in shape: `{ success: z.literal(false), error: z.string() }`? [Consistency, Contracts]

## Requirement Consistency -- Type Assertion Prohibition

- [ ] CHK031 - Does the spec or plan explicitly address `as Type` assertion policy, consistent with the CLAUDE.md NEVER rule and the established codebase pattern? [Consistency, Plan "Key Architecture Decisions" #11]
- [ ] CHK032 - Does the spec or plan document how OmniJS script results are parsed and typed at the primitive boundary? [Completeness, Plan "Key Architecture Decisions" #12]

## Requirement Consistency -- Shared Schema Reusability

- [ ] CHK033 - Is the decision to create a NEW `WindowItemIdentifierSchema` (rather than reuse `ItemIdentifierSchema` from status-tools) documented with rationale (4 types vs 2 types)? [Consistency, Plan "Key Architecture Decisions" #1]
- [ ] CHK034 - Are the shared window-tools schemas documented as living in both `specs/014-window-ui/contracts/shared/` (design-time) and `src/contracts/window-tools/shared/` (implementation)? [Consistency, Plan "Project Structure"]

## Scenario Coverage -- Guard Schema Application

- [ ] CHK035 - Is it documented that focus_items and unfocus skip the content tree (`!tree`) guard since they operate on `window.focus` directly? [Coverage, Plan "Key Architecture Decisions" #3, quickstart.md]
- [ ] CHK036 - Is it documented that focus_items still requires the version guard (OF4+) and window guard, even though it skips the content tree guard? [Coverage, Plan, quickstart.md]
- [ ] CHK037 - Is it documented which of the 3 guards (version, window, content-tree) apply to each of the 8 tools? [Coverage, Spec FR-018]

## Scenario Coverage -- Edge Cases in Type Resolution

- [ ] CHK038 - Is the item resolution order for ID-based lookup documented (Task -> Project -> Folder -> Tag via `byIdentifier`)? [Coverage, data-model.md, quickstart.md]
- [ ] CHK039 - Is the behavior specified when both `id` and `name` are provided to `WindowItemIdentifierSchema` (id takes precedence)? [Coverage, Contracts item-identifier.ts JSDoc]
- [ ] CHK040 - Is the `itemType` field behavior documented for failed lookups (what type is returned when the item is NOT_FOUND and cannot be resolved to a type)? [Coverage, Spec FR-019]

## Acceptance Criteria Quality

- [ ] CHK041 - Can the discriminated union requirement be objectively verified by running `z.discriminatedUnion('success', [...])` through Zod 4.x contract tests? [Measurability, Constitution X "TDD"]
- [ ] CHK042 - Can the batch result schema requirements be verified by checking per-item results include itemId, itemName, itemType, success fields at original array indices? [Measurability, Spec SC-002, SC-003]
- [ ] CHK043 - Can the "no `as Type`" rule be objectively verified via a lint rule or grep for `as [A-Z]` patterns in TypeScript source files? [Measurability, Plan "Key Architecture Decisions" #11]

## Non-Functional Requirements -- Type Safety Infrastructure

- [ ] CHK044 - Is the Zod version requirement (4.x / 4.2.x) explicitly documented in the plan's Technical Context section? [Completeness, Plan "Technical Context"]
- [ ] CHK045 - Is the TypeScript strict mode requirement documented and linked to Constitution Principle I (Type-First Development)? [Completeness, Plan "Technical Context", Constitution I]

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- All gaps identified during initial generation have been remediated (2026-03-19)
- Items numbered CHK001-CHK045 for sequential reference
