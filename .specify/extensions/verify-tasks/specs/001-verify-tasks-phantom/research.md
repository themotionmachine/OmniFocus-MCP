# Research: Verify-Tasks Phantom Completion Detector

**Date**: 2026-03-12
**Feature Branch**: `001-verify-tasks-phantom`

---

## R-001: Spec-Kit Extension Command Structure

### Decision

Implement `/speckit.verify-tasks` as a standard spec-kit prompt-driven extension using a single markdown command file with YAML frontmatter (`description`, `handoffs`), `## User Input` section with `$ARGUMENTS` placeholder, and `## Outline` section with numbered execution steps. The command calls `check-prerequisites.sh --json` for feature-directory discovery, then executes verification logic using agent-native capabilities.

### Rationale

All existing spec-kit commands (`.github/prompts/speckit.*.prompt.md`) follow this exact pattern. This ensures multi-agent compatibility (Claude Code, GitHub Copilot, Gemini CLI, Cursor, Windsurf) without agent-specific adaptations. Users familiar with `/speckit.plan`, `/speckit.implement`, etc., will immediately recognize the structure.

### Alternatives Considered

- **Agent-specific implementations** (Python for Claude Code, JS for Copilot): Violates Constitution Principle III (Pure Prompt Architecture); breaks multi-agent compatibility.
- **Custom YAML config + separate prompt file**: Adds complexity; spec-kit uses single `.md` file per command.
- **REST API / external service**: Requires infrastructure outside the repo; breaks offline capability.

---

## R-002: Task File Parsing Strategy

### Decision

Parse `tasks.md` using permissive pattern matching. Extract tasks with checkbox syntax `- [X]` (complete) and `- [ ]` (incomplete). Task IDs are the first identifier-like token after the checkbox — accept numeric (`1.1`, `2.3.1`), prefixed (`T-003`, `FEAT-05`), or mixed formats. File paths are extracted from task descriptions (exact paths like `src/models/user.py`, glob patterns like `tests/**/*.test.js`, directory references). Subtasks (indented) are verified independently from parents — no verdict roll-up.

### Rationale

The spec-kit `tasks-template.md` uses format `[ID] [P] [Story] Description` with `[P]` for parallel and `[Story]` for user story association. The feature spec explicitly states flexible ID parsing. Permissive parsing ensures compatibility with pre-existing task lists using custom numbering schemes (GitHub issue numbers, Jira keys, etc.).

### Alternatives Considered

- **Strict format enforcement** (IDs must be `T-###`): Breaks compatibility with existing task lists; adds friction.
- **Require YAML/JSON task structure**: Conflicts with spec-kit markdown-based conventions.
- **Skip subtasks** (flat list only): Loses expressiveness for complex features; ignores real task structures.

---

## R-003: Dead-Code Detection via Shell Commands

### Decision

Implement Layer 4 (Wiring Verification) using a multi-pass grep + git-grep strategy:

1. **Symbol Definition Check**: `grep -n` for definition patterns (`def`, `class`, `function`, `export`, `const`) in the target file.
2. **Cross-Repository Reference Scan**: `git grep -n "symbol" -- src/ tests/` excluding the definition line itself. Looks for imports, calls, and references.
3. **Scope-Aware Diff Check**: `git diff "$SCOPE" -- "path/to/file" | grep -q "^+.*symbol"` to confirm the symbol was actually added/modified in scope.
4. **Verdict Assignment**:
   - Definition exists AND external references found → WIRED (supports VERIFIED)
   - Definition exists BUT no external references → DEAD CODE → PARTIAL
   - Definition missing → NOT_FOUND
   - Symbol only in strings/comments → filter as false positive, report WEAK if ambiguous

Language-agnostic patterns work for Python (`def`/`class`/`import`), JavaScript/TypeScript (`export`/`function`/`const`/`import`), Java (`public class`/`new`/`import`), and other common languages.

### Rationale

Uses only tools present on every development machine (`grep`, `git grep`). No compilers, type checkers, or language runtimes required. Enables verification across all language ecosystems without per-language plugins. Multi-pass approach balances precision (distinguish "exists but unused" from "missing") with simplicity (basic text search).

### Alternatives Considered

- **Language-specific linters** (eslint, pylint, clippy): Non-portable; not all agents have all tools; requires per-language configuration.
- **AST-based analysis** (tree-sitter, babel): Requires external binaries; not agent-native.
- **Coverage/instrumentation tools**: Requires running tests; too intrusive for spec-driven verification context.

---

## R-004: Git Diff Scoping Patterns

### Decision

