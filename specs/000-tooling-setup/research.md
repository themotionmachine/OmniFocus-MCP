# Research: Tooling Modernization

**Feature Branch**: `001-tooling-modernization`
**Created**: 2025-12-08
**Status**: Complete
**Spec**: [spec.md](./spec.md)

## Executive Summary

This document records the research and decisions made for modernizing the
OmniFocus MCP Server development tooling. Each section addresses a specific
gap between the current state and target state defined in the specification.

---

## Gap Analysis

### Current State

| Aspect | Current | Issues |
|--------|---------|--------|
| Package Manager | npm | Flat node_modules, no strict dependency isolation |
| Build Tool | tsc + manual scripts | Slow compilation, manual JXA copy step |
| Test Framework | None | No automated testing capability |
| Linting/Formatting | ESLint (partial) | Separate tools, multiple configs |
| Development Runner | tsc -w | Requires build step, no direct execution |
| Pre-commit Hooks | None | No automated quality gates |
| TypeScript Strictness | strict: true | Missing advanced safety options |

### Target State (from spec.md)

- FR-001: ≤1 second build feedback
- FR-002-004: Enhanced TypeScript strictness
- FR-005: Strict dependency boundaries
- FR-006-007: Dual ESM/CJS output with declarations
- FR-008: TypeScript tests without compilation
- FR-009: Unified linting and formatting
- FR-010: Direct TypeScript execution
- FR-011: JXA script copying via build hook
- FR-012: Pre-commit hooks
- FR-013: Dependency vulnerability auditing

---

## Tool Decisions

### 1. Package Manager: pnpm

**Decision**: Migrate from npm to pnpm

**Rationale**:

- Strict dependency isolation via symlinked node_modules (FR-005)
- Built-in `pnpm audit` command for vulnerability scanning (FR-013)
- Disk space efficiency through content-addressable storage
- Faster installation through parallel operations
- Lock file (`pnpm-lock.yaml`) ensures deterministic installations

**Alternatives Considered**:

| Tool | Pros | Cons | Rejected Because |
|------|------|------|------------------|
| npm | Familiar, no migration | No strict isolation, slower | Doesn't meet FR-005 |
| yarn | Good performance | Complexity with PnP mode | pnpm simpler for this project |
| bun | Fast, all-in-one | Less mature ecosystem, macOS-focused | Risk for npm distribution |

**Migration Path**:

1. Delete `node_modules/` and `package-lock.json`
2. Run `pnpm import` to convert lock file
3. Run `pnpm install`
4. Verify build works

---

### 2. Build Tool: tsup

**Decision**: Replace tsc with tsup

**Rationale**:

- esbuild-based: ~100x faster than tsc for bundling (FR-001)
- Native dual format output (ESM + CJS) with single config (FR-006)
- Automatic TypeScript declaration generation (FR-007)
- `onSuccess` hook for JXA script copying (FR-011)
- Zero-config sensible defaults

**Alternatives Considered**:

| Tool | Pros | Cons | Rejected Because |
|------|------|------|------------------|
| tsc | Already configured | Slow, no bundling, manual copy | Doesn't meet FR-001 |
| esbuild | Fast | No .d.ts generation, more config | tsup wraps it better |
| rollup | Flexible | Complex config, slower | Unnecessary complexity |
| vite | Great for apps | Overkill for library/server | Not suited for MCP server |

**Configuration** (tsup.config.ts):

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'node24',
  onSuccess: async () => {
    // Use Node.js fs APIs for cross-platform compatibility and error handling
    const { cpSync, existsSync, mkdirSync } = await import('fs');
    const srcDir = 'src/utils/omnifocusScripts';
    const destDir = 'dist/utils/omnifocusScripts';

    if (!existsSync(srcDir)) {
      throw new Error(`JXA scripts directory not found: ${srcDir}`);
    }

    mkdirSync(destDir, { recursive: true });
    cpSync(srcDir, destDir, { recursive: true });
    console.log('✅ JXA scripts copied successfully');
  }
});
```

**Note**: The `onSuccess` hook uses Node.js `fs` APIs instead of shell commands
for better cross-platform compatibility and explicit error handling.

---

### 3. Test Framework: Vitest

**Decision**: Add Vitest as the test framework

**Rationale**:

- Native TypeScript support without compilation step (FR-008)
- esbuild-powered: fast test execution
- Jest-compatible API: familiar testing patterns
- Built-in watch mode with smart re-runs
- Native ESM support matching project configuration

**Alternatives Considered**:

| Tool | Pros | Cons | Rejected Because |
|------|------|------|------------------|
| Jest | Industry standard | Requires ts-jest, slower | Compilation step needed |
| Mocha | Flexible | Requires separate assertion lib | More setup required |
| Node test runner | Built-in | Less mature | Missing features |
| ava | Clean API | Less ecosystem support | Smaller community |

**Configuration** (vitest.config.ts):

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/utils/omnifocusScripts/**'
      ]
    }
  }
});
```

**Note**: Requires `@vitest/coverage-v8` package for the v8 coverage provider.

---

### 4. Linting & Formatting: Biome

**Decision**: Replace ESLint with Biome

**Rationale**:

- Single tool for linting AND formatting (FR-009)
- Single configuration file (`biome.json`)
- ~100x faster than ESLint + Prettier
- Rust-based performance
- `noExplicitAny: "error"` rule for type safety

