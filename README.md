# OmniFocus MCP Server

A Model Context Protocol (MCP) server that integrates with OmniFocus to enable Claude (or other MCP-compatible clients) to interact with your tasks and projects.

![OmniFocus MCP](assets/omnifocus-mcp-logo.png)

## Overview

This MCP server creates a bridge between AI assistants (like Claude) and your OmniFocus task management system. It gives AI models the ability to view, create, edit, and remove tasks and projects in your OmniFocus database through natural language conversations.
Some ways you could use it: 

- Translate the PDF of a syllabus into a fully specificed project with tasks, tags, defer dates, and due dates.
- Turn a meeting transcript into a list of actions
- Create visualizations of your tasks, projects, and tags
- Process multiple tasks or projects in a single operation
- Bulk manage your OmniFocus items efficiently

**Known Issues**
- Dump_database tool currently fails for very large omnifocus databases. 

## Roadmap
- Enable the client to interact with perspectives
- Benefit from MCP `resource` and `prompt` features
- Add support for the new `planned` date type in Omnifocus 4.7


## 🚀 Quick Start

### Prerequisites
- macOS with OmniFocus installed

### Connecting to Claude

1. In Claude Desktop, add this MCP server to your configuration file at:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

2. Add the following configuration:
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

3. Restart Claude Desktop

## Use Cases

### Efficient Task Queries
Use the new `query_omnifocus` tool for fast, targeted searches:
> "Show me tasks due today"
> "Get all flagged items in my Work project"  
> "Count how many tasks are in each project"

### Reorganize your projects, tasks, and tags
> "I want every task to have an energy level tag. Show me a list of all the tasks that don't have an energy level tag and your suggestions for what tag to add. I'll make any changes I think are appropriate. Then make the changes in OmniFocus."

### Add tasks from any conversation

> "Ok, thanks for the detailed explanation of why the rule of law is important. Add a recurring task to my activism project that reminds me to call my representative weekly. Include a summary of this conversation in the notes field."

### Quick, Virtual Perspectives

Get a summary of your current tasks and manage them conversationally:

> "Show me all my flagged tasks due this week"

Or create custom views:

> "What are my next actions in the Work folder?" 

### Process Transcripts or PDFs

Extract action items from meeting transcripts, academic research articles, or notes:

> "I'm pasting in the transcript from today's meeting. Please analyze it and create tasks in OmniFocus for any action items assigned to me. Put them in my 'Product Development' project."


## 🔧 Available Tools

The server currently provides these tools:

### `query_omnifocus` ⭐ NEW
Efficiently query your OmniFocus database with powerful filters. Get specific tasks, projects, or folders without loading the entire database.

Key Features:
- **Filter by multiple criteria**: project, tags, status, due dates, flags, and more
- **Request specific fields**: Reduce response size by only getting the data you need
- **Sort and limit results**: Control the output format
- **Much faster than dump_database** for targeted queries

Common Uses:
```
"Show me all flagged tasks due this week"
"Get next actions from my Work project"
"Count tasks in each project" (use with summary: true)
"Find all tasks deferred until tomorrow"
```

Parameters:
- `entity`: Type to query ('tasks', 'projects', or 'folders')
- `filters`: (Optional) Narrow results by project, tags, status, dates, etc.
- `fields`: (Optional) Specific fields to return (id, name, dueDate, etc.)
- `limit`: (Optional) Maximum items to return
- `sortBy`: (Optional) Field to sort by
- `includeCompleted`: (Optional) Include completed items (default: false)
- `summary`: (Optional) Return only count instead of full details

### `dump_database`
Gets the complete current state of your OmniFocus database. Best for comprehensive analysis or when you need everything.

Parameters:
- `hideCompleted`: (Optional) Hide completed/dropped tasks (default: true)
- `hideRecurringDuplicates`: (Optional) Hide duplicate recurring tasks (default: true)

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

### `batch_remove_items`
Remove multiple tasks or projects from OmniFocus in a single operation.

Parameters:
- `items`: Array of items to remove, where each item can be:
  - `id`: (Optional) The ID of the item to remove
  - `name`: (Optional) The name of the item to remove
  - `itemType`: The type of item ('task' or 'project')

## Development

Documentation to follow.

## How It Works

This server uses AppleScript to communicate with OmniFocus, allowing it to interact with the application's native functionality. The server is built using the Model Context Protocol SDK, which provides a standardized way for AI models to interact with external tools and systems.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.