# Feature Specification: Attachments & Linked Files

**Feature Branch**: `011-attachments`
**Created**: 2026-03-18
**Status**: Draft
**Input**: User description: "Attachments & Linked Files management for OmniFocus tasks"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - List Task Attachments (Priority: P1)

As a GTD practitioner, I want to list all attachments on a task so I can see
what reference materials are associated with it and decide whether they are
still relevant.

**Why this priority**: Reading is the foundation -- users must see what
attachments exist before they can add or remove them. This delivers immediate
value by surfacing attachment metadata (name, size, type) that is otherwise
only visible in the OmniFocus UI.

**Independent Test**: Can be fully tested by calling `list_attachments` with a
task ID and verifying the returned metadata matches what OmniFocus shows in
its inspector pane. Delivers value even without the write tools.

**Acceptance Scenarios**:

1. **Given** a task has 3 attachments (a PDF, an image, and a text file),
   **When** I call `list_attachments` with the task's ID,
   **Then** I receive an array of 3 attachment entries, each containing the
   filename, file type (UTI), and size in bytes.

2. **Given** a task has no attachments,
   **When** I call `list_attachments` with the task's ID,
   **Then** I receive an empty array and a success response.

3. **Given** a task has multiple attachments with the same filename,
   **When** I call `list_attachments`,
   **Then** each attachment is returned with its positional index so they can
   be distinguished for removal.

4. **Given** an ID that does not match any task,
   **When** I call `list_attachments`,
   **Then** I receive a clear error indicating the task was not found.

---

### User Story 2 - Add Attachment to Task (Priority: P1)

As a GTD practitioner, I want to add an attachment to a task from base64-encoded
data so I can associate reference documents, images, or other files with tasks
through the MCP text protocol.

**Why this priority**: Adding attachments is the core write operation. Combined
with listing, it provides a complete read-write cycle for task attachments.
Base64 encoding is necessary because MCP uses a JSON text protocol.

**Independent Test**: Can be tested by calling `add_attachment` with base64
data and a filename, then verifying via `list_attachments` that the attachment
appears with the correct name and size.

**Acceptance Scenarios**:

1. **Given** a task with no attachments,
   **When** I call `add_attachment` with valid base64-encoded data, a filename
   (e.g., "report.pdf"), and the task's ID,
   **Then** the attachment is added and the response confirms success with the
   new attachment count.

2. **Given** a task that already has attachments,
   **When** I call `add_attachment` with new data,
   **Then** the new attachment is appended without affecting existing attachments.

3. **Given** base64 data representing a file larger than 10 MB,
   **When** I call `add_attachment`,
   **Then** the attachment is added but the response includes a warning about
   potential OmniFocus Sync performance impact.

4. **Given** invalid base64 data (not properly encoded),
   **When** I call `add_attachment`,
   **Then** I receive an error indicating the data could not be decoded.

5. **Given** a filename with no extension,
   **When** I call `add_attachment`,
   **Then** the attachment is created using the provided filename as-is (no
   automatic extension inference).

---

### User Story 3 - Remove Attachment from Task (Priority: P2)

As a GTD practitioner, I want to remove an attachment from a task by its index
so I can clean up outdated or incorrect reference materials.

**Why this priority**: Removal completes the attachment lifecycle (list, add,
remove). Index-based removal is necessary because multiple attachments can share
the same filename. Requires listing first to know which index to remove.

**Independent Test**: Can be tested by adding an attachment, noting its index via
`list_attachments`, calling `remove_attachment`, then verifying the attachment
is gone.

**Acceptance Scenarios**:

1. **Given** a task has 3 attachments,
   **When** I call `remove_attachment` with the task's ID and index 1,
   **Then** the second attachment is removed and the remaining 2 attachments
   are returned with updated indices.

2. **Given** a task has 1 attachment,
   **When** I call `remove_attachment` with index 0,
   **Then** the attachment is removed and the task has no attachments.

3. **Given** a task has 2 attachments,
   **When** I call `remove_attachment` with index 5 (out of bounds),
   **Then** I receive an error indicating the index is out of range, including
   the valid range (0 to 1).

