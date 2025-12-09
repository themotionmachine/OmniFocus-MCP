# Feature Specification: Tooling Modernization

**Feature Branch**: `001-tooling-modernization`
**Created**: 2025-12-08
**Status**: Ready for Planning
**Input**: User description: "Phase 0 of omnifocus-mcp-complete-plan-v2.md"

## Overview

The OmniFocus MCP Server project requires modernization of its development
tooling infrastructure to improve developer experience, accelerate development
velocity, and enhance code quality. This specification defines the outcomes
and value proposition of upgrading from legacy tooling to a modern, unified
development stack.

## Clarifications

### Session 2025-12-08

- Q: What happens when a developer has existing node_modules from the legacy
  package manager? → A: Developers must delete node_modules and reinstall with
  the new package manager (clean migration approach).
- Q: How does the system handle mixed import/export syntax during migration?
  → A: Build fails with clear errors; developers fix imports manually.
- Q: What happens when a dependency has compatibility issues with the new
  tooling? → A: Replace incompatible dependencies with compatible alternatives.
- Q: How are JXA script files handled during the build process? → A: Use
  tsup's onSuccess hook to copy JXA files unchanged to dist/utils/omnifocusScripts/.
- Q: Is SC-007 (configuration file count) a valuable success criterion?
  → A: No. Removed SC-007 as it's a vanity metric; other criteria suffice.
- Q: FR-001 says "sub-second" but SC-001 says "within 1 second" - which
  threshold? → A: Align to "within 1 second" (≤ 1000ms) for consistency.
- Q: What is explicitly out of scope for this phase? → A: Git hooks (pre-commit
  formatting/linting) are in-scope; IDE integrations, Docker, monorepo support,
  and documentation generation tooling are out-of-scope.
- Q: Is SC-003 (test execution time) a valuable success criterion? → A: No.
  Removed SC-003 as test duration depends on test content, not tooling. FR-008
  and User Story 3 already capture the framework's value.
- Q: Is SC-004 (dependency installation time) a valuable success criterion?
  → A: No. Removed SC-004 as installation time is network/hardware dependent.
  FR-005 and User Story 4 capture the tooling's actual value.
- Q: Should dependency vulnerability scanning be in scope? → A: Yes. Added
  FR-013 requiring package manager to support vulnerability auditing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Development Feedback (Priority: P1)

As a developer making changes to the MCP server codebase, I want instant
feedback on code quality and correctness so that I can catch issues
immediately rather than waiting for slow build processes.

**Why this priority**: Slow feedback loops are the primary friction point in
current development workflow. Developers lose context waiting for builds,
reducing productivity and increasing the likelihood of introducing bugs.

**Independent Test**: Can be fully tested by measuring time from code change
to actionable feedback (build completion, lint results, format application).
Delivers immediate value through reduced wait time.

**Acceptance Scenarios**:

1. **Given** a developer saves a TypeScript file,
   **When** the build/compile process runs,
   **Then** feedback is available in under 1 second.
2. **Given** a developer wants to run the server locally,
   **When** they execute the development command,
   **Then** the server starts without requiring a separate build step.
3. **Given** a developer introduces a code style violation,
   **When** they attempt to commit the file,
   **Then** they receive immediate formatting and linting feedback via pre-commit
   hooks (note: IDE-based save-time feedback is out of scope for this phase).

---

### User Story 2 - Enhanced Type Safety (Priority: P1)

As a developer working with OmniFocus data structures, I want the type system
to catch subtle bugs at compile time so that runtime errors from undefined
values, optional property misuse, and phantom dependencies are prevented.

**Why this priority**: The JXA execution layer is prone to silent failures.
Stronger type safety prevents bugs from reaching production where they cause
cryptic errors.

**Independent Test**: Can be tested by verifying that previously compiling
code with type safety issues now fails to compile, and that developers
receive clear error messages guiding them to fix the issues.

**Acceptance Scenarios**:

1. **Given** code that accesses an array element by index,
   **When** compiled,
   **Then** the type system requires handling the undefined case.
2. **Given** code with an optional property,
   **When** that property is explicitly set to undefined (instead of omitted),
   **Then** the type system reports an error.
3. **Given** a developer imports a type,
   **When** they use ambiguous import syntax,
   **Then** the type system requires explicit type-only import declarations.

---

### User Story 3 - Automated Testing Capability (Priority: P2)

As a developer modifying JXA script generation logic, I want to run automated
tests to verify that changes do not break existing functionality so that
regressions are caught before merge.

**Why this priority**: The project currently has no automated tests. While
the codebase works, any modification risks introducing regressions that are
only discovered in production use.

**Independent Test**: Can be tested by creating a simple test file and
verifying that the test runner executes it with accurate pass/fail results.

**Acceptance Scenarios**:

1. **Given** a test file exists,
   **When** the test command is executed,
   **Then** tests run and report results.
2. **Given** TypeScript test files,
   **When** tests execute,
   **Then** they run without additional configuration or compilation steps.
3. **Given** a test is modified,
   **When** the developer is in watch mode,
   **Then** only affected tests re-run automatically.

---

### User Story 4 - Dependency Integrity (Priority: P2)

As a developer adding or updating dependencies, I want the package management
system to enforce strict dependency boundaries so that the production
application only uses explicitly declared dependencies.

**Why this priority**: Phantom dependencies (using packages not explicitly
declared) work during development but fail in production when the transitive
dependency structure changes.

