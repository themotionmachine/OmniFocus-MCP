# Type Safety & Schema Consistency Checklist: Tag Management Tools

**Purpose**: Validate consistency across three type layers (Zod schemas, TypeScript types, OmniJS scripts)
**Created**: 2025-12-10
**Feature**: [spec.md](../spec.md), [data-model.md](../data-model.md)
**Validated**: 2025-12-10
**Result**: 151/151 items satisfied (100%)

## Layer Overview

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Zod Schemas** | `src/contracts/tag-tools/` | Runtime validation, type inference source |
| **TypeScript Types** | Inferred from Zod via `z.infer<>` | Compile-time safety |
| **OmniJS Scripts** | `src/tools/primitives/*.ts` | Runtime data structure production |

## 1. Tag Entity Schema (TagSchema)

### Zod Schema Definition (`src/contracts/tag-tools/shared/tag.ts`)

- [x] `id` field is `z.string()` with `.describe()` — data-model.md line 27-28
- [x] `name` field is `z.string()` with `.describe()` — data-model.md line 29
- [x] `status` field is `z.enum(['active', 'onHold', 'dropped'])` (3-state) — data-model.md line 30-31, spec.md clarification 5
- [x] `parentId` field is `z.string().nullable()` (not `.optional()`) — data-model.md line 32-33
- [x] `allowsNextAction` field is `z.boolean()` with `.describe()` — data-model.md line 34-35
- [x] `taskCount` field is `z.number().int().min(0)` with `.describe()` — data-model.md line 36-37
- [x] Schema exports `type Tag = z.infer<typeof TagSchema>` — data-model.md line 40

### OmniJS Script Output Alignment

- [x] OmniJS returns `id` from `tag.id.primaryKey` (string) — data-model.md line 369, quickstart.md line 185
- [x] OmniJS returns `name` from `tag.name` (string) — data-model.md line 370
- [x] OmniJS maps `Tag.Status.Active` → `"active"` — data-model.md line 382
- [x] OmniJS maps `Tag.Status.OnHold` → `"onHold"` — data-model.md line 379-380
- [x] OmniJS maps `Tag.Status.Dropped` → `"dropped"` — data-model.md line 381
- [x] OmniJS returns `parentId` from `tag.parent?.id.primaryKey ?? null` — quickstart.md line 188
- [x] OmniJS returns `allowsNextAction` from `tag.allowsNextAction` (boolean) — data-model.md line 373
- [x] OmniJS returns `taskCount` from `tag.remainingTasks.length` (number) — data-model.md line 374, spec.md clarification 6

### Cross-Layer Consistency (Tag Entity)

- [x] Status enum values match EXACTLY: `'active'`, `'onHold'`, `'dropped'` (case-sensitive) — verified across all layers
- [x] `parentId` is `null` for root-level tags (not `undefined`, not empty string) — z.nullable() confirmed
- [x] `taskCount` counts incomplete tasks only (matches `remainingTasks.length` definition) — spec.md clarification 6

---

## 2. Tag.Status Enumeration

### Zod Schema Validation

- [x] Input schemas accepting status use `z.enum(['active', 'onHold', 'dropped'])` — data-model.md lines 111, 188
- [x] Filter parameter in `list_tags` is `.optional()` (not required) — data-model.md line 111
- [x] Edit schema status update is `.optional()` (partial update semantics) — data-model.md line 188, FR-019

### OmniJS Mapping Functions

- [x] `mapStatus(tag)` function exists in OmniJS scripts — data-model.md lines 378-384, quickstart.md lines 391-396
- [x] Returns `"onHold"` for `Tag.Status.OnHold` (not `"on_hold"` or `"onhold"`) — exact camelCase verified
- [x] Returns `"dropped"` for `Tag.Status.Dropped` (not `"archived"`) — consistent terminology
- [x] Returns `"active"` for `Tag.Status.Active` (default case) — data-model.md line 382

