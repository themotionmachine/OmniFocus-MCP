# Feature Specification: Perspectives

**Feature Branch**: `008-perspectives`
**Created**: 2026-03-18
**Status**: Draft
**Phase**: 8 of 20
**Tools**: 5 (`list_perspectives`, `get_perspective`, `switch_perspective`, `export_perspective`, `set_perspective_icon`)

## Overview

The Perspectives feature provides full perspective management through the MCP server,
replacing legacy tools with modern implementations following the definitions/primitives/contracts
architecture. This enables GTD practitioners using AI assistants to list, inspect, navigate,
export, and customize OmniFocus perspectives for context-based task views.

### Business Value

- **GTD Context Switching**: Perspectives are the primary mechanism in OmniFocus for viewing
  tasks through different lenses (by project, tag, due date, etc.) -- enabling rapid context
  switches during GTD workflows
- **Perspective Discovery**: AI assistants can enumerate available perspectives (built-in and
  custom) to understand what views the user has configured
- **Workflow Navigation**: Switching perspectives programmatically lets AI assistants navigate
  to the relevant view for the user's current focus area
- **Configuration Backup**: Exporting custom perspective configurations enables backup,
  sharing, and documentation of personal GTD setups
- **Visual Organization**: Setting icon colors helps users visually distinguish perspectives

### Migration Context

This phase replaces two legacy tools that predate the modern architecture:

- Legacy `list_perspectives` replaced with enhanced `list_perspectives` adding identifiers
  and filter rule metadata for custom perspectives
- Legacy `get_perspective_view` replaced with `get_perspective` providing full perspective
  metadata including filter rule configuration

Three new tools are added: `switch_perspective`, `export_perspective`, and
`set_perspective_icon`.

**Migration Strategy: Clean Break**

The migration follows a clean-break approach with no backward compatibility shims:

- **Input schemas**: The legacy `includeBuiltIn`/`includeCustom` boolean parameters are
  replaced with a single `type` enum ("all"/"builtin"/"custom"). No dual-support period.
- **Response shapes**: New Zod contract schemas following the modern
  definitions/primitives/contracts pattern replace the legacy undocumented response shapes.
  The legacy `OmnifocusPerspective` interface in `types.ts` and `PerspectiveItem` interface
  are superseded by new contracts in `src/contracts/perspective-tools/`.
- **server.ts transition**: Old tool registrations (`list_perspectives` and
  `get_perspective_view`) are removed and replaced with new registrations in-place. The old
  `get_perspective_view` tool name is retired entirely (replaced by `get_perspective`).
- **File cleanup**: Legacy files are deleted, not deprecated:
  - Delete `src/tools/definitions/listPerspectives.ts` (legacy definition)
  - Delete `src/tools/definitions/getPerspectiveView.ts` (legacy definition)
  - Delete `src/tools/primitives/listPerspectives.ts` (legacy primitive)
  - Delete `src/tools/primitives/getPerspectiveView.ts` (legacy primitive)
  - Remove `OmnifocusPerspective` interface from `src/types.ts`
- **Retired tool name handling**: After migration, the `get_perspective_view` tool name no
  longer exists. MCP clients that reference it will receive a standard "tool not found" error
  from the MCP server. This is correct behavior -- no compatibility shim or redirect is provided.
- **Migration order**: To avoid build breakage during migration: (1) create new contract,
  definition, and primitive files first, (2) delete legacy files, (3) update server.ts
  registrations. This ensures the build never references deleted files.
- **Rationale**: MCP tools are consumed by AI assistants, not versioned APIs with external
  consumers. The legacy tools have no tests, no contracts, and no documented response shapes.
  No deprecation period is needed.

---

## Clarifications

### Session 2026-03-18

- Q: Should the new `list_perspectives` use the spec's clean `type` enum parameter or maintain backward-compatible `includeBuiltIn`/`includeCustom` boolean parameters? → A: Clean break. Use the new `type` enum. MCP tools are consumed by AI assistants, not versioned APIs. No external consumers to break. The legacy tool has no tests or contracts.
- Q: Should the new tools use clean Zod contract schemas or maintain backward-compatible response shapes matching the legacy `OmnifocusPerspective`/`PerspectiveItem` interfaces? → A: Clean break on response shapes. Use new Zod contract schemas following the modern definitions/primitives/contracts pattern. The legacy response shapes are undocumented and untested.
- Q: How should the transition be handled in server.ts -- replace registrations in-place or add alongside with deprecation? → A: Replace in-place. Remove old tool registrations and register new ones. Delete old primitive and definition files. No deprecation period needed since there are no external consumers.
- Q: What color input format should `set_perspective_icon` accept for the `color` parameter? → A: Accept CSS hex strings (e.g., "#FF0000") and convert to OmniJS `Color.RGB(r, g, b, a)` in the primitive. This is the simplest format for AI assistants to produce.
- Q: What is the general migration principle for any remaining ambiguities about legacy tool handling? → A: Clean break, no backward compatibility shims. Delete old files, create new files following current architecture patterns.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - List All Perspectives (Priority: P1)

