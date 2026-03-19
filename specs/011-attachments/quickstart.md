# Quickstart: Attachments & Linked Files

**Feature Branch**: `011-attachments`

## Overview

5 new MCP tools for managing attachments (embedded files) and linked files (filesystem references) on OmniFocus tasks and projects.

## Tools

| Tool | Priority | Description |
|------|----------|-------------|
| `list_attachments` | P1 | List all embedded attachments with metadata |
| `add_attachment` | P1 | Add base64-encoded file as embedded attachment |
| `remove_attachment` | P2 | Remove attachment by zero-based index |
| `list_linked_files` | P2 | List all linked file URL references |
| `add_linked_file` | P3 | Add file:// URL as linked file reference |

## Architecture

```text
src/contracts/attachment-tools/     # Zod schemas (5 tool contracts + shared)
├── shared/
│   └── index.ts                    # AttachmentInfo, LinkedFileInfo, FileWrapperType
├── list-attachments.ts
├── add-attachment.ts
├── remove-attachment.ts
├── list-linked-files.ts
├── add-linked-file.ts
└── index.ts                        # Re-exports all contracts

src/tools/primitives/               # Business logic (5 primitives)
├── listAttachments.ts
├── addAttachment.ts
├── removeAttachment.ts
├── listLinkedFiles.ts
└── addLinkedFile.ts

src/tools/definitions/              # MCP handlers (5 definitions)
├── listAttachments.ts
├── addAttachment.ts
├── removeAttachment.ts
├── listLinkedFiles.ts
└── addLinkedFile.ts
```

## Key Design Decisions

1. **Base64 bridge**: Binary data transfers as base64 string in MCP JSON, decoded via `Data.fromBase64()` inside OmniJS
2. **Two-tier size validation**: Warning at >10 MB, rejection at >50 MB (server-side in TypeScript)
3. **Index-based removal**: Unambiguous when multiple attachments share filenames
4. **Task/project dual support**: Single `id` param, auto-resolves projects to root task
5. **Linked files are URL-only**: Lightweight bookmarks, not embedded data

## Implementation Order

1. Shared contracts (`src/contracts/attachment-tools/shared/`)
2. `list_attachments` (P1 read -- foundation for all verification)
3. `add_attachment` (P1 write -- core write operation)
4. `remove_attachment` (P2 -- completes attachment lifecycle)
5. `list_linked_files` (P2 read -- read-only linked file support)
6. `add_linked_file` (P3 write -- linked file creation)

## TDD Approach

Per Constitution Principle X, each tool follows:
1. Write contract tests (schema validation) -- verify they FAIL
2. Write unit tests (primitive logic with mocked `executeOmniJS`) -- verify they FAIL
3. Implement primitive -- tests turn GREEN
4. Implement definition -- integration works
5. Manual OmniFocus verification

## Quick Reference: OmniJS APIs

```javascript
// Attachments
task.attachments                              // FileWrapper[]
task.addAttachment(fileWrapper)               // void
task.removeAttachmentAtIndex(index)           // void
FileWrapper.withContents(name, data)          // FileWrapper (class function)

// FileWrapper properties
wrapper.preferredFilename                     // String | null
wrapper.filename                              // String | null
wrapper.type                                  // FileWrapper.Type enum
wrapper.contents                              // Data (read-only)
wrapper.contents.length                       // Number (bytes)

// Linked files
task.linkedFileURLs                           // URL[]
task.addLinkedFileURL(url)                    // void
URL.fromString(urlString)                     // URL

// URL properties
url.absoluteString                            // String
url.lastPathComponent                         // String
url.pathExtension                             // String

// Data
Data.fromBase64(base64String)                 // Data

// Project resolution
Project.byIdentifier(id).task                // Task (root task)
```
