# Quickstart: Notifications Implementation

**Feature**: 006-notifications
**TL;DR**: 5 per-task tools following existing definitions/primitives pattern.

## Before You Start

```bash
pnpm install && pnpm build && pnpm test  # Verify baseline
```

⚠️ **MANDATORY**: Run this in OmniFocus Script Editor to verify offset unit:
```javascript
// Pick any task with a due date
var task = flattenedTasks.filter(function(t) { return t.dueDate !== null; })[0];
task.addNotification(-3600);  // Should be 1 hour before due
var notif = task.notifications[task.notifications.length - 1];
// If relativeFireOffset === -3600 → unit is seconds (expected)
// If relativeFireOffset === -60 → unit is minutes (need to update spec)
console.log("relativeFireOffset:", notif.relativeFireOffset);
task.removeNotification(notif);  // Clean up
```

## File Creation Order (TDD)

For each tool, follow this exact sequence:

1. **Contract** → `src/contracts/notification-tools/{tool}.ts`
2. **Contract test** → `tests/contracts/notification-tools/{tool}.test.ts` (write, verify FAILS)
3. **Primitive** → `src/tools/primitives/{tool}.ts`
4. **Unit test** → `tests/unit/notification-tools/{tool}.test.ts` (write, verify FAILS)
5. **Implement** → Fill primitive body (tests go GREEN)
6. **Definition** → `src/tools/definitions/{tool}.ts`
7. **Register** → Add `server.tool()` call in `src/server.ts`

## Copy-Paste Templates

### Contract (per tool)

```typescript
import { z } from 'zod';
import { TaskIdentifierSchema } from './shared/task-identifier.js';
import { DisambiguationErrorSchema } from '../../task-tools/shared/disambiguation.js';

export const ToolInputSchema = z.object({
  // id/name from TaskIdentifierSchema pattern
}).refine(/* at least one identifier */);

export const ToolSuccessSchema = z.object({
  success: z.literal(true),
  // tool-specific fields
});

export const ToolErrorSchema = z.object({
  success: z.literal(false),
  error: z.string()
});

export const ToolResponseSchema = z.union([
  ToolSuccessSchema,
  DisambiguationErrorSchema,
  ToolErrorSchema
]);
```

### Primitive (per tool)

```typescript
import type { ToolInput, ToolResponse } from '../../contracts/notification-tools/tool.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

export async function toolName(params: ToolInput): Promise<ToolResponse> {
  const script = generateToolScript(params);
  const result = await executeOmniJS(script);
  return result as ToolResponse;
}

export function generateToolScript(params: ToolInput): string {
  // Escape inputs, generate OmniJS IIFE with try-catch
}
```

### Definition (per tool)

```typescript
import type { z } from 'zod';
import { ToolInputSchema } from '../../contracts/notification-tools/tool.js';
import { toolName } from '../primitives/toolName.js';

export const schema = ToolInputSchema;

export async function handler(params: z.infer<typeof schema>) {
  const result = await toolName(params);
  if (!result.success) {
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], isError: true };
  }
  return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
}
```

## Key Gotchas

| Gotcha | Solution |
|--------|----------|
| `absoluteFireDate` throws on relative kind | Check `kind` before access |
| `relativeFireOffset` throws on Absolute kind | Check `kind` before access |
| `removeNotification()` takes object, not index | `var notif = task.notifications[index]; task.removeNotification(notif)` |
| `addNotification(Number)` needs due date | Pre-check `task.effectiveDueDate` |
| Offset unit is SECONDS | -3600 = 1 hour, -86400 = 1 day |
| Notification indices shift after removal | User should re-list after removing |
| `executeOmniJS()` not `executeOmniFocusScript()` | Pipes via stdin, no temp files |
| Import `.js` extensions required | ESM: `import { x } from './foo.js'` |

## Verification Checklist

After each phase:
```bash
pnpm typecheck  # No type errors
pnpm lint       # No lint issues
pnpm test       # All tests pass (new + existing)
pnpm build      # Clean build
```
