# API Contract Completeness Checklist: Tag Management Tools

**Purpose**: Validate that each MCP tool contract is implementation-ready
**Created**: 2025-12-10
**Feature**: [spec.md](../spec.md), [data-model.md](../data-model.md)
**Scope**: 6 MCP tools (list_tags, create_tag, edit_tag, delete_tag, assign_tags, remove_tags)

## 1. Tool Definition Quality (All 6 Tools)

### Naming Convention

- [x] CHK001 - Is `list_tags` tool name documented following MCP lowercase_underscore convention? [Completeness, data-model §list_tags]
- [x] CHK002 - Is `create_tag` tool name documented following MCP lowercase_underscore convention? [Completeness, data-model §create_tag]
- [x] CHK003 - Is `edit_tag` tool name documented following MCP lowercase_underscore convention? [Completeness, data-model §edit_tag]
- [x] CHK004 - Is `delete_tag` tool name documented following MCP lowercase_underscore convention? [Completeness, data-model §delete_tag]
- [x] CHK005 - Is `assign_tags` tool name documented following MCP lowercase_underscore convention? [Completeness, data-model §assign_tags]
- [x] CHK006 - Is `remove_tags` tool name documented following MCP lowercase_underscore convention? [Completeness, data-model §remove_tags]

### Tool Descriptions

- [x] CHK007 - Does `list_tags` description explain its purpose (listing tags with filtering)? [Clarity, data-model §list_tags]
- [x] CHK008 - Does `create_tag` description explain when to use it vs edit? [Clarity, data-model §create_tag]
- [x] CHK009 - Does `edit_tag` description clarify it's for property changes, not hierarchy moves? [Clarity, data-model §edit_tag]
- [x] CHK010 - Does `delete_tag` description warn about recursive child deletion behavior? [Clarity, data-model §delete_tag]
- [x] CHK011 - Does `assign_tags` description differentiate from `remove_tags`? [Clarity, data-model §assign_tags]
- [x] CHK012 - Does `remove_tags` description explain `clearAll` vs selective removal? [Clarity, data-model §remove_tags]

---

## 2. Input Schema Completeness

### list_tags Input Schema

- [x] CHK013 - Is `status` parameter defined as optional enum with 3 values (active/onHold/dropped)? [Completeness, FR-004, data-model §list_tags]
- [x] CHK014 - Is `parentId` parameter defined as optional string? [Completeness, FR-005]
- [x] CHK015 - Is `includeChildren` parameter defined with boolean type and default `true`? [Completeness, FR-006]
- [x] CHK016 - Are all filter parameter combinations documented (status + parentId + includeChildren matrix)? [Coverage, data-model §Behavior Matrix]
- [x] CHK017 - Is the empty input `{}` documented as valid (returns all tags)? [Edge Case, data-model §Behavior Matrix]

### create_tag Input Schema

- [x] CHK018 - Is `name` parameter defined as required string with min length 1 and trim transform? [Completeness, FR-007]
- [x] CHK019 - Is `parentId` parameter defined as optional string? [Completeness, FR-009]
- [x] CHK020 - Is `position` parameter defined as optional TagPositionSchema? [Completeness, FR-010]
- [x] CHK021 - Is `allowsNextAction` parameter defined with boolean type and default `true`? [Completeness, FR-011]
- [x] CHK022 - Is empty/whitespace-only name rejection documented? [Edge Case, spec.md §Edge Cases]

### edit_tag Input Schema

- [x] CHK023 - Is `id` parameter defined as optional string for tag lookup? [Completeness, FR-014]
- [x] CHK024 - Is `name` parameter defined as optional string for tag lookup (distinct from newName)? [Clarity, FR-015]
- [x] CHK025 - Is `newName` parameter defined as optional string with min length 1 and trim? [Completeness, FR-016]
- [x] CHK026 - Is `status` parameter defined as optional 3-state enum? [Completeness, FR-017]
- [x] CHK027 - Is `allowsNextAction` parameter defined as optional boolean? [Completeness, FR-018]
- [x] CHK028 - Is the "id OR name required" refinement rule documented? [Constraint, FR-014/015]
- [x] CHK029 - Is the "at least one update field required" refinement rule documented? [Constraint, FR-019]
- [x] CHK030 - Is partial update semantics documented (omitted fields unchanged)? [Clarity, FR-019]

### delete_tag Input Schema

- [x] CHK031 - Is `id` parameter defined as optional string? [Completeness, FR-021]
- [x] CHK032 - Is `name` parameter defined as optional string? [Completeness, FR-021]
- [x] CHK033 - Is the "id OR name required" refinement rule documented? [Constraint, FR-021]

### assign_tags Input Schema

