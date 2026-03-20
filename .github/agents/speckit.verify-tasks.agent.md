---
description: Verify tasks marked [X] in tasks.md are implemented, not phantom completions
  (marked done but backed by missing or dead code).
handoffs:
- label: Re-implement Flagged Tasks
  agent: speckit.implement
  prompt: Re-implement the flagged tasks from the verify-tasks-report
  send: true
---


<!-- Extension: verify-tasks -->
<!-- Config: .specify/extensions/verify-tasks/ -->
## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

**Supported arguments**: Optional space/comma-separated task IDs to verify only specific tasks. Optional `--scope branch|uncommitted|plan-anchored|all` (default: `all`) to control which changes count as evidence.

Display the following advisory **immediately** before any other work:

> ⚠️ **FRESH SESSION ADVISORY**: For maximum reliability, run `/speckit.verify-tasks`
> in a **separate** agent session from the one that performed `/speckit.implement`.
> The implementing agent's context biases it toward confirming its own work.

## Pre-Execution Checks

**Check for extension hooks (before verification)**:

- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_verify-tasks` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter to only hooks where `enabled: true`
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):

    ```text
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```

  - **Mandatory hook** (`optional: false`):

    ```text
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding to the Outline.
    ```

- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Outline

**Asymmetric error model** — applies to all layers below: a false flag (flagging genuine work) is cheap — the developer dismisses it in seconds during the walkthrough. A missed phantom (returning `VERIFIED` for a task that was never implemented) is a **catastrophic failure of this tool** — it means `/speckit.verify-tasks` did the one thing it exists to prevent. When in doubt, flag.

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse FEATURE_DIR. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot"). Verify `$FEATURE_DIR/spec.md`, `$FEATURE_DIR/plan.md`, and `$FEATURE_DIR/tasks.md` all exist — if any are missing, `ERROR: Missing prerequisite: {file} not found in feature directory: $FEATURE_DIR` and stop.

2. **Task parsing**: From `$FEATURE_DIR/tasks.md`, extract all `[X]` (completed) tasks into a **completed task list** used by all subsequent layers. For each:
   - Extract task ID (first token after checkbox: `T001`, `T-003`, `1.1`, `FEAT-05`, etc.). If no ID found, synthesize `LINE-{n}` and emit `WARNING: No task ID found on line {n}: "{line}"`.
   - Extract optional markers: `[P]` (parallel), `[US1]`/`[US2]` (user story labels).
   - Extract file paths: exact paths, backtick-wrapped paths, glob patterns, directory references.
   - Extract code references: backtick-wrapped symbol names (function/class/type names).
   - Extract acceptance criteria: indented lines beginning with `Given`, `When`, `Then`, or `-`.
   - Record line number and nesting depth.
   - If `$ARGUMENTS` contains task IDs, restrict to those IDs only. Emit `WARNING: Task ID not found: {id} — skipping` for any filter ID not in `tasks.md`.
   - If no `[X]` tasks found: output `No completed tasks found to verify.` and stop cleanly.

3. **Diff scope determination**: Parse `--scope` from `$ARGUMENTS` (default: `all`). Detect git availability. If git unavailable, skip all git-dependent layers and note in report. Otherwise determine base ref by trying `origin/main`, `origin/master`, `origin/develop`, `main`, `master` in order. Collect the list of changed files for the scope:
   - `branch`: diff base ref to HEAD
   - `uncommitted`: diff HEAD to working tree
   - `plan-anchored`: extract date from `$FEATURE_DIR/plan.md`, list commits since that date. If no date found in plan.md, warn and fall back to `all`.
   - `all` (default): diff base ref to HEAD plus uncommitted/untracked changes
   - If shallow clone detected, warn that diff coverage may be incomplete.

4. **Verification cascade**: Process each completed task individually through all five layers before moving to the next task.

   For each completed task:

   **Layer 1 — File existence**: Check whether all referenced file paths exist. Expand glob patterns. If a file is missing and git is available, check for renames. Result: `positive` (all present), `negative` (any missing), or `not_applicable` (no file paths in task).

   **Layer 2 — Git diff cross-reference**: Check whether any referenced file appears in the changed files list from step 3. Result: `positive` (at least one changed), `negative` (none changed), `not_applicable` (no file paths), or `skipped` (git unavailable).

   **Layer 3 — Content pattern matching**: Search referenced files for the expected symbols. Adapt search strategy to artifact type:

   | Artifact Type | Symbol examples | Strategy |
   |---------------|----------------|----------|
   | Application code (`.py`, `.js`, `.ts`, `.java`, `.go`, `.rs`, etc.) | Function/class/method definitions | Search for definition-prefix patterns (`def`, `class`, `function`, `export`, `const`) |
   | SQL (`.sql`, `.ddl`) | Table/column/constraint names | Search for DDL keywords + symbol name |
   | Config (`.yml`, `.yaml`, `.toml`, `.json`, `.env`) | Key names, section headers | Plain text match |
   | Shell (`.sh`, `.bash`) | Function/variable names | Search for declaration patterns |
   | Markdown/prompt (`.md`) | Section headings, key phrases | Heading pattern match |
   | CI/CD (`Dockerfile`, `Makefile`, `.github/` YAML) | Job/stage/target names | Plain text match |

   For unlisted artifact types, fall back to plain text match. Only search files confirmed present by Layer 1. Result: `positive` (all symbols found), `negative` (some missing), or `not_applicable` (no code references in task).

   > **Note**: Content matching is most precise on application source code. For non-code artifacts, matches may produce false positives — acceptable per the asymmetric error model.

   **Layer 4 — Dead-code detection**: Assess whether usage references are expected for the artifact type. Skip this layer (`not_applicable`) for artifacts consumed by runtime/tooling rather than imported by code: SQL migrations, config files, CI/CD, shell scripts, prompts, static assets, test files. Proceed for application code symbols.

   For each symbol found in Layer 3:
   - **Determine search scope**: Walk up from the definition file's directory to find the nearest project root (directory containing `__init__.py`, `setup.py`, `pyproject.toml`, `package.json`, `go.mod`, `Cargo.toml`, `Makefile`, or the parent of a `src/` directory). Fall back to repository root if none found.
   - **Search for references** in source code files under that scope, excluding the definition site (the line or block where the symbol is declared). Search **only source code files** (by extension: `.py`, `.js`, `.ts`, `.java`, `.go`, `.rs`, `.rb`, `.c`, `.cpp`, `.h`, `.cs`, `.php`, `.sh`, etc.) to automatically exclude task files, markdown specs, reports, and docs that mention symbols by name. Same-file references outside the definition site count as wired.
   - Discard matches inside comments or string literals (unless the string is a dynamic import or reflective call).
   - If references remain → symbol is wired (`positive`). If none remain → dead code (`negative`); record `"{symbol}" declared in {file} but never imported/called/referenced`.

   > **Critical**: Use `grep -rn` (not `git grep`) for dead-code scanning. `git grep` only searches tracked files — implementation files that are untracked, newly added, or in untracked directories will be invisible, causing false dead-code reports.

   Aggregate: all symbols wired → `positive`; any dead → `negative`; none to check → `not_applicable`. When in doubt about whether an artifact type needs wiring, default to applicable (asymmetric error model).

   **Layer 5 — Semantic assessment**: Run when no mechanical layer (1–4) returned `negative` — i.e., the task would otherwise be VERIFIED or SKIPPED. Read the referenced files and `$FEATURE_DIR/spec.md`. Evaluate whether the described behavior appears genuinely implemented — not just structurally present (stub functions, empty bodies, placeholder returns, TODO comments). Always label as interpretive: `⚠️ Interpretive: {explanation}`.

   Result: `positive` (behavior visibly implemented and connected), `negative` (stub, placeholder, or no relevant logic found), or `not_applicable` (no files readable or no behavior to evaluate).

   > **Downgrade rule**: A high-confidence semantic `negative` can downgrade a mechanically-verified task to `PARTIAL`. This catches the critical case where a stub function passes all mechanical layers (file exists, file changed, symbol defined, symbol imported) but implements nothing. The downgrade must cite specific evidence (e.g., empty function body, `pass`/`TODO`/`NotImplementedError`, hardcoded return values).

   **Verdict assignment**: After all five layers complete for this task, combine results into a final verdict:

   | Verdict | Criteria |
   |---------|----------|
   | `✅ VERIFIED` | ALL applicable mechanical layers (1–4) return `positive` AND Layer 5 is `positive` or `not_applicable` |
   | `🔍 PARTIAL` | At least one mechanical layer `positive` AND at least one `negative` from any layer (including semantic downgrade) |
   | `⚠️ WEAK` | Only semantic layer `positive`, all mechanical layers `not_applicable` or `skipped` |
   | `❌ NOT_FOUND` | No layer returns `positive` |
   | `⏭️ SKIPPED` | ALL layers `not_applicable` — no verifiable indicators |

   Key rules:
   - A semantic `negative` with cited evidence downgrades `VERIFIED` → `PARTIAL`
   - `not_applicable` and `skipped` layers do not count against `VERIFIED` — only `negative` layers prevent it
   - `SKIPPED` tasks are not failures — they are behavioral-only tasks

5. **Report generation**: Write `$FEATURE_DIR/verify-tasks-report.md` (overwrite if exists). Include:
    - Header with date, scope, task count, and the fresh session advisory
    - Summary scorecard (verdict counts)
    - Flagged items section (NOT_FOUND → PARTIAL → WEAK), each with a per-layer detail table
    - Verified items table
    - Unassessable items table (SKIPPED)
    - Machine-parseable verdict line per task: `| {TASK_ID} | {EMOJI} {VERDICT} | {summary} |`

    Output: `✅ Report written to: {FEATURE_DIR}/verify-tasks-report.md`
    If report cannot be written, output to stdout instead.

6. **Interactive walkthrough** *(multi-turn — one item per message)*: Present flagged items one at a time in severity order (NOT_FOUND first, then PARTIAL, then WEAK). If no flagged items, output `✅ No flagged items — verification complete.` and skip to step 7.

    **For each flagged item, output exactly one item and then STOP.** Do not display the next item until the user has replied. Each message must follow this template:

    ```
    ### Flagged Item {i} of {total}: {TASK_ID} — {VERDICT_EMOJI} {VERDICT}

    **Task**: {task description}
    **Evidence gap**: {what was missing or failed}

    **Actions**: **I** — investigate further | **F** — propose fix | **S** — skip | **done** — end walkthrough

    Awaiting your choice:
    ```

    **CRITICAL**: After printing the block above, **end your response immediately**. Do NOT print the next flagged item, do NOT continue to step 7, and do NOT add any further output. You must yield control and wait for the user to reply with one of the action choices before proceeding. This is a hard stop — treat it as a turn boundary.

    When the user replies:
    - **I**: Investigate the evidence gap in detail (read files, check imports, etc.), then re-display the same action prompt for this item and STOP again.
    - **F**: Propose a fix (do not apply without explicit confirmation), then re-display the action prompt and STOP again.
    - **S**: Log as skipped, then display the **next** flagged item using the template above and STOP again.
    - **done** / **stop** / **exit**: End the walkthrough early.

    After the last flagged item is resolved (or the user ends early): `✅ Walkthrough complete. {n} of {total} flagged items addressed.`

    Append a `## Walkthrough Log` section to the report with the disposition of each flagged item (investigated, fix proposed, skipped). Do not modify the original verdict table — it is the audit record. If fixes were applied, suggest re-running `/speckit.verify-tasks` for a clean re-evaluation.

7. **Check for extension hooks**: After walkthrough, check if `.specify/extensions.yml` exists in the project root.
    - If it exists, read it and look for entries under the `hooks.after_verify-tasks` key
    - If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
    - Filter to only hooks where `enabled: true`
    - For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
      - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
      - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
    - For each executable hook, output the following based on its `optional` flag:
      - **Optional hook** (`optional: true`):

        ```text
        ## Extension Hooks

        **Optional Hook**: {extension}
        Command: `/{command}`
        Description: {description}

        Prompt: {prompt}
        To execute: `/{command}`
        ```

      - **Mandatory hook** (`optional: false`):

        ```text
        ## Extension Hooks

        **Automatic Hook**: {extension}
        Executing: `/{command}`
        EXECUTE_COMMAND: {command}
        ```

    - If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Historical Branch Notes

When using `--scope branch` against a previously-completed feature branch: files deleted in subsequent commits will cause Layer 1 to return `negative`. Note in the flagged detail that the file may have been deleted and suggest checking with `git show` for original presence.