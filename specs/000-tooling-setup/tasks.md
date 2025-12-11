# Tasks: Tooling Modernization

**Input**: Design documents from `/specs/001-tooling-modernization/`
**Prerequisites**: plan.md (required), spec.md (required), research.md
**Branch**: `001-tooling-modernization`
**Generated**: 2025-12-08

**Tests**: Not explicitly requested. Vitest setup includes a sample test for framework validation only.

**Organization**: Tasks follow the plan.md phase structure, mapped to user stories from spec.md for traceability.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Exact file paths included in descriptions

## User Story to Plan Phase Mapping

| User Story | Priority | Plan Phase(s) | Key Deliverables |
|------------|----------|---------------|------------------|
| US1: Fast Development Feedback | P1 | 3, 4, 5, 7 | tsup, Biome, tsx, Husky |
| US2: Enhanced Type Safety | P1 | 2 | TypeScript strict options |
| US3: Automated Testing | P2 | 6 | Vitest |
| US4: Dependency Integrity | P2 | 1 | pnpm |
| US5: CI/CD Efficiency | P3 | CI Updates | GitHub Actions |

---

## Phase 1: Setup

**Purpose**: Project initialization - No setup tasks required for this feature

This feature modernizes existing infrastructure. No new project structure needed.

**Checkpoint**: Proceed directly to Foundational phase

---

## Phase 2: Foundational (pnpm + TypeScript Strict)

**Purpose**: Core infrastructure that MUST be complete before ANY other phase can proceed

**⚠️ CRITICAL**: Phases 3-7 cannot begin until this phase completes successfully

### 2A: Package Manager Migration (US4: Dependency Integrity)

**Goal**: Establish strict dependency isolation with pnpm

- [x] T001 [US4] Create backup of package-lock.json to /tmp/package-lock.backup.json
- [x] T002 [US4] Delete node_modules/ directory
- [x] T003 [US4] Delete package-lock.json from repository root
- [x] T004 [US4] Run `pnpm import` to convert lock file format
- [x] T005 [US4] Run `pnpm install` to create new node_modules structure
- [x] T006 [US4] Update .gitignore to add .pnpm-store/ (do NOT ignore pnpm-lock.yaml)
- [x] T007 [US4] Validate: `pnpm build` succeeds
- [x] T008 [US4] Validate: `pnpm start` starts server
- [x] T009 [US4] Validate: `pnpm audit` runs without errors
- [x] T009a [US4] (Optional) Validate disk space efficiency: compare node_modules size before/after pnpm migration

**Rollback Point**: If validation fails, restore from backup:

```bash
git checkout package-lock.json
rm -rf node_modules pnpm-lock.yaml
npm install
```

**Commit**: `chore: migrate from npm to pnpm`

### 2B: TypeScript Strict Mode Enhancement (US2: Enhanced Type Safety)

**Goal**: Enable advanced type safety options to catch subtle bugs at compile time

**Pre-Assessment** (recommended before starting):

```bash
# Estimate noUncheckedIndexedAccess violations
pnpm exec tsc --noEmit --noUncheckedIndexedAccess 2>&1 | grep -c "error TS" || echo "0"

# Estimate verbatimModuleSyntax violations
grep -r "import {.*}" src/ --include="*.ts" | grep -v "import type" | wc -l
```

#### Step 2B.1: noUncheckedIndexedAccess

- [x] T010 [US2] Add `"noUncheckedIndexedAccess": true` to tsconfig.json compilerOptions
- [x] T011 [US2] Run `pnpm exec tsc --noEmit` to identify errors
- [x] T012 [US2] Fix all "possibly undefined" errors with type guards in src/**/*.ts
- [x] T013 [US2] Validate: `pnpm exec tsc --noEmit` passes with zero errors

**Commit**: `feat(types): enable noUncheckedIndexedAccess for array safety`

#### Step 2B.2: exactOptionalPropertyTypes

- [x] T014 [US2] Add `"exactOptionalPropertyTypes": true` to tsconfig.json compilerOptions
- [x] T015 [US2] Run `pnpm exec tsc --noEmit` to identify errors
- [x] T016 [US2] Fix optional property type errors in src/**/*.ts
- [x] T017 [US2] Validate: `pnpm exec tsc --noEmit` passes with zero errors

**Commit**: `feat(types): enable exactOptionalPropertyTypes`

#### Step 2B.3: verbatimModuleSyntax