4. **Given** a task has no attachments,
   **When** I call `remove_attachment` with index 0,
   **Then** I receive an error indicating there are no attachments to remove.

5. **Given** an ID that does not match any task,
   **When** I call `remove_attachment`,
   **Then** I receive a clear error indicating the task was not found.

---

### User Story 4 - List Linked Files on Task (Priority: P2)

As a GTD practitioner, I want to list linked file references on a task so I can
see what external files on my local filesystem are associated with it.

**Why this priority**: Linked files are a distinct concept from embedded
attachments -- they are lightweight macOS file bookmarks. Listing them rounds out
the read capabilities for all file-associated data on tasks.

**Independent Test**: Can be tested by calling `list_linked_files` with a task ID
and verifying the returned URLs match the linked files visible in OmniFocus.

**Acceptance Scenarios**:

1. **Given** a task has 2 linked files (e.g., `file:///Users/me/doc.pdf` and
   `file:///Users/me/notes.txt`),
   **When** I call `list_linked_files` with the task's ID,
   **Then** I receive an array of 2 file URL strings.

2. **Given** a task has no linked files,
   **When** I call `list_linked_files` with the task's ID,
   **Then** I receive an empty array and a success response.

3. **Given** an ID that does not match any task,
   **When** I call `list_linked_files`,
   **Then** I receive a clear error indicating the task was not found.

---

### User Story 5 - Add Linked File to Task (Priority: P3)

As a GTD practitioner, I want to add a linked file reference to a task so I can
associate local files without embedding them in the OmniFocus database, keeping
the database lightweight while maintaining file associations.

**Why this priority**: This is a convenience feature for macOS users who want
lightweight file references rather than full embedded attachments. Lower priority
because it is macOS-only and serves a narrower use case than embedded attachments.

**Independent Test**: Can be tested by calling `add_linked_file` with a
`file://` URL, then verifying via `list_linked_files` that the URL appears.

**Acceptance Scenarios**:

1. **Given** a task with no linked files,
   **When** I call `add_linked_file` with a valid `file://` URL (e.g.,
   `file:///Users/me/reference.pdf`),
   **Then** the linked file reference is added and the response confirms success.

2. **Given** a task that already has linked files,
   **When** I call `add_linked_file` with a new `file://` URL,
   **Then** the new reference is appended without affecting existing linked files.

3. **Given** a URL that does not use the `file://` scheme (e.g., `https://...`),
   **When** I call `add_linked_file`,
   **Then** I receive a validation error indicating only `file://` URLs are
   accepted.

4. **Given** an ID that does not match any task,
   **When** I call `add_linked_file`,
   **Then** I receive a clear error indicating the task was not found.

---

### Edge Cases

- What happens when listing attachments on a completed or dropped task? The
  operation succeeds -- task status does not affect attachment access.
- What happens when adding an attachment with an empty filename? Validation
  rejects it -- filename must be a non-empty string.
- What happens when adding an attachment with empty base64 data? Validation
  rejects it -- data must be a non-empty string representing valid base64.
- What happens when removing an attachment with a negative index? Validation
  rejects it -- index must be a non-negative integer.
- What happens when the underlying script execution returns empty output? This
  indicates a silent failure -- the tool reports the failure with a descriptive
  error.
- What happens when `add_linked_file` is called on a non-macOS platform? The
  MCP server requires macOS, so this scenario cannot occur in practice. No
  explicit platform check is needed.
- What happens when two attachments have identical filenames? Both are stored
  and distinguished by index. The `list_attachments` response includes the index
  for each entry.
- What happens when the base64-decoded data size exceeds 10 MB? The operation
  proceeds with a warning in the response about OmniFocus Sync performance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST list all attachments on a task, returning an array of
  metadata entries each containing the attachment's positional index, filename,
  file type (UTI string), and size in bytes.

- **FR-002**: System MUST add an attachment to a task given a filename and
  base64-encoded file data, embedding the decoded file in the task.

- **FR-003**: System MUST remove an attachment from a task given a zero-based
  positional index, returning an error when the index is out of bounds.

