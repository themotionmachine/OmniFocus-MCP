# Checklist: API Workaround Requirements Quality

**Purpose**: Validate that OmniJS API behavior assumptions, return types, parameter semantics, and platform gates are fully and unambiguously specified for Window & UI Control tools.
**Created**: 2026-03-18
**Focus**: Window & UI Control API surface -- ContentTree, TreeNode, DocumentWindow
**Depth**: Standard
**Audience**: Reviewer (PR)

## Requirement Completeness

- [ ] CHK001 - Is the exact OmniJS class name for `document.windows[0].content` documented (i.e., `Tree` vs `ContentTree`)? [Completeness, Spec Key Entities]
- [ ] CHK002 - Are the platforms where `document.windows[0].content` returns `undefined`/falsy explicitly enumerated (iOS, iPadOS)? [Completeness, Spec Assumptions]
- [ ] CHK003 - Is the return type of `tree.nodeForObject(item)` specified when the item is not visible in the current perspective (null vs undefined vs throws)? [Completeness, Spec Assumptions]
- [ ] CHK004 - Are all item types supported by `tree.nodeForObject()` explicitly listed (task, project, folder, tag)? [Completeness, Spec Assumptions]
- [ ] CHK005 - Is the parameter type for `tree.reveal(nodes)` specified as `Array of TreeNode` (not a single TreeNode)? [Completeness, Spec Key Entities]
- [ ] CHK006 - Is the return type of `tree.reveal(nodes)` specified (void)? [Completeness, Spec Key Entities]
- [ ] CHK007 - Is the `completely` parameter type for `node.expand(completely)` and `node.collapse(completely)` specified as `Boolean or null`? [Completeness, Spec Assumptions]
- [ ] CHK008 - Is the semantic meaning of `completely` parameter values (true = recursive, false/null/omitted = immediate only) documented? [Completeness, Spec Assumptions]
- [ ] CHK009 - Are `node.expandNote(completely)` and `node.collapseNote(completely)` methods documented as existing on TreeNode alongside expand/collapse? [Completeness, Spec Key Entities]
- [ ] CHK010 - Is the behavior of `expandNote()` on a node with no note specified (no-op vs error)? [Completeness, Spec User Story 3 Acceptance Scenario 4]
- [ ] CHK011 - Are the item types accepted by `window.focus` specified (Array of Project or Folder)? [Completeness, Spec Assumptions]
- [ ] CHK012 - Is the behavior of `window.focus = []` (empty array clears focus) documented? [Completeness, Spec Assumptions]
- [ ] CHK013 - Is the parameter type for `tree.select(nodes, extending)` specified -- `nodes` as `Array of TreeNode` and `extending` as `Boolean or null`? [Completeness, Spec Key Entities]
- [ ] CHK014 - Is the return type of `tree.select()` specified (void)? [Completeness, Spec Key Entities]
- [ ] CHK015 - Is `tree.nodesForObjects(objects)` documented with its batch return behavior (array may be smaller than input)? [Completeness, Spec Assumptions]
- [ ] CHK016 - Is the version detection pattern `app.userVersion.atLeast(new Version('4.0'))` explicitly specified for content tree availability? [Completeness, Spec Assumptions]

## Requirement Clarity

- [ ] CHK017 - Is the distinction between `null` return (nodeForObject when item not visible) and `undefined` (content property on non-macOS) clearly stated? [Clarity, Spec Assumptions]
- [ ] CHK018 - Is the asymmetric read/write behavior of `window.focus` unambiguously specified (read returns `null` when unfocused, write `[]` to clear)? [Clarity, Spec Assumptions]
- [ ] CHK019 - Is the `completely` parameter clearly distinguished from a boolean toggle (i.e., it affects recursion depth, not on/off of the operation itself)? [Clarity, Spec FR-002, FR-003]
- [ ] CHK020 - Is the phrase "ContentTree" as a conceptual name vs `Tree` as the OmniJS class name clarified to avoid implementer confusion? [Clarity, Spec Key Entities]
- [ ] CHK021 - Is the difference between `tree.nodeForObject()` (single) and `tree.nodesForObjects()` (batch) return behavior clearly distinguished? [Clarity, Spec Assumptions]
- [ ] CHK022 - Is it clear that `tree.reveal()` only accepts an Array (not a single node) as its parameter? [Clarity, Spec Key Entities]

## Requirement Consistency

- [ ] CHK023 - Is the ContentTree existence check (`!tree`) consistently used as the macOS platform gate across all 6 content-tree-dependent tools (reveal, expand, collapse, expand_notes, collapse_notes, select)? [Consistency, Spec FR-011, Plan Key Architecture Decision 3]
- [ ] CHK024 - Is it consistent that focus/unfocus tools skip the content tree check while all other tools require it? [Consistency, Plan Key Architecture Decision 3]
- [ ] CHK025 - Are the `completely` parameter semantics consistent across all 4 methods that use it (expand, collapse, expandNote, collapseNote)? [Consistency, Spec FR-002 through FR-005]
- [ ] CHK026 - Is the batch size limit consistent between the spec (1-50 for expand/collapse/notes, 1-100 for select, 1-10 for reveal) and the plan? [Consistency, Spec Assumptions, Plan Summary]
- [ ] CHK027 - Is the error code `NODE_NOT_FOUND` used consistently for "item exists but not visible in current perspective" across all batch tools? [Consistency, Spec FR-015, Data Model]

## Acceptance Criteria Quality

