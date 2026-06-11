# OmniFocus MCP Server

[![npm version](https://img.shields.io/npm/v/omnifocus-mcp.svg)](https://www.npmjs.com/package/omnifocus-mcp)
[![CI](https://github.com/themotionmachine/OmniFocus-MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/themotionmachine/OmniFocus-MCP/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server that connects OmniFocus to Claude and other MCP-compatible AI assistants.

![OmniFocus MCP](assets/omnifocus-mcp-logo.png)

## Overview

This server bridges AI assistants and your OmniFocus database. Through natural conversation, an assistant can query, create, edit, and remove tasks and projects — including bulk operations. Some things you can do with it:

- Translate a syllabus PDF into a fully specified project with tasks, tags, defer dates, and due dates
- Turn a meeting transcript into a list of actions
- Audit and reorganize your tags, projects, and folders conversationally
- Create visualizations of your tasks, projects, and tags
- Process dozens of items in a single batch operation

## Quick Start

### Prerequisites

- macOS with [OmniFocus](https://www.omnigroup.com/omnifocus) installed
- Node.js 20 or later (for `npx`)

The first time the server talks to OmniFocus, macOS will ask you to allow automation access. Grant it once and you're set.

### Claude Desktop

Add the server to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp"]
    }
  }
}
```

Then restart Claude Desktop.

### Claude Code

```bash
claude mcp add omnifocus -- npx -y omnifocus-mcp
```

Other MCP clients work the same way: launch `npx -y omnifocus-mcp` over stdio.

## Example Conversations

**Targeted queries:**

> "Show me all my flagged tasks due this week"
>
> "What are my next actions in the Work folder?"
>
> "Count how many tasks are in each project"

**Reorganizing:**

> "I want every task to have an energy level tag. Show me a list of all the tasks that don't have one and your suggestions for what tag to add. I'll make any changes I think are appropriate. Then make the changes in OmniFocus."

**Capturing from anywhere:**

> "Ok, thanks for the detailed explanation of why the rule of law is important. Add a recurring task to my activism project that reminds me to call my representative weekly. Include a summary of this conversation in the notes field."

**Working with perspectives:**

> "What perspectives do I have available?"
>
> "Show me what's in my Inbox perspective"

**Processing transcripts or PDFs:**

> "I'm pasting in the transcript from today's meeting. Please analyze it and create tasks in OmniFocus for any action items assigned to me. Put them in my 'Product Development' project."

## Tools

The server provides 12 tools. Optional parameters are marked.

### `query_omnifocus`

Query tasks, projects, or folders with targeted filters — much faster and lighter than dumping the whole database. See [QUERY_TOOL_REFERENCE.md](QUERY_TOOL_REFERENCE.md) for the full reference and [QUERY_TOOL_EXAMPLES.md](QUERY_TOOL_EXAMPLES.md) for worked examples.

| Parameter | Description |
|---|---|
| `entity` | What to query: `tasks`, `projects`, or `folders` |
| `filters` *(optional)* | Combine with AND logic; array filters (`tags`, `status`) use OR within the array |
| `fields` *(optional)* | Only return the listed fields — keeps responses small |
| `limit`, `sortBy`, `sortOrder` *(optional)* | Shape the result list |
| `includeCompleted` *(optional)* | Include completed/dropped items (default: false) |
| `summary` *(optional)* | Return only the match count |

Available filters:

- **Containers**: `projectName` (case-insensitive partial match; `"inbox"` targets the inbox), `projectId`, `folderId` (includes subfolders)
- **Names**: `taskName` (case-insensitive partial match)
- **Tags**: `tags` (exact match, case-sensitive)
- **Status**: `status` — tasks: `Next`, `Available`, `Blocked`, `DueSoon`, `Overdue`, `Completed`, `Dropped`; projects: `Active`, `OnHold`, `Done`, `Dropped`
- **Dates, forward-looking**: `dueWithin`, `deferredUntil`, `plannedWithin` (ranges), `dueOn`, `deferOn`, `plannedOn` (exact day). Accept a number of days, `"today"`, `"tomorrow"`, `"this week"`, `"next week"`, or an ISO date
- **Dates, backward-looking**: `addedWithin`, `addedOn`, `completedWithin`, `completedOn`, `droppedWithin`, `droppedOn` (completed/dropped filters require `includeCompleted: true`)
- **Flags & misc**: `flagged`, `inbox`, `hasNote`, `isRepeating`, `reviewDue` (projects only)

### `dump_database`

Get the complete state of your database. Use for comprehensive analysis; prefer `query_omnifocus` for anything targeted.

- `hideCompleted` *(optional)*: hide completed/dropped tasks (default: true)
- `hideRecurringDuplicates` *(optional)*: hide duplicate instances of recurring tasks (default: true)

### `add_omnifocus_task`

Create a new task.

- `name`
- `projectName` *(optional)*: project to add the task to (defaults to inbox)
- `parentTaskId` / `parentTaskName` *(optional)*: nest under an existing task
- `note`, `dueDate`, `deferDate`, `plannedDate`, `flagged`, `estimatedMinutes`, `tags` *(all optional)*

### `add_project`

Create a new project.

- `name`
- `folderName` *(optional)*: folder to place the project in
- `sequential` *(optional)*: whether tasks must be completed in order
- `note`, `dueDate`, `deferDate`, `flagged`, `estimatedMinutes`, `tags` *(all optional)*

### `edit_item`

Edit an existing task or project. Also the way to **move** items — set `newProjectName` to move a task into a project, or to `""`/`"inbox"` to send it to the inbox.

- `id` or `name`: which item to edit (id takes precedence)
- `itemType`: `task` or `project`
- Common: `newName`, `newNote`, `newDueDate`, `newDeferDate`, `newFlagged`, `newEstimatedMinutes` (dates in ISO format; empty string clears)
- Tasks: `newStatus` (`incomplete`, `completed`, `dropped`, `skipped` — skipped only for repeating tasks), `addTags`, `removeTags`, `replaceTags`, `newProjectName`, `newPlannedDate`
- Projects: `newProjectStatus` (`active`, `completed`, `dropped`, `onHold`), `newFolderName`, `newSequential`, `markReviewed` (sets the next review date based on the project's review interval)

### `remove_item`

Remove a task or project.

- `id` or `name`: which item to remove
- `itemType`: `task` or `project`

### `batch_add_items`

Create multiple tasks and projects in one operation. Each item accepts the same fields as `add_omnifocus_task` / `add_project`, plus `type` (`task` or `project`) and optional hierarchy helpers:

- `tempId`: a temporary ID other items in the same batch can reference
- `parentTempId`: nest this item under another batch item's `tempId`

```json
{
  "items": [
    { "type": "project", "name": "My Project", "tempId": "proj1" },
    { "type": "task", "name": "First task", "parentTempId": "proj1" },
    { "type": "task", "name": "Parent task", "parentTempId": "proj1", "tempId": "t1" },
    { "type": "task", "name": "Subtask", "parentTempId": "t1" }
  ]
}
```

### `batch_remove_items`

Remove multiple tasks or projects in one operation. Each item takes `id` or `name`, plus `itemType`.

### `list_perspectives`

List available perspectives, both built-in and custom (custom perspectives are an OmniFocus Pro feature).

- `includeBuiltIn`, `includeCustom` *(optional, default: true)*

### `get_perspective_view`

Get the items visible in a named perspective.

- `perspectiveName`: e.g. `Inbox`, `Flagged`, or a custom perspective name
- `limit` *(optional, default: 100)*, `includeMetadata` *(optional)*, `fields` *(optional)*

### `list_tags`

List all tags with their hierarchy, active status, and task counts.

- `includeDropped` *(optional, default: false)*

### `create_tag`

Create a tag, optionally nested under an existing parent.

- `name`
- `parentTagName` / `parentTagID` *(optional; ID takes precedence)*

## Resources

Resources let MCP clients attach OmniFocus data to a conversation as context, without tool calls. In Claude Code, type `@` to browse them; Claude Desktop and other resource-aware clients can attach them directly. All resources return JSON.

| URI | Description |
|---|---|
| `omnifocus://inbox` | Current inbox items |
| `omnifocus://today` | Today's agenda — due today, planned for today, and overdue |
| `omnifocus://flagged` | All flagged items |
| `omnifocus://stats` | Database statistics (task counts, overdue, flagged, etc.) |
| `omnifocus://project/{name}` | Tasks in a specific project |
| `omnifocus://perspective/{name}` | Items visible in a named perspective |

The two template resources support listing all available values and autocompleting the `{name}` parameter.

## Server Instructions & Logging

**Instructions:** during the MCP handshake the server sends usage guidance to the client — tool-selection advice (prefer `query_omnifocus` over `dump_database`), filter tips, and the resource catalog. No configuration needed.

**Logging:** the server emits structured logs via the MCP logging protocol. Clients can adjust verbosity with `logging/setLevel` (`debug`, `info`, `warning`, `error`, ...). Script execution timing and errors are logged automatically.

## How It Works

The server communicates with OmniFocus through `osascript`, using JXA (JavaScript for Automation) and OmniFocus's embedded Omni Automation (OmniJS) where appropriate. It's built on the official [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) and talks to clients over stdio.

## Roadmap

- MCP `prompt` support
- Manipulating notifications for projects and tasks
- See the [GitHub issues](https://github.com/themotionmachine/OmniFocus-MCP/issues) for feature requests and known issues

## Contributing

Contributions are welcome! Please feel free to submit a pull request. CI runs type checking, unit tests, and a build on every PR.

```bash
npm install
npm test            # unit tests
npm run build       # compile to dist/
npm run test:integration  # requires OmniFocus; creates and removes TEST:-prefixed items
```

## License

MIT
