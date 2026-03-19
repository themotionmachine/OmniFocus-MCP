# Research: Bulk Operations

**Branch**: `010-bulk-operations` | **Date**: 2026-03-18

## Research Tasks

### RT-01: OmniJS Bulk API Functions

**Decision**: Use `moveTasks()`, `duplicateTasks()`, `convertTasksToProjects()`, `moveSections()`, and `duplicateSections()` called one item at a time within a single OmniJS script execution.

**Rationale**: The spec clarifications (Session 2026-03-18) confirm that calling these functions one item at a time maintains 1:1 input-output correlation for per-item results (FR-007). This matches the existing batch patterns in `assignTags.ts` and `removeTags.ts` which iterate items individually within a single OmniJS execution. `moveTasks()` returns void; `duplicateTasks()` returns `TaskArray`; `convertTasksToProjects()` returns `Array of Project`; `moveSections()` returns void; `duplicateSections()` returns `SectionArray`.

**Alternatives Considered**:
- Passing all items in a single bulk call: Rejected because OmniJS returns copies in library order (not input order), breaking per-item correlation
- Multiple separate `executeOmniJS()` calls (one per item): Rejected due to process spawn overhead; a single OmniJS execution with an internal loop is far more efficient

### RT-02: Existing Batch Pattern Compatibility

**Decision**: Reuse `ItemIdentifierSchema` from `src/contracts/status-tools/shared/item-identifier.ts` and create new `BulkBatchItemResultSchema` specific to bulk-tools (structurally similar to `StatusBatchItemResultSchema` but with additional fields like `newId` for duplicate/convert results).

**Rationale**: The existing `ItemIdentifierSchema` is domain-agnostic (supports ID or name with disambiguation). The `StatusBatchItemResultSchema` is close but lacks `newId`/`newName` fields needed for duplicate and convert operations. Creating a bulk-tools-specific variant follows the per-domain pattern documented in `disambiguation.ts` ("Each tool domain owns its own identical schema. This is intentional -- not a DRY violation.").

**Alternatives Considered**:
- Extending `StatusBatchItemResultSchema` with optional `newId`: Rejected because it would add fields irrelevant to status tools, violating Interface Segregation (Constitution IX)
- Creating a shared cross-domain schema: Rejected per existing per-domain ownership pattern

### RT-03: Position Schema Design for Task vs Section Operations

**Decision**: Create two position schemas: `TaskPositionSchema` (supporting project, task, and inbox targets) and `SectionPositionSchema` (reusing the existing `PositionSchema` from folder-tools which supports folder targets and library root only).

**Rationale**: The spec (Key Entities - Position) explicitly states: "Task operations accept positions targeting projects, tasks (as subtask), or the inbox. Section operations accept positions targeting folders or the library root only (not inbox or tasks)." The existing `PositionSchema` from folder-tools already correctly models section positions. Task positions need a different schema because they accept different target types (project ID, parent task ID, or the literal "inbox").

**Alternatives Considered**:
- Single unified position schema with conditional validation: Rejected because the target types are fundamentally different (folders vs projects/tasks/inbox), making conditional refinements complex and error-prone (Constitution VII - KISS)
- Reusing `MoveProjectInputSchema` position fields directly: Rejected because those are single-item fields (targetFolderId, root, beforeProject, afterProject) not a clean position object

### RT-04: batch_update_tasks Property Set Design

**Decision**: Use a flat property object with explicit `clearX` boolean flags for nullable properties. Properties: `flagged`, `dueDate`, `deferDate`, `addTags`, `removeTags`, `note` (append), `clearDueDate`, `clearDeferDate`, `estimatedMinutes`, `clearEstimatedMinutes`, `plannedDate`, `clearPlannedDate`. Tag removals processed before additions (FR-014).

**Rationale**: The flat property object matches the existing `editItem` pattern. Explicit `clearX` flags avoid ambiguity between "not specified" (omit field) and "set to null" (clearX: true). The `plannedDate`/`clearPlannedDate` fields require OmniFocus v4.7+ version gating, consistent with the existing `setPlannedDate` tool.

