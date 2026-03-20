# Feature Specification: Verify-Tasks Phantom Completion Detector

**Feature Branch**: `001-verify-tasks-phantom`
**Created**: 2026-03-12
**Status**: Draft
**Input**: User description: "Build a spec-kit extension called verify-tasks that detects phantom completions in task-based spec-driven development workflows"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Post-Implementation Verification (Priority: P1)

As a developer who has just completed `/speckit.implement`, I want to verify that every task marked `[X]` in `tasks.md` has corresponding evidence of implementation in the codebase, so that I can catch phantom completions before they reach code review or production.

**Why this priority**: This is the primary use case — the reason the extension exists. Without this, phantom completions go undetected and surface only as bugs in testing or production.

**Independent Test**: Can be fully tested by creating a `tasks.md` with a mix of genuinely completed and phantom-completed tasks, running `/speckit.verify-tasks`, and confirming that all phantoms are flagged while genuine completions are verified.

**Acceptance Scenarios**:

1. **Given** a feature directory with a `tasks.md` containing 10 tasks marked `[X]` (8 genuinely implemented, 2 phantoms), **When** the user runs `/speckit.verify-tasks`, **Then** the tool produces a verification report with the 2 phantom tasks flagged as `NOT_FOUND` or `PARTIAL`, and the 8 genuine tasks marked `VERIFIED` or `WEAK`.
2. **Given** a `tasks.md` where all `[X]` tasks are genuinely implemented, **When** the user runs `/speckit.verify-tasks`, **Then** no tasks are flagged as `NOT_FOUND` and the summary scorecard shows all tasks as `VERIFIED` or `WEAK`.
3. **Given** a `tasks.md` with tasks referencing files that do not exist, **When** the user runs `/speckit.verify-tasks`, **Then** those tasks are flagged as `NOT_FOUND` at the file-existence verification layer.
4. **Given** a task that declares a function but the function is never imported, called, or referenced elsewhere, **When** the user runs `/speckit.verify-tasks`, **Then** the task is flagged as `PARTIAL` due to dead-code detection.

---

### User Story 2 — Targeted Re-Verification After Fixes (Priority: P2)

As a developer who has fixed issues flagged by a previous verification run, I want to re-run verification on specific tasks I fixed, so that I can confirm the gaps are closed without re-checking the entire task list.

**Why this priority**: After the initial verification catches phantoms, developers need a fast feedback loop to confirm their fixes. Without targeted re-verification, the developer must re-run the full verification every time.

**Independent Test**: Can be tested by running a full verification, fixing one flagged task, then re-running with a task filter and confirming only the specified task is re-checked and now passes.

**Acceptance Scenarios**:

1. **Given** a previous verification report flagging task T-003 as `NOT_FOUND`, and the developer has since implemented the missing code, **When** the user runs `/speckit.verify-tasks` with a task filter for T-003, **Then** the report shows T-003 as `VERIFIED` and does not re-evaluate other tasks.
2. **Given** the user specifies multiple task IDs to re-verify, **When** `/speckit.verify-tasks` runs, **Then** only those tasks are evaluated and reported.

---

### User Story 3 — Historical Branch Verification (Priority: P3)

As a developer reviewing a previously-completed feature branch, I want to run verify-tasks against the branch's task list and diff, so that I can assess whether any phantom completions exist in already-completed work.

**Why this priority**: Phantom completions in merged work can cause latent bugs. Being able to retroactively verify provides confidence in existing features and helps prioritize technical-debt remediation.

**Independent Test**: Can be tested by checking out a historical feature branch with a completed `tasks.md`, running `/speckit.verify-tasks` with a branch-scoped diff, and confirming the report correctly identifies the implementation state.

**Acceptance Scenarios**:

1. **Given** a feature branch that was completed and merged weeks ago, with its `tasks.md` and full commit history available, **When** the user checks out that branch and runs `/speckit.verify-tasks`, **Then** the verification report reflects the actual state of the code against the task list.
2. **Given** a historical branch where a task was marked complete but the corresponding file was later deleted in a subsequent commit, **When** the user runs `/speckit.verify-tasks`, **Then** that task is flagged as `NOT_FOUND`.

---

