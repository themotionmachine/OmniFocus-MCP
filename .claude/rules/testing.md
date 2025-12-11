---
paths:
  - "tests/**"
  - "**/*.test.ts"
---

# Testing Conventions

## Test-Driven Development (TDD) - REQUIRED

All new functionality MUST follow the Red-Green-Refactor cycle per
Constitution Principle X.

### Red-Green-Refactor Cycle

1. **RED**: Write a failing test first
   - Test MUST fail before implementation
   - Verify failure message is meaningful
   - This validates the test itself works

2. **GREEN**: Write minimum code to pass
   - Only implement what the test requires
   - Do not optimize or add extras
   - Run test to confirm it passes

3. **REFACTOR**: Improve while staying green
   - Clean up duplication, naming, structure
   - Tests MUST continue passing
   - No behavior changes allowed

### Task Ordering (MANDATORY)

For each user story, tasks MUST be ordered:

```text
1. Contract/schema tests → verify FAIL
2. Unit tests for primitive → verify FAIL
3. Implement primitive → tests turn GREEN
4. Implement definition → integration works
5. Refactor if needed → tests stay GREEN
6. Manual OmniFocus verification (last)
```

### Test-First Verification

Before marking a test task complete:

- [ ] Test file exists and compiles
- [ ] Running `pnpm test` shows the test FAILING
- [ ] Failure message clearly indicates what's missing
- [ ] No implementation code written yet

## Framework

- Vitest for all tests
- V8 coverage via `pnpm test:coverage`

## Test Types

### Contract Tests

Validate Zod schemas match expected structure:

```typescript
import { describe, it, expect } from "vitest";
import { AddFolderInputSchema } from "../contracts/add-folder.js";

describe("AddFolderInputSchema", () => {
  it("should accept valid input", () => {
    const result = AddFolderInputSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const result = AddFolderInputSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});
```

### Unit Tests (Primitives)

Test business logic with mocked script execution:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeOmniFocusScript } from "../src/utils/scriptExecution.js";
import { listFolders } from "../src/tools/primitives/listFolders.js";

vi.mock("../src/utils/scriptExecution.js", () => ({
  executeOmniFocusScript: vi.fn(),
}));

describe("listFolders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return folders on success", async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue(
      JSON.stringify({ success: true, folders: [] })
    );
    const result = await listFolders({});
    expect(result.success).toBe(true);
  });
});
```

## Patterns

- Mock `executeOmniFocusScript()` to avoid OmniFocus dependency
- Test OmniJS string generation separately from execution
- Validate cycle detection in batch operations
- Test date parsing edge cases
- Test disambiguation error responses

## File Organization

- Place tests in `tests/` directory
- Contract tests: `tests/contract/*.test.ts`
- Unit tests: `tests/unit/*.test.ts`
- Never disable tests - fix them instead

## Running Tests

```bash
pnpm test              # Run once
pnpm test:watch        # Watch mode (TDD recommended)
pnpm test:coverage     # With V8 coverage
```

**TDD Workflow:**

```bash
# 1. Write failing test
pnpm test:watch  # Keep running

# 2. See RED (test fails)
# 3. Write minimum implementation
# 4. See GREEN (test passes)
# 5. Refactor while watching tests stay green
```

## Test Structure

```typescript
describe("toolName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy path
  it("should handle valid input", async () => {
    // Arrange, Act, Assert
  });

  // Error cases
  it("should return error for invalid input", async () => {
    // Test validation errors
  });

  // Edge cases
  it("should handle disambiguation", async () => {
    // Test multiple matches scenario
  });
});
```
