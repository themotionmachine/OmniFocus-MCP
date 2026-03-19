# Data Model: Attachments & Linked Files

**Feature Branch**: `011-attachments`
**Date**: 2026-03-18

## Entities

### AttachmentInfo

Metadata returned by `list_attachments` for each embedded file in a task/project.

| Field | Type | Description |
|-------|------|-------------|
| `index` | `number` | Zero-based positional index in the attachments array |
| `filename` | `string` | Resolved as `preferredFilename \|\| filename \|\| 'unnamed'` |
| `type` | `'File' \| 'Directory' \| 'Link'` | `FileWrapper.Type` enum value (always `'File'` for embedded attachments) |
| `size` | `number` | Size in bytes from `wrapper.contents.length` |

**Notes**:
- `index` is stable within a single `list_attachments` call but may shift after removal operations.
- `type` is always `'File'` for embedded attachments; `'Directory'` and `'Link'` are theoretically possible but unlikely in practice.

### LinkedFileInfo

Metadata returned by `list_linked_files` for each linked file reference on a task/project.

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Full `file://` URL from `URL.absoluteString` |
| `filename` | `string` | Filename from `URL.lastPathComponent` |
| `extension` | `string` | File extension from `URL.pathExtension` |

### AddAttachmentParams

Input for adding an embedded attachment.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Task or project OmniFocus ID |
| `filename` | `string` | Yes | Name for the embedded file (non-empty) |
| `data` | `string` | Yes | Base64-encoded file content (non-empty) |

**Validation rules**:
- `id`: min 1 character
- `filename`: min 1 character
- `data`: min 1 character, valid base64 (validated server-side via `Buffer.from()`)
- Decoded size > 10 MB: warning in response
- Decoded size > 50 MB: rejection with validation error

### RemoveAttachmentParams

Input for removing an embedded attachment by index.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Task or project OmniFocus ID |
| `index` | `number` | Yes | Zero-based index of attachment to remove |

**Validation rules**:
- `id`: min 1 character
- `index`: non-negative integer (z.number().int().min(0))

### AddLinkedFileParams

Input for adding a linked file reference.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Task or project OmniFocus ID |
| `url` | `string` | Yes | `file://` URL string |

**Validation rules**:
- `id`: min 1 character
- `url`: min 1 character, must start with `file://`

## Relationships

```text
Task / Project (via project.task)
├── attachments: AttachmentInfo[]     (embedded FileWrapper objects)
└── linkedFileURLs: LinkedFileInfo[]  (lightweight URL bookmarks)
```

- A task or project can have zero or more attachments.
- A task or project can have zero or more linked files.
- Attachments are embedded binary data stored in the OmniFocus database.
- Linked files are lightweight `file://` URL references to local filesystem.
- Projects delegate all attachment/linked file operations to their root task via `project.task`.

## State Transitions

No state machines apply. Attachments and linked files are simple CRUD:
- **Create**: Add attachment / Add linked file
- **Read**: List attachments / List linked files
- **Delete**: Remove attachment by index (linked file removal deferred to future phase)

Attachment indices shift after removal (e.g., removing index 1 from [0,1,2] yields new indices [0,1]).

## OmniJS API Mapping

| Operation | OmniJS API |
|-----------|-----------|
| List attachments | `task.attachments` (array of FileWrapper) |
| Add attachment | `task.addAttachment(FileWrapper.withContents(name, Data.fromBase64(str)))` |
| Remove attachment | `task.removeAttachmentAtIndex(index)` |
| List linked files | `task.linkedFileURLs` (array of URL) |
| Add linked file | `task.addLinkedFileURL(URL.fromString(urlString))` |
| Resolve project | `Project.byIdentifier(id).task` |