- **FR-004**: System MUST list all linked file URLs on a task, returning an
  array of `file://` URL strings.

- **FR-005**: System MUST add a linked file reference to a task given a `file://`
  URL string. The URL MUST be validated to use the `file://` scheme before
  submission to OmniFocus.

- **FR-006**: System MUST accept tasks by their unique identifier. When a task
  is not found, the system MUST return a descriptive NOT_FOUND error.

- **FR-007**: System MUST warn (but not reject) when adding an attachment whose
  base64-decoded size exceeds 10 MB, noting the potential impact on OmniFocus
  Sync performance.

- **FR-008**: All 5 tools MUST validate input parameters before execution.
  Empty strings for required fields (task ID, filename, data, URL) MUST be
  rejected with a validation error.

- **FR-009**: System MUST return structured responses from all operations,
  with success/failure status and descriptive error messages.

- **FR-010**: The `remove_attachment` tool MUST include the valid index range in
  its error message when an out-of-bounds index is provided.

### Key Entities

- **Attachment**: An embedded file stored within the OmniFocus database.
  Key attributes: filename, file type (UTI), size in bytes, positional index
  within the task's attachment list.

- **Linked File**: A lightweight macOS file bookmark referencing an external file
  on the local filesystem. Represented as a `file://` URL string. Not embedded
  in the database.

- **Task**: The item that can have attachments and linked files. Identified by
  its unique OmniFocus ID.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view all attachment metadata for any task in a single
  tool call and receive a complete, structured response.

- **SC-002**: Users can add a file attachment to a task via base64-encoded data
  in a single tool call and verify it was added via `list_attachments`.

- **SC-003**: Users can remove a specific attachment by index in a single tool
  call without affecting other attachments on the same task.

- **SC-004**: Users can view all linked file references for any task in a single
  tool call.

- **SC-005**: Users can add a linked file reference to a task in a single tool
  call and verify it was added via `list_linked_files`.

- **SC-006**: All 5 tools pass contract validation tests, unit tests, and
  type-checking without errors.

- **SC-007**: Users receive a clear warning when adding attachments larger than
  10 MB, allowing them to make an informed decision about sync performance.

## Assumptions

- OmniFocus `task.attachments` returns an ordered array of FileWrapper objects
  where positional index is stable within a single operation (indices may shift
  after removal).

- `FileWrapper.withContents(name, data)` creates an in-memory FileWrapper
  suitable for `task.addAttachment()`.

- `Data.fromBase64(string)` is available in the OmniJS runtime and correctly
  decodes standard base64 strings into Data objects.

- FileWrapper objects expose `filename` and `type` (UTI string) properties.
  Size can be derived from the `contents` Data object or may require
  calculation from the original base64 data length.

- `task.linkedFileURLs` returns an array of URL objects whose `absoluteString`
  property yields the `file://` URL.

- `task.addLinkedFileURL(url)` accepts a URL object created via
  `URL.fromString(urlString)` in OmniJS.

- `task.removeAttachmentAtIndex(index)` uses zero-based indexing consistent
  with JavaScript array conventions.

- The `add_linked_file` tool is macOS-only per OmniFocus documentation. The
  default assumption is that the server runs on macOS (the only platform
  supporting OmniJS execution via `osascript`), so no explicit platform check
  is needed unless clarified otherwise.

## Scope Boundaries

### In Scope

- Listing, adding, and removing embedded attachments on individual tasks
- Listing and adding linked file references on individual tasks
- Base64 encoding/decoding for attachment data transfer over MCP JSON protocol
- Size warnings for attachments exceeding 10 MB
- Contract definitions and full TDD test coverage
- Structured responses from all operations

### Out of Scope

- Attachment content extraction or preview (file data is written, not read back)
- Linked file URL resolution or validation (no filesystem access beyond OmniFocus)
- Project-level attachments (focus on task attachments only for this phase)
- Removing linked files (no `removeLinkedFileURL` API documented in OmniFocus)
- Batch operations across multiple tasks (single task per call)
- Attachment content modification (add/remove only, no in-place editing)
- File type detection or MIME type inference from data content