As a GTD practitioner, I want to list all perspectives (built-in and custom) with
identifiers and metadata so I can understand what views are available in my OmniFocus
setup.

**Why this priority**: This is the foundational discovery tool. Users and AI assistants
must know what perspectives exist before they can inspect, switch to, or export them.
Without this, the other tools have no context.

**Independent Test**: Can be fully tested by calling `list_perspectives` and verifying
it returns both built-in and custom perspectives with correct identifiers and metadata.
Delivers immediate value by surfacing all available views.

**Acceptance Scenarios**:

1. **Given** an OmniFocus database with built-in and custom perspectives,
   **When** I call `list_perspectives` with no parameters,
   **Then** I receive all perspectives grouped by type (built-in and custom) with names and identifiers.

2. **Given** custom perspectives exist with filter rules configured,
   **When** I call `list_perspectives`,
   **Then** each custom perspective includes its filter rule summary and top-level filter aggregation type.

3. **Given** I only want to see custom perspectives,
   **When** I call `list_perspectives` with `type: "custom"`,
   **Then** I receive only custom perspectives, excluding built-in ones.

4. **Given** I only want to see built-in perspectives,
   **When** I call `list_perspectives` with `type: "builtin"`,
   **Then** I receive only built-in perspectives (Inbox, Projects, Tags, Forecast, Flagged, Review).

5. **Given** no custom perspectives have been created,
   **When** I call `list_perspectives`,
   **Then** I receive only built-in perspectives with an empty custom perspectives list.

6. **Given** multiple custom perspectives exist with various names,
   **When** I call `list_perspectives`,
   **Then** perspectives are sorted alphabetically by name within each type group
   (built-in first, then custom), and `totalCount` equals the length of the
   returned `perspectives` array.

7. **Given** OmniFocus version is below 4.2,
   **When** I call `list_perspectives`,
   **Then** custom perspectives are returned with `filterAggregation` as `null`
   (graceful degradation, not an error).

---

### User Story 2 - Get Perspective Details (Priority: P1)

As a GTD practitioner, I want to get detailed perspective information including filter
rule configuration so I can understand how a specific perspective works and what it
shows.

**Why this priority**: Tied with listing as P1 because understanding perspective
configuration is essential for AI assistants to make informed decisions about which
perspective suits the user's current needs.

**Independent Test**: Can be tested by calling `get_perspective` with a known perspective
name or identifier and verifying it returns complete configuration details.

**Acceptance Scenarios**:

1. **Given** a custom perspective exists with filter rules,
   **When** I call `get_perspective` with its name,
   **Then** I receive the perspective's full metadata including filter rules configuration,
   top-level filter aggregation type, and identifier.

2. **Given** a built-in perspective exists (e.g., "Inbox"),
   **When** I call `get_perspective` with its name,
   **Then** I receive the built-in perspective's metadata (name and type indicator),
   noting that built-in perspectives have limited configurable properties.

3. **Given** I provide a perspective identifier,
   **When** I call `get_perspective` with that identifier,
   **Then** I receive the perspective's full details without ambiguity.

4. **Given** a perspective name that does not exist,
   **When** I call `get_perspective`,
   **Then** I receive a clear error indicating the perspective was not found.

5. **Given** multiple custom perspectives with similar names,
   **When** I call `get_perspective` with a name that matches exactly one,
   **Then** I receive that specific perspective's details.

6. **Given** multiple custom perspectives share the same name,
   **When** I call `get_perspective` with that name,
   **Then** I receive a disambiguation error with `code: "DISAMBIGUATION_REQUIRED"`
   and a `candidates` array listing all matches with their names and identifiers.

7. **Given** OmniFocus version is below 4.2,
   **When** I call `get_perspective` for a custom perspective,
   **Then** the response includes `filterRules: null` and `filterAggregation: null`
   (graceful degradation, not an error).

---

### User Story 3 - Switch Active Perspective (Priority: P2)

