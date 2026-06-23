# Write Evaluation Notes

These notes record write-mode verification performed in this fork. They are intentionally separate from `README.md` so upstream-facing product documentation stays focused on general usage.

## Smoke Test

Date: 2026-06-23

Mode: `OMNIFOCUS_MCP_MODE=write`

The server was launched through the actual MCP stdio protocol. It initialized successfully, allowed ordinary write tools, and continued to block destructive operations before they reached OmniFocus.

## Test Data Created

The smoke test created isolated `TEST:` items so they are easy to find and clean up manually:

```text
Project: TEST: OmniFocus MCP write smoke 2026-06-23T06-29-58-260Z
Tag: TEST-write-smoke-2026-06-23T06-29-58-260Z
Task: TEST: write smoke task edited 2026-06-23T06-29-58-260Z
Batch task: TEST: write smoke batch one 2026-06-23T06-29-58-260Z
Batch task: TEST: write smoke batch two 2026-06-23T06-29-58-260Z
```

## Verified Ordinary Writes

- `add_project`
- `create_tag`
- `add_omnifocus_task`
- `edit_item` for non-destructive fields
- `batch_add_items` with a small batch

The query-back check found the created project and four active tasks in that project:

```text
TEST: OmniFocus MCP write smoke 2026-06-23T06-29-58-260Z
TEST: write smoke task edited 2026-06-23T06-29-58-260Z
TEST: write smoke batch one 2026-06-23T06-29-58-260Z
TEST: write smoke batch two 2026-06-23T06-29-58-260Z
```

## Verified Dangerous Blocking

The following remained blocked in `write` mode:

- `remove_item`
- `batch_remove_items`
- `edit_item` with `newStatus: completed`
- `edit_item` with `newProjectStatus: dropped`
- `batch_add_items` with more than 10 items

## Cleanup

No cleanup was performed through MCP during this smoke test because removals and destructive status changes intentionally require `OMNIFOCUS_MCP_MODE=dangerous`.

The test data can be removed manually in OmniFocus, or through a later dangerous-mode cleanup test after adding any desired confirmation guard.
