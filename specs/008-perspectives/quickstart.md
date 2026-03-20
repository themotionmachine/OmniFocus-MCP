# Quickstart: SPEC-008 Perspectives

**Branch**: `008-perspectives` | **Date**: 2026-03-18

## Implementation Order

Follow TDD (Red-Green-Refactor) per constitution. Each tool phase:
1. Write contract tests -> verify FAIL
2. Write unit tests for primitive -> verify FAIL
3. Implement contracts in `src/contracts/perspective-tools/`
4. Implement primitive -> tests turn GREEN
5. Implement definition -> integration works
6. Manual verification in OmniFocus

## Step 1: Contracts (shared schemas)

Copy contract files from `specs/008-perspectives/contracts/` to
`src/contracts/perspective-tools/`:

```text
src/contracts/perspective-tools/
├── index.ts
├── list-perspectives.ts
├── get-perspective.ts
├── switch-perspective.ts
├── export-perspective.ts
├── set-perspective-icon.ts
└── shared/
    ├── index.ts
    ├── perspective-identifier.ts
    └── perspective-summary.ts
```

## Step 2: Legacy Cleanup

Delete legacy files (clean-break migration):

```bash
rm src/tools/definitions/listPerspectives.ts
rm src/tools/definitions/getPerspectiveView.ts
rm src/tools/primitives/listPerspectives.ts
rm src/tools/primitives/getPerspectiveView.ts
```

Remove `OmnifocusPerspective` interface from `src/types.ts`.

Remove old tool registrations from `src/server.ts`:
- `list_perspectives` (old registration)
- `get_perspective_view` (retired)

## Step 3: P1 Tools (list_perspectives, get_perspective)

### list_perspectives

- **Definition**: `src/tools/definitions/listPerspectives.ts` (new implementation)
- **Primitive**: `src/tools/primitives/listPerspectives.ts` (new implementation)
- **Contract**: `src/contracts/perspective-tools/list-perspectives.ts`
- **OmniJS**: Enumerate `Perspective.BuiltIn.*` + `Perspective.Custom.all`
- **Version gate**: `archivedTopLevelFilterAggregation` requires v4.2+

### get_perspective

- **Definition**: `src/tools/definitions/getPerspective.ts`
- **Primitive**: `src/tools/primitives/getPerspective.ts`
- **Contract**: `src/contracts/perspective-tools/get-perspective.ts`
- **OmniJS**: `Perspective.Custom.byName()` / `byIdentifier()` + built-in name match
- **Version gate**: `archivedFilterRules` and `archivedTopLevelFilterAggregation` require v4.2+

## Step 4: P2 Tool (switch_perspective)

- **Definition**: `src/tools/definitions/switchPerspective.ts`
- **Primitive**: `src/tools/primitives/switchPerspective.ts`
- **Contract**: `src/contracts/perspective-tools/switch-perspective.ts`
- **OmniJS**: `document.windows[0].perspective = perspectiveObj`
- **Key**: Validate `document.windows.length > 0` before switch

## Step 5: P3 Tools (export_perspective, set_perspective_icon)

### export_perspective

- **Definition**: `src/tools/definitions/exportPerspective.ts`
- **Primitive**: `src/tools/primitives/exportPerspective.ts`
- **Contract**: `src/contracts/perspective-tools/export-perspective.ts`
- **OmniJS**: `perspective.fileWrapper()` + optional `writeFileRepresentationIntoDirectory()`

### set_perspective_icon

- **Definition**: `src/tools/definitions/setPerspectiveIcon.ts`
- **Primitive**: `src/tools/primitives/setPerspectiveIcon.ts`
- **Contract**: `src/contracts/perspective-tools/set-perspective-icon.ts`
- **OmniJS**: `perspective.iconColor = Color.RGB(r, g, b, a)`
- **Version gate**: Requires OmniFocus v4.5.2+
- **Key**: CSS hex -> Color.RGB() conversion in primitive

## Step 6: Server Registration

Update `src/server.ts` to register all 5 new tools:
- `list_perspectives` (replaced in-place)
- `get_perspective` (new, replaces retired `get_perspective_view`)
- `switch_perspective` (new)
- `export_perspective` (new)
- `set_perspective_icon` (new)

## Key Patterns to Follow

- **Contracts**: Mirror `src/contracts/notification-tools/` structure
- **Definitions**: Mirror `src/tools/definitions/listNotifications.ts` (import schema from contract)
- **Primitives**: Mirror `src/tools/primitives/listNotifications.ts` (generate OmniJS, execute, return typed response)
- **Version gating**: Mirror `src/tools/primitives/dropItems.ts` (`app.userVersion.atLeast()`)
- **String escaping**: Use `escapeForJS()` helper for all string interpolation in OmniJS scripts