- [x] T018 [US2] Add `"verbatimModuleSyntax": true` to tsconfig.json compilerOptions
- [x] T019 [US2] Run `pnpm exec tsc --noEmit` to identify errors
- [x] T020 [US2] Convert mixed imports to explicit `import type` syntax in src/**/*.ts
- [x] T021 [US2] Validate: `pnpm exec tsc --noEmit` passes with zero errors
- [x] T022 [US2] Validate: `pnpm build` produces working dist/

**Commit**: `feat(types): enable verbatimModuleSyntax for explicit imports`

**Checkpoint**: Foundation ready - Phase 3+ can now proceed

---

## Phase 3: User Story 1 - Fast Development Feedback (Priority: P1) 🎯 MVP

**Goal**: Achieve ≤1 second build feedback, direct TypeScript execution, instant lint/format

**Independent Test**: Measure time from code change to actionable feedback (build completion, lint results)

**Success Criteria**:

- SC-001: Build feedback within 1 second
- SC-002: Dev server starts without build step
- SC-003: Lint/format completes in under 3 seconds

### 3A: Build Tool Migration - tsup

**Goal**: Replace tsc with tsup for sub-second builds

- [x] T023 [US1] Install tsup: `pnpm add -D tsup`
- [x] T024 [US1] Create tsup.config.ts at repository root with onSuccess hook for JXA scripts
- [x] T025 [US1] Update package.json: change "build" script to "tsup"
- [x] T026 [US1] Remove "copy-files" script from package.json (tsup onSuccess replaces it)
- [x] T027 [US1] Update package.json exports for dual format (ESM + CJS) output
- [x] T028 [US1] Update cli.cjs to remove deprecated --experimental-modules flag
- [x] T029 [US1] Validate: `pnpm build` completes in under 1 second
- [x] T030 [US1] Validate: dist/ contains server.js, server.cjs, server.d.ts
- [x] T031 [US1] Validate: dist/utils/omnifocusScripts/ contains all 3 JXA files
- [x] T032 [US1] Validate: `node dist/server.js` starts server successfully
- [x] T033 [US1] Validate: `./cli.cjs` starts server successfully

**Commit**: `build: migrate from tsc to tsup for faster builds`

### 3B: Linting & Formatting - Biome

**Goal**: Unify linting and formatting into single tool with single config

- [x] T034 [P] [US1] Install Biome: `pnpm add -D @biomejs/biome`
- [x] T035 [US1] Create biome.json at repository root with JXA ignores (use latest stable schema - verify 2.0.0 exists, fallback to 1.9.4 if needed)
- [x] T036 [US1] Run initial format: `pnpm exec biome format --write .`
- [x] T037 [US1] Run initial lint fix: `pnpm exec biome check --write .`
- [x] T038 [US1] Add "lint", "format", "check" scripts to package.json
- [x] T039 [US1] Remove any ESLint configuration files (.eslintrc*, .eslintignore)
- [x] T040 [US1] Remove ESLint dependencies from package.json if present
- [x] T041 [US1] Validate: `pnpm lint` passes with zero errors
- [x] T042 [US1] Validate: `pnpm check` completes in under 3 seconds

**Commit**: `chore: add Biome for unified linting and formatting`

### 3C: Development Runner - tsx

**Goal**: Enable direct TypeScript execution without build step

- [x] T043 [P] [US1] Install tsx: `pnpm add -D tsx`
- [x] T044 [US1] Add "dev" script to package.json: "tsx watch src/server.ts"
- [x] T045 [US1] Validate: `pnpm dev` starts server without prior build
- [x] T046 [US1] Validate: File changes trigger automatic reload

**Commit**: `dx: add tsx for direct TypeScript execution in development`

### 3D: Pre-commit Hooks - Husky + lint-staged

**Goal**: Automate code quality checks before each commit

- [x] T047 [US1] Install dependencies: `pnpm add -D husky lint-staged`
- [x] T048 [US1] Initialize Husky: `pnpm exec husky init`
- [x] T049 [US1] Add "prepare" script to package.json: "husky"
- [x] T050 [US1] Configure lint-staged in package.json with --staged flag
- [x] T051 [US1] Update .husky/pre-commit to run `pnpm exec lint-staged`
- [x] T052 [US1] Validate: Make test commit, verify lint-staged triggers
- [x] T053 [US1] Validate: Fresh clone + install auto-installs hooks

**Commit**: `ci: add pre-commit hooks with Husky and lint-staged`

**Checkpoint**: User Story 1 complete - fast feedback loop established

---

## Phase 4: User Story 3 - Automated Testing Capability (Priority: P2)

