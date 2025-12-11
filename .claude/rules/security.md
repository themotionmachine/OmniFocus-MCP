# Security Rules

## Sensitive Data

- Never commit `.env` files or credentials
- Never log API keys, tokens, or passwords
- Never include secrets in error messages

## Input Validation

- Validate ALL external input with Zod schemas
- Sanitize strings before passing to JXA (prevent injection)
- Never trust user-provided IDs without validation

## JXA Security

- JXA runs with user privileges - be cautious
- Never execute arbitrary code from external sources
- Escape all user input in generated JXA scripts
- Template literals inside JXA need careful escaping

## Dependencies

- Review security implications of new dependencies
- Run `pnpm audit` periodically
- Keep dependencies updated for security patches
- Don't introduce new dependencies without strong justification