As a GTD practitioner, I want to switch the active perspective so my AI assistant
can navigate OmniFocus to the relevant view for my current workflow context.

**Why this priority**: Enables AI-driven workflow navigation, but depends on
knowing what perspectives exist (P1 stories). This is a UI-affecting action that
changes what the user sees on screen.

**Independent Test**: Can be tested by calling `switch_perspective` and verifying
the OmniFocus window displays the specified perspective.

**Acceptance Scenarios**:

1. **Given** a valid custom perspective name,
   **When** I call `switch_perspective` with that name,
   **Then** the OmniFocus front window switches to display that perspective
   and the tool returns confirmation of the switch.

2. **Given** a valid built-in perspective name (e.g., "Forecast"),
   **When** I call `switch_perspective` with that name,
   **Then** the OmniFocus front window switches to the Forecast perspective.

3. **Given** a perspective identifier,
   **When** I call `switch_perspective` with that identifier,
   **Then** the perspective switches without ambiguity.

4. **Given** a perspective name that does not exist,
   **When** I call `switch_perspective`,
   **Then** I receive an error and the current perspective remains unchanged.

5. **Given** the requested perspective is already the active perspective,
   **When** I call `switch_perspective`,
   **Then** the tool succeeds with a confirmation (idempotent operation).

6. **Given** no OmniFocus windows are open,
   **When** I call `switch_perspective`,
   **Then** I receive a clear error indicating no window is available.

---

### User Story 4 - Export Perspective Configuration (Priority: P3)

As a GTD practitioner, I want to export a custom perspective configuration so I can
back up my perspective setup or share it with others.

**Why this priority**: Valuable for backup and sharing workflows, but not required
for core perspective navigation. Only custom perspectives support export.

**Independent Test**: Can be tested by calling `export_perspective` on a custom
perspective and verifying the returned data contains a valid exportable configuration.

**Acceptance Scenarios**:

1. **Given** a custom perspective exists,
   **When** I call `export_perspective` with its name or identifier,
   **Then** I receive the perspective's exportable configuration data.

2. **Given** a built-in perspective,
   **When** I call `export_perspective`,
   **Then** I receive an error indicating that built-in perspectives cannot be exported.

3. **Given** a custom perspective name that does not exist,
   **When** I call `export_perspective`,
   **Then** I receive a clear error indicating the perspective was not found.

4. **Given** a valid custom perspective,
   **When** I call `export_perspective` with `saveTo` directory path,
   **Then** the perspective file is written to the specified directory and I receive
   the file path in the response.

5. **Given** an invalid or inaccessible directory path for `saveTo`,
   **When** I call `export_perspective`,
   **Then** I receive an error indicating the directory is invalid or not writable.

---

### User Story 5 - Set Perspective Icon Color (Priority: P3)

As a GTD practitioner, I want to set a perspective's icon color so I can visually
organize my perspectives in the OmniFocus sidebar.

**Why this priority**: Visual customization is a convenience feature. The `iconColor`
property is available in OmniFocus v4.5.2+ and must be version-gated accordingly.

**Independent Test**: Can be tested by calling `set_perspective_icon` on a custom
perspective with a color value and verifying the color changes in OmniFocus.

**Acceptance Scenarios**:

1. **Given** a custom perspective exists,
   **When** I call `set_perspective_icon` with a valid color value,
   **Then** the perspective's icon color is updated and the tool returns confirmation.

2. **Given** a built-in perspective,
   **When** I call `set_perspective_icon`,
   **Then** I receive an error indicating that built-in perspective colors cannot be modified.

3. **Given** an invalid color value,
   **When** I call `set_perspective_icon`,
   **Then** I receive a validation error describing the expected color format.

4. **Given** a perspective name that does not exist,
   **When** I call `set_perspective_icon`,
   **Then** I receive a clear error indicating the perspective was not found.

---

### Edge Cases

- **No OmniFocus windows open**: `switch_perspective` requires at least one open window.
  Must return a clear error rather than failing silently.

- **Built-in perspective names are locale-dependent**: Built-in perspective names may
  vary by language setting. The system should use well-known identifiers where possible
  rather than display names for built-in perspectives.

- **Custom perspective with same name as built-in**: If a user creates a custom
  perspective named "Inbox", lookup by name must handle this gracefully. Identifier-based
  lookup is preferred for precision.

- **Empty custom perspectives list**: When no custom perspectives exist, `list_perspectives`
  should return an empty array for the custom section, not an error.

