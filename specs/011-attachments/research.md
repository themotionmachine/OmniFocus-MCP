# Research: Attachments & Linked Files

**Feature Branch**: `011-attachments`
**Date**: 2026-03-18
**Status**: Complete

## R-001: FileWrapper API Surface

**Task**: Research FileWrapper class properties and methods available in OmniJS runtime for embedded attachment management.

**Decision**: Use the following FileWrapper API surface:
- `task.attachments` - Ordered array of FileWrapper objects (read-only collection)
- `task.addAttachment(fileWrapper)` - Add a FileWrapper to a task
- `task.removeAttachmentAtIndex(index)` - Remove by zero-based index
- `FileWrapper.withContents(name, data)` - Class function (not constructor) creating a FileWrapper from a filename and Data object
- `wrapper.preferredFilename` - Display name (preferred, may be null)
- `wrapper.filename` - Actual last-read name (fallback, may be null)
- `wrapper.type` - `FileWrapper.Type` enum: File, Directory, or Link (structural enum, NOT a UTI string)
- `wrapper.contents` - Data object (read-only); `contents.length` gives byte size

**Rationale**: These properties are confirmed by Omni Automation documentation and the spec clarification sessions. The `preferredFilename || filename || 'unnamed'` resolution matches KISS principle.

**Alternatives considered**:
- Returning both `preferredFilename` and `filename` as separate fields -- rejected per Constitution Principle VII (KISS). Single `filename` field with fallback chain is simpler.
- Using UTI for file type -- not possible. `FileWrapper.Type` is a structural enum (File/Directory/Link), not a UTI string. File type is inferred from filename extension only.

## R-002: Base64 Data Flow (MCP JSON to OmniJS)

**Task**: Research how to safely transfer binary file data from MCP JSON protocol to OmniJS FileWrapper creation.

**Decision**: Two-stage validation and conversion:
1. **Server-side (TypeScript)**: Validate base64 string using `Buffer.from(str, 'base64')` before passing to OmniJS. This catches invalid base64 encoding early with clear error messages.
2. **OmniJS-side**: Decode via `Data.fromBase64(base64String)` inside the script, then pass to `FileWrapper.withContents(name, data)`.

**Rationale**: `Data.fromBase64()` has undocumented error behavior and may fail silently (known OmniJS gotcha per spec clarifications). Server-side validation catches encoding errors before they reach OmniJS. The base64 string must be decoded inside OmniJS because `FileWrapper.withContents()` requires an OmniJS `Data` instance.

**Alternatives considered**:
- Server-side decode + binary transfer -- rejected because OmniJS `Data` object cannot be constructed from outside OmniJS runtime.
- OmniJS-only validation -- rejected because `Data.fromBase64()` error behavior is undocumented and may fail silently.

## R-003: Size Validation Strategy

**Task**: Research appropriate size limits for base64-encoded attachment data over MCP JSON-RPC stdio protocol.

**Decision**: Two-tier validation in TypeScript before OmniJS execution:
1. **Warning at >10 MB decoded size**: Response includes warning about OmniFocus Sync performance impact. Operation proceeds.
2. **Rejection at >50 MB decoded size**: Hard rejection with validation error. Prevents catastrophic memory allocation from enormous JSON-RPC payloads.

Size calculation: `Buffer.from(base64String, 'base64').length` gives exact decoded byte count.

**Rationale**: 10 MB warning threshold aligns with OmniFocus Sync best practices. 50 MB hard limit prevents MCP server memory exhaustion. Constitution Principle V (Defensive Error Handling) mandates proactive protection.

**Alternatives considered**:
- Approximate size from base64 string length (`str.length * 3/4`) -- rejected because it is imprecise and does not handle padding correctly.
- No hard limit -- rejected because enormous payloads could crash the MCP server process.

## R-004: Linked File URL Handling

**Task**: Research OmniJS URL class and linked file management APIs.

**Decision**: Use the following linked file API surface:
- `task.linkedFileURLs` - Array of URL objects
- `task.addLinkedFileURL(url)` - Add linked file reference
- `URL.fromString(urlString)` - Create OmniJS URL object from string
- URL properties: `absoluteString` (full URL), `lastPathComponent` (filename), `pathExtension` (extension)

Validation: Server-side TypeScript validates `file://` scheme before OmniJS execution. Only `file://` URLs are accepted (macOS filesystem references).

**Rationale**: Linked files are lightweight macOS file bookmarks, not embedded data. The `file://` scheme restriction matches OmniFocus behavior and prevents confusion with web URLs.

**Alternatives considered**:
- Accept any URL scheme -- rejected because OmniFocus linked files are filesystem references only.
- Return only the URL string -- rejected in favor of richer objects with `lastPathComponent` and `pathExtension` for immediate utility.

## R-005: Task/Project Resolution Pattern

**Task**: Research the existing pattern for tools that accept both task and project IDs.

**Decision**: Follow the repetition tools pattern (SPEC-007, `getRepetition.ts`):
1. Try `Task.byIdentifier(id)` first
2. If not found, try `Project.byIdentifier(id)`
3. If project found, resolve to `project.task` (root task)
4. If neither found, return `NOT_FOUND` error with descriptive message

All attachment and linked file operations delegate to the task object. Projects have attachments/linked files through their root task.

**Rationale**: This pattern is established across 5+ existing tools (getRepetition, setRepetition, clearRepetition, etc.). Following it ensures consistency and reduces cognitive load.

**Alternatives considered**:
- Separate `taskId` and `projectId` parameters -- rejected because the single-ID pattern with auto-resolution is simpler and already proven.

## R-006: Script String Escaping for Base64

**Task**: Research how to safely embed potentially large base64 strings in OmniJS script templates.

**Decision**: Use the existing `escapeForJS()` pattern (backslash, double-quote, newline, carriage return, tab escaping). Base64 strings only contain `[A-Za-z0-9+/=]` characters, so the standard escaping is sufficient. However, the base64 string could be very large (up to ~67 MB for a 50 MB file), so the string is embedded as a JavaScript string literal in the IIFE.

**Rationale**: Base64 encoding uses a safe character set that does not conflict with JavaScript string delimiters. The existing `escapeForJS()` function handles all edge cases.

**Alternatives considered**:
- Temp file approach for large base64 -- rejected because the current `executeOmniJS()` pipes scripts via stdin, avoiding filesystem I/O. The 50 MB hard limit keeps string sizes manageable.

## R-007: Index-Based vs Name-Based Attachment Removal

**Task**: Research why index-based removal is preferred over name-based for attachments.

**Decision**: Use zero-based index for `remove_attachment`. The `list_attachments` response includes the positional index for each attachment.

**Rationale**: Multiple attachments can share the same filename. Index-based removal is unambiguous. The workflow is: list (see indices) -> remove (by index). `task.removeAttachmentAtIndex(index)` is the native OmniJS API.

**Alternatives considered**:
- Name-based removal -- rejected because filenames can be duplicated across attachments on the same task.
- Both name and index -- rejected per YAGNI. Index is sufficient and unambiguous.
