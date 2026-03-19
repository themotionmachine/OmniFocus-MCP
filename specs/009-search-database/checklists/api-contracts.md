# API Contracts Checklist: Search & Database (SPEC-009)

**Purpose**: Validate requirements quality for API contract schemas, input validation, response shapes, and discriminated union patterns
**Created**: 2026-03-18
**Feature**: [spec.md](../spec.md) | [search-tools.ts](../contracts/search-tools.ts) | [database-tools.ts](../contracts/database-tools.ts)
**Domain**: api-contracts
**Depth**: Standard
**Audience**: Reviewer (PR)

## Requirement Completeness — Search Result Schemas

- [ ] CHK001 - Are the required fields for each search result type (task, project, folder, tag) exhaustively enumerated in the spec? [Completeness, Spec §FR-001 through §FR-004] — Spec says "ID, name, project, and status" for tasks but the contract adds `flagged`; is this addition documented in requirements?
- [ ] CHK002 - Is the `projectName` value for inbox tasks explicitly specified as a string constant (e.g., "Inbox") rather than null? [Clarity, Spec §Edge Cases] — The edge case says "indicate the task is in the inbox" but does not define the exact sentinel value.
- [ ] CHK003 - Are status enum values for each item type (tasks, projects, tags) explicitly defined in the spec? [Gap] — The spec references "status" in results but never enumerates the allowed status values returned; these only appear in the contracts.
- [ ] CHK004 - Is the absence of a `status` field on folder search results documented as an intentional design decision? [Completeness, Spec §FR-003] — Tasks, projects, and tags all include status in their result schemas; folders do not. Is this asymmetry specified?
- [ ] CHK005 - Are the parent context field names for each result type explicitly specified in requirements? [Clarity, Spec §Key Entities] — Spec says "parent context" generically; contract uses `projectName`, `folderName`, `parentFolderName`, `parentTagName` — are these exact field names requirements-driven?

## Requirement Completeness — Input Validation

- [ ] CHK006 - Is the maximum length for search query strings specified? [Gap] — Spec §FR-016 requires min 1 character but no maximum is defined. Should there be a max length to prevent abuse or performance issues?
- [ ] CHK007 - Are query string sanitization requirements documented (e.g., trimming whitespace, handling special characters)? [Gap] — Spec does not address whether leading/trailing whitespace counts toward the 1-character minimum or how regex-special characters are handled.
- [ ] CHK008 - Is the validation error format for invalid inputs (empty query, out-of-range limit) specified? [Gap] — Spec says "return a validation error" in edge cases but does not define the error response structure for validation failures.
- [ ] CHK009 - Is the validation error format for invalid `status` filter values specified? [Gap, Spec §Edge Cases] — Edge case says "return a validation error listing valid status options" but the error message structure is not defined in requirements.
- [ ] CHK010 - Are the exact accepted `status` filter values documented as requirements (not just in contracts)? [Clarity, Spec §FR-006] — FR-006 lists "active", "completed", "dropped", or "all" but the mapping from these filter values to OmniJS Task.Status enum values is only in the plan, not the spec.

## Requirement Completeness — Limit Parameter

- [ ] CHK011 - Is the limit parameter range consistently specified across spec and contracts? [Consistency] — Spec §FR-005 says "maximum of 1000"; contract uses `min(1).max(1000).default(50)`. The user's prompt mentions "1-200 range" — is there a conflict between the user expectation and the spec's 1-1000 range?
- [ ] CHK012 - Is the behavior when `limit` exceeds total matches defined? [Completeness, Spec §FR-005] — Spec defines truncation behavior when matches exceed limit but does not specify behavior when limit is larger than total results (should `totalMatches` equal `results.length`?).
- [ ] CHK013 - Is the `limit` parameter default value (50) explicitly stated as a requirement? [Clarity, Spec §FR-005] — FR-005 says "default of 50" but only in the context of User Story 1; is this default requirement explicitly shared across all four search tools?

## Requirement Clarity — Discriminated Union Patterns

- [ ] CHK014 - Is the discriminated union pattern (success: true/false) documented as a cross-cutting requirement? [Gap] — The contracts use `z.discriminatedUnion('success', [...])` for all 10 tools, but the spec never mentions this pattern as a requirement. Is there a project-wide convention being relied on implicitly?
- [ ] CHK015 - Are the success response fields for each tool explicitly defined in requirements? [Completeness] — The spec describes what to return narratively (e.g., "returns task counts broken down by status") but the exact field structure (e.g., `tasks.available`, `tasks.blocked`, etc.) only appears in contracts.
- [ ] CHK016 - Is the error response schema (`{ success: false, error: string }`) specified as a requirement? [Gap] — The contracts define a consistent error shape across all 10 tools, but the spec only discusses error scenarios narratively without defining the error response contract.
- [ ] CHK017 - Is the distinction between "operation not performed" (success=true, performed=false) and "operation failed" (success=false) for undo/redo clearly specified? [Clarity, Spec §FR-012] — FR-012 says "non-error message" for empty stacks, and the contract models this as `{ success: true, performed: false }`. Is this three-state behavior (success+performed, success+not-performed, error) documented in requirements?

## Requirement Consistency — Cross-Tool Schema Alignment