**Goal**: Establish automated testing capability with TypeScript support

**Independent Test**: Create test file, verify test runner executes with accurate pass/fail

### 4A: Test Framework - Vitest

- [x] T054 [P] [US3] Install dependencies: `pnpm add -D vitest @vitest/coverage-v8`
- [x] T055 [US3] Create vitest.config.ts at repository root
- [x] T056 [US3] Create tests/ directory structure: tests/unit/, tests/integration/, tests/fixtures/
- [x] T057 [US3] Create sample test file tests/unit/sample.test.ts to verify setup
- [x] T058 [US3] Add "test", "test:watch", "test:coverage" scripts to package.json
- [x] T059 [US3] Validate: `pnpm test` executes and passes sample test
- [x] T060 [US3] Validate: `pnpm test:watch` starts watch mode
- [x] T061 [US3] Validate: `pnpm test:coverage` generates coverage report

**Commit**: `test: add Vitest test framework with TypeScript support`

**Checkpoint**: User Story 3 complete - automated testing capability established

---

## Phase 5: User Story 5 - CI/CD Efficiency (Priority: P3)

**Goal**: Update CI pipelines to use new tooling for faster feedback

**Independent Test**: Measure CI duration before/after modernization

### 5A: GitHub Actions Workflow Updates

**Baseline Measurement** (before changes):

```bash
gh run list --limit 5 --json durationMs,conclusion
```

#### ci.yml Updates

- [x] T062 [US5] Add pnpm/action-setup@v4 step to .github/workflows/ci.yml
- [x] T063 [US5] Update actions/setup-node to use cache: 'pnpm' in ci.yml
- [x] T064 [US5] Replace `npm ci` with `pnpm install --frozen-lockfile` in ci.yml
- [x] T065 [US5] Replace `npm run build` with `pnpm build` in ci.yml
- [x] T066 [US5] Replace `npx tsc --noEmit` with `pnpm exec tsc --noEmit` in ci.yml
- [x] T067 [US5] Add pnpm-lock.yaml to paths trigger in ci.yml
- [x] T068 [US5] Update validate-structure job: remove 'copy-files' from required scripts

#### pr-checks.yml Updates

- [x] T069 [P] [US5] Add pnpm/action-setup@v4 step to .github/workflows/pr-checks.yml
- [x] T070 [US5] Replace all npm commands with pnpm equivalents in pr-checks.yml
- [x] T071 [US5] Replace `npm audit` with `pnpm audit` in pr-checks.yml

#### publish.yml Updates

- [x] T072 [P] [US5] Add pnpm/action-setup@v4 step to .github/workflows/publish.yml
- [x] T073 [US5] Replace `npm ci` with `pnpm install --frozen-lockfile` in publish.yml
- [x] T074 [US5] Replace `npm run build` with `pnpm build` in publish.yml
- [x] T075 [US5] Keep `npm publish` unchanged (npm for registry publishing) - Changed to `pnpm publish`

#### Other Workflows

- [x] T076 [P] [US5] Verify .github/workflows/codeql.yml for npm usage, update if needed
- [x] T077 [P] [US5] Verify .github/workflows/copilot-setup-steps.yml for npm usage, update if needed

#### Validation

- [x] T078 [US5] Create test PR to validate CI workflow passes
- [x] T079 [US5] Measure post-migration CI duration and compare to baseline

**Commit**: `ci: update GitHub Actions for pnpm and new tooling`

**Checkpoint**: User Story 5 complete - CI modernized

---

## Phase 6: Polish & Verification

**Purpose**: Final verification and documentation updates

### Success Criteria Verification

- [x] T080 Measure and record build time for SC-001 (target: ≤1 second) - Build completes in ~900ms
- [x] T081 Verify dev server starts without build for SC-002 - `pnpm dev` works
- [x] T082 Measure and record lint/format time for SC-003 (target: ≤3 seconds) - ~12ms for lint
- [x] T083 Verify CI duration meets SC-004: ≤30s cold install, ≤10s cached (also verify ≥40% reduction per US5)
- [x] T084 Run `grep -r "@ts-ignore" src/` to verify SC-005 (target: zero results)
- [x] T085 Run full regression test for SC-006: build, start, all tools functional

### Documentation Updates

- [x] T086 [P] Update CLAUDE.md "Active Technologies" section with new versions
- [x] T087 [P] Update CLAUDE.md "Build and Development Commands" with new commands
- [x] T088 Verify quickstart.md matches final implementation

### Final Cleanup

- [x] T089 Remove any deprecated configuration files
- [x] T090 Final commit with all verification results documented

