---
description: RepoPrompt MCP context management, file editing, and chat delegation
alwaysApply: true
---

# RepoPrompt MCP Usage Guide

## Overview

RepoPrompt MCP provides powerful context management and file editing capabilities
for working with codebases. It excels at curating file selections, applying
precise edits, and delegating work to specialized chat models.

**Key Value Propositions:**

- **14 Specialized MCP Tools** for file operations, search, code structure,
  context management, chat, and discovery
- **Token-Efficient Context** - Use codemaps and slices to include 10x more
  files without exceeding token budgets
- **Multi-Repository Support** - Analyze and search across multiple repositories
  in a single workspace
- **AI-Powered Discovery** - Context Builder uses tree-sitter parsing to
  understand code relationships and select relevant files automatically

**Philosophy:** RepoPrompt enhances rather than replaces your workflow. Use it
alongside Claude Code for maximum productivity with specialized tools working
in harmony.

## Tool Categories

RepoPrompt provides 14 MCP tools organized into four categories:

| Category | Tools |
|----------|-------|
| **Selection & Context** | `manage_selection`, `workspace_context`, `prompt`, `context_builder` |
| **File Operations** | `get_file_tree`, `file_search`, `read_file`, `get_code_structure`, `file_actions`, `edit_file` |
| **Chat & Models** | `chat_send`, `chats`, `list_models` |
| **Workspaces** | `manage_workspaces` |

## Core Tools

### Selection Management (`manage_selection`)

Controls which files are loaded into context. **This is the foundation for all
other operations.**

**Operations:**

- `get` - View current selection (views: summary, files, content, codemaps)
- `add` - Add files/folders to selection
- `remove` - Remove files from selection
- `set` - Replace entire selection (mode controls behavior)
- `clear` - Clear all selections
- `preview` - Preview changes before committing
- `promote` - Upgrade codemap-only file to full content
- `demote` - Downgrade full file to codemap-only

**Modes (Critical for Token Efficiency):**

- `full` - Complete file content (default) - for files being actively edited
- `slices` - Specific line ranges only - for targeted context from large files
- `codemap_only` - Just function/type signatures - **10x token savings** for
  reference files you need to understand but won't edit

**op=set Semantics:**

- `mode=full`: Clears selection, replaces with provided paths (complete reset)
- `mode=slices`: File-scoped - adds paths without clearing, replaces slice
  definitions only for specified files
- `mode=codemap_only`: Replaces codemap-only files, disables auto-management

**Automatic Codemap Management:**

- When selecting files with `mode=full` or `slices`, auto-adds codemaps for
  related/dependency files
- Manual codemap operations disable auto-management until you clear
- Prefer auto-management; only manually manage when you need precise control

**Best Practices:**

```bash
# Always use absolute paths for multi-root workspaces
manage_selection op=set paths=["/absolute/path/to/file.ts"]

# Preview before committing large selections
manage_selection op=preview paths=["/folder"] view=files

# Use slices for large files - include only relevant sections
manage_selection op=add slices=[{
  path: "file.ts",
  ranges: [{start_line: 10, end_line: 50, description: "Auth logic"}]
}]

# Use codemap_only for reference files (10x token savings)
manage_selection op=add paths=["utils.ts"] mode=codemap_only

# Promote codemap to full when you need to edit
manage_selection op=promote paths=["utils.ts"]

# Demote back when done editing
manage_selection op=demote paths=["utils.ts"]
```

### File Editing (`edit_file` / search-replace operations)

Precise search/replace edits with diff preview.

**Modes:**

- Single replacement: `{path, search, replace}`
- Multiple edits: `{path, edits: [{search, replace}, ...]}`
- Full rewrite: `{path, rewrite: "content", on_missing: "create"}`

**Options:**

- `verbose: true` - Show diff preview (always recommended)
- `all: true` - Replace all occurrences (default: false, first match only)
- `on_missing: "create"` - Create file if it doesn't exist (with rewrite)

**Best Practices:**

```bash
# Always use verbose=true to see diff before changes applied
edit path="file.ts" search="old" replace="new" verbose=true

# Use all=true for global replacements (renaming, etc.)
edit path="file.ts" search="oldName" replace="newName" all=true

# Batch related edits in one call for atomicity
edit path="file.ts" edits=[
  {search: "old1", replace: "new1"},
  {search: "old2", replace: "new2"}
]

# Create new file with content
edit path="new-file.ts" rewrite="content here" on_missing=create
```

