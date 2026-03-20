<!--
Sync Impact Report
===================
- Version change: N/A → 1.0.0 (initial ratification)
- Principles added:
  - I. Asymmetric Error Model
  - II. Agent Independence
  - III. Pure Prompt Architecture
  - IV. Verification Cascade
  - V. Structured, Parseable Output
  - VI. Minimal Footprint
  - VII. No Codebase Modification
  - VIII. Scope Flexibility
- Sections added:
  - Coding Standards (Article IX)
  - Testing & Validation (Article X)
  - Governance
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no changes needed
  - .specify/templates/spec-template.md ✅ no changes needed
  - .specify/templates/tasks-template.md ✅ no changes needed
  - .specify/templates/constitution-template.md ✅ source template
- Agent/command files checked:
  - .github/prompts/*.prompt.md ✅ no outdated references
  - .github/agents/*.agent.md ✅ no outdated references
- Follow-up TODOs: None
-->

# verify-tasks Constitution

## Core Principles

### I. Asymmetric Error Model

False negatives (a phantom completion that goes undetected) are the
catastrophic failure mode. False positives (a correctly-completed task
flagged for human review) are an acceptable cost.

- Every design decision, verification heuristic, and prompt framing
  MUST favor aggressive detection over comfortable confirmation.
- When evidence is ambiguous, the verdict MUST be PARTIAL or WEAK,
  never VERIFIED.
- A task reaches VERIFIED only when ALL applicable verification layers
  produce positive evidence.

**Rationale**: The tool exists to catch mistakes. A missed phantom
completion defeats the entire purpose; a false alarm costs only a
brief human review.

### II. Agent Independence

Verification MUST run in a session that is independent of the
implementing agent.

- The extension's documentation and command prompt MUST instruct users
  to invoke `/speckit.verify-tasks` in a fresh agent session, not in
  the same session that ran `/speckit.implement`.
- The implementing agent's context biases it toward confirming its own
  work.
- Fresh-session verification is not optional — it is a core principle
  of the tool's reliability model.

**Rationale**: An agent that just wrote the code carries context that
makes it predisposed to believe the code is correct. Independent
verification eliminates this confirmation bias.

### III. Pure Prompt Architecture

The extension is 100% prompt-driven for all verification logic. No
Python scripts, no external dependencies beyond the standard spec-kit
`check-prerequisites` shell script.

- The agent uses its native capabilities (file reading, shell commands
  such as `grep`, `find`, `git diff`, `git log`) to perform
  verification.
- Implementation details that would require agent-specific tooling are
  prohibited.
- The extension MUST work on Claude Code, GitHub Copilot, Gemini CLI,
  Cursor, Windsurf, and any future spec-kit supported agent.

**Rationale**: Multi-agent compatibility is non-negotiable. Prompt-only
logic is the only approach that works across all supported agents
without per-agent adaptation.

### IV. Verification Cascade

Each `[X]` task is verified through a layered cascade. Each layer is
independently capable of flagging a task. Layers are ordered from
cheapest/most-deterministic to most-expensive/most-interpretive:

1. **File existence** — does the referenced path exist?
2. **Git diff presence** — was the file modified in the relevant scope?
3. **Content pattern matching** — do expected symbols appear in the
   file?
4. **Wiring verification** — are declared symbols actually referenced,
   called, or imported?
5. **Semantic assessment** — does the behavior described in the task
   appear to be implemented?

- A task that fails any layer from 1–4 MUST NOT be VERIFIED regardless
  of what layer 5 concludes.
- Semantic assessment alone is NEVER sufficient for a VERIFIED verdict
  on a task that has mechanically verifiable indicators.

**Rationale**: Mechanical checks are objective and reproducible.
Semantic assessment is subjective and agent-dependent. The cascade
ensures objective evidence always takes precedence.

### V. Structured, Parseable Output

The verification report MUST be structured markdown that is both
human-readable and machine-parseable.

- Each task verdict MUST include the task ID, evidence level emoji, a
  one-line summary, and expandable detail showing what each
  verification layer found.
- The summary scorecard MUST appear first, before per-task details.
- Flagged items (NOT_FOUND, WEAK, PARTIAL) MUST appear before VERIFIED
  items.

**Rationale**: Structured output enables downstream tooling (dashboards,
CI gates) while remaining immediately useful to a human reviewer.

### VI. Minimal Footprint

The extension ships as a spec-kit extension with exactly one slash
command (`/speckit.verify-tasks`), one command markdown file, and
optionally one thin shell script for feature-directory discovery.

- No additional templates, no memory files, no configuration files
  beyond the standard `extension.yml` manifest.
- The verification report is written to the feature's spec directory
  alongside `tasks.md`, not to a separate output directory.

**Rationale**: A verification tool MUST NOT introduce its own
complexity burden. Minimal footprint ensures the extension remains
easy to audit, install, and maintain.

### VII. No Codebase Modification

The extension MUST NEVER modify source code, task files, or any
spec-kit artifacts. It is strictly a read-only verification and
reporting tool.

- The agent may offer to fix gaps interactively after presenting
  findings, but this is a separate user-approved action, not part of
  the verification command itself.
- The verification report is the only file the command creates.

**Rationale**: A verification tool that mutates the codebase cannot be
trusted to report objectively on its state. Read-only operation is a
prerequisite for audit integrity.

### VIII. Scope Flexibility

The extension MUST support the same diff-scope options as core spec-kit
commands: branch, uncommitted, plan-anchored, and all.

- The scope determines which changes the verification cascade considers
  as "evidence of implementation."
- The default scope MUST be the most inclusive option (all changes) to
  minimize the chance of missing evidence that exists but falls outside
  a narrow diff window.

**Rationale**: Overly narrow default scopes create false negatives —
the catastrophic failure mode per Article I.

## Coding Standards

### IX. Extension Conventions

All command markdown MUST follow spec-kit extension conventions:

- YAML frontmatter with `description` and `handoffs` fields.
- `## User Input` section with `$ARGUMENTS` placeholder.
- `## Outline` section with numbered steps.

Shell scripts (if any) MUST follow spec-kit conventions:

- Bash with `set -euo pipefail`.
- JSON output for structured data.
- Reuse of `common.sh` utilities where applicable.
- K&R formatting for brace style.
- Doxygen-style headers for documentation sections.

The extension repository is licensed under MIT by dataStone Inc.

## Testing & Validation

### X. Verification Test Suite

The extension MUST be validated against known phantom completion cases
before release. At minimum, the test suite MUST include:

1. A synthetic `tasks.md` with planted phantom completions that the
   verification cascade MUST detect.
2. A synthetic `tasks.md` where all tasks are genuinely complete and
   the cascade MUST NOT produce false NOT_FOUND verdicts.
3. Edge cases including:
   - Tasks with no file paths.
   - Tasks with only behavioral descriptions.
   - Tasks that reference files outside the diff scope.

Test cases are markdown files in a `tests/` directory with expected
verdicts documented alongside them.

## Governance

This constitution is the authoritative governance document for the
verify-tasks extension. All design decisions, code reviews, and prompt
authoring MUST comply with the principles defined herein.

- **Precedence**: This constitution supersedes all other development
  practices and conventions for this repository. In case of conflict,
  the constitution wins.
- **Amendment procedure**: Amendments require documentation of the
  change rationale, explicit version bump per semantic versioning, and
  review by at least one maintainer.
- **Versioning policy**:
  - MAJOR: Backward-incompatible principle removals or redefinitions.
  - MINOR: New principle or section added, or materially expanded
    guidance.
  - PATCH: Clarifications, wording, typo fixes, non-semantic
    refinements.
- **Compliance review**: Every PR MUST be checked against this
  constitution. Violations MUST be resolved before merge.

**Version**: 1.0.0 | **Ratified**: 2026-03-12 | **Last Amended**: 2026-03-12
