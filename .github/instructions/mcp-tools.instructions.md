---
applyTo: "src/tools/**/*.ts,src/server.ts"
---

# MCP Tool Development Instructions

When working with MCP tools:

## Tool Organization

**Definitions** (`src/tools/definitions/`)
- Tool schemas (Zod validation)
- MCP-facing handlers (bridge between MCP SDK and business logic)
- Exports for server registration

**Primitives** (`src/tools/primitives/`)
- Core business logic for each tool
- JXA script generation
- Result parsing and transformation
- Reusable across multiple tool definitions

## Tool Registration Pattern

In `src/server.ts`:

```typescript
import { myToolSchema, myToolHandler } from './tools/definitions/myTool';

server.tool(
  'tool_name',
  'Clear description of what this tool does',
  myToolSchema,
  myToolHandler
);
```

## Schema Definition

Use Zod for all parameter validation:

```typescript
import { z } from 'zod';

export const querySchema = z.object({
  taskId: z.string().describe('OmniFocus task ID'),
  status: z.enum(['available', 'completed', 'dropped']).optional(),
  includeNotes: z.boolean().default(false),
});

export type QueryParams = z.infer<typeof querySchema>;
```

## Tool Handler Pattern

```typescript
export async function toolHandler(params: QueryParams) {
  try {
    // 1. Call primitive logic
    const result = await primitiveFunction(params);

    // 2. Return structured response
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // 3. Return error as structured response (don't throw)
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
```

## Best Practices

### Schema Design
- Use descriptive field names matching OmniFocus terminology
- Provide `.describe()` for all fields to help AI assistants
- Set sensible defaults with `.default()`
- Use `.optional()` for truly optional parameters
- Validate enums match OmniFocus values

### Error Handling
- NEVER throw errors from tool handlers
- Return structured error responses
- Include context in error messages
- Log JXA execution failures with the script content

### Performance
- Generate minimal JXA scripts (don't fetch unnecessary fields)
- Use `query_omnifocus` with filters instead of `dump_database` for targeted queries
- Consider timeout implications for large databases
- Enable `hideCompleted` options when appropriate

### Documentation
- Write clear tool descriptions
- Document what each parameter does
- Explain return value structure
- Note any limitations or edge cases

## Testing Tools

To test a tool during development:

```bash
# Build first
npm run build

# Run server
npm run start

# Test via Claude Desktop or MCP inspector
```

## Common Patterns

**Batch Operations**: Process items in dependency order using topological sort
**Hierarchy Management**: Support `parentTempId` for within-batch references
**Date Handling**: Convert ISO 8601 strings to Date objects in JXA
**ID Mapping**: Track temporary IDs → real OmniFocus IDs for batch operations