### User Story 4 — Interactive Flagged-Item Walkthrough (Priority: P2)

As a developer reviewing a verification report, I want the tool to walk me through each flagged item interactively, explaining the evidence gap and offering to investigate further or attempt a fix, so that I can resolve issues efficiently.

**Why this priority**: The verification report identifies problems, but developers need guided resolution. The interactive walkthrough turns detection into action.

**Independent Test**: Can be tested by running verification on a codebase with known gaps and confirming the tool presents each flagged item with an explanation, the specific layer that failed, and offers to investigate or fix.

**Acceptance Scenarios**:

1. **Given** a verification report with 3 flagged tasks, **When** the interactive walkthrough begins, **Then** each flagged item is presented in severity order (NOT_FOUND first, then PARTIAL, then WEAK) with a description of what evidence was expected and what was found.
2. **Given** a flagged task where the developer approves a fix attempt, **When** the agent proposes a fix, **Then** the fix is only applied after explicit user confirmation — no automatic code modification occurs.

---

### Edge Cases

- What happens when `tasks.md` contains no `[X]` marked tasks? The tool reports "No completed tasks found to verify" and exits cleanly.
- What happens when a task references files using glob patterns or directory paths rather than specific file names? The tool expands globs to match existing files and verifies each matched file.
- What happens when a task has no file paths, no code references, and only a behavioral description? The task is evaluated via semantic assessment only and assigned `WEAK` or `SKIPPED` as appropriate.
- What happens when the git history is unavailable (shallow clone, no git)? The git-diff verification layer is skipped, and the tool relies on the remaining layers (file existence, content grep, dead-code detection, semantic assessment). The report notes that git-based verification was unavailable.
- What happens when a task references a file that exists but was not modified in the relevant diff scope? The task is flagged as `PARTIAL` — the file exists but there is no diff evidence of implementation within the specified scope.
- What happens when `tasks.md` has malformed task entries (missing IDs, broken checkbox syntax)? The tool reports a parsing warning for each malformed entry and continues with the tasks it can parse.
- How does the tool reinforce the fresh-session recommendation? Every verification run begins with a prominent advisory banner reminding the user to run this command in a separate session from implementation, per the Agent Independence principle. This is documentation-level guidance, not runtime detection — no agent environment reliably exposes session identity.
- What happens when `/speckit.verify-tasks` is run a second time on the same feature? The previous verification report is overwritten. The report reflects the current state, not a history. There is one canonical report file per feature.

## Clarifications

### Session 2026-03-12

- Q: When `/speckit.verify-tasks` is run again on the same feature, what happens to the previous report? → A: Overwrite — each run replaces the single report file, reflecting only the latest verification state.
- Q: When a parent task is marked `[X]` and has nested `[X]` subtasks, how is the parent verified? → A: Independent — parent and subtasks are each verified on their own merits; no roll-up.
- Q: For large task lists, should the extension batch tasks to manage context-window pressure? → A: No — process all tasks sequentially in a single pass, consistent with how existing spec-kit commands (`/speckit.implement`, `/speckit.plan`) operate. Context management is the agent's responsibility.
- Q: What task ID format should the parser expect? → A: Flexible — extract any identifier token from the task line (numeric, hierarchical, or prefixed); no fixed format assumed.

## Requirements *(mandatory)*

### Functional Requirements

#### Task Parsing

- **FR-001**: The extension MUST parse `tasks.md` and extract all tasks marked `[X]` (complete), including task IDs, descriptions, specified file paths, acceptance criteria, and inline code references. Task IDs are extracted flexibly — the parser accepts any identifier token format (numeric like `1.1`, hierarchical like `2.3.1`, prefixed like `T-003`, etc.) without assuming a fixed numbering convention.
- **FR-002**: The extension MUST ignore tasks marked `[ ]` (incomplete) — they are out of scope for verification.
- **FR-003**: The extension MUST handle `tasks.md` files that follow the standard spec-kit task format, including nested subtasks and task groups. Parent tasks and their subtasks are verified independently — each task is evaluated on its own description and file references. Subtask verdicts do not roll up to or influence the parent verdict.
- **FR-004**: The extension MUST report a warning for any task entry it cannot parse and continue processing remaining tasks.

