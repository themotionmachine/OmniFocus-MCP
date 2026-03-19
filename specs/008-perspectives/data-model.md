# Data Model: SPEC-008 Perspectives

**Branch**: `008-perspectives` | **Date**: 2026-03-18

## Entities

### PerspectiveIdentifier

Shared input schema for perspective lookup across all tools. Follows the pattern
from `TaskIdentifierSchema` in notification-tools.

| Field        | Type              | Required | Description                              |
|-------------|-------------------|----------|------------------------------------------|
| `name`       | `string`          | Optional | Perspective name (case-insensitive match for built-in) |
| `identifier` | `string`          | Optional | Perspective identifier (custom only)     |

**Validation**: At least one of `name` or `identifier` must be provided. When both
are provided, `identifier` takes precedence.

**Lookup behavior**:
- `identifier` -> `Perspective.Custom.byIdentifier(id)` (custom only)
- `name` -> Match against built-in names first, then `Perspective.Custom.byName(name)` (all perspectives)

### BuiltInPerspective

Represents a fixed, always-present OmniFocus perspective.

| Field  | Type                  | Description                |
|--------|-----------------------|----------------------------|
| `name` | `string`              | Display name               |
| `type` | `"builtin"` (literal) | Perspective type indicator  |

**Known values**: Inbox, Projects, Tags, Forecast, Flagged, Review

### CustomPerspective

Represents a user-created perspective with configurable filter rules.

| Field                | Type                  | Version  | Description                             |
|---------------------|-----------------------|----------|-----------------------------------------|
| `name`              | `string`              | All      | Display name                            |
| `identifier`        | `string`              | All      | Unique OmniFocus identifier             |
| `type`              | `"custom"` (literal)  | All      | Perspective type indicator              |
| `filterRules`       | `unknown \| null`     | v4.2+    | Opaque archived filter rules (serialized via JSON.stringify) |
| `filterAggregation` | `"any" \| "all" \| "none" \| null` | v4.2+ | Top-level filter aggregation type |

**Version gating**: `filterRules` and `filterAggregation` are `null` when OmniFocus < v4.2.

### PerspectiveListItem

Summary representation used in `list_perspectives` responses.

| Field                | Type                  | Description                             |
|---------------------|-----------------------|-----------------------------------------|
| `name`              | `string`              | Display name                            |
| `type`              | `"builtin" \| "custom"` | Perspective type                      |
| `identifier`        | `string \| null`      | Unique ID (null for built-in)           |
| `filterAggregation` | `string \| null`      | Filter aggregation type (custom only, v4.2+) |

### ExportResult

Result of exporting a custom perspective.

| Field              | Type              | Condition        | Description                          |
|-------------------|-------------------|------------------|--------------------------------------|
| `perspectiveName` | `string`          | Always           | Name of the exported perspective     |
| `perspectiveId`   | `string`          | Always           | Identifier of the exported perspective |
| `filePath`        | `string`          | When `saveTo`    | Path to the written `.ofocus-perspective` file |
| `fileName`        | `string`          | When no `saveTo` | Preferred filename for the export    |
| `fileType`        | `string`          | When no `saveTo` | File type identifier                 |

### IconColorResult

Result of setting a perspective's icon color.

| Field              | Type     | Description                           |
|-------------------|----------|---------------------------------------|
| `perspectiveName` | `string` | Name of the modified perspective      |
| `perspectiveId`   | `string` | Identifier of the modified perspective |
| `color`           | `string` | The CSS hex color that was set        |

## State Transitions

Not applicable. Perspectives are read-only configuration objects in this phase.
The only mutation is `set_perspective_icon` which sets a property value (no state machine).

## Relationships

```text
Perspective (abstract concept)
├── BuiltInPerspective (6 fixed instances)
│   └── Accessed via Perspective.BuiltIn.* enum
└── CustomPerspective (0..N user-created)
    ├── Accessed via Perspective.Custom.all (list)
    ├── Accessed via Perspective.Custom.byName(name)
    ├── Accessed via Perspective.Custom.byIdentifier(id)
    ├── Has filterRules (opaque, v4.2+)
    ├── Has filterAggregation (v4.2+)
    └── Has iconColor (v4.5.2+)
```

## Validation Rules

1. **Hex color format**: Must match `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/`
   - 3-digit: `#RGB` -> expand to `#RRGGBB`
   - 4-digit: `#RGBA` -> expand to `#RRGGBBAA`
   - 6-digit: `#RRGGBB` -> alpha defaults to 1.0
   - 8-digit: `#RRGGBBAA`

2. **Hex to Color.RGB conversion**: Divide each channel by 255 to get float 0.0-1.0

3. **Perspective name matching (built-in)**: Case-insensitive comparison against
   well-known names: `["Inbox", "Projects", "Tags", "Forecast", "Flagged", "Review"]`

4. **saveTo path validation**: Must be an existing directory (validated in OmniJS
   via `FileManager.defaultManager.fileExistsAtPath()` or similar)
