# Pull Request

## Summary

<!-- 1-3 bullet points describing what this PR does -->

## Changes

<!-- Key files/areas modified -->

| Area | Change |
|------|--------|
| <!-- e.g., Tools --> | <!-- Brief description --> |

## Testing

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] JXA scripts copied to `dist/utils/omnifocusScripts/`
- [ ] MCP server starts without errors (`npm run start`)
- [ ] Manually tested with Claude Desktop (if tool changes)

## MCP Server Validation

- [ ] Tool definitions follow schema pattern (Zod validation)
- [ ] Primitives separated from definitions
- [ ] JXA scripts use proper error handling
- [ ] No console.log statements in production code
- [ ] CLAUDE.md updated (if new tools added)

## Related Issues

<!-- Link to related issue(s) if applicable -->

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
