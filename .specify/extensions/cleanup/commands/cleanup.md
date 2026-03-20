---
description: Post-implementation quality gate that reviews changes, fixes small issues (scout rule), creates tasks for medium issues, and generates analysis for large issues.
scripts:
  sh: scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
  ps: scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
handoffs:
  - label: Re-implement follow-up tasks
    agent: speckit.implement
    prompt: Address the follow-up tech debt tasks created during cleanup
  - label: Run analysis
    agent: speckit.analyze
    prompt: Verify consistency after cleanup changes
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Perform a final quality gate after implementation. Review all changes made during implementation, identify technical debt, and handle issues according to severity:

- **Small issues**: Fix immediately (Scout Rule) - with user confirmation
- **Medium issues**: Create follow-up tasks in tasks.md
- **Large issues**: Generate detailed analysis with options in tech-debt-report.md

## Operating Constraints

**Constitution Authority**: The project constitution (`.specify/memory/constitution.md`) is **non-negotiable**. Any cleanup action that would violate constitution principles is forbidden. If a fix would conflict with a MUST principle, escalate to large issue instead of fixing.

**Linter Deference**: For style and formatting issues, defer to the project's configured linters. Do NOT manually fix issues that linters should handle - instead, run the linter with auto-fix if available.

**Preserve User Intent**: If code appears intentional (e.g., commented code with explanation, disabled tests with TODO reason), do NOT auto-fix. Escalate to medium issue for user review.

## Execution Steps

### 1. Initialize Cleanup Context

Run `{SCRIPT}` once from repo root and parse JSON for FEATURE_DIR and AVAILABLE_DOCS. Derive absolute paths:

- SPEC = FEATURE_DIR/spec.md
- PLAN = FEATURE_DIR/plan.md
- TASKS = FEATURE_DIR/tasks.md
- CONSTITUTION = .specify/memory/constitution.md
- TECH_DEBT_REPORT = FEATURE_DIR/tech-debt-report.md

Abort with error if TASKS does not exist or has no completed tasks (implementation not run).
For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

### 2. Load Implementation Context

Load minimal necessary context from each artifact:

**From tasks.md:**
- All completed tasks (marked `[X]` or `[x]`)
- File paths mentioned in completed tasks
- Implementation phases that were executed

**From plan.md:**
- Tech stack and language
- Project structure and directories
- Configured linters and tools