- [x] `parseStatus(str)` function exists for edit operations — data-model.md lines 385-389
- [x] Parses `"onHold"` → `Tag.Status.OnHold` — data-model.md line 386
- [x] Parses `"dropped"` → `Tag.Status.Dropped` — data-model.md line 387
- [x] Parses `"active"` → `Tag.Status.Active` (default case) — data-model.md line 388

### Cross-Layer Consistency (Status Enum)

- [x] Zod enum values match OmniJS output values exactly (case-sensitive strings) — all layers use identical strings
- [x] No intermediate "unknown" or "pending" status values — only 3 defined
- [x] 3-state model consistent across all layers (not 2-state like folders) — plan.md line 133 documents difference

---

## 3. TagPositionSchema

### Zod Schema Definition (`src/contracts/tag-tools/shared/position.ts`)

- [x] `placement` is `z.enum(['before', 'after', 'beginning', 'ending'])` — data-model.md line 61
- [x] `relativeTo` is `z.string().optional()` — data-model.md line 63
- [x] `.refine()` validates: `before`/`after` REQUIRE `relativeTo` — data-model.md lines 65-76
- [x] `.refine()` validates: `beginning`/`ending` allow `relativeTo` to be omitted — spec.md clarification 1
- [x] Refinement error message specifies path `['relativeTo']` — data-model.md line 75
- [x] Refinement error message is descriptive: "relativeTo is required for 'before' and 'after' placements" — data-model.md line 74

### OmniJS Position Mapping

- [x] `before` + `relativeTo` maps to `siblingTag.before` — spec.md FR-010, plan.md line 176
- [x] `after` + `relativeTo` maps to `siblingTag.after` — plan.md line 177
- [x] `beginning` + `relativeTo` maps to `parentTag.beginning` — plan.md line 174
- [x] `beginning` without `relativeTo` maps to `tags.beginning` — plan.md line 172
- [x] `ending` + `relativeTo` maps to `parentTag.ending` — plan.md line 175
- [x] `ending` without `relativeTo` maps to `tags.ending` — plan.md line 173
- [x] Position `undefined` (omitted entirely) defaults to `tags.ending` — spec.md FR-010

### Cross-Layer Consistency (Position)

- [x] Zod validation runs BEFORE OmniJS script generation — quickstart.md lines 226-241
- [x] OmniJS script assumes valid position (trusts Zod validation) — architecture pattern
- [x] Invalid `relativeTo` ID handled with error: `"Invalid relativeTo '{id}': tag not found"` — data-model.md position error table, quickstart.md lines 443-454

---

## 4. DisambiguationErrorSchema

### Zod Schema Definition (`src/contracts/tag-tools/shared/disambiguation.ts`)

- [x] `success` is `z.literal(false)` (discriminated union key) — data-model.md line 92
- [x] `error` is `z.string()` with descriptive message — data-model.md line 93, FR-038
- [x] `code` is `z.literal('DISAMBIGUATION_REQUIRED')` (exact string) — data-model.md line 94
- [x] `matchingIds` is `z.array(z.string()).min(2)` (at least 2 matches) — data-model.md line 95

### OmniJS Disambiguation Implementation

- [x] Name lookup uses `flattenedTags.filter(t => t.name === targetName)` — quickstart.md lines 371-373
- [x] Returns disambiguation error when `matches.length > 1` — quickstart.md lines 378-384
- [x] `matchingIds` populated from `matches.map(t => t.id.primaryKey)` — quickstart.md line 382
- [x] Error message format: `"Ambiguous tag name '{name}'. Found {count} matches."` — quickstart.md line 394

### Cross-Layer Consistency (Disambiguation)