Support four diff scopes matching the spec-kit ecosystem:

| Scope | Command Pattern | Use Case |
|-------|----------------|----------|
| `branch` | `git diff origin/main...HEAD` | Code review: what changed on this feature branch? |
| `uncommitted` | `git diff HEAD` | Mid-session: what's changed locally? |
| `plan-anchored` | `git log --since="$PLAN_DATE" --name-only` | Timeline-tied: what changed since planning? |
| `all` (default) | `git diff origin/main..HEAD` + `git status` | Post-mortem audit: everything inclusive |

Base branch detection: try `origin/main`, `origin/master`, `origin/develop`, `main`, `master` in order.

Graceful degradation: when git is unavailable (no `.git`, shallow clone, no history), skip Layer 2 entirely, note the limitation in the report, and continue with remaining layers.

### Rationale

Default to `all` (most inclusive) per Constitution Principle VIII (Scope Flexibility) to minimize false negatives — the catastrophic failure mode per Principle I (Asymmetric Error Model). Four-scope model gives users flexibility for different workflows. Graceful git-absence handling ensures the extension works in degraded environments.

### Alternatives Considered

- **Single fixed scope** (always `branch`): Overly restrictive; different workflows need different scopes.
- **Automatic scope detection** (guess from commit history): Error-prone; may guess wrong; violates Principle I.
- **Require explicit scope every invocation** (no default): Poor UX; most users don't think about scope.

---

## R-005: Verification Report Format

### Decision

Produce a structured markdown report (`verify-tasks-report.md`) with:

1. **Header**: Feature name, date, scope, task counts
2. **Fresh-Session Advisory Banner**: Prominent reminder per Constitution Principle II
3. **Summary Scorecard**: Counts per evidence level (VERIFIED, PARTIAL, WEAK, NOT_FOUND, SKIPPED)
4. **Flagged Items Section**: NOT_FOUND first, then PARTIAL, then WEAK — each with task ID, evidence level emoji, one-line summary, and expandable detail showing per-layer results
5. **Verified Items Section**: VERIFIED and SKIPPED tasks listed after flagged items
6. **Per-Task Detail**: Each task row shows task ID, verdict emoji, summary, and what each verification layer found

Machine-parseable: each task verdict on a single line as `| TASK_ID | EMOJI VERDICT | summary |` enabling extraction via simple text pattern.

### Rationale

Per Constitution Principle V (Structured, Parseable Output) and FR-020–FR-025. Severity-ordered presentation (flagged first) directs attention to problems. Machine-parseable format enables downstream tooling (CI gates, dashboards). Single canonical report file per feature (FR-036) — overwritten on each run.

### Alternatives Considered

- **JSON report**: Machine-friendly but not human-readable without tooling.
- **HTML report**: Rich formatting but requires a browser; overkill for markdown-based workflows.
- **Separate summary + detail files**: Adds file management complexity; single file is simpler.

---

## R-006: Evidence Level Assignment Logic

### Decision

Assign evidence levels based on the combined results of all applicable verification layers:

| Verdict | Criteria |
|---------|----------|
| `✅ VERIFIED` | ALL applicable mechanical layers (1–4) produce positive evidence |
| `🔍 PARTIAL` | Some mechanical layers pass, but at least one finds a gap (e.g., file exists but not in diff scope, or symbol declared but never referenced) |
| `⚠️ WEAK` | Only semantic assessment (Layer 5) provides evidence, OR mechanical evidence is ambiguous (e.g., symbol found only in comments/strings) |
| `❌ NOT_FOUND` | No evidence of implementation across any layer — probable phantom completion |
| `⏭️ SKIPPED` | Task has no mechanically verifiable indicators (no file paths, no code references, purely behavioral description) |

Key rules:

- Semantic assessment (Layer 5) alone NEVER yields VERIFIED for mechanically verifiable tasks (Principle I, FR-008)
- Ambiguous evidence → PARTIAL or WEAK, never VERIFIED (Principle I)
- Each layer independently flags — failure at any single layer prevents VERIFIED (FR-006)

### Rationale

Per Constitution Principle I (Asymmetric Error Model): false negatives are catastrophic, false positives are acceptable cost. The evidence-level hierarchy ensures aggressive detection while giving developers actionable severity-ordering for remediation.

### Alternatives Considered

- **Binary pass/fail**: Loses nuance; developers can't prioritize fixes.
- **Numeric confidence score**: More complex to implement and interpret; emoji-based verdicts are immediately readable.
- **Per-layer separate verdicts** (no rollup): Too granular for summary view; combined verdict is more actionable.