- **Perspective with complex filter rules**: Filter rules are stored as opaque objects
  owned by OmniFocus. The system serializes them via `JSON.stringify` and returns them
  as-is without attempting to interpret or validate the rule structure. Requires v4.2+.

- **Export file format**: Custom perspective exports produce `.ofocus-perspective` files
  via the `fileWrapper()` API. The system should handle the binary/wrapper format
  appropriately.

- **`iconColor` requires v4.5.2+**: The `iconColor` property was added in OmniFocus v4.5.2.
  The `set_perspective_icon` tool must version-gate using
  `app.userVersion.atLeast(new Version('4.5.2'))` and return a clear error on older versions.

- **Concurrent perspective switches**: If multiple `switch_perspective` calls arrive
  rapidly, only the last one should win (natural behavior of setting a window property).

- **iconColor round-trip fidelity**: After setting `iconColor` via `Color.RGB()`, reading
  it back may return slightly different float values due to color space conversion. The
  tool returns the CSS hex value that was *requested*, not the value read back from
  OmniFocus. Exact round-trip fidelity is not guaranteed.

- **Setting iconColor on a perspective with a custom icon image**: When `iconColor` is set
  on a perspective that has a custom icon image, OmniFocus applies the color as a tint. The
  `iconColor` property and custom icon image are independent properties -- setting one does
  not clear the other. The behavior is controlled by OmniFocus internally.

- **Color overwrite is idempotent**: Setting `iconColor` on a perspective that already has
  an icon color simply overwrites the previous value. This is correct idempotent behavior,
  not an error.

- **Multi-window scenarios**: `switch_perspective` always targets `document.windows[0]`,
  which is the frontmost OmniFocus window. Multi-window and tabbed-window scenarios are
  out of scope -- the tool always operates on the primary window.

- **Custom perspective with same name as built-in**: Custom perspectives and built-in
  perspectives are searched separately. When looking up by name, built-in names are matched
  first against the well-known list, then custom perspectives are searched via
  `Perspective.Custom.byName()`. There is no namespace collision because they are different
  types with different lookup paths.

- **OmniFocus Pro requirement**: Custom perspectives require an OmniFocus Pro license. Users
  on the Standard license will have no custom perspectives. `list_perspectives` returns an
  empty custom list (not an error). Tools that target custom perspectives by name/ID will
  return `NOT_FOUND` if the user has no Pro license and no custom perspectives exist.

---

## Requirements *(mandatory)*

### Functional Requirements - list_perspectives

- **FR-001**: Tool MUST return all built-in perspectives with their names and type indicator
- **FR-002**: Tool MUST return all custom perspectives from `Perspective.Custom.all` with
  names, identifiers, and filter rule summaries
- **FR-003**: Tool MUST support a `type` filter parameter accepting "all", "builtin", or
  "custom" (default: "all"). This replaces the legacy `includeBuiltIn`/`includeCustom`
  boolean parameters -- no backward-compatible aliases are provided
- **FR-004**: Built-in perspectives MUST include: Inbox, Projects, Tags, Forecast, Flagged,
  Review (these are always present on macOS)
- **FR-005**: Custom perspectives MUST include `identifier`, `name`, and
  `archivedTopLevelFilterAggregation` (filter type: any/all/none) in the response
- **FR-006**: Tool MUST return perspectives sorted alphabetically by name within each type
  group (built-in first, then custom)
- **FR-007**: Tool MUST return a `totalCount` indicating the total number of perspectives
  returned
- **FR-008**: Tool MUST replace the legacy `list_perspectives` tool in-place in server.ts
  (same tool name, new implementation with new definition/primitive/contract files; legacy
  files deleted)

### Functional Requirements - get_perspective

- **FR-009**: Tool MUST accept either a perspective `name` or `identifier` parameter
- **FR-010**: Tool MUST look up custom perspectives using `Perspective.Custom.byName(name)`
  for name-based lookups and `Perspective.Custom.byIdentifier(id)` for identifier-based
  lookups (both return `Perspective.Custom` or `null`)
- **FR-011**: Tool MUST return perspective metadata: name, identifier, type (builtin/custom)
- **FR-012**: For custom perspectives, tool MUST return filter rule configuration including
  `archivedFilterRules` (serialized as-is via `JSON.stringify` -- opaque object owned by
  OmniFocus, not parsed or validated) and `archivedTopLevelFilterAggregation`
