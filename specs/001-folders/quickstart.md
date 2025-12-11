# Quickstart: Folder Management Tools Implementation

**Feature Branch**: `002-folder-tools`
**Date**: 2025-12-10

## Overview

This guide provides step-by-step instructions for implementing the 5 folder management tools using Omni Automation JavaScript.

## Prerequisites

- Node.js 24+
- pnpm installed
- OmniFocus running on macOS
- Codebase cloned and dependencies installed

```bash
cd omnifocus-mcp
git checkout 002-folder-tools
pnpm install
```

## Implementation Order

Implement tools in this order (simplest to most complex):

1. **list_folders** - Read-only, establishes folder retrieval pattern
2. **add_folder** - Create operation, introduces position handling
3. **edit_folder** - Partial update pattern, disambiguation handling
4. **remove_folder** - Delete operation, confirm before destroy
5. **move_folder** - Most complex: position + circular move detection

## Step-by-Step: Implementing a Folder Tool

### Step 1: Create the Primitive

Location: `src/tools/primitives/listFolders.ts`

```typescript
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';

interface ListFoldersParams {
  status?: 'active' | 'dropped';
  parentId?: string;
  includeChildren?: boolean;
}

interface Folder {
  id: string;
  name: string;
  status: 'active' | 'dropped';
  parentId: string | null;
}

interface ListFoldersResult {
  success: boolean;
  folders?: Folder[];
  error?: string;
}

export async function listFolders(
  params: ListFoldersParams
): Promise<ListFoldersResult> {
  // Build the OmniJS script dynamically
  const omnijsScript = buildListFoldersScript(params);

  try {
    // Execute via existing bridge
    const result = await executeOmniFocusScript(omnijsScript);
    return result as ListFoldersResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function buildListFoldersScript(params: ListFoldersParams): string {
  const { status, parentId, includeChildren = true } = params;

  return `
(() => {
  try {
    let folders;

    ${parentId ? `
    // Filter by parent
    const parent = Folder.byIdentifier("${parentId}");
    if (!parent) {
      return JSON.stringify({
        success: false,
        error: "Invalid parentId '${parentId}': folder not found"
      });
    }
    folders = ${includeChildren ? 'parent.flattenedFolders' : 'parent.folders'};
    ` : `
    // All folders or top-level only
    folders = ${includeChildren ? 'flattenedFolders' : 'database.folders'};
    `}

    // Map to response format
    let result = folders.map(f => ({
      id: f.id.primaryKey,
      name: f.name,
      status: f.status === Folder.Status.Active ? 'active' : 'dropped',
      parentId: f.parent ? f.parent.id.primaryKey : null
    }));

    ${status ? `
    // Filter by status
    result = result.filter(f => f.status === '${status}');
    ` : ''}

    return JSON.stringify({ success: true, folders: result });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})()
`;
}
```

### Step 2: Create the Definition

Location: `src/tools/definitions/listFolders.ts`

```typescript
import { z } from 'zod';
import type {
  ServerRequest,
  ServerNotification,
  RequestHandlerExtra,
} from '@modelcontextprotocol/sdk/types.js';
import { listFolders } from '../primitives/listFolders.js';

// Zod schema for input validation
export const ListFoldersSchema = z.object({
  status: z.enum(['active', 'dropped']).optional(),
  parentId: z.string().optional(),
  includeChildren: z.boolean().default(true),
});

// Tool description for MCP
export const listFoldersToolDescription = {
  name: 'list_folders',
  description:
    'Lists folders from the OmniFocus database with optional filtering by status, parent, and recursion depth.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        enum: ['active', 'dropped'],
        description: 'Filter folders by status',
      },
      parentId: {
        type: 'string',
        description: 'Filter to children of this folder ID',
      },
      includeChildren: {
        type: 'boolean',
        description: 'Include nested folders recursively (default: true)',
        default: true,
      },
    },
  },
};

// Handler function
export async function handleListFolders(
  args: Record<string, unknown>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): Promise<{ content: [{ type: 'text'; text: string }] }> {
  // Validate input
  const parseResult = ListFoldersSchema.safeParse(args);
  if (!parseResult.success) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Validation error: ${parseResult.error.message}`,
          }),
        },
      ],
    };
  }

  // Execute primitive
  const result = await listFolders(parseResult.data);

  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
  };
}
```

### Step 3: Register the Tool

Location: `src/server.ts`

```typescript
import {
  listFoldersToolDescription,
  handleListFolders,
} from './tools/definitions/listFolders.js';

