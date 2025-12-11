# API Contract Completeness Checklist: Folder Management Tools

**Purpose**: Validate contract files are implementation-ready for all five
folder management MCP tools
**Created**: 2025-12-10
**Verified**: 2025-12-10 (Auto-verified against contracts/)
**Feature**: [spec.md](../spec.md), [data-model.md](../data-model.md)

**Note**: Validates contracts in `specs/002-folder-tools/contracts/*.ts`
against spec.md and data-model.md. Focus: can implementation proceed with
only the contract file as reference?

## Tool Definition - list_folders

- [x] CHK001 Tool name uses MCP lowercase_underscore convention [Clarity]
- [x] CHK002 Description explains listing with optional filtering [Clarity]
- [x] CHK003 `status` parameter has description with enum values [Clarity]
- [x] CHK004 `parentId` parameter has description with null semantics [Clarity]
- [x] CHK005 `includeChildren` parameter has default value documented [Gap]
- [x] CHK006 All parameters clearly marked optional with `?` [Completeness]

## Tool Definition - add_folder

- [x] CHK007 Tool name uses MCP lowercase_underscore convention [Clarity]
- [x] CHK008 Description explains folder creation at position [Clarity]
- [x] CHK009 Contrasts with move_folder for hierarchy changes [Gap]
- [x] CHK010 `name` parameter has non-empty requirement documented [Clarity]
- [x] CHK011 `position` parameter has default behavior documented [Clarity]
- [x] CHK012 Required vs optional parameters clearly distinguished [Clarity]

## Tool Definition - edit_folder

- [x] CHK013 Tool name uses MCP lowercase_underscore convention [Clarity]
- [x] CHK014 Description explains partial update semantics [Clarity]
- [x] CHK015 Contrasts with move_folder for position changes [Gap]
- [x] CHK016 Identification fields (id, name) have precedence documented [Clarity]
- [x] CHK017 Update fields (newName, newStatus) have prefix explained [Gap]
- [x] CHK018 Parameter constraints documented (one of each pair) [Clarity]

## Tool Definition - remove_folder

- [x] CHK019 Tool name uses MCP lowercase_underscore convention [Clarity]
- [x] CHK020 Description explains recursive deletion behavior [Clarity]
- [x] CHK021 Identification fields have precedence documented [Clarity]
- [x] CHK022 No force parameter - matches native OF behavior noted [Clarity]
- [x] CHK023 Required identification (id|name) clearly stated [Completeness]

## Tool Definition - move_folder

- [x] CHK024 Tool name uses MCP lowercase_underscore convention [Clarity]
- [x] CHK025 Description explains hierarchy relocation [Clarity]
- [x] CHK026 Contrasts with edit_folder for property changes [Gap]
- [x] CHK027 `position` marked as required (no default) [Clarity]
- [x] CHK028 Identification fields have precedence documented [Clarity]
- [x] CHK029 Circular move prevention documented [Gap]

## Input Schema - Position Conditional Validation

- [x] CHK030 `placement: 'before'` requires `relativeTo` documented [Spec §FR-010]
- [x] CHK031 `placement: 'after'` requires `relativeTo` documented [Spec §FR-010]
- [x] CHK032 `placement: 'beginning'` has optional `relativeTo` [Spec §FR-010]
- [x] CHK033 `placement: 'ending'` has optional `relativeTo` [Spec §FR-010]
- [x] CHK034 Zod `.refine()` implements conditional requirement [Consistency]
- [x] CHK035 Error message specifies which field is invalid [Clarity]
- [x] CHK036 Library root default (omit relativeTo) documented [Spec §FR-010]

## Input Schema - Folder Identification

- [x] CHK037 `id` takes precedence over `name` documented [Spec §15]
- [x] CHK038 At least one identifier required validation exists [Completeness]
- [x] CHK039 Zod `.refine()` enforces id|name requirement [Consistency]
- [x] CHK040 Error message for missing identifier is clear [Clarity]
- [x] CHK041 Case-sensitive matching for name documented [Spec §4]

## Input Schema - list_folders Filters

- [x] CHK042 `status` filter with enum values defined [Spec §FR-004]
- [x] CHK043 `parentId` + `includeChildren:true` behavior documented [Spec §FR-006]
- [x] CHK044 `parentId` + `includeChildren:false` behavior documented [Spec §FR-006]
- [x] CHK045 Omitted `parentId` + `includeChildren:true` behavior [Spec §FR-006]
- [x] CHK046 Omitted `parentId` + `includeChildren:false` behavior [Spec §FR-006]
- [x] CHK047 Default `includeChildren: true` specified [data-model.md]

## Input Schema - edit_folder Partial Updates

- [x] CHK048 At least one update field required validation [Spec §FR-015a]
- [x] CHK049 `newName` and `newStatus` both optional individually [Clarity]
- [x] CHK050 Zod `.refine()` enforces update field requirement [Consistency]
- [x] CHK051 `newName` trim transform documented [Spec §17]
- [x] CHK052 `newStatus` enum values match data-model [Consistency]

