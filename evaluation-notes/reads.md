# Read Evaluation Notes

These notes record read-only verification performed in this fork. They are intentionally separate from `README.md` so upstream-facing product documentation stays focused on general usage.

## Smoke Test

Date: 2026-06-23

Mode: `OMNIFOCUS_MCP_MODE` unset, which defaults to read-only.

The server was launched through the actual MCP stdio protocol. It initialized successfully, advertised all 12 tools, allowed read operations, and blocked every write/destructive tool before it reached OmniFocus.

## Verified Read Surfaces

Tools:

- `query_omnifocus`
- `dump_database`
- `list_tags`
- `list_perspectives`
- `get_perspective_view`

Fixed resources:

- `omnifocus://inbox`
- `omnifocus://today`
- `omnifocus://flagged`
- `omnifocus://stats`

Template resources:

- `omnifocus://project/{name}`
- `omnifocus://perspective/{name}`

## Verified Write Blocking

Ordinary writes blocked in read-only mode:

- `add_omnifocus_task`
- `add_project`
- `edit_item`
- `batch_add_items`
- `create_tag`

Destructive operations blocked in read-only mode:

- `remove_item`
- `batch_remove_items`

## Live Data Sample

Example database stats from the successful smoke test:

```text
972 total tasks
643 active tasks
106 projects
97 active projects
14 folders
148 tags
63 overdue tasks
51 next actions
8 flagged tasks
10 inbox tasks
```

The smoke test also confirmed real read output from inbox, today, flagged, stats, perspective, project, tag, folder, project-query, and database-dump paths.

## Issue Found And Fixed

The read-only sweep caught a template-resource decoding bug: encoded project and perspective names with spaces were passed through literally, so a resource such as `omnifocus://project/Live%20better` returned `[]` even though `query_omnifocus` found tasks for `Live better`.

Fix:

- Decode template resource names before querying in `src/resources/project.ts`.
- Decode template resource names before querying in `src/resources/perspective.ts`.
- Add regression coverage in `src/resources/resourceDecoding.test.ts`.

After the fix, `omnifocus://project/Live%20better` returned the expected project tasks through MCP read-only mode.

## Verification Commands

```sh
npm test
npm run build
```

Both commands passed after the read-only policy and resource-decoding changes.
