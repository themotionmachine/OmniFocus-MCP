# Error Handling Patterns Checklist: Tag Management Tools

**Purpose**: Validate consistent and actionable error handling requirements across all 6 tools
**Created**: 2025-12-10
**Feature**: [spec.md](../spec.md) FR-038, FR-044, [data-model.md](../data-model.md)
**Constitution**: Principle V (Defensive Error Handling)

## 1. Error Response Structure Requirements

### Standard Error Schema

- [x] CHK001 - Is `success: false` defined as the discriminator for all error responses? [Completeness, FR-039, data-model §Error Response]
- [x] CHK002 - Is `error` field defined as required string for standard errors? [Completeness, FR-039]
- [x] CHK003 - Is the error message requirement "descriptive" clarified with specific criteria? [Clarity, spec.md FR-040, Error Message Standards table]
- [x] CHK004 - Are error messages required to be actionable (explain problem AND solution)? [Clarity, spec.md FR-040]

### Disambiguation Error Schema

- [x] CHK005 - Is `code: "DISAMBIGUATION_REQUIRED"` defined as exact literal string? [Completeness, FR-038, data-model §Disambiguation]
- [x] CHK006 - Is `matchingIds` defined as array of strings with minimum 2 items? [Completeness, FR-038]
- [x] CHK007 - Is disambiguation error message format specified (e.g., "Ambiguous tag name 'X'. Found N matches.")? [Clarity, Edge Cases §Duplicate tag names]
- [x] CHK008 - Is the disambiguation error structure consistent between tags and tasks? [Consistency, data-model §Disambiguation in Batch Operations, spec.md §Per-item disambiguation]

### Batch Operation Error Structure

- [x] CHK009 - Is per-item error field defined (`error?: string`) in result schema? [Completeness, data-model §Batch Result]
- [x] CHK010 - Is it specified that batch operations do NOT use top-level error on partial failure? [Clarity, spec.md FR-041, data-model §Partial Failure Handling]
- [x] CHK011 - Is overall `success: true` documented even when some per-item results failed? [Clarity, spec.md FR-041, data-model §Batch Operation Semantics]
- [x] CHK012 - Is the relationship between per-item `success: false` and per-item `error` clarified? [Consistency, spec.md FR-044, data-model §Per-Item Result Schema]

---

## 2. Error Scenarios by Tool

### list_tags Error Scenarios