### Context Snapshot (`workspace_context`)

Get comprehensive view of current workspace state.

**Include options:** prompt, selection, code, files, tree, tokens

**Use for:**

- Understanding current selection before operations
- Checking token counts before adding more files
- Getting full context snapshot for complex tasks
- Verifying auto-codemap additions

**Example:**

```bash
# Quick token check
workspace_context include=["selection", "tokens"]

# Full snapshot for complex planning
workspace_context include=["prompt", "selection", "code", "tree", "tokens"]
```

### Context Builder (`context_builder`)

AI-powered intelligent codebase exploration for complex tasks. Uses tree-sitter
parsing and parallel processing to understand code relationships at a deeper
level.

**Response types:**

- `plan` - Generate implementation plan alongside context
- `question` - Answer questions about the codebase
- `clarify` - Just build context, no response (returns selection only)

**Key Capability:** Delegates file selection to RepoPrompt's intelligent
context builder, automatically selecting files relevant to your task.

**Use for:**

- Starting complex tasks with optimal file context
- Understanding unfamiliar codebases
- Building context before delegation to chat models
- Exploring monorepos and multi-repository workspaces

**Note:** Thorough exploration takes 30s-5min depending on codebase size and
task complexity.

**Example:**

```bash
# Build context and get implementation plan
context_builder instructions="Implement user authentication" response_type=plan

# Just build context for manual review
context_builder instructions="Understand the auth system" response_type=clarify
```

### Chat Delegation (`chat_send`)

Send prompts to specialized RepoPrompt chat models for planning, implementation,
or review.

**Available Models (from `list_models`):**

- `Phd-Planner` - Extremely senior planner, thinks long for very detailed plans
- `Senior-Planner` - Everyday planning tasks (Plan mode)
- `Large-Context-Planner` - Handles very large context sizes (Plan mode)
- `Senior-Engineer` - Complex implementation (Plan, Edit modes)
- `Speed-Engineer` - Rapid code implementation of simple fixes (Edit mode)
- `Evaluator` - Discussion, ideation, review (Chat mode)

**Modes:**

- `chat` - Discussion, ideation, review
- `plan` - Architecture, change planning
- `edit` - Code implementation with diffs

**Session Management:**

- `new_chat: true` - Start new session
- `chat_id` - Continue existing conversation (preserves full context)
- `chat_name` - Highly recommended for session identification
- `selected_paths` - Override current selection for this message

**Best Practices:**

```bash
# Start new planning session with descriptive name
chat_send new_chat=true mode=plan model="Senior-Planner"
  message="Plan the implementation of feature X"
  chat_name="Feature X Planning"

# Continue existing conversation for implementation
chat_send chat_id="..." mode=edit model="Senior-Engineer"
  message="Now implement the first step"

# Override context for specific review
chat_send new_chat=true selected_paths=["file1.ts", "file2.ts"]
  message="Review these files for security issues"
```

### File Operations (`file_actions`)

Create, delete, or move files.

**Actions:** create, delete, move

**Parameters:**

- `action`: "create" | "delete" | "move"
- `path`: File path (absolute required for delete and multi-root)
- `content`: File content (for create)
- `new_path`: Destination path (for move)
- `if_exists`: "error" | "overwrite" (for create)

**Best Practices:**

- Use absolute paths for multi-root workspaces
- Use `if_exists: "overwrite"` to replace existing files
- Missing intermediate folders are auto-created
- New files are automatically added to selection

### Search (`file_search`)

Powerful regex-based search across codebase.

**Modes:**

- `auto` - Auto-detect path vs content search (default)
- `path` - Search file names/paths only
- `content` - Search file contents only
- `both` - Search both paths and content

**Key Parameters:**

- `pattern` - Search pattern (regex by default)
- `regex: false` - Use literal matching instead of regex
- `context_lines` - Lines of context before/after matches
- `max_results` - Limit results (default: 50)
- `whole_word` - Match whole words only
- `filter` - Extensions, exclude patterns, path filters

**Best Practices:**

```bash
# Content search with context
file_search pattern="functionName" mode=content context_lines=3

# Path search with wildcards
file_search pattern="*.test.ts" mode=path

# Limit results for large codebases
file_search pattern="import" max_results=20

# Literal search (no regex escaping needed)
file_search pattern="frame(minWidth:" regex=false
```