**Independent Test**: Can be tested by attempting to import from a transitive
dependency that is not explicitly declared, which should fail.

**Acceptance Scenarios**:

1. **Given** code that imports from a transitive dependency,
   **When** the code runs,
   **Then** the import fails with a clear error.
2. **Given** multiple developers with different local environments,
   **When** they install dependencies,
   **Then** they get identical dependency trees.
3. **Given** the same dependencies installed across multiple projects,
   **When** disk space is measured,
   **Then** shared packages are not duplicated.

---

### User Story 5 - CI/CD Efficiency (Priority: P3)

As a project maintainer, I want continuous integration pipelines to complete
quickly so that contributors receive fast feedback on their pull requests
and CI costs remain manageable.

**Why this priority**: Fast CI pipelines improve contributor experience and
reduce costs. However, this is an optimization that builds on the core
developer experience improvements.

**Independent Test**: Can be tested by measuring CI pipeline duration before
and after modernization.

**Acceptance Scenarios**:

1. **Given** a pull request is opened,
   **When** CI runs,
   **Then** the dependency installation step completes in under 30 seconds.
2. **Given** dependencies were previously installed in CI,
   **When** a new CI run uses cache,
   **Then** dependency installation completes in under 10 seconds.
3. **Given** the full CI pipeline runs,
   **When** measured end-to-end,
   **Then** total time is reduced by at least 40% compared to baseline.

---

### Edge Cases

- **Legacy node_modules**: Developers must delete existing node_modules and
  reinstall with the new package manager. The new package manager uses a
  different symlink structure incompatible with npm's flat node_modules.
- **Mixed import/export syntax**: Build fails with clear TypeScript errors
  indicating which imports need `import type` syntax. Developers fix imports
  manually guided by error messages.
- **Dependency compatibility issues**: Replace incompatible dependencies with
  compatible alternatives that work with the modern tooling stack.
- **JXA script handling**: Build tool's onSuccess hook copies JXA files
  unchanged from src/utils/omnifocusScripts/ to dist/utils/omnifocusScripts/,
  preserving the existing runtime behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Development environment MUST provide instant feedback on code
  changes (within 1 second compilation)
- **FR-002**: Type system MUST flag array index access as potentially
  undefined
- **FR-003**: Type system MUST distinguish between absent optional properties
  and properties explicitly set to undefined
- **FR-004**: Type system MUST require explicit type-only import syntax for
  types
- **FR-005**: Package management MUST enforce strict dependency boundaries,
  preventing access to undeclared transitive dependencies
- **FR-006**: Build process MUST generate both module formats (ESM and
  CommonJS) for npm distribution
- **FR-007**: Build process MUST generate TypeScript declaration files for
  type safety in consuming projects
- **FR-008**: Test framework MUST execute TypeScript tests without requiring
  pre-compilation
- **FR-009**: Linting and formatting MUST be unified into a single tool with
  a single configuration file
- **FR-010**: Development server MUST execute TypeScript directly without
  requiring a separate build step
- **FR-011**: Build process MUST copy JXA scripts unchanged from
  src/utils/omnifocusScripts/ to dist/utils/omnifocusScripts/ via onSuccess hook
- **FR-012**: Pre-commit hooks MUST automatically run formatting and linting
  on staged files before each commit
- **FR-013**: Package manager MUST support dependency vulnerability auditing
  via a built-in audit command

### Key Entities

- **Build Artifact**: The compiled output distributed via npm, including
  JavaScript code, type declarations, and JXA scripts
- **Development Environment**: The local setup enabling developers to run,
  test, and modify the codebase
- **Configuration**: The set of files controlling tooling behavior (target is
  minimal unified configuration)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers receive build feedback within 1 second of saving a
  file (down from multi-second builds)
- **SC-002**: Development server starts and executes TypeScript directly,
  eliminating the need for explicit build steps during development
- **SC-003**: Linting and formatting complete in under 3 seconds for the
  entire codebase
- **SC-004**: CI pipeline dependency installation completes in under 30
  seconds cold, under 10 seconds cached
- **SC-005**: Zero type safety warnings are suppressed or ignored (no
  @ts-ignore, @ts-expect-error for type workarounds)
- **SC-006**: All existing functionality continues to work correctly after
  modernization (regression-free migration)

## Assumptions

- Developers have access to Node.js version 24.0.0 or higher (required per project
  constitution for ES2024 target and native ESM support)
- The project will continue to be macOS-only (OmniFocus requirement)
- Existing CI/CD platform supports the new tooling without platform-specific
  issues
- The npm package distribution model remains unchanged (published via npm
  registry)
- Contributors are willing to adopt new development commands (e.g., different
  package manager CLI)

## Dependencies

- Phase 0.5 (MCP SDK Upgrade) must be complete before tooling modernization,
  as modern tooling requires compatible module resolution settings
- No external service dependencies; all tooling is local development
  infrastructure

## Out of Scope

The following items are explicitly excluded from this phase:

- **IDE integrations**: VS Code extensions, settings.json, workspace configs
- **Docker/containerization**: Dockerfile, docker-compose, container builds
- **Monorepo support**: Workspaces, multi-package configurations
- **Documentation generation**: TypeDoc, API documentation tooling

The following is explicitly included:

- **Git hooks**: Pre-commit hooks for automated formatting and linting
