# Task Completion Checklist

## When completing a task in this project:

### 1. Build the Project
```bash
pnpm build
```
**Critical**: Always build after making changes. The server runs from `dist/`, not `src/`.

### 2. Run Quality Checks
```bash
pnpm lint       # Run Biome linting
pnpm typecheck  # TypeScript strict mode check
pnpm test       # Run Vitest tests
```

### 3. Test Manually (if needed)
- Run the server: `pnpm start` or `node dist/server.js`
- Test with an MCP client (Claude Desktop, etc.)
- Verify the specific functionality you changed

### 4. Update Documentation (if applicable)
- **CLAUDE.md**: Update if architectural patterns changed
- **README.md**: Update if user-facing features changed
- **QUERY_TOOL_REFERENCE.md**: Update if query fields/filters changed
- **QUERY_TOOL_EXAMPLES.md**: Update if new query patterns added

### 5. Check for Common Gotchas
- ✅ JXA scripts properly escaped (backticks, quotes)
- ✅ Date handling uses ISO 8601 format
- ✅ Pre-built JXA scripts copied to `dist/utils/omnifocusScripts/`
- ✅ Batch operations handle cycles properly
- ✅ Tool schemas match parameter types

### 6. Git Workflow (pre-commit hooks will run automatically)
```bash
git status                    # Check what changed
git add .                     # Stage changes
git commit -m "description"   # Commit - Husky runs lint-staged automatically
git push                      # Push to remote
```

## Available Scripts
| Script | Purpose |
|--------|---------|
| `pnpm build` | Build with tsup (ESM + CJS + types) |
| `pnpm start` | Run the MCP server |
| `pnpm dev` | Watch mode with tsx |
| `pnpm lint` | Run Biome linting |
| `pnpm lint:fix` | Auto-fix Biome issues |
| `pnpm format` | Format code with Biome |
| `pnpm typecheck` | TypeScript strict mode check |
| `pnpm test` | Run Vitest tests |
| `pnpm test:watch` | Watch mode for tests |
| `pnpm test:coverage` | Tests with coverage |

## Build Output Verification
After building, verify:
- `dist/` directory exists
- `dist/server.js` (ESM) and `dist/server.cjs` (CJS) are present
- `dist/server.d.ts` type declarations exist
- `dist/utils/omnifocusScripts/*.js` files are copied
- All quality checks pass

## Known Issues to Be Aware Of
- `dump_database` can timeout on very large OmniFocus databases
- `get_perspective_view` cannot programmatically switch perspectives
- Batch operations return success even if some items fail (check individual results)