- [ ] CHK018 - Are the four search input schemas intentionally consistent in structure (query + limit, with status only on tasks)? [Consistency] — Three search tools share identical input shapes (query + limit) while task search adds `status`. Is this asymmetry documented as a design decision?
- [ ] CHK019 - Is the response envelope shape (`results` + `totalMatches`) consistently required across all four search tools? [Consistency, Spec §FR-008] — FR-008 says "all search operations MUST return the total number of matches" but does not name the field; is the `totalMatches` field name a requirement or implementation choice?
- [ ] CHK020 - Are the task status filter values ("active", "completed", "dropped", "all") consistent with the task result status values ("available", "blocked", "completed", "dropped", "dueSoon", "next", "overdue")? [Consistency] — Filter uses "active" which maps to multiple result statuses. Is this mapping documented as a requirement?
- [ ] CHK021 - Is the project status enum ("active", "done", "dropped", "onHold") consistent with the spec's terminology? [Consistency, Spec §FR-014] — The spec says "completed" for project status in FR-014 but the contract uses "done". Is the canonical term defined?
- [ ] CHK022 - Are the database stats task status categories ("available", "blocked", "completed", "dropped") consistent with the search task result status values (7 values including "dueSoon", "next", "overdue")? [Consistency] — Stats aggregate into 4 buckets while search results expose 7 statuses. Is this intentional consolidation documented?

## Scenario Coverage — Undo/Redo Response

- [ ] CHK023 - Is the `canUndo`/`canRedo` post-operation state specified as a requirement for undo/redo responses? [Completeness, Spec §Clarifications] — This requirement appears only in the clarifications section, not in functional requirements. Should FR-010/FR-011 explicitly include post-operation state?
- [ ] CHK024 - Is the `performed` boolean field in undo/redo responses specified as a requirement? [Gap] — The contract introduces `performed` to distinguish "executed undo" from "nothing to undo", but the spec's FR-012 only says "clear, non-error message". Is the exact field documented?
- [ ] CHK025 - Are requirements defined for what `canUndo`/`canRedo` report when the operation itself fails (success=false)? [Edge Case, Gap] — The contract only includes `canUndo`/`canRedo` in the success schema. Should error responses also report stack state?

## Scenario Coverage — Database Stats Response

- [ ] CHK026 - Are the exact task status categories for statistics (available, blocked, completed, dropped) specified in requirements? [Clarity, Spec §FR-014] — FR-014 says "task counts broken down by status" with examples in parentheses, but are these the exhaustive categories or just examples?
- [ ] CHK027 - Is the `total` field in task and project stats specified as a requirement? [Gap] — The contract includes `total` as a computed sum for both task and project stats, but the spec does not mention a total field.
- [ ] CHK028 - Is the aggregation rule for the stats `available` bucket defined (does it include DueSoon, Next, Overdue)? [Clarity] — The contract describes `available` as "Available + DueSoon + Next + Overdue tasks" but this consolidation rule is not in the spec.
- [ ] CHK029 - Are the project status categories for statistics (active, onHold, completed, dropped) consistent with the project search result status enum (active, done, dropped, onHold)? [Consistency] — Stats use "completed" while search results use "done" for the same concept.

## Edge Case Coverage

- [ ] CHK030 - Are requirements defined for search behavior when the query is exactly 1 character? [Edge Case, Spec §FR-016] — The minimum is 1 character, but are single-character searches expected to work normally or is there a practical minimum for useful results?
- [ ] CHK031 - Are requirements defined for how Smart Match (`*Matching()`) handles queries that match zero items vs. queries with special characters? [Edge Case, Gap] — The spec defines empty result behavior (FR-007) but does not address whether Smart Match could throw on certain input patterns.
- [ ] CHK032 - Is the behavior of `totalMatches` for native Smart Match methods defined? [Completeness, Spec §FR-008] — For task search, `totalMatches` can differ from `results.length` (filter then limit). For Smart Match, does the native API provide a total count, or must it be computed?
- [ ] CHK033 - Are requirements defined for the inbox count when items exist in the inbox but are assigned to projects (pre-cleanup state)? [Edge Case, Spec §User Story 6] — Does `inbox.length` include items awaiting cleanup?
- [ ] CHK034 - Is the behavior of `save_database` response schema sufficient? [Completeness, Spec §FR-013] — The contract returns only `{ success: true }` with no additional data. Is the absence of sync status or timestamp an intentional simplification documented in requirements?

## Non-Functional Requirements

- [ ] CHK035 - Are performance requirements for search operations quantified? [Gap] — The plan mentions "<500ms for single search operations" but the spec has no performance requirements. Is this an NFR that should be in the spec?
- [ ] CHK036 - Are performance requirements for `get_database_stats` on large databases specified? [Gap] — The assumptions mention "under 10,000 items" but no degradation behavior or timeout is defined for larger databases.

## Dependencies & Assumptions

- [ ] CHK037 - Is the assumption that `*Matching()` returns all matches (not limited) validated? [Assumption] — The contract assumes `totalMatches` can be computed from the full `*Matching()` result before applying the limit. Is this confirmed in the OmniJS API documentation?
- [ ] CHK038 - Is the assumption that `canUndo`/`canRedo` are synchronous read-only properties documented as a verified API constraint? [Assumption, Spec §Assumptions] — Spec states this in assumptions but the verification source is not cited.
- [ ] CHK039 - Is the assumption that `flattenedTasks` includes inbox items documented and validated? [Assumption, Spec §Assumptions] — This affects both search and stats accuracy.

## Ambiguities & Traceability

- [ ] CHK040 - Is there a mapping from each contract schema to its originating functional requirement? [Traceability] — The plan maps tools to FRs but the contract files themselves have no FR traceability references.
- [ ] CHK041 - Does the spec define the term "active" unambiguously for task search? [Ambiguity, Spec §FR-006] — "Active" is a filter value that maps to 5 OmniJS statuses (Available, Blocked, DueSoon, Next, Overdue). Is this expansion documented in the spec or only in the plan?
