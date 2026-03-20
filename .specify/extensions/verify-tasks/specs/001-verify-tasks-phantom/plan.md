# Implementation Plan: Verify-Tasks Phantom Completion Detector

**Branch**: `001-verify-tasks-phantom` | **Date**: 2026-03-12 | **Spec**: [spec.md](specs/001-verify-tasks-phantom/spec.md)
**Input**: Feature specification from `/specs/001-verify-tasks-phantom/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a spec-kit extension called `verify-tasks` that detects phantom completions in task-based spec-driven development workflows. The extension provides a single slash command (`/speckit.verify-tasks`) that parses completed tasks from `tasks.md`, runs a five-layer verification cascade (file existence → git diff → content pattern matching → dead-code detection → semantic assessment), and produces a structured markdown verification report. The extension is 100% prompt-driven (no external scripts beyond `check-prerequisites`), works across all spec-kit supported agents, and never modifies source code or task files.

## Technical Context

**Language/Version**: Markdown (prompt files) + Bash (shell scripts, `set -euo pipefail`)
**Primary Dependencies**: spec-kit core (extension conventions, `common.sh` utilities, `check-prerequisites.sh`); agent-native tools (`grep`, `find`, `git diff`, `git log`, file reading)
**Storage**: Filesystem only — reads `tasks.md`, writes a single `verify-tasks-report.md` to the feature's spec directory
**Testing**: Synthetic `tasks.md` test fixtures with planted phantom completions and known-good completions; manual agent-session testing across at least two supported agents (Claude Code + GitHub Copilot)
**Target Platform**: All spec-kit supported agents (Claude Code, GitHub Copilot, Gemini CLI, Cursor, Windsurf) on any OS with git and standard POSIX shell utilities
**Project Type**: spec-kit extension (prompt-driven agent command)
**Performance Goals**: Verification of a 50-task `tasks.md` completes within a single agent session's context limits
**Constraints**: Pure prompt architecture — no Python, no compiled binaries, no external dependencies beyond `check-prerequisites.sh`; read-only operation (only output is the verification report); must work across all supported agents without agent-specific modifications
**Scale/Scope**: Single slash command (`/speckit.verify-tasks`), one command markdown file, optional thin shell script for feature-directory discovery, test fixtures directory

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Asymmetric Error Model | ✅ PASS | Design favors aggressive detection over comfortable confirmation. Ambiguous evidence → PARTIAL/WEAK, never VERIFIED. VERIFIED requires ALL mechanical layers positive. |
| II | Agent Independence | ✅ PASS | Fresh-session advisory banner is included per FR-035. No runtime session detection (correct — agent environments don't expose this reliably). |
| III | Pure Prompt Architecture | ✅ PASS | Extension is 100% prompt-driven. No Python, no compiled binaries. Agent uses native file-read + shell commands (`grep`, `find`, `git diff`). Only shell script is `check-prerequisites.sh`. |
| IV | Verification Cascade | ✅ PASS | Five-layer cascade defined (FR-005–FR-018): file existence → git diff → content pattern matching → dead-code detection → semantic assessment. Each layer independently flags. Semantic alone never yields VERIFIED. |
| V | Structured, Parseable Output | ✅ PASS | Report includes summary scorecard first, per-task detail rows, flagged items sorted by severity before VERIFIED items (FR-020–FR-025). Machine-parseable markdown. |
| VI | Minimal Footprint | ✅ PASS | Single slash command, one command markdown file, optional thin shell script. Report written alongside `tasks.md`. No extra templates, memory files, or config. |
| VII | No Codebase Modification | ✅ PASS | Extension is strictly read-only. Only file created is the verification report. Interactive fixes require explicit user approval (FR-028, FR-034). |
| VIII | Scope Flexibility | ✅ PASS | Supports branch, uncommitted, plan-anchored, and all diff scopes (FR-011). Default is most inclusive (all) per FR-012. |
| IX | Extension Conventions | ✅ PASS | Command markdown will follow spec-kit conventions (YAML frontmatter, `## User Input`, `## Outline`). Shell scripts use `set -euo pipefail`, K&R braces, Doxygen headers. MIT license. |
| X | Verification Test Suite | ✅ PASS | SC-001/SC-002 require synthetic test suites with planted phantoms and known-good completions. Edge cases specified. Test fixtures in `tests/` directory. |

**Gate Result**: ✅ ALL PASS — No violations. Proceeding to Phase 0.

### Post-Design Re-Check (Phase 1 Complete)

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Asymmetric Error Model | ✅ PASS | Evidence level assignment logic (data-model.md) enforces: VERIFIED requires ALL mechanical layers positive. Ambiguous → PARTIAL/WEAK. Semantic alone never VERIFIED. |
| II | Agent Independence | ✅ PASS | Command contract (contracts/command-interface.md) includes fresh-session advisory banner as first element after header. |
| III | Pure Prompt Architecture | ✅ PASS | Single markdown command file. No Python/Node dependencies. Shell commands limited to `grep`, `find`, `git diff`, `git log`. |
| IV | Verification Cascade | ✅ PASS | Five layers defined in data-model.md with per-layer result tracking. Each layer independently flags. Layer results aggregated into TaskVerdict. |
| V | Structured, Parseable Output | ✅ PASS | Report contract defines machine-parseable format: `\| TASK_ID \| EMOJI VERDICT \| summary \|`. Summary scorecard first, flagged items before verified. |
| VI | Minimal Footprint | ✅ PASS | Project structure: one command file, one optional shell script, test fixtures. Report written alongside `tasks.md`. |
| VII | No Codebase Modification | ✅ PASS | Data model marks all inputs as read-only. Only output is `verify-tasks-report.md`. Interactive fixes require explicit user approval. |
| VIII | Scope Flexibility | ✅ PASS | Four diff scopes defined (research.md R-004). Default is `all`. DiffScope entity in data-model.md. |
| IX | Extension Conventions | ✅ PASS | Research R-001 confirms command file structure: YAML frontmatter, `## User Input`, `## Outline`. |
| X | Verification Test Suite | ✅ PASS | Test fixtures directory defined in project structure. Expected verdicts documented. Three fixture categories: phantom, genuine, edge-cases. |

**Post-Design Gate Result**: ✅ ALL PASS — Design artifacts are consistent with constitution.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
commands/
└── speckit.verify-tasks.md   # The single slash command (prompt-driven)

# Note: check-prerequisites.sh is a pre-existing spec-kit core dependency
# at .specify/scripts/bash/check-prerequisites.sh — NOT an extension deliverable.

tests/
├── fixtures/
│   ├── phantom-tasks/        # Synthetic tasks.md with planted phantom completions
│   │   ├── tasks.md
│   │   └── src/              # Partial/missing source files for phantom testing
│   ├── genuine-tasks/        # Synthetic tasks.md where all tasks are genuinely complete
│   │   ├── tasks.md
│   │   └── src/              # Fully implemented source files
│   └── edge-cases/           # Edge case tasks.md files (no paths, malformed, etc.)
│       └── tasks.md
└── expected-verdicts.md      # Documented expected verdicts for each test fixture
```

**Structure Decision**: Minimal extension layout — a single `commands/` directory for the prompt-driven command file, and a `tests/` directory with synthetic fixtures for validation. No `src/`, `models/`, or `services/` directories needed since the extension is entirely prompt-driven with no application code.

## Complexity Tracking

> No constitution violations identified. This section is intentionally empty.
