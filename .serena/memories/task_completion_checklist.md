# Task Completion Checklist

## When completing a task in this project:

### 1. Build the Project
```bash
npm run build
```
**Critical**: Always build after making changes. The server runs from `dist/`, not `src/`.

### 2. Test Manually (No automated tests currently)
Since there are no automated tests, manual testing is required:
- Run the server: `npm run start` or `node dist/server.js`
- Test with an MCP client (Claude Desktop, etc.)
- Verify the specific functionality you changed

### 3. Update Documentation (if applicable)
- **CLAUDE.md**: Update if architectural patterns changed
- **README.md**: Update if user-facing features changed
- **QUERY_TOOL_REFERENCE.md**: Update if query fields/filters changed
- **QUERY_TOOL_EXAMPLES.md**: Update if new query patterns added

### 4. Check for Common Gotchas
- ✅ JXA scripts properly escaped (backticks, quotes)
- ✅ Date handling uses ISO 8601 format
- ✅ Pre-built JXA scripts copied to `dist/utils/omnifocusScripts/`
- ✅ Batch operations handle cycles properly
- ✅ Tool schemas match parameter types

### 5. Git Workflow
```bash
git status                    # Check what changed
git add .                     # Stage changes
git commit -m "description"   # Commit with clear message
git push                      # Push to remote
```

## No Linting/Formatting Tools
This project currently has no:
- ESLint configuration
- Prettier configuration
- Pre-commit hooks
- Automated tests

Follow the existing code style when making changes (see `code_style_conventions.md`).

## Build Output Verification
After building, verify:
- `dist/` directory exists
- `dist/server.js` is executable (has shebang)
- `dist/utils/omnifocusScripts/*.js` files are copied
- TypeScript compiled without errors

## Known Issues to Be Aware Of
- `dump_database` can timeout on very large OmniFocus databases
- `get_perspective_view` cannot programmatically switch perspectives
- Batch operations return success even if some items fail (check individual results)