- [ ] CHK028 - Are acceptance criteria for platform gate failure measurable (specific error message content or code)? [Acceptance Criteria, Spec User Story 1 Scenario 6]
- [ ] CHK029 - Are acceptance criteria for version gate failure measurable (specific error message or code for OF3)? [Acceptance Criteria, Spec User Story 1 Scenario 5]
- [ ] CHK030 - Is the success criterion for `tree.reveal()` measurable (what constitutes "visible on screen")? [Acceptance Criteria, Spec SC-001]
- [ ] CHK031 - Is the idempotency success criterion (SC-008) testable -- specifically, can the no-op behavior be distinguished from an actual state change in the response? [Acceptance Criteria, Spec SC-008]

## Scenario Coverage

- [ ] CHK032 - Are requirements defined for what happens when `tree.nodesForObjects()` returns an empty array (all items filtered by perspective)? [Coverage, Spec Assumptions]
- [ ] CHK033 - Are requirements defined for the interaction between `tree.reveal()` and items whose parent nodes are collapsed? [Coverage, Spec Edge Cases]
- [x] CHK034 - Are requirements defined for calling `tree.select()` with `extending=true` when the current selection is empty? [Coverage] -- Addressed in Spec Edge Cases: "extending=true with no prior selection is equivalent to extending=false"
- [x] CHK035 - Are requirements defined for what happens when `window.focus` is set with a mix of valid (projects/folders) and invalid (tasks/tags) items? [Coverage] -- Addressed in Spec Edge Cases: TypeScript-layer validation, per-item INVALID_TYPE errors, no focus change if no valid targets remain
- [x] CHK036 - Are requirements defined for the behavior of `node.expandNote()` when called on a folder or tag (which may not have notes)? [Coverage] -- Addressed in Spec Edge Cases: no-op, consistent with task-with-no-note scenario (User Story 3, Scenario 4)
- [ ] CHK037 - Are error response requirements documented for when `document.windows` is an empty array vs `document.windows[0]` being null/undefined? [Coverage, Spec Edge Cases]

## Edge Case Coverage

- [x] CHK038 - Is the behavior specified when `tree.nodeForObject()` is called with an object type not supported by the content tree? [Edge Case] -- Addressed in Spec Edge Cases: returns null, NODE_NOT_FOUND error code in per-item results
- [x] CHK039 - Is the behavior of `node.expand(completely)` on a leaf node (task with no children) specified? [Edge Case] -- Addressed in Spec Edge Cases: no-op, canExpand would be false but expand() does not throw, consistent with SC-008
- [x] CHK040 - Is the behavior of `tree.reveal()` with an empty array specified? [Edge Case] -- Addressed in Spec Edge Cases: no-op, Zod schema enforces minimum 1 item at validation layer
- [x] CHK041 - Is the behavior of `tree.select()` with an empty nodes array specified (should it clear the selection or no-op)? [Edge Case] -- Addressed in Spec Edge Cases: clears selection, Zod schema enforces minimum 1 item at validation layer

## Dependencies & Assumptions

- [ ] CHK042 - Is the assumption that `nodeForObject()` returns null (not throws) validated with a citation or empirical test reference? [Assumption, Spec Assumptions]
- [x] CHK043 - Is the assumption that `expandNote()`/`collapseNote()` exist as methods on TreeNode validated against OmniJS API documentation or empirical testing? [Assumption] -- Validated in Spec Assumptions: "OmniJS API reference at omni-automation.com/omnifocus/outline.html documents all four methods on TreeNode"
- [ ] CHK044 - Is the assumption that `tree.nodesForObjects()` silently omits non-visible items (rather than returning null entries) validated? [Assumption, Spec Assumptions]
- [ ] CHK045 - Is the version threshold of 4.0 for content tree API validated against actual OmniFocus release notes or API documentation? [Assumption, Spec Assumptions]

## API Gap Resolution (2026-03-18 remediation pass)

- [x] CHK046 - Is the `tree.select()` collapsed-ancestor constraint ("nodes with collapsed ancestors cannot be selected") documented as a requirement? [Gap, remediated] -- Added FR-017 requiring pre-flight `tree.reveal(nodes)` before `tree.select()`. Source: omni-automation.com/omnifocus/OF-API.html
- [x] CHK047 - Is the `TreeNode.reveal()` instance method (no params, expands ancestors) documented alongside the Tree-level `tree.reveal(nodes)` method? [Gap, remediated] -- Added to Key Entities TreeNode definition. Source: omni-automation.com/omnifocus/outline.html
- [x] CHK048 - Is the per-item result tracking location (OmniJS vs TypeScript layer) consistent with established patterns from SPEC-007 and SPEC-013? [Gap, remediated] -- Updated Assumptions to specify OmniJS-inside tracking, superseding earlier "TypeScript layer" statement. Source: SPEC-007/SPEC-013 patterns
- [x] CHK049 - Is the ContentTree platform availability accurately documented (available on all platforms in OF4, not macOS-only)? [Gap, remediated] -- Updated Assumptions and Key Entities to reflect OF4 cross-platform availability while noting MCP server is macOS-only. Source: omni-automation.com/omnifocus/outline.html
- [x] CHK050 - Is the `!tree` guard rationale correctly stated as defensive runtime check (not platform detection)? [Gap, remediated] -- Updated FR-011 and Assumptions. Source: omni-automation.com/omnifocus/window.html, SPEC-003 Platform Detection
- [x] CHK051 - Are `canExpand` and `canCollapse` read-only Boolean properties documented on TreeNode? [Gap, remediated] -- Added to Key Entities TreeNode definition. Source: omni-automation.com/omnifocus/OF-API.html