- [x] CHK034 - Is `taskIds` parameter defined as array of strings with min length 1? [Completeness, FR-026/027]
- [x] CHK035 - Is `tagIds` parameter defined as array of strings with min length 1? [Completeness, FR-026/028]
- [x] CHK036 - Is task identification (ID or name lookup) behavior documented? [Clarity, data-model §Identifier Resolution Order]
- [x] CHK037 - Is tag identification (ID or name lookup) behavior documented? [Clarity, data-model §Identifier Resolution Order]

### remove_tags Input Schema

- [x] CHK038 - Is `taskIds` parameter defined as array of strings with min length 1? [Completeness, FR-032/034]
- [x] CHK039 - Is `tagIds` parameter defined as optional array of strings? [Completeness, FR-032/035]
- [x] CHK040 - Is `clearAll` parameter defined as boolean with default `false`? [Completeness, FR-033]
- [x] CHK041 - Is the "clearAll OR tagIds required" refinement rule documented? [Constraint, data-model §remove_tags]
- [x] CHK042 - Is the mutual exclusivity of `clearAll: true` and non-empty `tagIds` clarified? [Clarity, data-model §remove_tags Purpose]

---

## 3. TagPositionSchema Completeness

- [x] CHK043 - Is `placement` defined as enum with exactly 4 values (before/after/beginning/ending)? [Completeness, FR-010, data-model §Position Schema]
- [x] CHK044 - Is `relativeTo` defined as optional string? [Completeness, data-model §Position Schema]
- [x] CHK045 - Is the refinement rule documented: `relativeTo` REQUIRED for before/after? [Constraint, data-model §Position Schema]
- [x] CHK046 - Is the refinement rule documented: `relativeTo` OPTIONAL for beginning/ending? [Constraint, data-model §Position Schema]
- [x] CHK047 - Is the refinement error message path `['relativeTo']` specified? [Clarity, data-model §Position Schema]
- [x] CHK048 - Is the default position (when entire `position` object omitted) documented as `tags.ending`? [Completeness, FR-010]

---

## 4. Tag.Status 3-State Enum Consistency