## Input Schema - Edge Cases

- [x] CHK053 Empty name rejection documented (after trim) [Spec §17]
- [x] CHK054 Invalid ID handling documented (not found) [Spec §Edge Cases]
- [x] CHK055 Circular move detection for move_folder [Spec §FR-025]
- [x] CHK056 Invalid relativeTo handling documented [Spec §11]
- [x] CHK057 Invalid parentId handling documented [Spec §19]
- [x] CHK058 Library root operation rejection documented [Spec §28]

## Response Schema - Success Structures

- [x] CHK059 list_folders: `{ success, folders[] }` defined [Spec §FR-002]
- [x] CHK060 add_folder: `{ success, id, name }` defined [Spec §FR-011a]
- [x] CHK061 edit_folder: `{ success, id, name }` defined [Spec §FR-016]
- [x] CHK062 remove_folder: `{ success, id, name }` defined [Spec §FR-019]
- [x] CHK063 move_folder: `{ success, id, name }` defined [Spec §FR-026]

## Response Schema - Folder Entity

- [x] CHK064 FolderSchema includes `id: string` [data-model.md]
- [x] CHK065 FolderSchema includes `name: string` [data-model.md]
- [x] CHK066 FolderSchema includes `status` enum [data-model.md]
- [x] CHK067 FolderSchema includes `parentId: string|null` [data-model.md]
- [x] CHK068 All fields have `.describe()` documentation [Clarity]

## Response Schema - Error Structures

- [x] CHK069 Standard error `{ success: false, error: string }` [Spec §FR-028]
- [x] CHK070 Disambiguation error includes `code` field [Spec §FR-027]
- [x] CHK071 Disambiguation error includes `matchingIds` array [Spec §FR-027]
- [x] CHK072 `code` value is literal `'DISAMBIGUATION_REQUIRED'` [Spec §34]
- [x] CHK073 z.union or discriminatedUnion covers all response types [Consistency]

## Response Schema - Error Scenarios Mapped

- [x] CHK074 "Folder not found" maps to standard error [Completeness]
- [x] CHK075 "Invalid parentId" maps to standard error [Completeness]
- [x] CHK076 "Invalid relativeTo" maps to standard error [Completeness]
- [x] CHK077 "Circular move" maps to standard error [Completeness]
- [x] CHK078 "Empty name" maps to standard error [Completeness]
- [x] CHK079 "Multiple name matches" maps to disambiguation [Completeness]
- [x] CHK080 "Library operation" maps to standard error [Completeness]

## Schema-to-Spec Alignment - Functional Requirements

- [x] CHK081 list_folders schema matches FR-001 to FR-006 [Consistency]
- [x] CHK082 add_folder schema matches FR-007 to FR-011a [Consistency]
- [x] CHK083 edit_folder schema matches FR-012 to FR-016 [Consistency]
- [x] CHK084 remove_folder schema matches FR-017 to FR-020 [Consistency]
- [x] CHK085 move_folder schema matches FR-021 to FR-026 [Consistency]

## Schema-to-Spec Alignment - Data Model

- [x] CHK086 FolderSchema matches data-model Folder entity [Consistency]
- [x] CHK087 PositionSchema matches data-model Position entity [Consistency]
- [x] CHK088 Position mapping table in data-model has schema parity [Consistency]
- [x] CHK089 Status enum values match Folder.Status in data-model [Consistency]
- [x] CHK090 Error codes in data-model match schema definitions [Consistency]

## Schema-to-Spec Alignment - Position System

- [x] CHK091 Position requirement rules match spec clarification #33 [Consistency]
- [x] CHK092 `relativeTo` conditional logic matches data-model rules [Consistency]
- [x] CHK093 add_folder position default matches FR-010 [Consistency]
- [x] CHK094 move_folder position required matches FR-023 [Consistency]
- [x] CHK095 Position mapping to Omni Automation documented [Completeness]

## Schema-to-Spec Alignment - Error Responses

- [x] CHK096 Disambiguation error matches clarification #34 [Consistency]
- [x] CHK097 Standard error matches clarification #9 [Consistency]
- [x] CHK098 Error codes table in data-model covers all scenarios [Completeness]
- [x] CHK099 Error message patterns are consistent across tools [Consistency]

## Implementation Readiness

- [x] CHK100 Type exports provided for all input/output types [Completeness]
- [x] CHK101 Schema exports provided for runtime validation [Completeness]
- [x] CHK102 Zod version compatibility documented (4.1.x) [Gap]
- [x] CHK103 No external dependencies beyond Zod [Consistency]
- [x] CHK104 Contract file header comments describe tool purpose [Clarity]
- [x] CHK105 Contract follows existing codebase patterns [Consistency]

## Notes

- Check items off as completed: `[x]`
- `[Gap]` indicates missing specification that may need addition
- `[Spec §X]` references clarification numbers in spec.md
- `[Consistency]` checks alignment between artifacts
- `[Clarity]` checks documentation completeness
- `[Completeness]` checks coverage of requirements
