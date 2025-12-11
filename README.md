# OmniFocus MCP Server Pro

> **⚠️ WORK IN PROGRESS - NOT FOR PRODUCTION USE**
>
> This project is undergoing a major refactor and expansion. The codebase
> is actively being restructured and many features are incomplete or
> untested. **Do not use this in production environments.** Check the
> roadmap below for current progress.

A professional-grade Model Context Protocol (MCP) server that provides
comprehensive OmniFocus integration with 62 automation tools. Built for
power users who need advanced features like Perspectives management,
Review system, TaskPaper import/export, Forecast, Window/UI control,
and bulk operations.

![OmniFocus MCP](assets/omnifocus-mcp-logo.png)

---

## Development Roadmap

This project is being expanded from 22 to 86 tools across 20
implementation phases.

### Current Progress

| Phase | Category                       | Tools | Status   |
| ----- | ------------------------------ | ----- | -------- |
| 0     | Tooling Setup                  | -     | Complete |
| 0.5   | MCP SDK Upgrade to 1.24.x      | -     | Complete |
| 1     | Folders                        | 5     | Complete |
| 2     | Tags                           | 6     | Complete |
| 3     | **Tasks (Enhanced)**           | 4     | Pending  |
| 4     | **Projects**                   | 6     | Pending  |
| 5     | **Review System**              | 3     | Pending  |
| 6     | Notifications                  | 5     | Pending  |
| 7     | Repetition                     | 5     | Pending  |
| 8     | **Perspectives**               | 5     | Pending  |
| 9     | **Search & Database**          | 10    | Pending  |
| 10    | **Bulk Operations**            | 6     | Pending  |
| 11    | Attachments & Linked Files     | 5     | Pending  |
| 12    | **TaskPaper Import/Export**    | 3     | Pending  |
| 13    | **Task Status & Completion**   | 6     | Pending  |
| 14    | **Window & UI Control** (OF4)  | 8     | Pending  |
| 15    | **Forecast**                   | 3     | Pending  |
| 16    | **Settings**                   | 2     | Pending  |
| 17    | **Deep Links & URLs** (OF4.5)  | 3     | Pending  |
| 18    | **Pasteboard & Clipboard**     | 3     | Pending  |
| 19    | **Document & Sync**            | 4     | Pending  |
| 20    | **MCP Optimization**           | 8     | Pending  |

### Key New Features

Bold items in the table above represent new capabilities:

- **Tasks (Enhanced)** - Dedicated list/get, planned date (v4.7+), append note
- **Projects** - Full CRUD + move, parallel to Folders/Tags phases
- **Review System** - Get projects for review, mark reviewed, set intervals
- **Perspectives** - List, get details, switch perspectives, export configs
- **Search & Database** - Smart search across all item types, DB utilities
- **Bulk Operations** - Move, duplicate, convert, and batch update items
- **TaskPaper** - Import/export TaskPaper format for interoperability
- **Window & UI Control** - Reveal, expand, collapse, focus items (OF4+)
- **Forecast** - Get forecast data and navigate to specific days
- **Deep Links & URLs** - Get/resolve OmniFocus URLs (OF4.5+)
- **Pasteboard** - Copy/paste tasks between apps
- **Document & Sync** - Trigger sync, create windows/tabs, export database
- **MCP Optimization** - Dynamic toolsets, TOON format, lazy schemas, protocol-native logging (75-160x token reduction)

---

## Overview

This MCP server creates a bridge between AI assistants (like Claude) and
your OmniFocus task management system. It gives AI models the ability to
view, create, edit, and remove tasks and projects in your OmniFocus
database through natural language conversations.

Some ways you could use it:

- Translate the PDF of a syllabus into a fully specified project with
  tasks, tags, defer dates, and due dates.
- Turn a meeting transcript into a list of actions
- Create visualizations of your tasks, projects, and tags
- Process multiple tasks or projects in a single operation
- Bulk manage your OmniFocus items efficiently