**From spec.md:**
- Original requirements (to verify fixes don't violate intent)
- User stories (to map issues to features)

**From constitution:**
- All MUST/SHOULD principles
- Quality gates and standards

### 3. Identify Implementation Changes

Determine which files to review using this priority order:

1. **Task-based detection** (most reliable):
   - Parse tasks.md for all file paths in completed tasks
   - This is deterministic and matches what was actually implemented

2. **Git-based detection** (supplementary):
   - Run `git diff --name-only HEAD~N` where N = number of implementation commits
   - Or use `git log --oneline FEATURE_DIR` to find implementation commit range
   - Cross-reference with task-based list

3. **Build the review scope**:
   ```
   REVIEW_FILES = files from completed tasks
   REVIEW_DIRS = src/, tests/, and directories from plan.md structure
   EXCLUDE = node_modules/, venv/, dist/, build/, *.lock files
   ```

### 4. Detect Project Tooling

Before scanning, identify available project tools:

**Linters** (check for config files):
- ESLint: `.eslintrc*`, `eslint.config.*`
- Prettier: `.prettierrc*`
- Pylint/Ruff/Black: `pyproject.toml`, `.pylintrc`, `ruff.toml`
- RuboCop: `.rubocop.yml`
- Go: `go.mod` (use `go fmt`, `go vet`)

**Test runners**:
- Jest/Vitest: `jest.config.*`, `vitest.config.*`
- Pytest: `pytest.ini`, `pyproject.toml`
- Go: `*_test.go` files

Record available tools for use in validation steps.

### 5. Perform Issue Detection

Scan each file in REVIEW_FILES for issues. Use **progressive disclosure** - only load file contents when checking that specific file.

#### A. Debugging Artifacts (SMALL - auto-fixable)

Language-specific patterns to detect and remove:

| Language | Patterns |
|----------|----------|
| JS/TS | `console.log`, `console.debug`, `console.info`, `console.warn` (non-error), `debugger` |
| Python | `print(` without logging context, `breakpoint()`, `pdb.set_trace()`, `import pdb` |
| Java | `System.out.print`, `e.printStackTrace()` without logging |
| Go | `fmt.Print` used for debugging (not in main/CLI) |
| Ruby | `puts` for debugging, `binding.pry`, `byebug` |
| PHP | `var_dump(`, `print_r(`, `dd(`, `dump(` |
| Rust | `println!` used for debugging, `dbg!` |

#### B. Dead Code (SMALL - auto-fixable with caution)

- Unused imports: No references in file after import statement
- Commented-out code: Block comments containing code syntax (>3 lines) with no explanatory context
- Unreachable code: Statements after unconditional `return`, `throw`, `break`, `continue`

**Caution**: Do NOT auto-remove if:
- Adjacent comment explains WHY code is disabled (even on separate line above)
- Import is used in type annotations only (TS/Python)
- Code is conditionally compiled
- Commented code has a TODO/ticket reference indicating planned restoration

When in doubt about intent, escalate to MEDIUM (create task) rather than auto-fixing.

#### C. Development Remnants (SMALL/MEDIUM)

| Pattern | Severity | Action |
|---------|----------|--------|
| `TODO` without ticket reference | SMALL | Add ticket or remove |
| `FIXME`, `HACK`, `XXX` | MEDIUM | Create follow-up task |
| `localhost`, `127.0.0.1` in source code | SMALL | Replace with environment variable or config |
| Disabled tests without reason | MEDIUM | Create task to fix or remove |
| Hardcoded credentials/secrets | **CRITICAL** | STOP - alert user immediately |
| Logging user data or queries | MEDIUM | Create task to sanitize logs |
| Import from non-existent module | MEDIUM | Create task to fix or remove |

**Localhost replacement pattern**:
```typescript
// Before (SMALL issue)
const apiUrl = 'http://localhost:3000/api';

// After (fix)
const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
```

#### D. Code Quality (MEDIUM - create tasks)

These require judgment and should NOT be auto-fixed:

- Missing error handling on external calls (API, DB, file I/O)
- Missing input validation on public functions
- Code duplication (same logic in 2-3 locations)
- Missing documentation on public API
- Long functions (project-specific threshold, default: check if >50 lines AND complexity is high)
- Deep nesting (>4 levels with complex logic)

#### E. Architecture Concerns (LARGE - generate analysis)

- Circular dependencies between modules
- Business logic in wrong layer (e.g., in controllers/handlers)
- Inconsistent patterns across similar components
- Missing abstraction causing tight coupling
- Performance anti-patterns (N+1 queries, missing pagination)

#### F. Security Concerns (LARGE/CRITICAL)

| Pattern | Severity |
|---------|----------|
| SQL string concatenation | LARGE |
| Unsanitized HTML output | LARGE |
| Hardcoded secrets | CRITICAL - halt |
| Disabled auth checks | CRITICAL - halt |
| Overly permissive CORS (`*`) | MEDIUM |

### 6. Constitution Validation

For each potential fix or issue:

1. Check if fix would violate any MUST principle
2. Check if issue represents a constitution violation
3. Constitution violations are automatically LARGE severity

### 7. Classify and Confirm Issues

Build issue inventory with severity assignment:

**Severity Heuristics:**

| Severity | Criteria | Action |
|----------|----------|--------|
| CRITICAL | Security vulnerability, credential exposure, auth bypass | HALT - alert user, do not proceed until fixed |
| LARGE | Architecture problem, constitution violation, security design issue | Generate analysis in tech-debt-report.md |
| MEDIUM | Code quality issue requiring design decision, multi-file change | Create follow-up task |
| SMALL | Mechanical fix, single-file, no judgment needed | Fix with confirmation |

**On CRITICAL halt**: After user fixes critical issues manually, they should re-run `/speckit.cleanup` to continue with remaining issues.

**Present findings to user before proceeding:**

```markdown
## Cleanup Findings

### Critical Issues (BLOCKING)
[List any - must resolve before continuing]

### Small Issues (Propose to fix now)
| # | File | Issue | Proposed Fix |
|---|------|-------|--------------|
| 1 | src/api.ts:42 | console.log | Remove line |
| 2 | src/util.ts:1 | Unused import | Remove 'lodash' |

### Medium Issues (Will create tasks)
| # | File | Issue | Task Description |
|---|------|-------|------------------|
| 1 | src/service.ts | Missing error handling | Add try/catch to API calls |

### Large Issues (Will generate analysis)
| # | Scope | Issue | Impact |
|---|-------|-------|--------|
| 1 | auth/, user/ | Circular dependency | Prevents clean testing |

**Proceed with cleanup?** (yes/no/skip-small/only-report)
```

Wait for user confirmation before applying fixes.

### 8. Execute Fixes (Small Issues)

For each confirmed small issue:

1. **Check for uncommitted changes** in target file:
   - If dirty: WARN user, ask to stash or commit first

2. **Apply fix**:
   - Remove debugging artifacts
   - Remove confirmed dead code
   - Replace hardcoded values with config references

3. **Validate fix**:
   - Run project linter on modified file (if available)
   - Ensure no syntax errors introduced

4. **Track changes** for summary (do not commit yet)

### 9. Run Project Validation

After all small fixes applied:

1. **Run linter** (if detected in step 4):
   - `npm run lint` / `yarn lint`
   - `ruff check --fix` / `black .`
   - `go fmt ./...`
   - Fix any new violations introduced

2. **Run tests** (if test runner detected):
   - `npm test` / `pytest` / `go test ./...`
   - If tests fail: ROLLBACK fixes, report failure, ask user how to proceed

3. **Verify no regressions**:
   - All previously passing tests still pass
   - No new linter errors

### 10. Create Tasks for Medium Issues

If user confirmed, append to FEATURE_DIR/tasks.md:

```markdown
---

## Tech Debt Tasks (Generated by /speckit.cleanup)

**Generated**: [ISO DATE]
**Source**: Post-implementation cleanup of [FEATURE NAME]
**Priority**: Address before next feature iteration

### Detected Issues

- [ ] TD001 [P] Add error handling to [function] in [file:line] - missing try/catch on external API call
- [ ] TD002 Extract duplicate validation logic from [file1], [file2] into shared utility
- [ ] TD003 [P] Add JSDoc documentation to public methods in [module]
- [ ] TD004 Enable or remove skipped test in [test file] - currently disabled without explanation
```

**ID Assignment**:
- Check existing TD### IDs in tasks.md
- Start from max(existing) + 1 to avoid conflicts
- If no existing TD tasks, start at TD001

### 11. Generate Analysis for Large Issues

Create FEATURE_DIR/tech-debt-report.md:

```markdown
# Tech Debt Report: [FEATURE NAME]

**Generated**: [ISO DATE]
**Feature**: [FEATURE_DIR]
**Spec Reference**: [link to spec.md]

## Executive Summary

| Severity | Count | Immediate Action Required |
|----------|-------|---------------------------|
| Critical | 0 | None (or cleanup was halted) |
| Large | X | Review and prioritize |
| Medium | X | Tasks created in tasks.md |
| Small | X | Fixed during cleanup |

## Large Issues Requiring Analysis

### [ISSUE-001] [Descriptive Title]

**Category**: [Architecture / Security / Performance / Design]
**Location**: [file:line or module scope]
**Related Spec**: [Which requirement/story this affects]
**Constitution Impact**: [Which principles apply]

#### Problem Description

[Clear explanation of what the issue is, how it was detected, and why it matters]

#### Impact if Not Addressed

- [Concrete impact 1]
- [Concrete impact 2]
- [Risk assessment]

#### Options

**Option 1: [Name] (Recommended)**
- **Approach**: [What to do]
- **Pros**: [Benefits]
- **Cons**: [Drawbacks]
- **Effort**: [T-shirt size: S/M/L/XL]
- **Risk**: [Low/Medium/High]

**Option 2: [Name]**
- **Approach**: [What to do]
- **Pros**: [Benefits]
- **Cons**: [Drawbacks]
- **Effort**: [T-shirt size]
- **Risk**: [Low/Medium/High]

**Option 3: Defer**
- **Approach**: Document and revisit later
- **Pros**: No immediate effort
- **Cons**: [Technical debt accumulation, risks]
- **Recommended deferral period**: [timeframe or trigger]

#### Recommendation

[Which option and why, with specific next steps]

---

[Repeat for each large issue]

## Cross-References

- **Specification**: FEATURE_DIR/spec.md
- **Implementation Plan**: FEATURE_DIR/plan.md
- **Tasks**: FEATURE_DIR/tasks.md (Tech Debt section)
- **Constitution**: .specify/memory/constitution.md

## Next Steps

1. Review this report with stakeholders
2. Decide on approach for each large issue
3. Create implementation tasks for approved remediations
4. Run `/speckit.implement` to address TD tasks
5. Re-run `/speckit.cleanup` to verify resolution
```

### 12. Commit Changes (with user approval)

If small fixes were applied and validation passed:

```markdown
Ready to commit cleanup fixes:
- X files modified
- Y debugging artifacts removed
- Z dead code lines removed

Commit message:
"chore(cleanup): remove debugging artifacts and dead code

- Remove console.log statements from api handlers
- Remove unused imports in utils module
- [list other changes]

Generated by /speckit.cleanup"

**Commit these changes?** (yes/no/amend-message)
```

### 13. Generate Cleanup Summary

Output final report:

```markdown
## Cleanup Complete

### Summary
| Category | Found | Fixed | Tasks Created | In Report |
|----------|-------|-------|---------------|-----------|
| Critical | 0 | - | - | - |
| Small | X | X | - | - |
| Medium | X | - | X | - |
| Large | X | - | - | X |

### Files Modified
- src/api/handler.ts (removed 2 console.log)
- src/utils/parser.ts (removed unused import)

### Artifacts Updated
- [x] FEATURE_DIR/tasks.md - Added Tech Debt Tasks section (X tasks)
- [x] FEATURE_DIR/tech-debt-report.md - Created with X large issues

### Validation Status
- [x] Linter: No violations
- [x] Tests: All passing (X tests)
- [x] Constitution: No violations

### Recommended Next Steps
1. Review tech-debt-report.md for large issues
2. Run `/speckit.implement` to address TD tasks when ready
3. Consider running `/speckit.analyze` to verify overall consistency
```

## Operating Principles

### Scout Rule
"Always leave the code cleaner than you found it." Small issues are fixed immediately - but always with user visibility and confirmation.

### Proportional Response
Match effort to issue severity:
- SMALL → Fix now (minutes)
- MEDIUM → Task for next sprint (hours)
- LARGE → Analyze and decide (days, needs discussion)

### Non-Destructive by Default
- Always confirm before modifying files
- Never force-fix issues that might be intentional
- Large issues get analysis, not automatic fixes
- Rollback if validation fails

### Constitution Compliance
Every cleanup action must respect constitution principles. When in conflict, constitution wins - escalate to large issue rather than violating principles.

### Traceability
All outputs stay in FEATURE_DIR:
- Links tech debt to the feature that introduced it
- Enables re-running `/speckit.implement` for follow-ups
- Supports audit trail: Spec → Plan → Tasks → Implement → Cleanup

### Idempotency
Safe to run multiple times:
- Already-fixed issues won't be re-fixed
- Task IDs increment from existing max
- tech-debt-report.md regenerated with current state
- Validation re-runs each time
