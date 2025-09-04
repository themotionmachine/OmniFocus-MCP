# PR: Hierarchical Task Creation and Batch Hierarchy Support

## Summary
- Adds first-class support for creating parent–child task hierarchies in OmniFocus via MCP.
- Extends single-task and batch APIs with parent-reference fields, dependency-aware ordering, and clear error reporting.

## Motivation
- Fills a major gap: previously only flat tasks were created, forcing manual re-organization.
- Enables assistants to preserve structure from transcripts, plans, and documents.

## What’s Included
- Single add (`add_omnifocus_task`)
  - New fields: `parentTaskId`, `parentTaskName`, `hierarchyLevel` (ignored for single adds).
  - Accurate placement messages derived from the created task’s actual container.
  - Warning appended when a requested parent isn’t found.
- Batch add (`batch_add_items`)
  - New fields: `tempId`, `parentTempId`, `parentTaskId`, `parentTaskName`, `hierarchyLevel`.
  - Dependency-aware ordering with `tempId` → real ID mapping.
  - Cycle detection with human-readable paths (e.g., `A -> B -> A`).
  - Specific errors for `Unknown parentTempId`.
- Robust AppleScript execution
  - Scripts are written to a temp file and executed with `osascript <file>` to avoid quoting/escaping issues.

## Usage Examples
- Single child by ID:
  ```json
  { "name": "Child", "projectName": "Project", "parentTaskId": "<ID>" }
  ```
- Batch with temp mapping:
  ```json
  { "items": [
    { "type": "task", "name": "Parent", "projectName": "P", "tempId": "p1" },
    { "type": "task", "name": "Child A", "parentTempId": "p1" }
  ] }
  ```

## Testing & QA
- Parent by ID: PASS (message: “under the parent task”).
- Parent by Name (valid): PASS.
- Parent by Name (invalid): PASS (project placement + warning).
- Cycle detection: PASS (clear path message).
- Unknown parentTempId: PASS (specific error; others proceed).
- Inbox creation and flat adds: PASS.
- Mixed batch with projects/tasks: PASS.

## Backward Compatibility
- Flat creation continues to work.
- Name-based parent lookup is constrained to the specified `projectName` when provided; otherwise uses global first match.

## Files Changed (high level)
- `src/tools/definitions/addOmniFocusTask.ts`: zod schema additions, improved handler messaging.
- `src/tools/definitions/batchAddItems.ts`: zod schema additions, clearer failure reporting.
- `src/tools/primitives/addOmniFocusTask.ts`: parent resolution, container-based placement, temp-file AppleScript execution.
- `src/tools/primitives/batchAddItems.ts`: ordering, `tempId` mapping, cycle/unknown-parent validation.
- `README.md`, `docs/hierarchy-testing.md`.

## Notes
- Prefer `parentTaskId` for precision; name-based matches can be ambiguous.
- Inbox fallback preserved when neither project nor parent is resolved.