#### Verification Cascade

- **FR-005**: The extension MUST perform a five-layer verification cascade for each `[X]` task, in order: file existence, git diff cross-reference, content pattern matching, dead-code detection, and semantic assessment.
- **FR-006**: Each verification layer MUST be independently capable of flagging a task — failure at any single layer is sufficient to prevent a `VERIFIED` verdict.
- **FR-007**: A task MUST reach `VERIFIED` only when ALL applicable mechanical layers (1–4) produce positive evidence.
- **FR-008**: Semantic assessment (layer 5) alone MUST NEVER be sufficient for a `VERIFIED` verdict on a task that has mechanically verifiable indicators.

##### Layer 1 — File Existence

- **FR-009**: For each file path referenced in a task, the extension MUST check whether the file exists in the repository at the expected path.

##### Layer 2 — Git Diff Cross-Reference

- **FR-010**: The extension MUST check whether the files referenced by a task were modified within the specified diff scope (branch diff, uncommitted changes, plan-anchored, or all changes).
- **FR-011**: The extension MUST support the same diff-scope options as other spec-kit commands: branch, uncommitted, plan-anchored, and all.
- **FR-012**: The default diff scope MUST be the most inclusive option (all changes) to minimize the risk of false negatives.
- **FR-013**: When git history is unavailable, the extension MUST skip this layer gracefully, note the limitation in the report, and continue with remaining layers.

##### Layer 3 — Content Pattern Matching

- **FR-014**: The extension MUST search modified files for expected symbols, patterns, or behaviors described in the task (function names, type definitions, configuration entries, filter logic, etc.).

##### Layer 4 — Dead-Code Detection

- **FR-015**: For symbols that exist in the codebase, the extension MUST check whether they are actually wired up — referenced, called, or imported by other code — or are declared but unused.
- **FR-016**: A symbol that exists but is never referenced, called, or imported MUST be flagged as potential dead code masquerading as implementation.

##### Layer 5 — Semantic Assessment

- **FR-017**: For tasks that cannot be verified mechanically (behavioral requirements, UX constraints, integration behaviors), the extension MUST perform a best-effort semantic assessment by reading relevant files and reasoning about whether the described behavior is present.
- **FR-018**: The extension MUST clearly label semantic assessment results as interpretive and distinguish them from mechanical verification results.

#### Evidence Levels

- **FR-019**: The extension MUST assign each `[X]` task one of five evidence levels:
  - `✅ VERIFIED` — All mechanical checks pass, strong evidence of implementation
  - `🔍 PARTIAL` — Some evidence found but gaps exist
  - `⚠️ WEAK` — Evidence is indirect or requires semantic interpretation
  - `❌ NOT_FOUND` — No evidence of implementation despite `[X]` marking (probable phantom completion)
  - `⏭️ SKIPPED` — Task has no mechanically verifiable indicators; noted but not assessed

#### Verification Report

- **FR-020**: The extension MUST produce a structured markdown verification report.
- **FR-021**: The report MUST include a summary scorecard showing counts per evidence level at the top.
- **FR-022**: The report MUST include per-task detail rows showing what was checked and what was found.
- **FR-023**: Flagged items (NOT_FOUND, WEAK, PARTIAL) MUST appear before VERIFIED items in the report, sorted by severity (NOT_FOUND first).
- **FR-024**: The report MUST be written to the feature's spec directory alongside `tasks.md`.
- **FR-025**: The report MUST be both human-readable and machine-parseable structured markdown.

#### Interactive Walkthrough

- **FR-026**: After producing the report, the extension MUST interactively walk the user through flagged items, explaining the evidence gap for each.
- **FR-027**: For each flagged item, the extension MUST offer to investigate further or attempt a fix.
- **FR-028**: Any code modification proposed during the walkthrough MUST require explicit user approval before being applied.

#### Targeted Re-Verification

- **FR-029**: The extension MUST support a task-filter option that allows the user to specify individual task IDs for re-verification instead of checking all `[X]` tasks.
- **FR-030**: When a task filter is active, only the specified tasks are evaluated and reported on.

#### Scope and Architecture

