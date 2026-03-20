# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.0.0] - 2026-03-12

### Added

- `/speckit.verify-tasks` slash command (`commands/speckit.verify-tasks.md`) — five-layer phantom completion detector
- **Layer 1**: File existence verification via `test -f` / `find`
- **Layer 2**: Git diff cross-reference supporting four scopes (`branch`, `uncommitted`, `plan-anchored`, `all`)
- **Layer 3**: Content pattern matching via `grep` for declared symbols
- **Layer 4**: Dead-code / wiring detection via `git grep` across the repository
- **Layer 5**: Semantic assessment with invariant — semantic evidence alone never yields `VERIFIED`
- Five verdict levels: `✅ VERIFIED`, `🔍 PARTIAL`, `⚠️ WEAK`, `❌ NOT_FOUND`, `⏭️ SKIPPED`
- Structured `verify-tasks-report.md` output: summary scorecard, flagged items with per-layer detail, verified items table, machine-parseable verdict lines
- Interactive walkthrough (Step 11) for flagged items with Investigate / Fix / Skip options
- Fresh-session advisory banner in both the command prompt and the generated report
- Historical branch verification notes for deleted-file and plan-anchored edge cases
- Graceful degradation when `git` is unavailable (layers 2 and 4 skipped)
- Shallow-clone warning
- Full error condition table (missing `tasks.md`, no `[X]` tasks, malformed entries, unwritable report path, etc.)
- Project constitution (`.specify/memory/constitution.md`) with eight governing principles
- Test fixtures:
  - `tests/fixtures/phantom-tasks/` — 10 tasks, 5 genuine + 5 planted phantoms (missing file, empty class, dead code, wrong function, behavioral gap)
  - `tests/fixtures/genuine-tasks/` — 10 tasks, all genuinely implemented with verified cross-references
  - `tests/fixtures/edge-cases/` — behavioral-only tasks, malformed entries, glob patterns, zero `[X]` tasks scenario
  - `tests/fixtures/scalability/` — 50-task synthetic fixture for session overflow testing (42 source files)
- `tests/expected-verdicts.md` — expected evidence level with rationale for every task in every fixture
- `.markdownlint.json` configuration

[Unreleased]: https://github.com/speckit/spec-kit-verify-tasks/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/speckit/spec-kit-verify-tasks/releases/tag/v1.0.0