- **FR-012a**: Filter rule properties (`archivedFilterRules`, `archivedTopLevelFilterAggregation`)
  MUST be version-gated using `app.userVersion.atLeast(new Version('4.2'))`. When the
  OmniFocus version is below 4.2, these fields MUST be omitted (returned as `null`)
- **FR-013**: Tool MUST return an error when the specified perspective is not found
- **FR-014**: When name matches multiple custom perspectives, tool MUST return a
  disambiguation error with matching candidates
- **FR-015**: Tool MUST replace the legacy `get_perspective_view` tool with the new
  `get_perspective` tool name. The old tool registration is removed from server.ts and
  legacy definition/primitive files are deleted. The new tool uses clean Zod contract
  schemas -- no backward-compatible response shape aliases
- **FR-016**: For built-in perspectives, tool MUST return available metadata (name, type)
  noting that built-in perspectives have limited queryable properties

### Functional Requirements - switch_perspective

- **FR-017**: Tool MUST accept either a perspective `name` or `identifier` parameter
- **FR-018**: Tool MUST set `document.windows[0].perspective` to switch the active view
- **FR-019**: Tool MUST verify that at least one OmniFocus window is open before attempting
  the switch
- **FR-020**: Tool MUST return an error if no windows are available
- **FR-021**: Tool MUST return confirmation including the perspective name that was switched to
  and the name of the previously active perspective (so the AI assistant can report what changed)
- **FR-022**: Tool description MUST clearly warn AI assistants that this action changes
  what the user sees on screen (UI-affecting operation)
- **FR-023**: Tool MUST succeed without error if the requested perspective is already active
  (idempotent)
- **FR-024**: Tool MUST support switching to both built-in and custom perspectives

### Functional Requirements - export_perspective

- **FR-025**: Tool MUST accept a custom perspective `name` or `identifier` parameter
- **FR-026**: Tool MUST return an error if the perspective is built-in (only custom
  perspectives can be exported)
- **FR-027**: Tool MUST use the `fileWrapper()` API to obtain the exportable configuration
- **FR-028**: Tool MUST support an optional `saveTo` parameter specifying a directory path
  for file output
- **FR-029**: When `saveTo` is provided, tool MUST use
  `writeFileRepresentationIntoDirectory()` to save the file and return the output path
- **FR-030**: When `saveTo` is not provided, tool MUST return export metadata
  (filename, file type) in the response
- **FR-031**: Tool MUST return an error if the specified perspective is not found
- **FR-032**: Tool MUST return an error if the `saveTo` directory does not exist or is
  not writable

### Functional Requirements - set_perspective_icon

- **FR-033**: Tool MUST accept a custom perspective `name` or `identifier` parameter
  and a `color` parameter
- **FR-034**: Tool MUST return an error if the perspective is built-in (only custom
  perspectives can have their icon color modified)
- **FR-035**: Tool MUST set the `iconColor` property on the custom perspective
- **FR-036**: Tool MUST accept color as a CSS hex string (e.g., "#FF0000" or "#ff0000")
  and convert to OmniJS `Color.RGB(r, g, b, a)` in the primitive. The primitive MUST
  validate the hex format (3, 4, 6, or 8 hex digits with leading `#`) before conversion
- **FR-037**: Tool MUST return confirmation including the perspective name and the
  color that was set
- **FR-038**: Tool MUST return an error if the specified perspective is not found
- **FR-039**: Tool MUST version-gate `iconColor` using
  `app.userVersion.atLeast(new Version('4.5.2'))`. When the OmniFocus version is below
  4.5.2, the tool MUST return an error indicating that icon color is not supported on
  this version. The `iconColor` property accepts a `Color` object input.

### Error Handling Requirements

- **FR-040**: All tools MUST return structured error responses with `success: false`
- **FR-041**: Error responses MUST include actionable `error` message
- **FR-042**: Disambiguation errors MUST include `candidates` array with matching
  perspective names and identifiers
- **FR-043**: All OmniJS scripts MUST use try-catch with JSON.stringify returns

### Lookup Behavior

| Parameter      | Lookup Method                                   | Scope             |
| -------------- | ----------------------------------------------- | ----------------- |
| `identifier`   | `Perspective.Custom.byIdentifier(id)`            | Custom only       |
| `name`         | `Perspective.Custom.byName(name)` + match built-in names | All perspectives  |

**Lookup precedence**: When `identifier` is provided, it takes precedence over `name`.
If both are provided, only `identifier` is used.

**Built-in perspective lookup**: Built-in perspectives are matched by well-known name.
No identifier-based lookup is available for built-in perspectives.

