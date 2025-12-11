---
paths:
  - "src/server.ts"
  - "src/tools/**/*.ts"
---

# MCP Development Patterns

## SDK Version

- Using @modelcontextprotocol/sdk 1.24.3
- Check Context7 for latest API changes before major modifications

## Tool Registration

Tools are registered in `src/server.ts`:

```typescript
server.tool("tool_name", schema, async (params, extra) => {
  // handler implementation
});
```

## Handler Signatures

- SDK 1.15.x+ requires: `RequestHandlerExtra<ServerRequest, ServerNotification>`
- Always include both type parameters

## Response Format

- Success: `{ content: [{ type: "text", text: JSON.stringify(data) }] }`
- Error: `{ content: [{ type: "text", text: error.message }], isError: true }`

## Transport

- Uses StdioServerTransport for stdio communication
- Server invoked via `npx -y omnifocus-mcp-pro`
- Handled by `cli.cjs` wrapper

## Common SDK Gotchas

- `RequestHandlerExtra` requires 2 type params in SDK 1.15.x+
- Use `"moduleResolution": "NodeNext"` to avoid infinite type recursion
- Legacy `"moduleResolution": "node"` causes type issues