- [x] `code` field value is exactly `"DISAMBIGUATION_REQUIRED"` (all caps, underscore) — verified across layers
- [x] `matchingIds` is array of strings, not array of objects — data-model.md line 95
- [x] Disambiguation applies to: `edit_tag`, `delete_tag`, `assign_tags`, `remove_tags` — data-model.md lines 326-332
- [x] `list_tags` does NOT trigger disambiguation (uses parentId, not name lookup) — data-model.md line 327
- [x] `create_tag` does NOT trigger disambiguation (creates new, doesn't lookup) — data-model.md line 328

---

## 5. Batch Result Schemas (assign_tags / remove_tags)

### Zod Schema Definition

- [x] `AssignTagsResultSchema` has `taskId: z.string()` — data-model.md line 262
- [x] `AssignTagsResultSchema` has `taskName: z.string()` — data-model.md line 263
- [x] `AssignTagsResultSchema` has `success: z.boolean()` — data-model.md line 264
- [x] `AssignTagsResultSchema` has `error: z.string().optional()` — data-model.md line 265

- [x] `RemoveTagsResultSchema` has identical structure to `AssignTagsResultSchema` — data-model.md lines 299-304

- [x] `AssignTagsSuccessSchema` has `success: z.literal(true)` — data-model.md line 268
- [x] `AssignTagsSuccessSchema` has `results: z.array(AssignTagsResultSchema)` — data-model.md lines 269-270

- [x] `RemoveTagsSuccessSchema` has `success: z.literal(true)` — data-model.md line 306
- [x] `RemoveTagsSuccessSchema` has `results: z.array(RemoveTagsResultSchema)` — data-model.md line 307

### OmniJS Per-Item Result Production

- [x] OmniJS produces result for EACH task in input array — quickstart.md lines 533-570 (assignTags), 651-690 (removeTags)
- [x] Each result has `taskId` from `task.id.primaryKey` — quickstart.md line 558
- [x] Each result has `taskName` from `task.name` — quickstart.md line 559
- [x] Each result has `success: true` or `success: false` — schema defines z.boolean()
- [x] Failed results include `error` string with specific reason — data-model.md, spec.md edge cases
- [x] Results maintain original array index order — quickstart.md comment line 572, data-model.md line 416

### Cross-Layer Consistency (Batch Results)

- [x] Partial failures do NOT fail entire operation — data-model.md line 407-409, quickstart.md line 538 "continue processing"
- [x] Response `success: true` even if some per-item results failed — data-model.md lines 413-415, quickstart.md line 572
- [x] Per-item `error` only present when per-item `success: false` — data-model.md line 417
- [x] Task lookup failures produce per-item error: `"Task '{id}' not found"` — spec.md edge cases line 275
- [x] Tag lookup failures produce per-item error: `"Tag '{id}' not found"` — spec.md edge cases line 277
- [x] Disambiguation failures produce per-item error with `code` and `matchingIds` — quickstart.md lines 543-546, data-model.md lines 444-464

---

## 6. Tool-Specific Input Schemas

### list_tags (ListTagsInputSchema)

- [x] `status` is `z.enum(['active', 'onHold', 'dropped']).optional()` — data-model.md line 111
- [x] `parentId` is `z.string().optional()` — data-model.md line 113
- [x] `includeChildren` is `z.boolean().default(true)` — data-model.md line 115, spec.md clarification 3
- [x] Empty object `{}` is valid input (all defaults applied) — quickstart.md lines 262-266

### create_tag (CreateTagInputSchema)

- [x] `name` is `z.string().min(1).transform(s => s.trim())` — data-model.md line 148, spec.md edge cases
- [x] `parentId` is `z.string().optional()` — data-model.md line 150
- [x] `position` is `TagPositionSchema.optional()` — data-model.md line 152
- [x] `allowsNextAction` is `z.boolean().default(true)` — data-model.md line 154, FR-011

### edit_tag (EditTagInputSchema)

- [x] `id` is `z.string().optional()` — data-model.md line 181
- [x] `name` is `z.string().optional()` (for lookup, not update) — data-model.md line 183
- [x] `newName` is `z.string().min(1).transform(s => s.trim()).optional()` — data-model.md line 186
- [x] `status` is `z.enum(['active', 'onHold', 'dropped']).optional()` — data-model.md line 188
- [x] `allowsNextAction` is `z.boolean().optional()` — data-model.md line 190
- [x] `.refine()` validates: `id` OR `name` must be provided — data-model.md lines 192-194
- [x] `.refine()` validates: at least one update field must be provided — data-model.md lines 195-197, FR-019

### delete_tag (DeleteTagInputSchema)

- [x] `id` is `z.string().optional()` — data-model.md line 221
- [x] `name` is `z.string().optional()` — data-model.md line 223
- [x] `.refine()` validates: `id` OR `name` must be provided — data-model.md lines 225-227

### assign_tags (AssignTagsInputSchema)

- [x] `taskIds` is `z.array(z.string()).min(1)` — data-model.md line 251
- [x] `tagIds` is `z.array(z.string()).min(1)` — data-model.md line 253

### remove_tags (RemoveTagsInputSchema)

- [x] `taskIds` is `z.array(z.string()).min(1)` — data-model.md line 284
- [x] `tagIds` is `z.array(z.string()).optional()` — data-model.md line 286
- [x] `clearAll` is `z.boolean().default(false)` — data-model.md line 288, FR-033
- [x] `.refine()` validates: `clearAll` OR `tagIds` with length > 0 — data-model.md lines 290-292

---

## 7. Response Schema Discriminated Unions

### Success/Error Union Pattern

- [x] All tools use discriminated union on `success` field — quickstart.md lines 118-121
- [x] Success schema has `success: z.literal(true)` — quickstart.md line 108
- [x] Error schema has `success: z.literal(false)` — quickstart.md line 114
- [x] Response schema uses `z.discriminatedUnion('success', [...])` — quickstart.md line 118

### Tool-Specific Success Responses

- [x] `list_tags` success has `tags: z.array(TagSchema)` — data-model.md lines 123-126
- [x] `create_tag` success has `id: z.string()` and `name: z.string()` — data-model.md lines 162-166, FR-013
- [x] `edit_tag` success has `id: z.string()` and `name: z.string()` — data-model.md lines 203-208, FR-020
- [x] `delete_tag` success has `id: z.string()` and `name: z.string()` — data-model.md lines 233-238, FR-024
- [x] `assign_tags` success has `results: z.array(AssignTagsResultSchema)` — data-model.md lines 269-270
- [x] `remove_tags` success has `results: z.array(RemoveTagsResultSchema)` — data-model.md line 307

### Error Response Consistency

- [x] Standard error: `{ success: false, error: string }` — data-model.md lines 316-319, FR-039
- [x] Disambiguation error: `{ success: false, error: string, code: 'DISAMBIGUATION_REQUIRED', matchingIds: string[] }` — data-model.md lines 91-96, FR-038
- [x] OmniJS catch blocks return standard error format — quickstart.md line 196
- [x] TypeScript error handling wraps exceptions in standard format — quickstart.md lines 208-210

---

## 8. TypeScript Type Inference Alignment

### Type Export Pattern

- [x] Each contract file exports Zod schema AND inferred type — data-model.md line 40, quickstart.md line 106
- [x] Pattern: `export type X = z.infer<typeof XSchema>` — quickstart.md lines 106, 123
- [x] No manual type definitions that could drift from Zod schemas — all use z.infer

### Primitive Function Signatures

- [x] Primitive functions accept `z.input<typeof Schema>` (pre-transform) — quickstart.md line 134
- [x] Primitive functions return `Promise<ResponseType>` (inferred from response schema) — quickstart.md line 201
- [x] No `any` types in primitive signatures — all typed
- [x] No type assertions (`as Type`) - use Zod validation — quickstart.md lines 207-221 uses runtime validation with type narrowing

### Definition Handler Signatures

- [x] Handlers accept `unknown` params (validated by Zod) — quickstart.md line 225
- [x] Handlers return MCP response format: `{ content: [...], isError?: boolean }` — quickstart.md lines 229-249
- [x] Validation errors return `isError: true` — quickstart.md line 239
- [x] Runtime errors return `isError: true` — quickstart.md line 248

---

## 9. OmniJS Script Safety Patterns

### JSON Output Structure

- [x] All OmniJS scripts wrapped in IIFE: `(function() { ... })();` — quickstart.md lines 149, 198
- [x] All OmniJS scripts have try-catch with JSON error return — quickstart.md lines 150, 195-197
- [x] Success: `return JSON.stringify({ success: true, ... })` — quickstart.md line 194
- [x] Error: `return JSON.stringify({ success: false, error: e.message || String(e) })` — quickstart.md line 196

### String Escaping

- [x] `escapeForJS()` function escapes backslashes: `\\` → `\\\\` — quickstart.md line 144
- [x] `escapeForJS()` function escapes quotes: `"` → `\\"` — quickstart.md line 144
- [x] `escapeForJS()` function escapes newlines: `\n` → `\\n` — quickstart.md line 144
- [x] All user-provided strings passed through escapeForJS before OmniJS injection — quickstart.md lines 146-147

### Null Safety in OmniJS

- [x] `tag.parent?.id.primaryKey ?? null` pattern used (not `|| null`) — quickstart.md line 188 uses ternary (OmniJS compat)
- [x] Null checks before accessing properties on lookup results — quickstart.md lines 167-172
- [x] `Tag.byIdentifier()` result checked before use — quickstart.md line 167

---

## 10. Contract Test Coverage

### Schema Validation Tests

- [x] Test valid input acceptance for each tool schema — quickstart.md lines 261-278
- [x] Test invalid input rejection with correct error paths — quickstart.md lines 275-278
- [x] Test default values applied correctly (`includeChildren: true`, `allowsNextAction: true`) — quickstart.md lines 262-267
- [x] Test `.refine()` validations fire with correct error messages — quickstart.md lines 703-746 (EditTagInputSchema refine tests)
- [x] Test name trimming via `.transform()` on name fields — quickstart.md lines 749-786 (CreateTagInputSchema transform tests)

### Response Schema Tests

- [x] Test success response validates against success schema — quickstart.md lines 306-313
- [x] Test error response validates against error schema — quickstart.md lines 315-323
- [x] Test disambiguation response validates with correct `code` and `matchingIds` — quickstart.md lines 789-835 (DisambiguationErrorSchema tests)
- [x] Test per-item batch results validate against result schemas — quickstart.md lines 838-898 (BatchItemResultSchema tests)

---

## Validation Summary

**Result**: [x] PASS (100% - 151/151 items satisfied)

**Date Validated**: 2025-12-10

**Validated By**: Claude (automated review)

**Remediation Completed**:

1. **Batch Operation Templates** ✅ — Added OmniJS templates for assign_tags (quickstart.md lines 463-578) and remove_tags (quickstart.md lines 580-697)
2. **Continue-on-Error Semantics** ✅ — Documented in data-model.md lines 403-472
3. **Position Error Format** ✅ — Added position error table to data-model.md (lines 82-89)
4. **Test Templates** ✅ — Added refine tests (lines 703-746), transform tests (lines 749-786), disambiguation tests (lines 789-835), batch result tests (lines 838-898)
5. **Type Assertion Pattern** ✅ — Replaced `as` cast with runtime validation in primitive template (quickstart.md lines 207-221)

**Status Enum Consistency**: ✅ VERIFIED

- 3-state (active/onHold/dropped) consistent across Zod, TypeScript, and OmniJS
- Differentiated from folders (2-state) in plan.md

**Schema Reuse Opportunity**:

- BatchItemResultSchema defined in data-model.md lines 419-441
- Shared between AssignTagsSuccessSchema and RemoveTagsSuccessSchema
