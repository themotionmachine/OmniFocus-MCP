# MCP Context Efficiency for Large Tool Sets (86+ tools)

## Research Date: 2026-03-17

## Key Findings

### Token Costs
- **Per-tool**: 550-1,400 tokens (name + description + inputSchema + enums)
- **86 tools estimate**: ~47K-120K tokens; realistic middle ~60K
- **Real-world**: 143K/200K tokens consumed by 3 MCP servers; GitHub's 91 tools ate massive context

### Tool Selection Accuracy Degradation
- Degrades significantly past **30-50 tools**
- Opus 4: 49% accuracy with large libraries (74% with Tool Search)
- Opus 4.5: 79.5% accuracy (88.1% with Tool Search)

### MCP Spec Features
- `notifications/tools/list_changed` for runtime tool updates
- `tools/list` supports **cursor-based pagination**
- `listChanged: true` capability declaration during init
- **No built-in namespacing** or hierarchical grouping

### Claude Code: MCP Tool Search
- Auto-enables when tools consume >10% of context
- Builds lightweight search index at session start
- Fetches 3-5 tools on-demand per query
- **85%+ context reduction** (40K -> 5K tokens)
- `defer_loading: true` per tool definition
- Two variants: regex and BM25

### Anthropic API: `defer_loading` + `tool_reference`
- Mark tools with `defer_loading: true`
- Tool search tool (non-deferred) discovers them
- `mcp_toolset` with `default_config` for MCP servers
- Custom search via `tool_reference` blocks in tool_result
- Keep 3-5 most-used tools non-deferred

### GitHub MCP Server Pattern (91 tools)
- **Toolsets**: `--toolsets repos,issues,pull_requests` (logical groups)
- **Individual tools**: `--tools` flag for granular control
- **Dynamic toolsets**: `GITHUB_DYNAMIC_TOOLSETS=1` starts with 4 base tools
- **Composable**: all modes combine freely
- Limitation: dynamic tools not available mid-chain

### Server-Side Strategies
1. **Toolset filtering** (GitHub pattern)
2. **Dynamic registration** via `tools/list_changed`
3. **Auth-aware hiding** (hide tools when auth expires)
4. **Progressive disclosure** (CLI-style `--help` approach)

## Relevance to OmniFocus MCP
- Current: 22 tools (safe zone)
- If growing to 86+: implement toolsets or dynamic loading
- Consider: `serverInstructions` field for discovery hints
- Claude Code Tool Search handles it automatically for clients
