---
paths:
  - "src/**/*.ts"
  - "tests/**/*.ts"
---

# TypeScript Standards

## Strict Mode

- TypeScript strict mode is enabled - respect all type checks
- Never use `any` - use `unknown` with type guards instead
- Never use type assertions (`as Type`) - use Zod or type narrowing

## Module System

- ES modules with `"type": "module"` in package.json
- Use `.js` extensions in imports (TypeScript moduleResolution: NodeNext)
- Named exports preferred over default exports

## Naming Conventions

- Functions: camelCase (e.g., `executeJXA`, `addTask`)
- Types/Interfaces: PascalCase (e.g., `TaskMinimal`, `AddTaskParams`)
- Enums: PascalCase name, PascalCase values (e.g., `Task.Status.Available`)
- Constants: camelCase (e.g., `server`, `transport`)

## SDK Type Patterns

- `RequestHandlerExtra` requires 2 type params: `<ServerRequest, ServerNotification>`
- Use `"moduleResolution": "NodeNext"` to avoid infinite type recursion

## Import/Export Style

```typescript
// Named exports
export { schema, handler } from "./toolName.js";

// Type imports
import type { TaskMinimal } from "../omnifocustypes.js";
```

## Type Definitions

- Define parameter types for all functions
- Use TypeScript enums for OmniFocus states
- Minimal interfaces for data structures
- Zod schemas for runtime validation
