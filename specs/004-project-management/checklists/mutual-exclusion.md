# Mutual Exclusion & Auto-Clear Validation Checklist

**Purpose**: Validate requirements clarity, completeness, and consistency for the sequential/containsSingletonActions mutual exclusion pattern with auto-clear behavior
**Created**: 2025-12-12
**Feature**: Phase 4 - Project Management Tools
**Last Review**: 2025-12-12 (All items satisfied after remediation)

---

## Mutual Exclusion Definition Clarity

- [x] CHK001 - Is the mutual exclusion between `sequential` and `containsSingletonActions` explicitly stated with "invalid state" terminology? [Clarity, spec.md §Project Type Mutual Exclusion, data-model.md §Type Derivation]
- [x] CHK002 - Is the auto-clear behavior (NOT validation error) clearly documented as the resolution strategy? [Clarity, spec.md §Resolution: Silent Auto-Clear]
- [x] CHK003 - Is the official source for this pattern (Omni Automation defensive pattern) cited for traceability? [Completeness, spec.md §Source of Truth, research.md §Finding 1]
- [x] CHK004 - Are both directions of auto-clear documented: sequential→clears containsSingletonActions AND containsSingletonActions→clears sequential? [Completeness, spec.md §FR-028/FR-036, contracts TSDoc]

## Auto-Clear Behavior Requirements

- [x] CHK005 - Is it specified that auto-clear is silent (no error response, no warning)? [Clarity, spec.md §Resolution: Silent Auto-Clear, quickstart.md §Silent behavior]
- [x] CHK006 - Is it specified that success response does NOT mention auto-clear occurred? [Clarity, spec.md §Resolution: Silent Auto-Clear item 2]
- [x] CHK007 - Is the OmniJS implementation order documented (set false FIRST, then set true)? [Completeness, quickstart.md §Complete Implementation Pattern, data-model.md §Precedence Rule]
- [x] CHK008 - Is it documented that auto-clear is application logic, not Zod schema validation? [Clarity, spec.md §Resolution: Silent Auto-Clear, contracts TSDoc "NOT Schema Validation"]

## create_project Tool Requirements

- [x] CHK009 - Does FR-028 explicitly state auto-clear behavior for create_project? [Completeness, spec.md §FR-028]
- [x] CHK010 - Is the CreateProjectInputSchema documented as NOT having a Zod refinement preventing both=true? [Clarity, contracts/create-project.ts TSDoc "intentionally does NOT have a Zod refinement"]
- [x] CHK011 - Do the schema field descriptions mention auto-clear for both `sequential` and `containsSingletonActions`? [Completeness, contracts/create-project.ts field descriptions]

## edit_project Tool Requirements

- [x] CHK012 - Does FR-036 explicitly reference FR-028 for consistent auto-clear pattern? [Consistency, spec.md §FR-036 "same pattern as FR-028"]
- [x] CHK013 - Is the EditProjectInputSchema documented with identical auto-clear behavior as create? [Consistency, contracts/edit-project.ts TSDoc]
- [x] CHK014 - Are requirements specified for toggling between project types (sequential↔parallel↔single-actions)? [Coverage, spec.md §Complete Scenario Matrix]

## Edge Case: Both Properties in Same Request

- [x] CHK015 - Is the precedence rule specified when both sequential=true AND containsSingletonActions=true are provided in the same request? [spec.md §Precedence Rule: containsSingletonActions Wins]
- [x] CHK016 - If precedence exists, is it documented identically for create_project and edit_project? [Consistency, spec.md §Precedence Rule applies to both]
- [x] CHK017 - Is "last one wins" or "first one wins" or other precedence explicitly stated? [Clarity, spec.md §containsSingletonActions wins (last processed)]

## Edge Case: Setting to False