- [x] CHK049 - Is Tag.Status defined with exactly 3 values: 'active', 'onHold', 'dropped'? [Completeness, Spec §Clarifications #5]
- [x] CHK050 - Are the 3 enum values case-sensitive strings (not camelCase 'OnHold')? [Clarity, data-model §Tag.Status]
- [x] CHK051 - Is the 3-state enum consistent between input schemas (filters, edit) and output (Tag entity)? [Consistency, data-model]
- [x] CHK052 - Is the OmniJS mapping documented (Tag.Status.OnHold → 'onHold')? [Completeness, data-model §Status Mapping Function]
- [x] CHK053 - Are all 3 states documented for both reading (list) and writing (edit)? [Coverage, FR-004/017]

---

## 5. Tag Entity Schema Completeness

- [x] CHK054 - Is `id` field defined as string with description referencing `tag.id.primaryKey`? [Completeness, FR-002, data-model §Tag Entity]
- [x] CHK055 - Is `name` field defined as string with description? [Completeness, FR-002]
- [x] CHK056 - Is `status` field defined as 3-state enum? [Completeness, FR-002]
- [x] CHK057 - Is `parentId` field defined as `string | null` (nullable, not optional)? [Clarity, FR-002/003]
- [x] CHK058 - Is `allowsNextAction` field defined as boolean? [Completeness, FR-002]
- [x] CHK059 - Is `taskCount` field defined as non-negative integer? [Completeness, FR-002, Spec §Clarifications #6]
- [x] CHK060 - Is `taskCount` documented as `remainingTasks.length` (incomplete tasks only)? [Clarity, Spec §Clarifications #6]

---

## 6. Response Schema Completeness

### Success Responses - Single Operations

- [x] CHK061 - Is `list_tags` success schema defined with `success: true` and `tags: Tag[]`? [Completeness, data-model §list_tags Response]
- [x] CHK062 - Is `create_tag` success schema defined with `success: true`, `id`, and `name`? [Completeness, FR-013]
- [x] CHK063 - Is `edit_tag` success schema defined with `success: true`, `id`, and `name`? [Completeness, FR-020]
- [x] CHK064 - Is `delete_tag` success schema defined with `success: true`, `id`, and `name`? [Completeness, FR-024]

### Success Responses - Batch Operations

- [x] CHK065 - Is `assign_tags` success schema defined with `success: true` and `results` array? [Completeness, FR-031, data-model §assign_tags Response]
- [x] CHK066 - Is `remove_tags` success schema defined with `success: true` and `results` array? [Completeness, FR-037, data-model §remove_tags Response]
- [x] CHK067 - Is per-item result schema defined with `taskId`, `taskName`, `success`, and optional `error`? [Completeness, data-model §Per-Item Result Schema]
- [x] CHK068 - Is it documented that overall `success: true` even when some per-item results failed? [Clarity, data-model §Partial Failure Handling]

### Error Responses

- [x] CHK069 - Is standard error schema defined with `success: false` and `error: string`? [Completeness, FR-039, data-model §Error Response Schema]
- [x] CHK070 - Is disambiguation error schema defined with `code: 'DISAMBIGUATION_REQUIRED'`? [Completeness, FR-038, data-model §Disambiguation Error Schema]
- [x] CHK071 - Is disambiguation `matchingIds` defined as array of strings with minimum 2 items? [Completeness, FR-038]
- [x] CHK072 - Are all response schemas using discriminated union on `success` field? [Consistency, data-model §Complete Response Schemas]

---

## 7. Disambiguation Requirements

### Tag Disambiguation

- [x] CHK073 - Is tag disambiguation specified for `edit_tag` when name lookup matches multiple? [Completeness, FR-015]
- [x] CHK074 - Is tag disambiguation specified for `delete_tag` when name lookup matches multiple? [Completeness, FR-021]
- [x] CHK075 - Is tag disambiguation specified for `assign_tags` when tag name matches multiple? [Completeness, data-model §Disambiguation in Batch Operations]
- [x] CHK076 - Is tag disambiguation specified for `remove_tags` when tag name matches multiple? [Completeness, data-model §Disambiguation in Batch Operations]
- [x] CHK077 - Is the `matchingIds` array populated from `tag.id.primaryKey` values? [Clarity, research.md §Tag Identification]

### Task Disambiguation

- [x] CHK078 - Is task disambiguation specified for `assign_tags` when task name matches multiple? [Completeness, Spec §Clarifications #2]
- [x] CHK079 - Is task disambiguation specified for `remove_tags` when task name matches multiple? [Completeness, Spec §Clarifications #2]
- [x] CHK080 - Is task disambiguation error format consistent with tag disambiguation? [Consistency, data-model §Disambiguation in Batch Operations]
- [x] CHK081 - Is per-item task disambiguation error documented for batch operations? [Clarity, data-model §Per-Item Result Schema Extended]

---

## 8. ID Precedence and Lookup Behavior

- [x] CHK082 - Is "ID takes precedence over name" behavior documented for `edit_tag`? [Clarity, data-model §edit_tag Purpose]
- [x] CHK083 - Is "ID takes precedence over name" behavior documented for `delete_tag`? [Clarity, data-model §delete_tag Purpose]
- [x] CHK084 - Is "try ID first, then name" lookup order documented for task identification? [Clarity, data-model §Identifier Resolution Order]
- [x] CHK085 - Is "try ID first, then name" lookup order documented for tag identification? [Clarity, data-model §Identifier Resolution Order]
- [x] CHK086 - Is `Tag.byIdentifier()` vs `flattenedTags.filter()` distinction documented? [Completeness, data-model §Identifier Resolution Order]

---

## 9. Batch Operation Semantics

### Idempotency

- [x] CHK087 - Is `assign_tags` idempotency documented (adding already-assigned tag is no-op)? [Completeness, FR-030, data-model §Idempotency]
- [x] CHK088 - Is `remove_tags` idempotency documented (removing absent tag is no-op)? [Completeness, FR-036, data-model §Idempotency]

### Partial Failure Handling

- [x] CHK089 - Is partial failure behavior documented (one failed item doesn't fail entire batch)? [Completeness, data-model §Partial Failure Handling]
- [x] CHK090 - Is result ordering documented (results match original array index order)? [Clarity, data-model §Partial Failure Handling]
- [x] CHK091 - Is per-item error inclusion documented (only when per-item `success: false`)? [Clarity, data-model §Per-Item Result Schema]

### clearAll Behavior

- [x] CHK092 - Is `clearAll: true` behavior documented as calling `task.clearTags()`? [Completeness, FR-033, research.md §Task-Tag Operations]
- [x] CHK093 - Is it documented that `tagIds` is ignored when `clearAll: true`? [Clarity, data-model §remove_tags Purpose]

---

## 10. Schema-to-Spec Alignment

### Functional Requirements Coverage

- [x] CHK094 - Do contracts cover FR-001 through FR-006 (list_tags requirements)? [Traceability, Spec §List Tags]
- [x] CHK095 - Do contracts cover FR-007 through FR-013 (create_tag requirements)? [Traceability, Spec §Create Tag]
- [x] CHK096 - Do contracts cover FR-014 through FR-020 (edit_tag requirements)? [Traceability, Spec §Edit Tag]
- [x] CHK097 - Do contracts cover FR-021 through FR-025 (delete_tag requirements)? [Traceability, Spec §Delete Tag]
- [x] CHK098 - Do contracts cover FR-026 through FR-031 (assign_tags requirements)? [Traceability, Spec §Assign Tags]
- [x] CHK099 - Do contracts cover FR-032 through FR-037 (remove_tags requirements)? [Traceability, Spec §Remove Tags]
- [x] CHK100 - Do contracts cover FR-038 (disambiguation error) and FR-039 (standard error)? [Traceability, Spec §Error Handling]

### Data Model Alignment

- [x] CHK101 - Does TagSchema in contracts match data-model.md Tag Entity definition? [Consistency, data-model §Tag Entity]
- [x] CHK102 - Does TagPositionSchema match data-model.md Position Schema? [Consistency, data-model §Position Schema]
- [x] CHK103 - Does DisambiguationErrorSchema match data-model.md definition? [Consistency, data-model §Disambiguation Error Schema]
- [x] CHK104 - Do batch result schemas match data-model.md definitions? [Consistency, data-model §Per-Item Result Schema]

---

## 11. Edge Cases and Error Scenarios

### Input Validation Errors

- [x] CHK105 - Is empty string name rejection documented for `create_tag`? [Edge Case, spec.md §Edge Cases]
- [x] CHK106 - Is whitespace-only name rejection documented (after trim)? [Edge Case, spec.md §Edge Cases]
- [x] CHK107 - Is invalid tag ID handling documented ("Tag '{id}' not found")? [Edge Case, spec.md §Edge Cases]
- [x] CHK108 - Is invalid task ID handling documented ("Task '{id}' not found")? [Edge Case, spec.md §Edge Cases]
- [x] CHK109 - Is invalid parentId handling documented for `create_tag`? [Edge Case, spec.md §Edge Cases]

### Hierarchy Edge Cases

- [x] CHK110 - Is recursive deletion of child tags documented? [Edge Case, FR-022, spec.md §Edge Cases]
- [x] CHK111 - Is orphaned tag reference handling documented (tasks auto-untagged)? [Edge Case, FR-023, spec.md §Edge Cases]
- [x] CHK112 - Is root-level tag (parentId: null) handling documented? [Edge Case, data-model §Tag Entity]

---

## 12. Implementation Readiness

### Self-Contained Contract

- [x] CHK113 - Could a developer implement `list_tags` using only the contract file? [Completeness, data-model + quickstart.md]
- [x] CHK114 - Could a developer implement `create_tag` using only the contract file? [Completeness, data-model + quickstart.md]
- [x] CHK115 - Could a developer implement `edit_tag` using only the contract file? [Completeness, data-model + quickstart.md]
- [x] CHK116 - Could a developer implement `delete_tag` using only the contract file? [Completeness, data-model + quickstart.md]
- [x] CHK117 - Could a developer implement `assign_tags` using only the contract file? [Completeness, data-model §Batch Operation Semantics]
- [x] CHK118 - Could a developer implement `remove_tags` using only the contract file? [Completeness, data-model §Batch Operation Semantics]

### Missing Information Gaps

- [x] CHK119 - Are all Zod schema imports documented (z, TagSchema, etc.)? [Completeness, data-model §Complete Response Schemas]
- [x] CHK120 - Are export statements documented for schemas and types? [Completeness, quickstart.md §Contract Template]
- [x] CHK121 - Are `.describe()` calls documented for all schema fields? [Completeness, data-model schemas]

---

## Validation Summary

**Result**: [x] PASS / [ ] FAIL

**Total Items**: 121 / 121 satisfied (100%)

**Date Validated**: 2025-12-10

**Validated By**: Claude Code (automated review with remediation)

**Focus Areas**:

- Tool Definition Quality (naming, descriptions) - COMPLETE
- Input Schema Completeness (all 6 tools) - COMPLETE
- TagPosition validation rules - COMPLETE
- Tag.Status 3-state consistency - COMPLETE
- Batch operation semantics (assign_tags, remove_tags) - COMPLETE
- Task AND Tag disambiguation - COMPLETE
- clearAll flag behavior - COMPLETE
- Schema-to-Spec FR alignment - COMPLETE

**Remediation Applied**:

1. Enhanced tool descriptions (create_tag, edit_tag, delete_tag, remove_tags)
2. Added ID precedence documentation for edit_tag and delete_tag
3. Added clearAll/tagIds interaction documentation for remove_tags
4. Added comprehensive Batch Operation Semantics section
5. Added Extended Per-Item Result Schema with disambiguation support
6. Added Complete Response Schemas with discriminated unions
7. Added Identifier Resolution Order section
8. Added invalid parentId edge case to spec.md
9. All schemas now include proper import statements and .describe() calls

**Notes**:
All 121 checklist items have been satisfied through documentation updates to
data-model.md and spec.md. The contracts are now implementation-ready with
complete coverage of batch operations, disambiguation handling, and error
scenarios.