**Alternatives Considered**:
- Using `null` to clear properties: Rejected because Zod's optional vs nullable semantics create confusion, and the existing `PositionSchema` documentation explicitly warns against null values
- Per-task property overrides: Rejected per spec clarification -- uniform properties to all tasks, consistent with every batch tool in the codebase

### RT-05: convert_tasks_to_projects Task-to-Project Mapping

**Decision**: Return a mapping of original task ID to new project ID in per-item results. The conversion calls `convertTasksToProjects()` one item at a time within the OmniJS script loop. The new project inherits name, note, and subtasks; tags and dates transfer where applicable.

**Rationale**: Calling one item at a time maintains 1:1 correlation (same pattern as RT-01). The function returns `Array of Project` for the newly created projects, so the script can immediately read `project.id.primaryKey` from the return value. The original task is consumed by the conversion (removed from its original location).

**Alternatives Considered**:
- Calling `convertTasksToProjects()` with all tasks at once: Rejected because per-item error handling becomes impossible if any single task fails the entire batch
- Creating a new project manually and moving subtasks: Rejected because `convertTasksToProjects()` handles the full lifecycle including subtask promotion

### RT-06: Target Location Pre-validation Pattern

**Decision**: Validate the shared target location (project, folder, inbox) before processing individual items. Invalid target returns a single top-level error (not per-item). This is a pre-validation gate before the item loop.

**Rationale**: FR-016 requires validating the target exists before processing individual items. Since the target is shared across all items in the batch, a single validation check is more efficient and produces a clearer error message than N per-item errors all saying the same thing.

**Alternatives Considered**:
- Per-item target validation: Rejected because it produces N identical error messages for a single root cause
- No pre-validation (rely on OmniJS exceptions): Rejected because it would process items unnecessarily before failing

### RT-07: Duplicate Operation Reset Behavior

**Decision**: Duplicated tasks are created as active (incomplete) regardless of original's completion status (FR-011). The OmniJS `duplicateTasks()` function creates copies with matching properties; the script explicitly sets `duplicatedTask.markIncomplete()` after duplication if the original was completed.

**Rationale**: FR-011 explicitly requires copies to be active. This matches the template-workflow use case described in User Story 2 where users duplicate completed checklist items for reuse.

**Alternatives Considered**:
- Preserving original completion status: Rejected by FR-011
- Only resetting status if original was completed (not dropped): Rejected because dropped items should also produce active copies per the spec

### RT-08: Error Code Taxonomy

**Decision**: Use the following error codes across all 6 tools:
- `NOT_FOUND` - Item not found by ID or name
- `DISAMBIGUATION_REQUIRED` - Name matches multiple items (with candidates array)
- `TARGET_NOT_FOUND` - Target location does not exist (top-level error, not per-item)
- `OPERATION_FAILED` - OmniJS threw an exception during the operation
- `TAG_NOT_FOUND` - Tag referenced in addTags/removeTags does not exist (batch_update_tasks only)
- `RELATIVE_TARGET_NOT_FOUND` - The relativeTo sibling in position does not exist
- `ALREADY_A_PROJECT` - Task is already a project's root task (convert_tasks_to_projects only)
- `VERSION_NOT_SUPPORTED` - OmniFocus version too old for requested feature (batch_update_tasks with plannedDate)
- `VALIDATION_ERROR` - Request-level validation failure (empty items, exceeds 100, empty properties)

**Rationale**: Consistent with existing error codes in status-tools (NOT_FOUND, DISAMBIGUATION_REQUIRED, VERSION_NOT_SUPPORTED). New codes (TARGET_NOT_FOUND, OPERATION_FAILED, TAG_NOT_FOUND, ALREADY_A_PROJECT, RELATIVE_TARGET_NOT_FOUND) cover bulk-specific scenarios documented in the spec edge cases.

**Alternatives Considered**:
- Reusing only existing codes: Rejected because bulk operations have unique failure modes (target validation, conversion errors) not present in status tools
- Numeric error codes: Rejected; string codes are more readable and match existing patterns
