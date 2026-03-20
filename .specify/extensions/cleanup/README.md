# Spec-Kit Cleanup Extension

Post-implementation quality gate that reviews changes, fixes small issues (scout rule), creates tasks for medium issues, and generates analysis for large issues.

## Installation

```bash
specify extension add cleanup
```

Or install from repository directly:

```bash
specify extension add --from https://github.com/dsrednicki/spec-kit-cleanup/archive/refs/tags/v1.0.0.zip
```

## Usage

After completing implementation with `/speckit.implement`, run the cleanup command:

```bash
/speckit.cleanup
```

Or use the full command name:

```bash
/speckit.cleanup.run
```

## What It Does

The cleanup command performs a final quality gate after implementation:

1. **Reviews all implementation changes** - Analyzes files modified during implementation
2. **Detects issues by severity**:
   - **CRITICAL**: Security vulnerabilities requiring immediate attention (halts execution)
   - **LARGE**: Architecture concerns requiring team discussion
   - **MEDIUM**: Code quality issues requiring follow-up tasks
   - **SMALL**: Mechanical fixes that can be applied immediately
3. **Applies fixes with user confirmation** - Small issues are fixed following the Scout Rule
4. **Creates tech debt tasks** - Medium issues become follow-up tasks in tasks.md
5. **Generates analysis reports** - Large issues get detailed analysis in tech-debt-report.md

## Issue Detection

### Small Issues (Auto-fixable)

| Category | Patterns |
|----------|----------|
| Debug statements | `console.log`, `print()`, `debugger`, `breakpoint()`, `pdb.set_trace()` |
| Dead code | Unused imports, unreachable code after `return`/`throw` |
| Dev remnants | `localhost` URLs, `TODO` without ticket reference |

### Medium Issues (Task Creation)

- Missing error handling on external calls
- Code duplication (same logic in 2-3 locations)
- Missing documentation on public API
- Disabled tests without explanation
- Long functions (>50 lines with high complexity)

### Large Issues (Analysis Required)

- Circular dependencies between modules
- Business logic in wrong layer
- Performance anti-patterns (N+1 queries, missing pagination)
- Security design issues (SQL injection patterns, unsanitized HTML)

### Critical Issues (Halt)

- Hardcoded credentials/secrets
- Disabled authentication checks

## Outputs

| Artifact | Description |
|----------|-------------|
| Direct fixes | Small issues fixed in-place (with user confirmation) |
| tasks.md | Tech Debt Tasks section appended for medium issues |
| tech-debt-report.md | Detailed analysis for large issues with options |

## Configuration

Copy `config-template.yml` to `cleanup-config.yml` and customize:

```yaml
severity_thresholds:
  long_function_lines: 50
  deep_nesting_levels: 4

auto_fix:
  debug_statements: true
  unused_imports: true
  dead_code: false
```

## Workflow Integration

The cleanup command integrates with the Spec Kit workflow:

```
/speckit.specify → /speckit.plan → /speckit.tasks → /speckit.implement → /speckit.cleanup
                                                                              │
                                                                              ▼
                                                    /speckit.implement (for tech debt tasks)
```

## Operating Principles

- **Scout Rule**: "Always leave the code cleaner than you found it"
- **Constitution Compliance**: All actions respect project constitution principles
- **Non-Destructive**: Always confirms before modifying, rolls back on validation failure
- **Idempotent**: Safe to run multiple times

## Requirements

- Spec Kit >= 0.1.0
- Completed implementation (tasks.md with completed tasks)

## License

MIT License - Copyright (c) 2026 Dominik Srednicki
