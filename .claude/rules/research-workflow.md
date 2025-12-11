# Research Workflow

## When to Research

- Before implementing unfamiliar patterns
- When debugging obscure JXA/OmniJS errors
- When evaluating new dependencies
- Before making architectural decisions

## Research Tools by Domain

### OmniFocus/Omni Automation

Use Tavily to search official documentation:

- `mcp__tavily-mcp__tavily-search` for omni-automation.com (official API docs)
- `mcp__tavily-mcp__tavily-extract` to pull specific pages from omni-automation.com
- OmniGroup Forums: discourse.omnigroup.com

### MCP SDK

- **Context7** - Get up-to-date @modelcontextprotocol/sdk docs
- Check for breaking changes before SDK upgrades

### General Research

- **Tavily** - JXA patterns, Stack Overflow, GitHub issues
- **Web Search** - AppleScript/JXA conversion, debugging

## Key OmniFocus Documentation URLs

- API Reference: <https://omni-automation.com/omnifocus/>
- Task operations: <https://omni-automation.com/omnifocus/task.html>
- Project operations: <https://omni-automation.com/omnifocus/project.html>
- Folder operations: <https://omni-automation.com/omnifocus/folder.html>
- Tag operations: <https://omni-automation.com/omnifocus/tag.html>

## Research Agent

Use `research-specialist` agent for complex multi-source research:

- "Search omni-automation.com for [OmniFocus feature] API"
- "How do others implement [pattern] in JXA?"
- "Best practices for [automation technique]?"
