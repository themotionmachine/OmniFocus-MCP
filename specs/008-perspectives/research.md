# Research: SPEC-008 Perspectives

**Branch**: `008-perspectives` | **Date**: 2026-03-18

## Research Tasks

### RT-001: OmniJS Perspective API Surface

**Decision**: Use `Perspective.Custom.all`, `Perspective.Custom.byName()`, `Perspective.Custom.byIdentifier()`, and `Perspective.BuiltIn.*` enum for perspective access.

**Rationale**: These are the confirmed OmniJS APIs from the clarify sessions. `byName()` and `byIdentifier()` return `Perspective.Custom` or `null`. Built-in perspectives are accessed via the `Perspective.BuiltIn` enum (Inbox, Projects, Tags, Forecast, Flagged, Review).

**Alternatives considered**:
- `flattenedPerspectives` or similar collection -- not available in OmniJS API
- Name-string matching against `Perspective.Custom.all` -- unnecessary since `byName()` exists

**Source**: SPEC-008 spec.md Clarification Session 2026-03-18, OmniJS API documentation

### RT-002: Perspective Filter Rules and Version Gating

**Decision**: `archivedFilterRules` and `archivedTopLevelFilterAggregation` are available on `Perspective.Custom` objects starting from OmniFocus v4.2+. Serialize as-is via `JSON.stringify` without parsing.

**Rationale**: These are opaque objects owned by OmniFocus. The spec explicitly states not to parse or validate the rule structure. Version gating follows the established `app.userVersion.atLeast(new Version('4.2'))` pattern from `dropItems.ts` and `getRepetition.ts`.

**Alternatives considered**:
- Parsing filter rules into typed structures -- rejected per spec (opaque, owned by OmniFocus)
- Omitting filter rules entirely -- loses valuable perspective metadata for AI assistants

**Source**: SPEC-008 FR-012, FR-012a; existing version gating patterns in `src/tools/primitives/dropItems.ts`

### RT-003: Perspective Icon Color API

**Decision**: Use `iconColor` property on `Perspective.Custom` objects (v4.5.2+). Accept CSS hex input (`#RRGGBB` or `#RRGGBBAA`), parse server-side, convert to `Color.RGB(r, g, b, a)` in OmniJS script.

**Rationale**: CSS hex is the simplest format for AI assistants to produce. The conversion from hex to `Color.RGB()` float values (0.0-1.0 per channel) is straightforward arithmetic. `iconColor` accepts a `Color` object.

**Alternatives considered**:
- Accepting RGB float arrays directly -- less intuitive for AI assistants
- Named CSS colors -- over-engineered, hex is sufficient
- Accept only 6-digit hex -- spec says 3, 4, 6, or 8 digit formats supported

**Source**: SPEC-008 FR-036, FR-039; Clarification Session 2026-03-18

### RT-004: Perspective Export via fileWrapper()

**Decision**: Use `fileWrapper()` on `Perspective.Custom` to get exportable configuration. When `saveTo` is provided, use `writeFileRepresentationIntoDirectory()` with a `URL.filePath()` target. When no `saveTo`, serialize FileWrapper metadata as JSON (name, type, preferredFilename) since binary content is not MCP-transportable.

**Rationale**: `fileWrapper()` returns a `FileWrapper` object. The `writeFileRepresentationIntoDirectory()` method writes the `.ofocus-perspective` file to disk. For inline response (no `saveTo`), returning the full binary content via MCP is impractical; instead, return serializable metadata about the exportable perspective.

**Alternatives considered**:
- Base64-encoding the binary content -- adds complexity, spec suggests this as option but metadata-only is more practical for AI assistants
- Always requiring `saveTo` -- limits flexibility when user just wants to know export is possible

**Source**: SPEC-008 FR-027, FR-028, FR-029, FR-030

### RT-005: Perspective Switching via Window API

**Decision**: Use `document.windows[0].perspective` to switch the active perspective. Validate `document.windows.length > 0` before attempting switch.

**Rationale**: `document.windows[0]` is the standard way to reference the frontmost OmniFocus window. Setting `.perspective` changes the active view. The operation is idempotent (setting the same perspective again is a no-op).

**Alternatives considered**:
- Using `app.windows` instead of `document.windows` -- `document.windows` is the established pattern
- Creating a new window if none exists -- out of scope, spec says return error

**Source**: SPEC-008 FR-018, FR-019, FR-020; Constitution Platform Constraints section

### RT-006: Legacy Migration Strategy

**Decision**: Clean-break migration. Delete 4 legacy files, remove `OmnifocusPerspective` from `types.ts`, replace tool registrations in `server.ts`.

**Rationale**: Per clarify session, MCP tools are consumed by AI assistants (not versioned APIs). The legacy tools have no tests, no contracts, and no documented response shapes. No deprecation period is warranted.

**Files to delete**:
- `src/tools/definitions/listPerspectives.ts`
- `src/tools/definitions/getPerspectiveView.ts`
- `src/tools/primitives/listPerspectives.ts`
- `src/tools/primitives/getPerspectiveView.ts`

**Interface to remove**: `OmnifocusPerspective` from `src/types.ts`

**Tool registrations to replace in server.ts**:
- `list_perspectives` -- same name, new implementation
- `get_perspective_view` -- retired, replaced by `get_perspective`

**New registrations to add**:
- `switch_perspective`
- `export_perspective`
- `set_perspective_icon`

**Source**: SPEC-008 Migration Context section, Clarification Session 2026-03-18

### RT-007: Shared Schemas for Perspective Tools

**Decision**: Create shared schemas for perspective identifier (name/identifier with precedence), perspective type enum, and built-in perspective names.

**Rationale**: Multiple tools share the same lookup pattern (name or identifier, identifier takes precedence). A shared `PerspectiveIdentifierSchema` mirrors the `TaskIdentifierSchema` pattern from notification-tools. A shared `PerspectiveTypeSchema` enum ("builtin"/"custom") and `BuiltInPerspectiveNames` constant array avoid duplication.

**Source**: Existing patterns in `src/contracts/notification-tools/shared/task-identifier.ts`, `src/contracts/review-tools/shared/`

### RT-008: Built-in Perspective Name Matching

**Decision**: Match built-in perspective names case-insensitively against the well-known list: Inbox, Projects, Tags, Forecast, Flagged, Review. For `switch_perspective`, use `Perspective.BuiltIn.*` enum values directly. For `get_perspective`, return limited metadata (name + type only).

**Rationale**: Built-in perspectives do not have `byIdentifier()` or `byName()` methods -- they are enum values on `Perspective.BuiltIn`. Name-based lookup must match against the known list. Case-insensitive matching improves usability for AI assistants.

**Alternatives considered**:
- Strict case-sensitive matching only -- reduces usability
- Fuzzy matching -- over-engineered per YAGNI

**Source**: SPEC-008 FR-004, FR-010, FR-016, Lookup Behavior table