**Alternatives Considered**:

| Tool | Pros | Cons | Rejected Because |
|------|------|------|------------------|
| ESLint + Prettier | Mature ecosystem | Two tools, two configs, slow | Doesn't meet FR-009 |
| dprint | Fast | Less mature | Smaller ecosystem |
| oxc | Very fast | Early stage | Not production-ready |

**Configuration** (biome.json):

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignore": [
      "src/utils/omnifocusScripts/*.js",
      "dist/**",
      "node_modules/**"
    ]
  },
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "suspicious": { "noExplicitAny": "error" },
      "style": { "noNonNullAssertion": "warn" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

**Note**: JXA scripts are excluded from Biome analysis as they use unconventional
JavaScript patterns that may trigger false positives.

---

### 5. Development Runner: tsx

**Decision**: Add tsx for direct TypeScript execution

**Rationale**:

- Executes TypeScript directly without build step (FR-010)
- esbuild-based: instant startup
- Watch mode with fast reloading
- Drop-in replacement for `node` command
- Supports ESM and CommonJS

**Alternatives Considered**:

| Tool | Pros | Cons | Rejected Because |
|------|------|------|------------------|
| ts-node | Mature | Slower startup, more config | Performance concerns |
| esbuild-register | Fast | Less features | tsx more complete |
| node --loader | Built-in | Experimental, complex | Not stable |

**Usage**:

```bash
# Development with watch
pnpm dev  # tsx watch src/server.ts

# Single execution
pnpm exec tsx src/server.ts
```

---

### 6. Pre-commit Hooks: Husky + lint-staged

**Decision**: Add Husky with lint-staged

**Rationale**:

- Automates formatting/linting on commit (FR-012)
- lint-staged runs only on staged files (fast)
- Husky v9+ uses native git hooks
- Industry standard for JavaScript projects

**Alternatives Considered**:

| Tool | Pros | Cons | Rejected Because |
|------|------|------|------------------|
| lefthook | Fast, Go-based | Less JS ecosystem integration | Husky more familiar |
| simple-git-hooks | Minimal | Less features | lint-staged integration better with Husky |
| pre-commit (Python) | Language-agnostic | Requires Python | Extra dependency |

**Configuration** (package.json):

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,js,json,md}": ["biome check --write --staged"]
  }
}
```

**Note**: The `prepare` script runs automatically after `pnpm install`, ensuring
git hooks are installed for all contributors. The `--staged` flag is more
efficient as Biome natively understands which files are staged.

---

### 7. TypeScript Strict Options

**Decision**: Enable all three additional strict options

**Rationale**:

- `noUncheckedIndexedAccess`: Prevents silent undefined bugs (FR-002)
- `exactOptionalPropertyTypes`: Distinguishes absent vs undefined (FR-003)
- `verbatimModuleSyntax`: Enforces explicit type imports (FR-004)

**Risk Assessment**:

| Option | Risk Level | Expected Code Changes |
|--------|------------|----------------------|
| noUncheckedIndexedAccess | HIGH | Array access needs null guards |
| exactOptionalPropertyTypes | MEDIUM | Optional props may need adjustment |
| verbatimModuleSyntax | HIGH | All type imports need `import type` |

**Mitigation**:

- Enable one option at a time
- Fix all errors before proceeding to next
- Commit after each option is stable

**Configuration** (tsconfig.json additions):

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true
  }
}
```

---

## CI/CD Updates Required

### GitHub Actions Changes

1. **Add pnpm setup**:

   ```yaml
   - uses: pnpm/action-setup@v4
     with:
       version: 9
   ```

2. **Update cache key**:

   ```yaml
   - uses: actions/cache@v4
     with:
       path: ~/.pnpm-store
       key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}
   ```

3. **Replace npm commands**:

   - `npm ci` → `pnpm install --frozen-lockfile`
   - `npm run build` → `pnpm build`
   - `npm test` → `pnpm test`
   - `npm audit` → `pnpm audit`

---

## Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TypeScript strict failures | High | Medium | Phase incrementally, commit after each |
| Phantom dependencies | Medium | High | Audit imports before pnpm migration |
| Build output differences | Medium | High | Compare dist/ before/after tsup; verify CLI works |
| Pre-commit hook failures | Low | Low | Run biome check before commit setup |
| CI Runner Node 24 support | Low | Medium | Verify GitHub Actions supports Node 24 |
| npm Registry Publishing | Low | High | Keep `npm publish` (not pnpm); test with `--dry-run` |

---

## Validation Checkpoints

Each phase must pass validation before proceeding:

- **pnpm**: `pnpm build` succeeds, output unchanged
- **TS strict**: `pnpm tsc --noEmit` passes, zero errors
- **tsup**: `dist/` structure matches, server starts
- **Biome**: `pnpm lint` passes, code formatted
- **tsx**: `pnpm dev` starts server without build
- **Vitest**: `pnpm test` executes sample test
- **Husky**: Commit triggers lint-staged

---

## References

- [pnpm Documentation](https://pnpm.io/)
- [tsup Documentation](https://tsup.egoist.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Biome Documentation](https://biomejs.dev/)
- [tsx Documentation](https://tsx.is/)
- [Husky Documentation](https://typicode.github.io/husky/)