**Commit**: `docs: update documentation for tooling modernization`

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational: pnpm + TS strict) ⬅️ BLOCKS ALL
    │
    ▼
Phase 3 (US1: tsup → Biome/tsx → Husky)
    │
    ├───────────────┐
    ▼               ▼
Phase 4         Phase 5
(US3: Vitest)   (US5: CI)
    │               │
    └───────┬───────┘
            ▼
        Phase 6
        (Polish)
```

### Within Phase 2 (Foundational)

1. **pnpm migration (T001-T009)**: Must complete first
2. **TS strict (T010-T022)**: Sequential - one option at a time
   - noUncheckedIndexedAccess (T010-T013)
   - exactOptionalPropertyTypes (T014-T017)
   - verbatimModuleSyntax (T018-T022)

### Within Phase 3 (US1: Fast Feedback)

1. **tsup (T023-T033)**: Must complete first (foundation for dev tooling)
2. **Biome (T034-T042)**: Can start after tsup
3. **tsx (T043-T046)**: Can run parallel with Biome
4. **Husky (T047-T053)**: Requires Biome complete

### Parallel Opportunities

- **Phase 3**: T034 (Biome install) and T043 (tsx install) can run in parallel
- **Phase 4 & 5**: Can run in parallel after Phase 3 completes
- **Phase 5**: T069, T072, T076, T077 (workflow updates) can run in parallel
- **Phase 6**: T086, T087 (doc updates) can run in parallel

---

## Parallel Example: Phase 3 Installs

```bash
# These can run in parallel (different package installs):
Task T034: Install Biome: pnpm add -D @biomejs/biome
Task T043: Install tsx: pnpm add -D tsx

# Then sequentially:
Task T035-T042: Biome configuration
Task T044-T046: tsx configuration
```

---

## Implementation Strategy

### MVP First (Foundational + US1)

1. Complete Phase 2: Foundational (pnpm + TS strict)
2. Complete Phase 3: US1 - Fast Development Feedback
3. **STOP and VALIDATE**: Verify ≤1s builds, direct TS execution
4. Can proceed to next user story or deploy MVP

### Incremental Delivery

| Milestone | Phases | Value Delivered |
|-----------|--------|-----------------|
| Foundation | 2 | Strict deps + type safety |
| MVP | 2 + 3 | Fast feedback loop (most impact) |
| Testing | 2 + 3 + 4 | Automated test capability |
| Full | All | Complete modernization |

### Suggested MVP Scope

**Phases 2 + 3** deliver the highest-impact improvements:

- Strict dependency isolation (prevents production bugs)
- Enhanced type safety (catches subtle bugs)
- Sub-second builds (developer productivity)
- Direct TypeScript execution (faster iteration)
- Unified linting/formatting (consistent code quality)
- Pre-commit hooks (automated quality gates)

Phases 4 (Vitest) and 5 (CI) can follow as separate increments.

---

## Notes

- **[P]** tasks = different files, no dependencies on incomplete tasks
- **[Story]** label maps task to user story for traceability
- Commit after each logical group completes
- Run validation tasks before proceeding to next group
- If validation fails, consult rollback instructions in plan.md
- Avoid: modifying same file in parallel, skipping validation steps

---

## Task Summary

| Phase | Task Count | User Stories |
|-------|------------|--------------|
| Phase 1: Setup | 0 | N/A |
| Phase 2: Foundational | 23 | US2, US4 |
| Phase 3: US1 Fast Feedback | 31 | US1 |
| Phase 4: US3 Testing | 8 | US3 |
| Phase 5: US5 CI/CD | 18 | US5 |
| Phase 6: Polish | 11 | All |
| **Total** | **91** | |

### Tasks by User Story

| User Story | Priority | Task Count |
|------------|----------|------------|
| US1: Fast Development Feedback | P1 | 31 |
| US2: Enhanced Type Safety | P1 | 13 |
| US3: Automated Testing | P2 | 8 |
| US4: Dependency Integrity | P2 | 10 |
| US5: CI/CD Efficiency | P3 | 18 |
| Cross-cutting (Polish) | - | 11 |

### Parallel Task Summary

- **Phase 2**: None (sequential TypeScript strict options)
- **Phase 3**: 2 parallel install tasks (T034, T043)
- **Phase 4-5**: Can run in parallel (different concerns)
- **Phase 5**: 4 parallel workflow updates (T069, T072, T076, T077)
- **Phase 6**: 2 parallel doc updates (T086, T087)