### Known Issues

- Dump_database tool currently fails for very large omnifocus databases.

## 🚀 Quick Start

### Prerequisites

- macOS with OmniFocus installed

### Connecting to Claude

1. In Claude Desktop, add this MCP server to your configuration file at:

   ```text
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

1. Add the following configuration:

   ```json
   {
     "mcpServers": {
       "omnifocus-pro": {
         "command": "npx",
         "args": ["-y", "omnifocus-mcp-pro"]
       }
     }
   }
   ```

1. Restart Claude Desktop

## Use Cases

### Efficient Task Queries

Use the new `query_omnifocus` tool for fast, targeted searches:

> "Show me tasks due today"
> "Get all flagged items in my Work project"
> "Count how many tasks are in each project"

### Reorganize your projects, tasks, and tags

> "I want every task to have an energy level tag. Show me a list of all
> the tasks that don't have an energy level tag and your suggestions for
> what tag to add. I'll make any changes I think are appropriate. Then
> make the changes in OmniFocus."

### Add tasks from any conversation

> "Ok, thanks for the detailed explanation of why the rule of law is
> important. Add a recurring task to my activism project that reminds me
> to call my representative weekly. Include a summary of this
> conversation in the notes field."

### Quick, Virtual Perspectives

Get a summary of your current tasks and manage them conversationally:

> "Show me all my flagged tasks due this week"

Or create custom views:

> "What are my next actions in the Work folder?"

### Work with OmniFocus Perspectives

List and view your perspectives:

> "What perspectives do I have available?"
> "Show me what's in my Inbox perspective"
> "Get the flagged items from my current perspective"

### Process Transcripts or PDFs

Extract action items from meeting transcripts, academic research
articles, or notes:

> "I'm pasting in the transcript from today's meeting. Please analyze it
> and create tasks in OmniFocus for any action items assigned to me. Put
> them in my 'Product Development' project."

## 🔧 Available Tools

The server currently provides these tools:

### `query_omnifocus` ⭐ NEW

Efficiently query your OmniFocus database with powerful filters. Get
specific tasks, projects, or folders without loading the entire database.

Key Features:

- **Filter by multiple criteria**: project, tags, status, due dates, etc.
- **Request specific fields**: Reduce response size by getting only needed data
- **Sort and limit results**: Control the output format
- **Much faster than dump_database** for targeted queries

Common Uses:

```text
"Show me all flagged tasks due this week"
"Get next actions from my Work project"
"Count tasks in each project" (use with summary: true)
"Find all tasks deferred until tomorrow"
```

Parameters:

- `entity`: Type to query ('tasks', 'projects', or 'folders')
- `filters`: (Optional) Narrow results by project, tags, status, dates
- `fields`: (Optional) Specific fields to return (id, name, dueDate, etc.)
- `limit`: (Optional) Maximum items to return
- `sortBy`: (Optional) Field to sort by
- `includeCompleted`: (Optional) Include completed items (default: false)
- `summary`: (Optional) Return only count instead of full details

### `dump_database`

Gets the complete current state of your OmniFocus database. Best for
comprehensive analysis or when you need everything.

Parameters:

- `hideCompleted`: (Optional) Hide completed/dropped tasks (default: true)
- `hideRecurringDuplicates`: (Optional) Hide duplicate recurring tasks

### `add_omnifocus_task`

Add a new task to OmniFocus.

Parameters:

- `name`: The name of the task
- `projectName`: (Optional) The name of the project to add the task to
- `note`: (Optional) Additional notes for the task
- `dueDate`: (Optional) The due date of the task in ISO format
- `deferDate`: (Optional) The defer date of the task in ISO format
- `flagged`: (Optional) Whether the task is flagged or not
- `estimatedMinutes`: (Optional) Estimated time to complete the task
- `tags`: (Optional) Tags to assign to the task
- `parentTaskId`: (Optional) Create under an existing parent task by ID
- `parentTaskName`: (Optional) Create under first matching parent task

### `add_project`

Add a new project to OmniFocus.

Parameters:

- `name`: The name of the project
- `folderName`: (Optional) The name of the folder to add the project to
- `note`: (Optional) Additional notes for the project
- `dueDate`: (Optional) The due date of the project in ISO format
- `deferDate`: (Optional) The defer date of the project in ISO format
- `flagged`: (Optional) Whether the project is flagged or not
- `estimatedMinutes`: (Optional) Estimated time to complete the project
- `tags`: (Optional) Tags to assign to the project
- `sequential`: (Optional) Whether tasks in the project should be sequential

### `remove_item`

Remove a task or project from OmniFocus.

Parameters:

- `id`: (Optional) The ID of the task or project to remove
- `name`: (Optional) The name of the task or project to remove
- `itemType`: The type of item to remove ('task' or 'project')

### `edit_item`

Edit a task or project in OmniFocus.

Parameters:

- `id`: (Optional) The ID of the task or project to edit
- `name`: (Optional) The name of the task or project to edit
- `itemType`: The type of item to edit ('task' or 'project')
- Various parameters for editing properties

### `batch_add_items`

Add multiple tasks or projects to OmniFocus in a single operation.

Parameters:

- `items`: Array of items to add, where each item can be:
  - `type`: The type of item ('task' or 'project')
  - `name`: The name of the item
  - `note`: (Optional) Additional notes
  - `dueDate`: (Optional) Due date in ISO format
  - `deferDate`: (Optional) Defer date in ISO format
  - `flagged`: (Optional) Whether the item is flagged
  - `estimatedMinutes`: (Optional) Estimated completion time
  - `tags`: (Optional) Array of tags
  - `projectName`: (Optional) For tasks: the project to add to
  - `folderName`: (Optional) For projects: the folder to add to
  - `sequential`: (Optional) For projects: whether tasks are sequential
  - `parentTaskId`: (Optional, tasks): Parent task by ID
  - `parentTaskName`: (Optional, tasks): Parent task by name (fallback)
  - `tempId`: (Optional, tasks): Temporary ID for within-batch references
  - `parentTempId`: (Optional, tasks): Reference to another item's tempId
  - `hierarchyLevel`: (Optional, tasks): Ordering hint (0=root, 1=child)

Examples:

```json
{
  "items": [
    {
      "type": "task",
      "name": "Parent",
      "projectName": "My Project",
      "tempId": "p1"
    },
    { "type": "task", "name": "Child A", "parentTempId": "p1" },
    { "type": "task", "name": "Child B", "parentTempId": "p1" }
  ]
}
```

### `batch_remove_items`

Remove multiple tasks or projects from OmniFocus in a single operation.

Parameters:

- `items`: Array of items to remove, where each item can be:
  - `id`: (Optional) The ID of the item to remove
  - `name`: (Optional) The name of the item to remove
  - `itemType`: The type of item ('task' or 'project')

### `list_perspectives` ⭐ NEW

List all available perspectives in OmniFocus, including built-in and
custom perspectives.

Parameters:

- `includeBuiltIn`: (Optional) Include built-in perspectives like Inbox,
  Projects, Tags (default: true)
- `includeCustom`: (Optional) Include custom perspectives (Pro feature)

Returns:

- List of perspectives with their names, types, and modification status

### `get_perspective_view` ⭐ NEW

Get the items visible in the current OmniFocus perspective. Shows what
tasks and projects are displayed.

Parameters:

- `perspectiveName`: Name of the perspective to view (e.g., 'Inbox')
- `limit`: (Optional) Maximum number of items to return (default: 100)
- `includeMetadata`: (Optional) Include additional metadata (default: true)
- `fields`: (Optional) Specific fields to include in the response

Note: This tool returns the content of the current perspective window.
Due to OmniJS limitations, it cannot programmatically switch perspectives.

### `list_folders`

List folders from the OmniFocus database with optional filtering.

Parameters:

- `status`: (Optional) Filter by folder status ('active' or 'dropped')
- `parentId`: (Optional) Filter to children of a specific folder ID
- `includeChildren`: (Optional) Include all nested descendants (default: false)

Returns:

- Array of folders with id, name, status, and parentId

### `add_folder`

Create a new folder in the OmniFocus hierarchy.

Parameters:

- `name`: The name of the new folder (required, non-empty after trim)
- `position`: (Optional) Where to place the folder:
  - `placement`: 'beginning', 'ending', 'before', or 'after'
  - `relativeTo`: Folder ID (required for before/after, optional for
    beginning/ending to specify parent)

Defaults to library ending if position is omitted.

### `edit_folder`

Edit folder properties (name and/or status) in OmniFocus.

Parameters:

- `id`: (Optional) The folder's unique identifier
- `name`: (Optional) The folder's name (used if id not provided)
- `newName`: (Optional) New name for the folder (trimmed, must be non-empty)
- `newStatus`: (Optional) New status ('active' or 'dropped')

Note: At least one of `id` or `name` must be provided for identification.
At least one of `newName` or `newStatus` must be provided.
Returns disambiguation error if multiple folders match the name.

### `remove_folder`

Remove a folder and all its contents from OmniFocus.

Parameters:

- `id`: (Optional) The folder's unique identifier
- `name`: (Optional) The folder's name (used if id not provided)

Note: This permanently deletes the folder and ALL nested folders, projects,
and tasks. Returns disambiguation error if multiple folders match the name.

### `move_folder`

Move a folder to a new location in the OmniFocus hierarchy.

Parameters:

- `id`: (Optional) The folder's unique identifier
- `name`: (Optional) The folder's name (used if id not provided)
- `position`: Where to move the folder (required):
  - `placement`: 'beginning', 'ending', 'before', or 'after'
  - `relativeTo`: Folder ID (required for before/after, optional for
    beginning/ending)

Note: Prevents circular moves (folder into its own descendant). Returns
disambiguation error if multiple folders match the name.

### `list_tags`

List tags from the OmniFocus database with optional filtering.

Parameters:

- `status`: (Optional) Filter by tag status ('active', 'onHold', or 'dropped')
- `parentId`: (Optional) Filter to children of a specific tag ID
- `includeChildren`: (Optional) Include all nested descendants (default: true)

Returns:

- Array of tags with id, name, status, parentId, allowsNextAction, and taskCount

### `create_tag`

Create a new tag in OmniFocus.

Parameters:

- `name`: The name of the new tag (required, non-empty after trim)
- `parentId`: (Optional) Parent tag ID to create a nested tag
- `position`: (Optional) Where to place the tag:
  - `placement`: 'beginning', 'ending', 'before', or 'after'
  - `relativeTo`: Tag ID (required for before/after)
- `allowsNextAction`: (Optional) Whether tasks with this tag can be next
  actions (default: true)

Returns:

- The ID and name of the newly created tag

### `edit_tag`

Edit tag properties in OmniFocus.

Parameters:

- `id`: (Optional) The tag's unique identifier
- `name`: (Optional) The tag's name (used if id not provided)
- `newName`: (Optional) New name for the tag
- `status`: (Optional) New status ('active', 'onHold', or 'dropped')
- `allowsNextAction`: (Optional) Whether tasks can be next actions

Note: At least one of `id` or `name` must be provided for identification.
At least one of `newName`, `status`, or `allowsNextAction` must be provided.
Returns disambiguation error if multiple tags match the name.

### `delete_tag`

Delete a tag from OmniFocus.

Parameters:

- `id`: (Optional) The tag's unique identifier
- `name`: (Optional) The tag's name (used if id not provided)

Note: Deleting a tag removes it from all tasks but does not delete the tasks.
Child tags are also deleted. Returns disambiguation error if multiple tags
match the name.

### `assign_tags`

Assign tags to multiple tasks in a single operation.

Parameters:

- `taskIds`: Array of task IDs to assign tags to (required, at least one)
- `tagIds`: Array of tag IDs to assign (required, at least one)

Returns:

- `results`: Array of per-task results with success/failure status

Note: This operation is idempotent - assigning a tag already on a task
succeeds silently. Continues processing remaining tasks if one fails.

### `remove_tags`

Remove tags from multiple tasks in a single operation.

Parameters:

- `taskIds`: Array of task IDs to remove tags from (required, at least one)
- `tagIds`: (Optional) Array of specific tag IDs to remove
- `clearAll`: (Optional) If true, remove ALL tags from the tasks (default: false)

Note: Must provide either `tagIds` OR set `clearAll: true`, but not both.
This operation is idempotent - removing a tag not on a task succeeds silently.
Continues processing remaining tasks if one fails.

Returns:

- `results`: Array of per-task results with success/failure status

## Development

### Prerequisites

- **Node.js 24+** required
- **pnpm** recommended (npm/yarn also work)
- macOS with OmniFocus installed (for integration testing)

### Quick Setup

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Start the server
pnpm start
```

