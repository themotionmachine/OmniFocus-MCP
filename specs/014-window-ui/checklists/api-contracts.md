# API Contracts Checklist: Window & UI Control

**Purpose**: Validate that API contract requirements are complete, clear, consistent, and measurable for all 8 Window & UI Control tools -- covering discriminated unions, error codes, version/platform guards, per-item batch results, and cross-tool contract consistency.
**Created**: 2026-03-19
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [data-model.md](../data-model.md)

## Requirement Completeness -- Discriminated Union Consistency

- [ ] CHK001 - Are all 8 tool response contracts defined as `z.discriminatedUnion('success', [SuccessSchema, ErrorSchema])` with consistent `success: z.literal(true)` and `success: z.literal(false)` variants? [Completeness, Contracts reveal-items.ts through unfocus.ts]
- [ ] CHK002 - Is the unfocus tool's simpler success schema (`{ success: true }` without results/summary) explicitly justified as intentional, given that all other 7 tools include `results` and `summary`? [Clarity, Contracts unfocus.ts, data-model.md]
- [ ] CHK003 - Are the error response schemas across all 8 tools structurally identical (`{ success: z.literal(false), error: z.string() }`) to ensure AI clients can parse errors uniformly? [Consistency, Contracts *ErrorSchema]
- [ ] CHK004 - Is the relationship between top-level error responses (`success: false, error: string`) and per-item error codes (NOT_FOUND, NODE_NOT_FOUND, etc.) documented to clarify when each is used? [Clarity, Spec FR-012, FR-014]

## Requirement Completeness -- Version Error Code

- [x] CHK005 - Is a specific error code (e.g., `VERSION_TOO_OLD`) defined for version incompatibility, or is the version error only conveyed via the top-level `error` string message? [Resolved] --> The established codebase pattern (SPEC-007, SPEC-013) deliberately uses flat `{ success: false, error: string }` for top-level guard errors without machine-parseable codes. Version errors are conveyed via human-readable strings. FR-021 now documents this two-tier error hierarchy explicitly. Source: SPEC-007 `set_advanced_repetition` and SPEC-013 `drop_items` contracts.
- [ ] CHK006 - Does the version error response requirement specify inclusion of the minimum required version (4.0) and the user's current version in a machine-parseable format, not just a human-readable string? [Clarity, Spec FR-010, quickstart.md Guard Pattern]
- [ ] CHK007 - Is the version error response format consistent across all 8 tools, given that all tools share the same version guard pattern? [Consistency, Spec FR-018, quickstart.md]

## Requirement Completeness -- Platform/Content Tree Error Code

- [x] CHK008 - Is a specific error code (e.g., `CONTENT_TREE_UNAVAILABLE`) defined for content tree unavailability, or is it only conveyed via the top-level `error` string message? [Resolved] --> Consistent with CHK005: top-level guard errors use flat `{ success: false, error: string }` without machine-parseable codes. Content tree errors are Tier 1 guard errors per FR-021. Source: established pattern from SPEC-007/SPEC-013 contracts.
- [ ] CHK009 - Is the content tree error documented as applying to only 6 of 8 tools (excluding focus_items and unfocus), consistent with the FR-018 guard matrix? [Consistency, Spec FR-018]

## Requirement Completeness -- NO_WINDOW Error Code

- [x] CHK010 - Is a specific error code (e.g., `NO_WINDOW`) defined for the no-window-open condition, or is it only conveyed via the top-level `error` string? [Resolved] --> Consistent with CHK005 and CHK008: top-level guard errors use flat `{ success: false, error: string }` without machine-parseable codes. Window guard errors are Tier 1 per FR-021. Source: established pattern from SPEC-007/SPEC-013 contracts.
- [ ] CHK011 - Is the no-window error requirement documented as applying to all 8 tools (every tool requires a window)? [Completeness, Spec FR-018]

## Requirement Completeness -- ITEM_NOT_FOUND Error Code

- [ ] CHK012 - Is the `NOT_FOUND` per-item error code requirement documented with the exact condition: item ID/name does not correspond to any existing task, project, folder, or tag? [Clarity, Spec FR-009, data-model.md]
- [ ] CHK013 - Is the `NOT_FOUND` error code documented as a per-item result code (inside `results[]`) rather than a top-level response code? [Clarity, data-model.md, Contracts batch.ts]

## Requirement Completeness -- NODE_NOT_FOUND Error Code

- [ ] CHK014 - Is the `NODE_NOT_FOUND` per-item error code documented with the exact condition: item exists in the database but has no corresponding TreeNode in the content tree (not visible in current perspective)? [Clarity, Spec FR-015, data-model.md]
- [ ] CHK015 - Are the semantic differences between `NOT_FOUND` (item does not exist) and `NODE_NOT_FOUND` (item exists but is not visible) explicitly defined to prevent implementer confusion? [Clarity, Spec FR-015, data-model.md]
- [ ] CHK016 - Is the `NODE_NOT_FOUND` code documented as applicable to 6 tools using the content tree (excluding focus_items and unfocus which do not resolve TreeNodes)? [Consistency, Spec FR-018]

