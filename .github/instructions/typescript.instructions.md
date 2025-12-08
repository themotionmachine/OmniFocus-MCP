---
applyTo: "**/*.ts"
---

# TypeScript Instructions

When working with TypeScript files in the OmniFocus MCP Server:

## Type Definitions

- Prefer `interface` over `type` for object shapes
- Use `type` for unions, intersections, and mapped types
- Export types that are used across files
- Reference `src/omnifocustypes.ts` for OmniFocus domain types

```typescript
// Object shapes
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Unions and enums
type TaskStatus = 'available' | 'completed' | 'dropped';
enum ProjectStatus {
  Active = 'active',
  OnHold = 'on-hold',
  Completed = 'completed',
  Dropped = 'dropped'
}
```

## Function Typing

```typescript
// Arrow functions with explicit return types
const processJXAResult = (result: string): ParsedResult => {
  return JSON.parse(result);
};

// Async functions
async function executeJXA(script: string): Promise<string> {
  // implementation
}
```

## MCP Tool Handlers

Tool handlers should follow this pattern:

```typescript
import { z } from 'zod';

// Schema definition
const myToolSchema = z.object({
  taskId: z.string(),
  newName: z.string().optional(),
});

// Handler implementation
async function myToolHandler(params: z.infer<typeof myToolSchema>): Promise<ToolResult> {
  try {
    // implementation
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Error Handling

- Always wrap MCP tool logic in try-catch blocks
- Return structured error objects, don't throw
- Provide meaningful error messages
- Log JXA script errors with context

## Avoid

- Using `any` - prefer `unknown` if type is truly unknown
- Type assertions unless absolutely necessary (JXA parsing is an exception)
- Implicit any in function parameters
- Catching errors without proper error propagation

## Strict Mode

This project uses strict TypeScript. Ensure:
- No implicit any
- Strict null checks
- No unused locals/parameters
- All promises are properly awaited or returned