- [x] CHK018 - Is the behavior documented when setting sequential=false on a sequential project? [Coverage, spec.md §Setting Properties to false, quickstart.md §Setting to False]
- [x] CHK019 - Is the behavior documented when setting containsSingletonActions=false on a single-actions project? [Coverage, spec.md §Setting Properties to false]
- [x] CHK020 - Is it clear that setting both to false results in 'parallel' project type? [Clarity, data-model.md §Type Derivation, spec.md §Complete Scenario Matrix]
- [x] CHK021 - Is it specified that setting one to false does NOT auto-set the other? [Clarity, spec.md §Setting Properties to false, data-model.md §Setting to False]

## Edge Case: Omitting Parameters

- [x] CHK022 - Is it specified that omitting both parameters preserves existing project type? [Coverage, spec.md §Omitting Parameters, data-model.md §Omitting Parameters]
- [x] CHK023 - Is it specified that omitting one parameter while setting the other triggers auto-clear only if necessary? [Clarity, spec.md §Omitting Parameters, contracts/edit-project.ts TSDoc]

## ProjectType Derivation Alignment

- [x] CHK024 - Is the ProjectType derivation table (sequential + containsSingletonActions → projectType) complete with all 4 combinations? [Completeness, data-model.md §Type Derivation]
- [x] CHK025 - Is the invalid combination (both true) marked with "auto-cleared" annotation? [Clarity, data-model.md §Type Derivation "Invalid (auto-cleared)"]
- [x] CHK026 - Is the derivation function in quickstart.md consistent with the data model table? [Consistency, quickstart.md §Project Type Derivation]
- [x] CHK027 - Does the derivation function handle all valid combinations correctly (parallel, sequential, single-actions)? [Coverage, quickstart.md §Project Type Derivation]

## Cross-Document Consistency

- [x] CHK028 - Is auto-clear behavior described consistently between spec.md §FR-028/FR-036 and quickstart.md §Auto-Clear Pattern? [Consistency - both use same terminology and precedence]
- [x] CHK029 - Is auto-clear behavior described consistently between data-model.md and contracts TSDoc comments? [Consistency - both reference spec.md and use same language]
- [x] CHK030 - Do all references cite the same clarification session (2025-12-12) as source of truth? [Traceability, spec.md §Clarifications, research.md §Finding 1]

## OmniJS API Alignment

- [x] CHK031 - Is it documented that OmniJS allows setting both properties to true (no native validation)? [Completeness, research.md §Finding 1 "undefined behavior"]
- [x] CHK032 - Is it documented that implementation MUST add auto-clear logic explicitly (not OmniFocus native behavior)? [Clarity, research.md "OmniFocus itself does NOT auto-clear", data-model.md §OmniFocus Native Behavior]
- [x] CHK033 - Does the documented pattern match official Omni Automation examples? [Traceability, research.md §4 Setting Project Type]

## Error Handling (Non-Errors) Clarity

- [x] CHK034 - Is it explicitly stated that NO validation error is returned when both are true? [Clarity, spec.md §Resolution: Silent Auto-Clear "NOT return a validation error"]
- [x] CHK035 - Is there an explicit statement that this is NOT in the error response table? [Clarity, spec.md §Error Message Standards - mutual exclusion not listed]
- [x] CHK036 - Is it clear that the user discovers the result via subsequent get_project call? [Clarity, spec.md §Resolution: Silent Auto-Clear item 4]

## Warning/Documentation Requirements

- [x] CHK037 - Does quickstart.md include a warning section about not setting both simultaneously? [Completeness, quickstart.md §Common Issues - Project Type Mutual Exclusion]
- [x] CHK038 - Do contract TSDoc comments explain the auto-clear behavior for implementers? [Completeness, contracts/create-project.ts and edit-project.ts TSDoc headers]
- [x] CHK039 - Is there an example showing the WRONG pattern (both true) and CORRECT pattern? [Completeness, quickstart.md §Common Issues - WRONG and CORRECT examples]

## Uniqueness to Phase 4

- [x] CHK040 - Is it documented that this pattern is NEW and not present in folders, tags, or tasks phases? [Clarity, spec.md §Unique to Phase 4, quickstart.md, data-model.md, contracts TSDoc]
- [x] CHK041 - Are there any similar patterns in previous phases that could cause confusion? [No - explicitly stated as unique to Phase 4 in multiple documents]
