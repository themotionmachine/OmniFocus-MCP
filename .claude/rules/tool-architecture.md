---
paths:
  - "src/tools/**/*.ts"
  - "src/server.ts"
---

# Tool Architecture Pattern

## Two-Layer Structure

- `definitions/` - Zod schemas + MCP handlers (interface layer)
- `primitives/` - Business logic (implementation layer)

This separation allows clean MCP registration while keeping logic testable.

## When Adding Tools

1. Create definition in `src/tools/definitions/toolName.ts`
2. Create primitive in `src/tools/primitives/toolName.ts`
3. Register in `src/server.ts`
4. Add to README tool list
5. Run `pnpm build` to verify

## Definition File Pattern

```typescript
// src/tools/definitions/toolName.ts
import { z } from "zod";

export const schema = z.object({
  // ... parameters
});

export async function handler(params: z.infer<typeof schema>) {
  // Validate, call primitive, format response
}
```

## Primitive File Pattern

```typescript
// src/tools/primitives/toolName.ts
export interface ToolNameParams {
  // ... typed parameters
}

export async function toolName(params: ToolNameParams) {
  // Business logic, JXA generation/execution
}
```

## Validation Rules

- Use Zod schemas for all tool input validation
- Never use type assertions (`as Type`) - use Zod or type narrowing
- Return structured errors with actionable messages
