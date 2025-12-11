---
paths:
  - "*.md"
  - "README.md"
  - "CLAUDE.md"
  - "docs/**"
---

# Documentation Standards

## CLAUDE.md Updates

- Update when adding new tools
- Keep under 200 lines (use `.claude/rules/` for details)
- Focus on "what Claude gets wrong" not general best practices

## README Updates

- Update tool list when adding/removing tools
- Keep usage examples current
- Document any breaking changes

## Code Comments

- JSDoc for complex functions only
- Inline comments for non-obvious logic
- Don't over-document obvious code

## File Structure

- All text files end with newline
- Use consistent markdown formatting
- Tables for structured information

## When to Document

- New tools require README and CLAUDE.md updates
- Breaking changes require migration notes
- Complex logic requires inline comments

## What NOT to Document

- Obvious code behavior
- Standard library usage
- Temporary workarounds (fix them instead)
