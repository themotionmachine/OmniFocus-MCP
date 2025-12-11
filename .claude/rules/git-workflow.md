# Git Workflow

## Commit Conventions

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Keep commits atomic and focused
- Commit working code incrementally

## Branch Strategy

- Feature branches: `feature/[ticket-id]-description`
- Bug fixes: `fix/[ticket-id]-description`
- Main branch: `main`

## Pre-commit Hooks

- Husky + lint-staged configured
- Never use `--no-verify` to bypass hooks
- Fix lint errors, don't skip them

## Pull Requests

- **NEVER** open PRs against `themotionmachine/OmniFocus-MCP` (upstream fork)
- Target `main` branch in your repo
- Include clear description of changes

## Dangerous Operations

- Never force push to main/master
- Avoid `git commit --amend` unless explicitly requested
- Never skip pre-commit hooks
- Check authorship before amending: `git log -1 --format='%an %ae'`