### Code Structure (`get_code_structure`)

Extract function/type signatures without full file content using tree-sitter
parsing.

**Scopes:**

- `paths` - Explicit file/directory paths (default)
- `selected` - Current selection only

**Use for:**

- Understanding API surface quickly
- Navigating large codebases
- Reducing token usage while maintaining context
- Getting function signatures before adding full files

**Example:**

```bash
# Get structure for directory
get_code_structure paths=["src/tools/"]

# Get structure for current selection
get_code_structure scope=selected
```

### Workspace Management (`manage_workspaces`)

Manage workspaces across RepoPrompt windows.

**Actions:** list, switch, create, delete, add_folder, remove_folder, list_tabs,
select_tab

**Tab Binding:** Use `select_tab` to pin your connection to a specific compose
tab for consistent context across multiple tool calls.

## Workflow Patterns

### Pattern 1: Targeted File Editing

```bash
1. manage_selection op=set paths=["target.ts"]
2. workspace_context include=["selection", "tokens"]  # Verify context
3. edit path="target.ts" search="..." replace="..." verbose=true
```

### Pattern 2: Multi-File Refactoring

```bash
1. file_search pattern="oldPattern" mode=content  # Find all occurrences
2. manage_selection op=set paths=[...files from search...]
3. For each file: edit with all=true
```

### Pattern 3: Delegated Implementation (Recommended for Complex Tasks)

```bash
1. context_builder instructions="Understand the auth system" response_type=plan
2. chat_send mode=plan model="Senior-Planner" message="Review this plan"
3. chat_send mode=edit model="Senior-Engineer" message="Implement step 1"
```

**From RepoPrompt docs:** "Example Workflow: Planning a microservices refactor.
Use Repo Prompt's MCP tools in Claude Code to search across repositories,
analyze code structures with codemaps, and use `chat_send mode="plan"` for
architectural guidance. Then apply changes with edits and review in
Repo Prompt's diff view."

### Pattern 4: Large Codebase Navigation

```bash
1. get_file_tree type=files mode=auto  # Overview
2. get_code_structure paths=["src/"]  # API signatures (token-efficient)
3. manage_selection op=add paths=["key-file.ts"] mode=full  # Files to edit
4. manage_selection op=add paths=["context-file.ts"] mode=codemap_only  # Reference
```

### Pattern 5: Three-Phase Development (Research → Plan → Implement)

Best practice pattern identified from community usage:

```bash
1. RESEARCH: Use file_search, get_code_structure, context_builder to map the repo
2. PLAN: Use chat_send mode=plan to draft a reviewable plan
3. IMPLEMENT: Execute scoped edits, validate at each step
```

## Token Management

RepoPrompt's key advantage is token-efficient context building:

| Mode | Token Usage | Use Case |
|------|-------------|----------|
| `full` | 100% | Files being actively edited |
| `slices` | ~10-30% | Large files, need specific sections |
| `codemap_only` | ~10% | Reference files, API understanding |

**Best Practices:**

- Check tokens with `workspace_context include=["tokens"]`
- Use `mode=codemap_only` for reference files - **10x more files in context**
- Use `slices` for large files (only include relevant sections)
- `demote` files you no longer need to edit
- Target ~25,000 tokens for efficient operations
- Let auto-codemap management handle dependencies

## Common Gotchas

1. **Paths must be absolute** for multi-root workspaces
2. **Selection persists** - clear when switching tasks
3. **Codemaps require supported languages** - tree-sitter must support the language
4. **Edits are exact match** - whitespace and formatting matter in search strings
5. **Chat context is separate** - use `selected_paths` to override for specific messages
6. **Auto-codemap management** - manual mode operations disable it until clear
7. **op=set with mode=slices** - doesn't clear, only replaces slices for specified files
8. **Tool name in content** - RepoPrompt rejects edits containing its tool names

## Integration with Claude Code

RepoPrompt complements Claude Code:

- **Use Claude Code for:** Daily coding, AI completions, file editing
- **Use RepoPrompt MCP for:** Complex context building, multi-repository analysis,
  delegating to specialized models, token-efficient large codebase work
- **Use Both Together:** Maximum productivity with each tool excelling at its
  specialty

The MCP connection provides Claude Code with RepoPrompt's sophisticated
capabilities without leaving your preferred editor workflow.