- **FR-031**: The extension MUST be installable as a standalone spec-kit extension via `specify extension add`, with no modifications to core spec-kit files.
- **FR-032**: The extension MUST provide a single slash command: `/speckit.verify-tasks`.
- **FR-033**: The extension MUST work across all spec-kit supported agents (Claude Code, GitHub Copilot, Gemini CLI, Cursor, Windsurf) using prompt-driven verification logic only — no external scripts beyond the standard `check-prerequisites` shell script.
- **FR-034**: The extension MUST NOT modify source code, task files, or any spec-kit artifacts during verification. The verification report is the only file the command creates.
- **FR-035**: The extension MUST display a prominent fresh-session advisory at the start of every verification run, reminding the user that verification is most reliable when performed in a separate agent session from the one that ran `/speckit.implement`. This is a static banner, not a runtime detection — agent environments do not reliably expose session identity across all supported platforms.
- **FR-036**: When a verification report already exists in the feature directory, a subsequent run MUST overwrite it. There is one canonical report file per feature, reflecting only the latest verification state.

### Key Entities

- **Task**: A single work item from `tasks.md` with an ID (any format — numeric, hierarchical, or prefixed), description, completion status (`[X]` or `[ ]`), optional file paths, acceptance criteria, and inline code references. Only `[X]` tasks are subject to verification.
- **Verification Layer**: One step in the five-layer verification cascade. Each layer independently produces evidence (positive, negative, or not-applicable) for a given task.
- **Evidence Level**: The overall verdict assigned to a task after all applicable verification layers have been evaluated. One of: VERIFIED, PARTIAL, WEAK, NOT_FOUND, SKIPPED.
- **Verification Report**: A structured markdown document containing the summary scorecard, per-task detail rows, and flagged items. Written to the feature's spec directory.
- **Diff Scope**: The range of changes considered as evidence of implementation. Options: branch (changes relative to base branch), uncommitted (staged and unstaged local changes), plan-anchored (changes since plan creation), all (everything — the default).
- **Phantom Completion**: A task marked `[X]` where the corresponding code is missing, incomplete, or not to specification. The primary failure mode this extension is designed to detect.

## Assumptions

- The user has a valid spec-kit project with a `tasks.md` file following the standard spec-kit task format.
- The user has git installed and the repository has commit history available for diff-based verification. When git is unavailable, the tool degrades gracefully by skipping the git-diff layer.
- Tasks in `tasks.md` reference specific file paths or identifiable code symbols in most cases. Tasks that are purely behavioral may only be assessable via semantic evaluation.
- The spec-kit extension installation mechanism (`specify extension add`) is available and follows the standard spec-kit extension conventions (YAML frontmatter, `## User Input`, `## Outline` structure).
- The implementing agent and the verifying agent have equivalent file-system and tool-use capabilities (read files, run shell commands like `grep`, `find`, `git diff`).
- The extension processes all `[X]` tasks sequentially in a single pass, consistent with existing spec-kit command patterns. Context-window management is the agent's responsibility, not the command's. SC-003 validates that a 50-task verification completes within session limits.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The extension detects 100% of planted phantom completions in a synthetic test suite containing at least 5 distinct phantom failure modes (missing file, empty file, declared-but-unused symbol, wrong file modified, behavioral gap).
- **SC-002**: The extension produces zero `NOT_FOUND` false positives when run against a synthetic test suite where all tasks are genuinely and correctly implemented.
- **SC-003**: Verification of a 50-task `tasks.md` completes within the context limits of a single agent session (no session overflow or truncation).
- **SC-004**: The verification report is parseable — each task verdict can be extracted by a straightforward text pattern (task ID + evidence level emoji + summary on a single line).
- **SC-005**: Users can complete the full verify-then-fix workflow (run verification, review flagged items, fix gaps, re-verify fixed tasks) in under 30 minutes for a typical feature with 20–50 tasks.
- **SC-006**: The extension installs and runs successfully on at least two distinct spec-kit supported agents (e.g., Claude Code and GitHub Copilot) without agent-specific modifications.
- **SC-007**: 90% of users who run the extension on a real project report that the flagged items were actionable (either true phantoms or reasonable to review), based on post-use feedback.
