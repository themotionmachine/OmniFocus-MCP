# Code Style and Conventions

## TypeScript Configuration
- ES module syntax (`"type": "module"` in package.json)
- Target: ES2020+ (from tsconfig.json)
- Strict type checking enabled
- File extensions: `.ts` for TypeScript, `.js` for JXA scripts

## Naming Conventions

### Files
- **TypeScript files**: camelCase (e.g., `addOmniFocusTask.ts`, `scriptExecution.ts`)
- **JXA scripts**: camelCase (e.g., `omnifocusDump.js`, `listPerspectives.js`)
- **Documentation**: SCREAMING_SNAKE_CASE or Title Case (e.g., `CLAUDE.md`, `README.md`)

### Code Elements
- **Functions**: camelCase (e.g., `executeJXA()`, `addOmniFocusTask()`)
- **Types/Interfaces**: PascalCase (e.g., `TaskMinimal`, `AddOmniFocusTaskParams`)
- **Namespaces**: PascalCase (e.g., `Task`, `Project`, `Folder`)
- **Enums**: PascalCase for enum name, PascalCase for values (e.g., `Task.Status.Available`)
- **Constants**: camelCase (e.g., `server`, `transport`)

## Code Organization

### Tool Pattern
Each tool follows a consistent pattern:
1. **Definition file** (`src/tools/definitions/toolName.ts`):
   - Exports `schema` (Zod schema)
   - Exports `handler` (MCP tool handler)
   - Validates input, calls primitive, formats response

2. **Primitive file** (`src/tools/primitives/toolName.ts`):
   - Exports parameter type
   - Exports main function with business logic
   - Generates JXA or calls pre-built scripts

### Import/Export Style
- Use ES6 imports with `.js` extensions (TypeScript moduleResolution)
- Export types and functions separately
- Named exports preferred over default exports

## JXA Script Conventions
- Wrap all scripts in try-catch blocks
- Return JSON-formatted results
- Use template literals for script generation
- Escape special characters properly (backticks, quotes)
- Date comparisons use `.getTime()` for milliseconds

## Error Handling
- Catch and log errors in `executeJXA()`
- Return empty arrays or structured error responses
- Don't throw exceptions to MCP clients when possible
- Provide meaningful error messages

## Documentation
- Use JSDoc-style comments for complex functions
- Inline comments for non-obvious logic
- CLAUDE.md for architectural guidance
- README.md for user-facing documentation

## Type Safety
- Define parameter types for all functions
- Use TypeScript enums for OmniFocus states
- Minimal interfaces for data structures
- Zod schemas for runtime validation
