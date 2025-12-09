# Quickstart: Tooling Modernization Migration Guide

**Feature Branch**: `001-tooling-modernization`
**Created**: 2025-12-08
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This guide helps developers migrate to the modernized tooling stack. After this
migration, you'll have:

- **Faster builds**: Sub-second compilation with tsup
- **Unified tooling**: One command for lint + format (Biome)
- **Direct execution**: Run TypeScript without building (tsx)
- **Automated tests**: Vitest with native TypeScript support
- **Quality gates**: Pre-commit hooks prevent bad commits

---

## Prerequisites

Before migrating, ensure you have:

- **Node.js 24.0.0+** (check: `node --version`)
- **pnpm** installed globally:

  ```bash
  npm install -g pnpm
  ```

  Or via Corepack:

  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

---

## Migration Steps

### Step 1: Clean Existing Installation

**IMPORTANT**: The new tooling requires a clean installation.

```bash
# Remove old node_modules (incompatible structure)
rm -rf node_modules

# Remove npm lock file
rm package-lock.json
```

### Step 2: Install Dependencies

```bash
# Install with pnpm
pnpm install
```

This creates:

- `pnpm-lock.yaml` (new lock file format)
- `node_modules/` (symlinked structure)

### Step 3: Verify Installation

```bash
# Build the project
pnpm build

# Should complete in under 1 second
# Output: dist/server.js, dist/server.cjs, dist/server.d.ts
```

---

## New Commands

### Daily Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (auto-reload) |
| `pnpm build` | Build for production |
| `pnpm start` | Run built server |

### Code Quality

| Command | Description |
|---------|-------------|
| `pnpm lint` | Check for lint errors |
| `pnpm format` | Format all files |
| `pnpm check` | Lint + format in one command |

### Testing

| Command | Description |
|---------|-------------|
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |

### Maintenance

| Command | Description |
|---------|-------------|
| `pnpm audit` | Check for security vulnerabilities |
| `pnpm outdated` | Check for outdated dependencies |
| `pnpm update` | Update dependencies |

---

## Key Differences from npm

### 1. Strict Dependencies

pnpm enforces strict dependency boundaries. You cannot import packages that
aren't in `package.json`:

```typescript
// This works with npm but FAILS with pnpm if 'lodash' isn't in package.json
import { debounce } from 'lodash'; // Error: Module not found
```

**Fix**: Add missing dependencies explicitly:

```bash
pnpm add lodash
pnpm add -D @types/lodash
```

### 2. Different node_modules Structure

pnpm uses symlinks instead of flat structure:

```text
# npm structure (flat)
node_modules/
├── express/
├── body-parser/      # transitive dependency is accessible
└── ...

# pnpm structure (symlinked)
node_modules/
├── express -> .pnpm/express@4.18.2/node_modules/express
├── .pnpm/
│   └── express@4.18.2/
│       └── node_modules/
│           ├── express/
│           └── body-parser/  # only accessible from express
└── ...
```

### 3. Lock File

- **npm**: `package-lock.json`
- **pnpm**: `pnpm-lock.yaml`

Always commit the lock file to ensure reproducible builds.

---

## TypeScript Changes

### Enhanced Strict Mode

The following TypeScript options are now enabled:

#### 1. noUncheckedIndexedAccess

Array access now returns `T | undefined`:

```typescript
// Before (compiles but unsafe)
const items = [1, 2, 3];
const first = items[0]; // type: number
first.toFixed(); // Runtime error if array is empty

// After (requires null check)
const items = [1, 2, 3];
const first = items[0]; // type: number | undefined
if (first !== undefined) {
  first.toFixed(); // Safe
}
```

#### 2. exactOptionalPropertyTypes

Cannot assign `undefined` to optional properties:

```typescript
interface Config {
  name?: string;
}

// Before (allowed)
const config: Config = { name: undefined }; // Allowed

// After (error)
const config: Config = { name: undefined }; // Error!
const config: Config = {}; // Correct way to omit
```

#### 3. verbatimModuleSyntax

Type imports must use `import type`:

```typescript
// Before
import { MyType } from './types';

// After
import type { MyType } from './types';
// or
import { type MyType } from './types';
```

---

## Biome vs ESLint

### Configuration

Biome uses a single `biome.json` file instead of multiple ESLint configs.

### Key Rules

- `noExplicitAny: "error"` - No `any` types allowed
- `noNonNullAssertion: "warn"` - Warns on `!` operator

### Running Checks

```bash
# ESLint (old)
npm run lint

# Biome (new) - same command, different tool
pnpm lint
```

---

## Pre-commit Hooks

Commits now automatically run Biome on staged files:

```bash
git add src/server.ts
git commit -m "Update server"
# Biome runs automatically and fixes issues
```

If you need to skip hooks (not recommended):

```bash
git commit --no-verify -m "Emergency fix"
```

---

## Troubleshooting

### "Module not found" errors

**Cause**: Phantom dependency (using package not in package.json)

**Fix**:

```bash
# Find the missing package
grep -r "from 'missing-package'" src/

# Add it explicitly
pnpm add missing-package
```

### "Cannot find module" after switching branches

**Cause**: Different branches may have different dependencies

**Fix**:

```bash
rm -rf node_modules
pnpm install
```

### TypeScript errors after migration

**Cause**: New strict options catch previously hidden issues

**Fix**: Address each error type:

- `possibly undefined`: Add null checks
- `undefined is not assignable`: Omit property instead
- `Cannot use namespace`: Use `import type`

### Build fails with "onSuccess" errors

**Cause**: JXA scripts not found

**Fix**:

```bash
# Verify scripts exist
ls src/utils/omnifocusScripts/

# Rebuild
pnpm build
```

### Pre-commit hook fails

**Cause**: Biome found issues

**Fix**:

```bash
# View issues
pnpm lint

# Auto-fix
pnpm check

# Stage fixed files and recommit
git add -u
git commit -m "Your message"
```

---

## IDE Setup

### VS Code

The project includes recommended settings in `.vscode/settings.json`. Install
the Biome extension for inline feedback:

1. Install "Biome" extension
2. Reload VS Code

### Other IDEs

Configure your IDE to use Biome for TypeScript/JavaScript formatting and
linting. Refer to [Biome IDE integrations](https://biomejs.dev/guides/integrate-in-editor/).

---

## FAQ

**Q: Can I still use npm commands?**
A: Use pnpm equivalents instead. Most commands are identical:

- `npm install` → `pnpm install`
- `npm run build` → `pnpm build`
- `npm test` → `pnpm test`

**Q: Why pnpm over npm?**
A: Stricter dependency isolation prevents "works on my machine" bugs and saves
disk space.

**Q: Why Biome over ESLint?**
A: Single tool, single config, 100x faster.

**Q: Do I need to change my development workflow?**
A: Minimal changes. Use `pnpm dev` instead of `npm run dev`. Everything else
works the same.

**Q: What if I find a bug in the new tooling?**
A: Open an issue with:

- Command that failed
- Error message
- Node.js and pnpm versions (`node --version`, `pnpm --version`)