---

## Key Entities

### Perspective

Represents a view configuration in OmniFocus.

- **name**: Display name of the perspective
- **identifier**: Unique identifier (custom perspectives only)
- **type**: Either "builtin" or "custom"
- **filterRules**: Archived filter rule configuration (custom perspectives only)
- **filterAggregation**: Top-level filter aggregation type -- any, all, or none
  (custom perspectives only)

### Built-in Perspectives

Fixed set of perspectives available in every OmniFocus installation:

| Name      | Purpose                                    |
| --------- | ------------------------------------------ |
| Inbox     | Uncategorized items awaiting processing    |
| Projects  | All projects organized by folder           |
| Tags      | Tasks organized by tag                     |
| Forecast  | Calendar-based view of upcoming tasks      |
| Flagged   | Tasks marked as flagged                    |
| Review    | Projects due for review                    |

Note: "Nearby" is iOS-only and not available on macOS. "Completed" and "Changed"
are available in OmniFocus but are not user-facing sidebar perspectives -- they are
internal views accessible only via menu navigation. "Search" is a UI affordance, not
a perspective. All three are excluded from `BUILT_IN_PERSPECTIVE_NAMES`.

### Export Configuration

- **Format**: `.ofocus-perspective` file produced by `fileWrapper()` API
- **Content**: Binary/wrapper format containing perspective settings and filter rules
- **Scope**: Custom perspectives only; built-in perspectives cannot be exported

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `list_perspectives` returns all built-in and custom perspectives accurately
  within 500ms for setups with up to 50 custom perspectives
- **SC-002**: `get_perspective` returns complete filter rule configuration for any custom
  perspective, matching what OmniFocus displays in its perspective editor
- **SC-003**: `switch_perspective` changes the active OmniFocus window perspective within
  1 second of invocation, confirmed by the window displaying the target perspective
- **SC-004**: `export_perspective` produces a valid `.ofocus-perspective` file that can be
  re-imported into OmniFocus via the File menu
- **SC-005**: All five tools pass contract validation with Zod schemas
- **SC-006**: All tools handle perspective-not-found and disambiguation errors correctly
  with structured error responses
- **SC-007**: Legacy `list_perspectives` and `get_perspective_view` tools are fully replaced
  with no functionality regression

---

## Assumptions

- OmniFocus 4.x is the target platform (macOS only for this phase)
- `Perspective.Custom.all` reliably enumerates all user-created perspectives
- Built-in perspective names are consistent in English-language OmniFocus installations
- The `fileWrapper()` method is available on all custom perspective objects
- The `writeFileRepresentationIntoDirectory()` method accepts a URL object for the
  target directory
- `document.windows[0]` reliably references the frontmost OmniFocus window
- Filter rules stored as `archivedFilterRules` are opaque objects serialized via
  `JSON.stringify` in OmniJS; the structure is owned by OmniFocus and not parsed or
  validated by the MCP server
- The `iconColor` property is confirmed available in OmniFocus v4.5.2+; version-gated
  at runtime
- `archivedFilterRules` and `archivedTopLevelFilterAggregation` are confirmed available
  in OmniFocus v4.2+; version-gated at runtime
- `Perspective.Custom.byName()` and `Perspective.Custom.byIdentifier()` are available
  as direct lookup methods (confirmed in OmniFocus API)
- Custom perspectives require OmniFocus Pro license. Standard license users will see
  no custom perspectives, which is handled gracefully (empty arrays, NOT_FOUND errors)
- `Perspective.Custom.byName()` case sensitivity follows OmniFocus internal behavior.
  This should be verified in Script Editor during implementation -- assumed to be
  case-sensitive for custom perspective names (consistent with other OmniJS `byName()`
  methods like `flattenedProjects.byName()`)
- Perspective identifiers are opaque strings generated by OmniFocus (similar to UUIDs).
  The MCP server treats them as opaque -- no format validation beyond `.min(1)`
- `document.windows[0]` is the frontmost OmniFocus window. Multi-window scenarios are
  not addressed; the tool always operates on the primary window

---

## Out of Scope

- Creating custom perspectives programmatically (OmniJS limitation -- perspectives are
  created via the OmniFocus UI only)
- Editing perspective filter rules (complex archived JSON format; deferred to future
  enhancement)
- Deleting custom perspectives
- Reordering perspectives in the sidebar
- iOS/iPadOS perspective management
- Perspective-specific keyboard shortcuts
- Perspective sharing via OmniFocus sync