### Development Commands

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `pnpm build`         | Build with tsup (ESM + CJS, sourcemaps, types)   |
| `pnpm dev`           | Watch mode with tsx (auto-rebuild on changes)    |
| `pnpm start`         | Run the built server                             |
| `pnpm test`          | Run tests with Vitest                            |
| `pnpm test:watch`    | Run tests in watch mode                          |
| `pnpm test:coverage` | Run tests with V8 coverage report                |
| `pnpm lint`          | Check code with Biome                            |
| `pnpm lint:fix`      | Fix lint issues automatically                    |
| `pnpm format`        | Format code with Biome                           |
| `pnpm typecheck`     | TypeScript type checking without emit            |

### Tooling Stack

- **[tsup](https://tsup.egoist.dev/)** - Fast TypeScript bundler powered by
  esbuild. Generates ESM, CJS, and type definitions
- **[Vitest](https://vitest.dev/)** - Vite-native test framework with V8
  coverage
- **[Biome](https://biomejs.dev/)** - Fast linter and formatter (replaces
  ESLint + Prettier)
- **[tsx](https://tsx.is/)** - TypeScript execution for development watch mode
- **[Husky](https://typicode.github.io/husky/)** - Git hooks for pre-commit
  linting

### Project Structure

```text
src/
├── server.ts              # Entry point, MCP server setup
├── tools/
│   ├── definitions/       # Tool schemas and MCP handlers
│   └── primitives/        # Core business logic
├── utils/
│   ├── omnifocusScripts/  # JXA scripts (copied to dist on build)
│   └── scriptExecution.ts # JXA execution utilities
└── omnifocustypes.ts      # TypeScript types for OmniFocus

tests/                     # Test files
dist/                      # Build output (gitignored)
```

### Testing JXA Scripts

JXA (JavaScript for Automation) scripts cannot be tested in CI as they require
macOS with OmniFocus. Test JXA changes manually:

1. Open Script Editor.app on macOS
2. Set language to JavaScript (View → Show Log, then choose JavaScript)
3. Copy your JXA code and run it
4. Verify output before integrating

See `CLAUDE.md` for detailed JXA development guidelines.

### Specification Documentation

This project follows spec-driven development. Each phase has detailed
documentation in the `/specs/` directory:

- `spec.md` - Feature requirements and user stories
- `plan.md` - Implementation strategy and architecture
- `tasks.md` - Task breakdown and progress tracking
- `research.md` - API research and technical decisions
- `quickstart.md` - Developer implementation guide

See `/specs/001-tooling-modernization/` and `/specs/002-folder-tools/` for
examples.

## How It Works

This server uses Omni Automation JavaScript (OmniJS) to communicate with
OmniFocus, allowing it to interact with the application's native
functionality. The server is built using the Model Context Protocol SDK,
which provides a standardized way for AI models to interact with external
tools and systems.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