## Requirement Completeness -- INVALID_TYPE Error Code

- [ ] CHK017 - Is the `INVALID_TYPE` error code documented as specific to `focus_items` only, with clear condition: item resolved to a task or tag instead of a project or folder? [Clarity, Spec FR-016, data-model.md]
- [ ] CHK018 - Does the spec define what information the `INVALID_TYPE` per-item result includes (e.g., the resolved type of the item, the expected types)? [Completeness, Spec FR-016]

## Requirement Completeness -- toolAffectsUI Metadata

- [ ] CHK019 - Does the spec requirement FR-013 define whether `toolAffectsUI` is communicated via tool description text (WARNING string) or via structured MCP tool metadata? [Clarity, Spec FR-013]
- [ ] CHK020 - Is the exact wording of the UI side-effect warning defined for use across all 8 tool descriptions? [Clarity, Spec FR-013, Plan "Key Architecture Decisions" #7]

## Requirement Completeness -- Per-Item Batch Results

- [ ] CHK021 - Are the per-item batch result fields (itemId, itemName, itemType, success, error, code, candidates) documented with which are required vs optional? [Completeness, data-model.md, Contracts batch.ts]
- [ ] CHK022 - Is the `results` array documented as maintaining original input array index correspondence (result[i] corresponds to input[i])? [Clarity, Spec FR-012, Contracts batch.ts]
- [ ] CHK023 - Is the BatchSummary invariant (`total === succeeded + failed`) documented as an implementation enforcement rather than a schema constraint? [Clarity, data-model.md]

## Requirement Consistency -- Error Code Completeness Matrix

- [x] CHK024 - Is there a comprehensive matrix documenting which error codes apply to which tools (NOT_FOUND to all 7 batch tools, NODE_NOT_FOUND to 6 tree tools, INVALID_TYPE to focus_items only, DISAMBIGUATION_REQUIRED to all 7 batch tools)? [Resolved] --> Added FR-022 to spec.md with a comprehensive per-item error/no-op code applicability matrix covering all 7 error/no-op codes across all 8 tools. Source: derived from FR-015, FR-016, FR-018, FR-020, and per-tool contract error condition documentation.
- [ ] CHK025 - Are the no-op success codes (ALREADY_EXPANDED, ALREADY_COLLAPSED, NO_NOTE) documented with which specific tools produce each code? [Consistency, Spec FR-020]
- [ ] CHK026 - Is the absence of no-op codes for `reveal_items` and `select_items` (these tools do not have a meaningful "already in state" concept) explicitly documented or inferable from FR-020? [Coverage, Spec FR-020]

## Requirement Consistency -- Guard Error vs Per-Item Error Layering

- [x] CHK027 - Is the error response hierarchy clearly documented: (1) guard errors return top-level `{ success: false, error }` and abort the entire operation, (2) per-item errors return inside `{ success: true, results: [...] }` with partial failures? [Resolved] --> Added FR-021 to spec.md documenting the two-tier error hierarchy: Tier 1 (guard/catastrophic) uses flat `{ success: false, error: string }` and aborts all processing; Tier 2 (per-item) uses `{ success: true, results: [...] }` with machine-parseable codes. Guard errors always take priority. Source: pattern analysis of SPEC-007/SPEC-013 contracts; MCP error handling best practices (mcpcat.io/guides/error-handling-custom-mcp-servers).
- [ ] CHK028 - Is it documented that guard errors (version, window, content tree) prevent ANY per-item processing, while per-item errors (NOT_FOUND, NODE_NOT_FOUND, etc.) allow partial success? [Clarity, Spec FR-012, FR-014]

## Requirement Consistency -- Reveal Tool Specifics

- [ ] CHK029 - Is the reveal tool's batch limit (1-10) documented with rationale, and is the limit reflected in both the spec (FR-001) and the contract schema (`.max(10)`)? [Consistency, Spec FR-001, Contracts reveal-items.ts]
- [ ] CHK030 - Is the reveal tool documented as using `tree.reveal(nodes)` (Tree-level batch method) rather than `node.reveal()` (TreeNode instance method)? [Clarity, Spec Assumptions, quickstart.md]

## Requirement Consistency -- Focus Tool Specifics

- [ ] CHK031 - Is the focus tool documented as rejecting tasks and tags with `INVALID_TYPE` code at the per-item result level rather than as a top-level schema validation error? [Clarity, Spec FR-016, Edge Cases]
- [ ] CHK032 - Is the `FocusTargetSchema` documented as accepting the same id/name structure as `WindowItemIdentifierSchema` but with different type constraints enforced at runtime (OmniJS layer), not at schema validation? [Clarity, Contracts focus-items.ts]
- [ ] CHK033 - Does the spec define focus behavior when a mix of valid (projects/folders) and invalid (tasks/tags) items are provided in a single batch: partial success with valid items focused, invalid items reported as errors? [Completeness, Spec Edge Cases]
- [ ] CHK034 - Is the focus tool's batch limit (1-50) documented consistently between the spec and the contract schema? [Consistency, Contracts focus-items.ts, data-model.md]

## Requirement Consistency -- Unfocus Tool Specifics

- [ ] CHK035 - Is the unfocus tool documented as requiring no input parameters and returning a simple `{ success: true }` on success? [Completeness, Spec FR-007, Contracts unfocus.ts, data-model.md]
- [ ] CHK036 - Is the unfocus tool's idempotent behavior documented: calling unfocus when already unfocused succeeds as a no-op? [Completeness, Spec SC-008, User Story 5 Scenario 2]
- [ ] CHK037 - Is the unfocus tool's guard behavior documented: version guard + window guard apply, content tree guard does NOT apply? [Consistency, Spec FR-018]

## Requirement Consistency -- Select Tool Specifics

- [ ] CHK038 - Is the select tool's pre-flight reveal step (FR-017) documented as part of the API contract, ensuring callers understand that select also causes visible expand/scroll side effects? [Completeness, Spec FR-017]
- [ ] CHK039 - Is the select tool's `extending` parameter requirement consistent between the spec (FR-008), the contract (`z.boolean().optional()`), and the user story (Story 6, Scenarios 2/2a)? [Consistency, Spec FR-008, Contracts select-items.ts]

## Scenario Coverage -- Top-Level Error Response Codes

- [x] CHK040 - Are top-level (catastrophic) error responses defined with distinct, machine-parseable error codes (e.g., `VERSION_TOO_OLD`, `NO_WINDOW`, `CONTENT_TREE_UNAVAILABLE`) rather than relying solely on human-readable error message strings? [Resolved] --> Research confirmed the established codebase pattern deliberately omits machine-parseable codes from top-level errors. FR-021 documents this design decision with rationale: AI clients parse natural-language error messages for user presentation, and the flat pattern has proven sufficient across SPEC-007 and SPEC-013. Machine-parseable codes are reserved for Tier 2 per-item results only. Source: `src/contracts/status-tools/drop-items.ts`, `src/contracts/repetition-tools/set-advanced-repetition.ts`, SPEC-007 checklists/api-contracts.md CHK003/CHK007/CHK018.
- [x] CHK041 - Is the top-level error response schema specified with an optional `code` field alongside the `error` string, to support programmatic error handling by AI clients? [Resolved] --> No `code` field is added to the top-level error schema. This follows the established pattern: `set_project_type` (SPEC-013) uses `.strict()` on its error object, explicitly rejecting any additional fields. FR-021 documents that top-level errors are flat by design. Source: `src/contracts/status-tools/set-project-type.ts` (strict schema), SPEC-007 spec.md Clarifications session.

## Scenario Coverage -- Edge Cases in Contract Definitions

- [ ] CHK042 - Is the behavior documented when ALL items in a batch fail (e.g., all return NOT_FOUND): does the top-level response still use `success: true` with a summary of `{ total: N, succeeded: 0, failed: N }`? [Coverage, Spec FR-012]
- [ ] CHK043 - Is the empty-input case documented: what happens when an empty array is passed despite Zod `.min(1)` enforcement? [Coverage, Contracts]
- [ ] CHK044 - Is the behavior documented for the `candidates` field in disambiguation responses: must it include the id, name, and type of ALL matching items? [Completeness, data-model.md, Contracts batch.ts]

## Acceptance Criteria Quality

- [ ] CHK045 - Can the discriminated union contract be objectively verified via Zod 4.x contract tests that parse success and error variants? [Measurability, Constitution X]
- [ ] CHK046 - Can error code consistency across all 8 tools be objectively verified via a test that enumerates all valid codes per tool? [Measurability, Constitution X]
- [ ] CHK047 - Can the guard applicability matrix (FR-018) be verified via tests that confirm each tool applies the correct guards and produces the expected error responses? [Measurability, Spec FR-018]

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- Items numbered CHK001-CHK047 for sequential reference
- All 7 gaps identified during initial generation have been remediated (2026-03-19)
- Gaps CHK005, CHK008, CHK010, CHK040, CHK041: resolved by confirming established codebase pattern (flat top-level errors, no machine-parseable codes)
- Gap CHK024: resolved by adding FR-022 error code applicability matrix to spec.md
- Gap CHK027: resolved by adding FR-021 two-tier error hierarchy documentation to spec.md
