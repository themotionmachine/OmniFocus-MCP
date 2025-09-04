# Hierarchical Task Creation – Manual Test Checklist

- Single add under parent by ID:
  - Create a parent task; capture its ID (via `query_omnifocus` or UI).
  - Call `add_omnifocus_task` with `parentTaskId` and verify child appears under parent.
- Single add under parent by name (fallback):
  - Ensure a unique parent task name in the target project.
  - Call `add_omnifocus_task` with `projectName` + `parentTaskName`; verify placement.
- Batch hierarchy with tempId/parentTempId:
  - Send three items: parent (with `tempId`), two children using `parentTempId`.
  - Verify ordering and parent-child relationship in OmniFocus.
- Mixed batch with existing parent:
  - Use `parentTaskId` for one child and `parentTempId` for another referencing a new parent in the same batch.
- Error cases:
  - Unknown `parentTempId` → item reports `Unknown parentTempId`.
  - Cyclic references (A->B, B->A) → items report cycle detection.
  - Missing `projectName` + missing parent → item is created in Inbox.