// In the server setup section:
server.tool(
  listFoldersToolDescription.name,
  listFoldersToolDescription.description,
  listFoldersToolDescription.inputSchema,
  handleListFolders
);
```

### Step 4: Write Tests

Location: `tests/unit/listFolders.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listFolders } from '../../src/tools/primitives/listFolders.js';

// Mock the script execution
vi.mock('../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn(),
}));

import { executeOmniFocusScript } from '../../src/utils/scriptExecution.js';

describe('listFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all folders when no filters provided', async () => {
    const mockFolders = [
      { id: 'id1', name: 'Work', status: 'active', parentId: null },
      { id: 'id2', name: 'Personal', status: 'active', parentId: null },
    ];

    vi.mocked(executeOmniFocusScript).mockResolvedValue({
      success: true,
      folders: mockFolders,
    });

    const result = await listFolders({});

    expect(result.success).toBe(true);
    expect(result.folders).toEqual(mockFolders);
  });

  it('should filter by status when provided', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue({
      success: true,
      folders: [{ id: 'id1', name: 'Dropped', status: 'dropped', parentId: null }],
    });

    const result = await listFolders({ status: 'dropped' });

    expect(result.success).toBe(true);
    expect(result.folders?.every((f) => f.status === 'dropped')).toBe(true);
  });

  it('should return error for invalid parentId', async () => {
    vi.mocked(executeOmniFocusScript).mockResolvedValue({
      success: false,
      error: "Invalid parentId 'xyz': folder not found",
    });

    const result = await listFolders({ parentId: 'xyz' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid parentId');
  });
});
```

### Step 5: Build and Test

```bash
# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint

# Run tests
pnpm test

# Manual test in OmniFocus
# (Use Script Editor or OmniFocus Console)
```

## OmniJS Script Patterns

### Folder Lookup by ID

```javascript
const folder = Folder.byIdentifier("abc123");
if (!folder) {
  return JSON.stringify({
    success: false,
    error: "Folder not found: abc123"
  });
}
```

### Folder Lookup by Name (with disambiguation)

```javascript
const matches = flattenedFolders.filter(f => f.name === "Work");
if (matches.length === 0) {
  return JSON.stringify({ success: false, error: "Folder not found: Work" });
}
if (matches.length > 1) {
  return JSON.stringify({
    success: false,
    error: "Ambiguous folder name 'Work'. Found " + matches.length + " matches.",
    code: "DISAMBIGUATION_REQUIRED",
    matchingIds: matches.map(f => f.id.primaryKey)
  });
}
const folder = matches[0];
```

### Position Resolution

```javascript
function resolvePosition(placement, relativeTo) {
  if (!relativeTo) {
    // Library root
    return library[placement];
  }
  const folder = Folder.byIdentifier(relativeTo);
  if (!folder) {
    throw new Error("Invalid relativeTo '" + relativeTo + "': folder not found");
  }
  return folder[placement];
}
```

### Circular Move Detection

```javascript
function isDescendantOf(folder, potentialAncestor) {
  let current = folder.parent;
  while (current) {
    if (current.id.primaryKey === potentialAncestor.id.primaryKey) {
      return true;
    }
    current = current.parent;
  }
  return false;
}
```

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Script returns empty | Wrap in try-catch, return JSON error |
| `evaluateJavascript` typo | Use lowercase 's' (not `evaluateJavaScript`) |
| Forgot .js extension | All imports need `.js` suffix (ESM) |
| Script string escaping | Use template literals, escape backticks |
| Testing without build | Always run `pnpm build` first |

## Testing in OmniFocus Console

Open OmniFocus > Automation > Console and paste:

```javascript
(() => {
  try {
    const folders = flattenedFolders.map(f => ({
      id: f.id.primaryKey,
      name: f.name,
      status: f.status === Folder.Status.Active ? 'active' : 'dropped',
      parentId: f.parent ? f.parent.id.primaryKey : null
    }));
    console.log(JSON.stringify({ success: true, count: folders.length, folders }));
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message }));
  }
})()
```

## Next Steps

After implementing all 5 tools:

1. Run full test suite: `pnpm test`
2. Check coverage: `pnpm test:coverage`
3. Build: `pnpm build`
4. Manual verification with OmniFocus
5. Update CLAUDE.md if new patterns emerged
6. Create PR for review
