# Claude Code Plugins, Skills, and MCP Optimization Research

## Date: 2026-03-17

## Key Findings

### Plugins (shipped Jan 2026)

- Bundle: skills, hooks, subagents, MCP servers, LSP servers, commands
- Manifest: `.claude-plugin/plugin.json` (only `name` required)
- Auto-discovery: components found in default dirs without manifest
- Scopes: user, project, local, managed
- `${CLAUDE_PLUGIN_ROOT}` env var for paths
- Plugin MCP servers in `.mcp.json` at plugin root or inline in plugin.json

### Skills (Agent Skills open standard)

- Progressive disclosure: 3 layers
  - Layer 1: Metadata (~100 tokens/skill) loaded at startup
  - Layer 2: Full SKILL.md (<5000 tokens) loaded on relevance match
  - Layer 3+: Referenced files loaded on-demand via bash
- Budget: 2% of context window for skill descriptions, fallback 16,000 chars
- Skills != Tools: Skills are procedural knowledge, tools are function calls
- Frontmatter: name, description, disable-model-invocation, allowed-tools, context, agent, model

### Tool Search (Official Anthropic Feature)

- Auto-activates when MCP tools exceed 10% of context window
- Two variants: Regex and BM25
- `defer_loading: true` on tool definitions
- 85%+ context reduction (55k -> 8k typical)
- Shipped Jan 14, 2026
- Config: ENABLE_TOOL_SEARCH env var (true/false/auto/auto:N)
- Requires Sonnet 4+ or Opus 4+ (no Haiku support)

### TOON (Token-Oriented Object Notation)

- Data format, not tool management
- 30-60% token reduction for data payloads
- MCP server implementations exist for transparent conversion

### Context Numbers

- ~400-500 tokens per tool definition
- 50 tools = 20-25k tokens
- 5-server setup (GitHub, Slack, etc.) = ~55k tokens
- 7 MCP servers = 67.3k tokens (33.7% of 200k)

### MCP Protocol Features

- `notifications/tools/list_changed` for dynamic updates
- Proposed (not implemented): tools/categories, tools/discover, tools/load, tools/unload
- Hierarchical tool management still under discussion (GitHub Discussion #532)