- [x] CHK013 - Is error handling defined for invalid `parentId` (tag not found)? [Coverage, quickstart.md §OmniJS Script Template]
- [x] CHK014 - Is error message format specified for invalid parentId: "Invalid parentId '{id}': tag not found"? [Clarity, data-model §Position Error Messages]
- [x] CHK015 - Is error handling defined for invalid `status` enum value? [Coverage, spec.md Edge Cases §Invalid status enum, quickstart.md §Status Enum Validation Error]
- [x] CHK016 - Is transport-level failure handling (OmniFocus not running) documented? [Coverage, Spec §Clarifications #4]

### create_tag Error Scenarios

- [x] CHK017 - Is error handling defined for empty name after trim? [Coverage, Edge Cases §Empty tag names]
- [x] CHK018 - Is the error message format specified: "Tag name is required and must be a non-empty string"? [Clarity, spec.md Error Message Standards table]
- [x] CHK019 - Is error handling defined for invalid `relativeTo` ID in position? [Coverage, spec.md Edge Cases §Invalid relativeTo, data-model §Position Error Messages]
- [x] CHK020 - Is error handling defined for invalid `parentId`? [Coverage, spec.md Edge Cases §Invalid parentId]
- [x] CHK021 - Is Zod refinement error for position (before/after without relativeTo) documented? [Coverage, data-model §Position Schema]

### edit_tag Error Scenarios

- [x] CHK022 - Is error handling defined for tag not found (by ID)? [Coverage, spec.md Edge Cases §Tag references]
- [x] CHK023 - Is error message format specified: "Tag '{id}' not found"? [Clarity, spec.md Error Message Standards table]
- [x] CHK024 - Is disambiguation error defined for ambiguous tag name lookup? [Coverage, FR-015]
- [x] CHK025 - Is Zod refinement error for "no updates provided" documented? [Coverage, FR-019, data-model §edit_tag Input Schema]
- [x] CHK026 - Is error handling defined for invalid status value in update? [Coverage, spec.md Edge Cases §Invalid status enum]

### delete_tag Error Scenarios

- [x] CHK027 - Is error handling defined for tag not found? [Coverage, FR-025]
- [x] CHK028 - Is disambiguation error defined for ambiguous tag name? [Coverage, FR-021]
- [x] CHK029 - Is error message format consistent with edit_tag? [Consistency, spec.md Error Message Standards table]

### assign_tags Error Scenarios

- [x] CHK030 - Is per-item error handling defined for tag not found? [Coverage, spec.md Edge Cases §Batch operation tag not found]
- [x] CHK031 - Is per-item error handling defined for task not found? [Coverage, Edge Cases §Task references]
- [x] CHK032 - Is per-item disambiguation error defined for ambiguous tag name? [Coverage, spec.md Edge Cases §Per-item disambiguation, data-model §Disambiguation in Batch Operations]
- [x] CHK033 - Is per-item disambiguation error defined for ambiguous task name? [Coverage, Spec §Clarifications #2, data-model §Disambiguation in Batch Operations]
- [x] CHK034 - Is the per-item error structure (taskId, taskName, success, error) documented? [Completeness, FR-031, data-model §BatchItemResultSchema]

### remove_tags Error Scenarios

- [x] CHK035 - Is per-item error handling defined for tag not found? [Coverage, spec.md Edge Cases §Batch operation tag not found]
- [x] CHK036 - Is per-item error handling defined for task not found? [Coverage, Edge Cases §Task references]
- [x] CHK037 - Is per-item disambiguation error defined for ambiguous names? [Coverage, spec.md Edge Cases §Per-item disambiguation]
- [x] CHK038 - Is error handling defined for `clearAll: true` with non-empty `tagIds`? [Coverage, spec.md Edge Cases §clearAll with tagIds conflict, data-model §remove_tags Input Schema]
- [x] CHK039 - Is the per-item error structure consistent with assign_tags? [Consistency, data-model]

---

## 3. Error Message Quality Requirements

### Message Content Standards

- [x] CHK040 - Are error messages required to quote the problematic input value? [Clarity, spec.md FR-040, Error Message Standards table]
- [x] CHK041 - Are error messages required to explain WHY the operation failed? [Clarity, spec.md FR-040]
- [x] CHK042 - Are error messages required to suggest corrective action when applicable? [Clarity, spec.md FR-040, Error Message Standards shows "Please specify by ID"]
- [x] CHK043 - Are IDs required in "not found" errors for debugging? [Clarity, spec.md Error Message Standards table]

### Disambiguation Message Format

- [x] CHK044 - Is disambiguation error message required to state how many matches found? [Clarity, Edge Cases §Duplicate tag names]
- [x] CHK045 - Is disambiguation error required to include all matching IDs? [Completeness, FR-038]
- [x] CHK046 - Is the suggestion "Please specify by ID" included in disambiguation messages? [Clarity, spec.md Error Message Standards table]

### Batch Error Message Quality

- [x] CHK047 - Are batch operation errors required to clearly indicate WHICH items failed? [Clarity, spec.md FR-043, data-model §BatchItemResultSchema]
- [x] CHK048 - Is the failed item's identifier (taskId/taskName) included in per-item errors? [Completeness, data-model §Batch Result]
- [x] CHK049 - Is it documented that successful items have no `error` field (only on failure)? [Clarity, spec.md FR-044, data-model §Batch Operation Semantics]

---

## 4. Error Handling Layers

### Zod Validation Layer

- [x] CHK050 - Is Zod validation error formatting documented? [Completeness, quickstart.md §Zod Validation Error Formatting]
- [x] CHK051 - Is the pattern for extracting error paths from Zod issues specified? [Clarity, quickstart.md §Definition Template]
- [x] CHK052 - Is consistent error message format specified: "path.field: message"? [Consistency, plan.md §Layer 1, quickstart.md]
- [x] CHK053 - Are Zod refinement errors formatted consistently with field validation errors? [Consistency, quickstart.md]

### OmniJS Script Layer

- [x] CHK054 - Is try-catch wrapping required for all OmniJS scripts? [Completeness, Constitution Principle V, plan.md §Layer 2]
- [x] CHK055 - Is JSON error format specified: `{ success: false, error: string }`? [Completeness, quickstart.md §OmniJS Error Pattern]
- [x] CHK056 - Is `e.message || String(e)` pattern documented for error extraction? [Clarity, quickstart.md]
- [x] CHK057 - Is it documented that OmniJS errors should NOT be swallowed silently? [Clarity, Constitution Principle V, quickstart.md §Error Handling Layers]

### Primitive Function Layer

- [x] CHK058 - Is error propagation without context loss documented? [Clarity, quickstart.md §Primitive Error Propagation, plan.md §Layer 3]
- [x] CHK059 - Are primitives required to return structured error responses (not throw)? [Consistency, quickstart.md §Error Handling Layers]
- [x] CHK060 - Is it documented that primitives preserve original error messages? [Clarity, quickstart.md §Primitive Error Propagation, plan.md §Layer 3]

### Definition Handler Layer

- [x] CHK061 - Is MCP error response format documented: `{ content: [...], isError: true }`? [Completeness, quickstart.md §Definition Template]
- [x] CHK062 - Is transformation from primitive errors to MCP format specified? [Clarity, quickstart.md §Definition Template]
- [x] CHK063 - Is `isError: true` required when response contains error? [Completeness, quickstart.md]

---

## 5. Batch Operation Error Semantics

### Continue-on-Error Behavior

- [x] CHK064 - Is continue-processing-on-failure behavior documented for assign_tags? [Completeness, spec.md FR-042, plan.md §Batch Operation Error Semantics]
- [x] CHK065 - Is continue-processing-on-failure behavior documented for remove_tags? [Completeness, spec.md FR-042]
- [x] CHK066 - Is it documented that one failed item does NOT halt the entire batch? [Clarity, spec.md FR-042, Constitution Principle V]
- [x] CHK067 - Are remaining items processed even after encountering an error? [Coverage, spec.md FR-042, data-model §Partial Failure Handling]

### Result Ordering

- [x] CHK068 - Is result ordering documented (results match original array index)? [Clarity, spec.md FR-043, data-model §Batch Operation Semantics]
- [x] CHK069 - Is it documented that every input item produces a result entry? [Completeness, spec.md FR-043]

### Top-Level vs Per-Item Success

- [x] CHK070 - Is the distinction between top-level success and per-item success clear? [Clarity, spec.md FR-041, data-model §Batch Operation Semantics, plan.md]
- [x] CHK071 - Is it documented that top-level `success: true` indicates operation completed (not all succeeded)? [Clarity, spec.md FR-041, data-model §Partial Failure Handling]
- [x] CHK072 - Is the consumer's responsibility to check per-item results documented? [Clarity, spec.md FR-041, plan.md §Consumer code example]

---

## 6. Constitution Principle V Alignment

### Error Coverage

- [x] CHK073 - Are errors caught at every layer (Zod, OmniJS, Primitive, Definition)? [Coverage, quickstart.md §Error Handling Layers, plan.md §Error Handling Architecture]
- [x] CHK074 - Is it documented that no layer silently swallows exceptions? [Clarity, Constitution Principle V, quickstart.md]
- [x] CHK075 - Are all error paths documented (no undocumented failure modes)? [Completeness, spec.md Edge Cases, spec.md Error Message Standards]

### Actionable Messages

- [x] CHK076 - Are all error messages required to be actionable? [Clarity, spec.md FR-040]
- [x] CHK077 - Is "actionable" defined (explain problem + suggest solution)? [Clarity, spec.md FR-040 - 3 criteria listed]
- [x] CHK078 - Are generic messages like "An error occurred" prohibited? [Clarity, spec.md FR-040 explicitly prohibits]

### Silent Failure Prevention

- [x] CHK079 - Is OmniJS try-catch required to return JSON (not empty)? [Completeness, Constitution Principle V, quickstart.md]
- [x] CHK080 - Is it documented that empty OmniJS results indicate silent failure? [Clarity, quickstart.md §Silent Failure Detection, plan.md §Silent Failure Detection]
- [x] CHK081 - Are recovery instructions documented for silent failures? [Coverage, quickstart.md §Silent Failure Detection - "Test the script in OmniFocus Script Editor to diagnose"]

---

## 7. Dual Disambiguation (Tags AND Tasks)

### Tag Disambiguation

- [x] CHK082 - Is tag disambiguation documented for all tag name lookups? [Coverage, FR-015/021/028/035]
- [x] CHK083 - Is the disambiguation trigger condition specified (>1 matches)? [Clarity, data-model §Disambiguation]
- [x] CHK084 - Are tools that DON'T use tag disambiguation identified (list_tags, create_tag)? [Clarity, data-model §Disambiguation Support by Tool]

### Task Disambiguation

- [x] CHK085 - Is task disambiguation documented for assign_tags task lookup? [Coverage, Spec §Clarifications #2]
- [x] CHK086 - Is task disambiguation documented for remove_tags task lookup? [Coverage, Spec §Clarifications #2]
- [x] CHK087 - Is the task disambiguation error structure consistent with tag disambiguation? [Consistency, spec.md §Clarifications #2 - "consistent with tag/folder patterns", data-model §Disambiguation in Batch Operations]

### Per-Item Disambiguation in Batch Ops

- [x] CHK088 - Is per-item tag disambiguation error documented for assign_tags? [Coverage, spec.md Edge Cases §Per-item disambiguation, data-model §BatchItemResultSchema with code/matchingIds]
- [x] CHK089 - Is per-item task disambiguation error documented for assign_tags? [Coverage, data-model §Disambiguation in Batch Operations, quickstart.md §Batch Operation Template]
- [x] CHK090 - Is per-item tag disambiguation error documented for remove_tags? [Coverage, spec.md Edge Cases §Per-item disambiguation]
- [x] CHK091 - Is per-item task disambiguation error documented for remove_tags? [Coverage, data-model §Disambiguation in Batch Operations]

---

## 8. 3-State Status Enum Validation

- [x] CHK092 - Is error handling defined for invalid status values in list_tags filter? [Coverage, Zod enum validation, quickstart.md §Status Enum Validation Error]
- [x] CHK093 - Is error handling defined for invalid status values in edit_tag update? [Coverage, spec.md Edge Cases §Invalid status enum]
- [x] CHK094 - Is the error message format specified for invalid status? [Clarity, spec.md Edge Cases, Error Message Standards table]
- [x] CHK095 - Are all 3 valid values (active/onHold/dropped) documented in error messages? [Clarity, spec.md Error Message Standards - lists all 3]
- [x] CHK096 - Is case-sensitivity enforced and error message clarity for case mismatches? [Clarity, spec.md Edge Cases §Invalid status enum - "case-sensitive"]

---

## 9. Transport and Infrastructure Errors

### OmniFocus Availability

- [x] CHK097 - Is error handling documented for OmniFocus not running? [Coverage, Spec §Clarifications #4, quickstart.md §Transport Failure Detection]
- [x] CHK098 - Is the error message format specified for transport failures? [Clarity, quickstart.md §Transport Failure Detection]
- [x] CHK099 - Is existing scriptExecution.ts pattern referenced? [Consistency, Spec §Clarifications #4, plan.md §Layer 4]

### Script Execution Failures

- [x] CHK100 - Is osascript timeout handling documented? [Coverage, quickstart.md §Transport Failure Detection]
- [x] CHK101 - Is OmniJS syntax error handling documented? [Coverage, quickstart.md §Silent Failure Detection - empty result indicates syntax error]
- [x] CHK102 - Is empty script result (silent failure) handling documented? [Coverage, quickstart.md §Silent Failure Detection, plan.md §Silent Failure Detection]

---

## 10. Error Schema Consistency

### Across Single-Item Operations

- [x] CHK103 - Is error response structure consistent across list_tags, create_tag, edit_tag, delete_tag? [Consistency, FR-039]
- [x] CHK104 - Is disambiguation error structure consistent across edit_tag and delete_tag? [Consistency, FR-038]

### Across Batch Operations

- [x] CHK105 - Is per-item error structure identical between assign_tags and remove_tags? [Consistency, data-model]
- [x] CHK106 - Is the per-item success/error semantics documented identically? [Consistency, spec.md FR-044, data-model §Batch Operation Semantics]

### Between Spec and Data Model

- [x] CHK107 - Does data-model.md error schema match spec.md FR-038 and FR-039? [Traceability, data-model]
- [x] CHK108 - Does quickstart.md error handling template match data-model.md schemas? [Consistency, quickstart.md]

---

## Validation Summary

**Result**: [x] PASS / [ ] FAIL

**Total Items**: 108

**Satisfied**: 108/108 (100%)

**Date Validated**: 2025-12-10

**Validated By**: Claude (automated review with remediation)

**Focus Areas**:

- Error response structure (standard, disambiguation, batch) ✅
- Error scenarios by tool (all 6 tools) ✅
- Error message quality (actionable, includes input values) ✅
- Error handling layers (Zod → OmniJS → Primitive → Definition) ✅
- Batch operation continue-on-error semantics ✅
- Dual disambiguation (tags AND tasks) ✅
- Constitution Principle V alignment ✅

**Notes**:

- All gaps identified during initial review have been remediated
- spec.md updated with FR-040 through FR-044 for error handling requirements
- data-model.md updated with clearAll mutual exclusivity validation
- quickstart.md updated with comprehensive error handling patterns
- plan.md updated with error handling architecture documentation
- Edge cases expanded to cover all identified error scenarios
