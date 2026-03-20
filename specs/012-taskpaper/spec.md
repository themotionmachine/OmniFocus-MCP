# Feature Specification: TaskPaper Import/Export

**Feature Branch**: `012-taskpaper`
**Created**: 2026-03-20
**Status**: Draft
**Input**: User description: "TaskPaper Import/Export - 3 MCP tools for transport text import, export, and validation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Transport Text to Create Tasks (Priority: P1)

As a GTD practitioner, I want to import a transport text string to create tasks and projects so that an AI assistant can generate a complete project structure from a single text description, meeting notes, or structured outline.

**Why this priority**: Import is the primary value driver -- it enables AI assistants to bulk-create complex task hierarchies in OmniFocus from natural language processing results. Without import, the AI must create tasks one at a time, which is slow and loses hierarchical structure.

**Independent Test**: Can be fully tested by passing a multi-line transport text string containing a project with nested tasks, tags, dates, and notes, then verifying that the correct items appear in OmniFocus with the expected hierarchy and metadata. Delivers immediate value for AI-assisted task creation workflows.

**Acceptance Scenarios**:

1. **Given** a valid transport text string with a project and nested tasks, **When** the user imports it, **Then** all tasks and the project are created in OmniFocus and the system returns the identifiers of every created item.
2. **Given** a valid transport text string and an existing target project, **When** the user imports it into that project, **Then** the new tasks are created inside the specified project.
3. **Given** a transport text string with tags, due dates, defer dates, flagged status, estimated duration, and notes, **When** the user imports it, **Then** each task retains the metadata specified in the transport text.
4. **Given** an empty transport text string, **When** the user attempts to import, **Then** the system returns an error indicating that no content was provided.
5. **Given** a transport text string containing only whitespace or blank lines, **When** the user attempts to import, **Then** the system returns an error indicating no actionable content was found.

---

### User Story 2 - Export Tasks to Transport Text (Priority: P2)

As a GTD practitioner, I want to export specific tasks or a project to transport text so I can share task lists with colleagues, archive completed projects as plain text, or feed the data into other tools for processing.

**Why this priority**: Export completes the round-trip capability and enables data portability. It is essential for reporting, archiving, and inter-tool workflows, but import alone already delivers the primary AI-assistant use case.

**Independent Test**: Can be fully tested by exporting an existing project (or set of tasks) and verifying that the resulting transport text string accurately represents the task names, hierarchy, tags, dates, flags, estimates, and notes of the source items.

**Acceptance Scenarios**:

1. **Given** a project with nested tasks, tags, dates, and notes, **When** the user exports by project identifier, **Then** the system returns a transport text string that faithfully represents the project hierarchy and task metadata.
2. **Given** a list of specific task identifiers, **When** the user exports those tasks, **Then** the system returns a transport text string containing only those tasks (with their subtasks and metadata).
3. **Given** a folder identifier, **When** the user exports by folder, **Then** the system returns a transport text string containing all projects and tasks within that folder.
4. **Given** an identifier that does not match any item, **When** the user attempts to export, **Then** the system returns an error indicating the item was not found.
5. **Given** a project with no tasks, **When** the user exports it, **Then** the system returns a transport text string representing the empty project (project header line only, no child tasks).

---

### User Story 3 - Validate Transport Text Before Import (Priority: P3)

As a GTD practitioner, I want to validate a transport text string before importing so I can catch formatting errors and preview what would be created without actually modifying my OmniFocus database.

**Why this priority**: Validation is a safety net. Since import creates items immediately with no undo-via-API, previewing the parse result lets the user (or AI) confirm correctness before committing. It is valuable but not required for the core import/export workflow.

**Independent Test**: Can be fully tested by passing various transport text strings (valid and invalid) and verifying the returned dry-run report accurately lists the items that would be created, the tags referenced, the dates parsed, and any syntax warnings -- all without touching the OmniFocus database.

**Acceptance Scenarios**:

1. **Given** a valid transport text string, **When** the user validates it, **Then** the system returns a report listing the number of tasks, project names, tag names, date fields, and estimated durations that would be created.
2. **Given** a transport text string with unrecognized syntax (e.g., malformed date, unknown metadata prefix), **When** the user validates it, **Then** the system returns warnings identifying the problematic lines while still reporting the parseable portions.
3. **Given** an empty or whitespace-only string, **When** the user validates it, **Then** the system returns a report indicating zero items would be created.
4. **Given** a transport text string with deeply nested tasks (multiple indentation levels), **When** the user validates it, **Then** the report accurately reflects the hierarchy depth and parent-child relationships.

---

### Edge Cases

- What happens when transport text references tags that do not yet exist in OmniFocus? (Import should let OmniFocus handle tag creation via its built-in behavior with `byParsingTransportText`.)
- What happens when transport text contains special characters (Unicode, emoji, quotes, backslashes) in task names or notes?
- What happens when export encounters a task with properties that have no transport text representation (repetition rules, review intervals, custom perspectives)? (These properties are silently omitted from export output.)
- What happens when the transport text string is extremely large (thousands of lines)? (The system should handle it within reasonable memory limits or return a size-exceeded error.)
- What happens when importing transport text with a `::ProjectName` reference that does not match any existing project? (The task is created in the inbox with no project assignment; OmniFocus does NOT auto-create projects from unmatched `::` references. If the project name matches an existing project, the task is placed into that project.)
- What happens when exporting a task that has been completed or dropped? (Export includes a `status` filter defaulting to `'active'`. Completed/dropped tasks are only included when the caller sets `status` to `'completed'`, `'dropped'`, or `'all'`. Completed tasks emit `@done(date)` in the output.)
- What happens when the validator encounters mixed indentation (tabs vs. spaces)? (The validator should flag this as a warning since OmniFocus transport text uses tabs for indentation.)

## Clarifications

### Session 2026-03-20

- Q: Should `singleTask` parameter be `false` or `null` when calling `Task.byParsingTransportText()`? → A: Use `null`. Official Omni Automation docs (omni-automation.com/omnifocus/task.html) exclusively use `null` in examples; `false` is never shown in official documentation.
- Q: How should the optional target project parameter work for `import_taskpaper`? → A: Two-phase approach: (1) call `Task.byParsingTransportText(text, null)` which creates tasks in the inbox, then (2) call `moveTasks(createdTasks, targetProject)` to relocate them into the specified project. This reuses the existing `moveTasks` OmniJS function (already used in the bulk-tools domain) and avoids fragile text manipulation of the transport text string. The target project is resolved by identifier using `Project.byIdentifier()`.
- Q: What happens when `byParsingTransportText` encounters invalid or unparseable transport text? → A: It returns an empty array (no tasks created) rather than throwing an exception. The OmniJS API is lenient; unrecognized syntax is silently ignored. Our implementation must check for an empty result array and return a structured error indicating no items were created from the provided text.
- Q: Should the returned task IDs include both top-level tasks AND subtasks, or only root-level tasks? → A: Return both top-level and all nested subtask IDs. The OmniJS `byParsingTransportText` returns only top-level Task objects, so the implementation must recursively walk each returned task's `children` (via `flattenedTasks` on each top-level task) to collect all created item identifiers. This maximizes utility for callers who need to reference or modify specific subtasks.
- Q: If transport text contains a `::ProjectName` that does not match any existing project, does `byParsingTransportText` create a new project? → A: No. The `::` syntax matches existing projects "exactly as if it was entered in a project cell in OmniFocus" (per Omni Automation docs). If no match is found, the task is created in the inbox with no project assignment. OmniFocus does NOT auto-create projects from `::` references.
- Q: Should export_taskpaper include completion/drop status and structural parameters (`@autodone`, `@parallel`, `@repeat-*`) in its output? → A: Status only. Export includes `@done(date)` for completed items but omits structural parameters (`@autodone`, `@parallel`) and repetition parameters (`@repeat-method`, `@repeat-rule`). Rationale: `@autodone` and `@parallel` are project-level properties handled by project header serialization; `@repeat-*` adds complexity for minimal benefit since transport text round-trips are primarily for task data, not rule configuration (KISS principle).
- Q: Should validate_transport_text return a parsed structure (per-item task objects with fields) or just summary counts with pass/fail? → A: Parsed structure. The validator returns an array of parsed item objects, each containing: name, type (task/project), depth, tags, dates, flagged, estimate, and notes. Summary counts are derived from this array. This maximizes utility for AI agents that need to confirm exactly what will be created before committing an import. The parsed items array plus a summary object plus a warnings array compose the full validation report.
- Q: Should export_taskpaper support exporting completed/dropped tasks, or only active items? → A: Configurable via a `status` filter parameter defaulting to `'active'`, with options `['active', 'completed', 'dropped', 'all']`. This follows the existing codebase pattern established by `search-tasks.ts` (`TaskStatusFilterSchema`). Active-by-default is safest for the common use case; users opt-in to completed/dropped items. Completed tasks emit `@done(date)` in the output.
- Q: When exporting individual tasks by ID (FR-005), should the output include `::ProjectName` to indicate project assignment? → A: No. The `::` syntax is an import directive, not a standard export parameter. OmniFocus's own "Copy as TaskPaper" does not emit `::ProjectName`. The official TaskPaper parameter list (support.omnigroup.com/omnifocus-taskpaper-reference/) does not include it as an export parameter. The containing project is contextually obvious when exporting by project ID (FR-003).
- Q: Should the validator parse only the subset of TaskPaper parameters we export, or the full set of officially-supported parameters? → A: Full set. The validator must recognize all parameters from the official OmniFocus TaskPaper Reference (`@autodone`, `@parallel`, `@repeat-method`, `@repeat-rule`, `@defer`, `@due`, `@done`, `@estimate`, `@flagged`). If it only knew the export subset, it would flag valid `@autodone`/`@parallel`/`@repeat-*` parameters as "unrecognized syntax," producing false warnings that violate SC-003.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a transport text string and create all tasks, projects, and metadata described in that string within OmniFocus, returning the identifiers of every created item (both top-level tasks and all nested subtasks). The implementation recursively walks the `children` of each top-level task returned by `byParsingTransportText` to collect all identifiers.
- **FR-002**: System MUST support optional placement of imported items into a specified target project when a target project identifier is provided. Implementation uses a two-phase approach: (1) parse transport text via `byParsingTransportText` (creates in inbox), then (2) move created tasks into the target project via the OmniJS `moveTasks()` function, resolving the project by identifier with `Project.byIdentifier()`.
- **FR-003**: System MUST export a specified project (by identifier) to a transport text string that includes the project name, all child tasks with hierarchy, and per-task metadata (name, tags, due date, defer date, flagged status, estimated duration, notes, and `@done(date)` for completed items). Export accepts an optional `status` filter parameter defaulting to `'active'` with options `['active', 'completed', 'dropped', 'all']`, following the existing `TaskStatusFilterSchema` pattern.
- **FR-004**: System MUST export a specified folder (by identifier) to a transport text string containing all projects and tasks within that folder.
- **FR-005**: System MUST export a specified set of tasks (by identifiers, 1 to 100) to a transport text string containing those tasks with their subtasks and metadata. The output does NOT include `::ProjectName` directives; the `::` syntax is an import directive not present in standard TaskPaper export output.
- **FR-006**: System MUST validate a transport text string without modifying the OmniFocus database, returning a structured report containing: (1) an array of parsed item objects, each with name, type (task/project), depth, tags, dates, flagged, estimate, and notes fields; (2) a summary object with counts (tasks, projects, tags, maxDepth); (3) a warnings array. The validator recognizes the full set of officially-supported TaskPaper parameters (`@autodone`, `@parallel`, `@repeat-method`, `@repeat-rule`, `@defer`, `@due`, `@done`, `@estimate`, `@flagged`) to avoid false-positive warnings.
- **FR-007**: System MUST return structured warnings from validation when the transport text contains unrecognized or malformed syntax, identifying the problematic line numbers and content.
- **FR-008**: System MUST reject empty or whitespace-only input for both import and validation with a clear error message.
- **FR-009**: System MUST handle transport text containing the full set of supported metadata: task names, project headers, tags (@tag), due dates, defer dates, flagged status (!), estimated durations, notes (//), and nested hierarchy (tab indentation).
- **FR-010**: System MUST document which OmniFocus properties are not representable in transport text format (repetition rules, review intervals, perspectives, attachments) so users understand round-trip fidelity limitations.

### Key Entities

- **Transport Text**: A plaintext string in OmniFocus transport text format representing tasks, projects, tags, and metadata using a concise line-based syntax with indentation for hierarchy.
- **Import Result**: A structured response containing the identifiers of all items created during import, along with a summary count of tasks, projects, and tags created.
- **Export Result**: A structured response containing the generated transport text string and a summary of what was exported (item counts, hierarchy depth).
- **Validation Report**: A structured response containing: (1) `items` -- an array of parsed item objects (each with name, type, depth, tags, dates, flagged, estimate, notes); (2) `summary` -- aggregate counts (tasks, projects, tags, maxDepth); (3) `warnings` -- an array of syntax warnings with line numbers and descriptions. This parsed structure enables AI agents to confirm exactly what will be created before committing an import.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a complete project with 50+ nested tasks, tags, dates, and notes from a single transport text string in under 5 seconds.
- **SC-002**: Exported transport text accurately represents at least 95% of the supported metadata fields (name, tags, due date, defer date, flagged, estimate, notes, hierarchy) when compared to the source items.
- **SC-003**: Validation correctly identifies 100% of parseable items and flags 100% of lines with unrecognized syntax as warnings.
- **SC-004**: Round-trip fidelity: importing an exported transport text string produces items whose supported properties match the originals (name, tags, dates, flagged, estimate, notes, hierarchy).
- **SC-005**: All three tools (import, export, validate) pass contract and unit tests covering the acceptance scenarios and edge cases defined in this specification.

## Assumptions

- OmniFocus transport text format uses tab characters (not spaces) for indentation hierarchy.
- `Task.byParsingTransportText(text, null)` creates items immediately and returns an array of top-level Task objects; there is no dry-run mode in the OmniJS API. The `singleTask` parameter is `null` (not `false`) per official Omni Automation documentation conventions. When given invalid or unparseable text, it returns an empty array rather than throwing.
- Tags referenced in transport text that do not exist in OmniFocus will be auto-created by OmniFocus during import.
- The validator (validate_transport_text) is a pure TypeScript implementation with no OmniJS dependency, making it testable without OmniFocus running.
- Export is a custom OmniJS implementation that reads task properties and builds the transport text string manually, since OmniJS provides no built-in per-item serialization method.
- `document.makeFileWrapper` exports the entire database and is async/Promise-based; it is not used for scoped export in this feature.
- Export emits these TaskPaper parameters: task name, `@tags`, `@due(date)`, `@defer(date)`, `@flagged`, `@estimate(duration)`, `@done(date)` for completed items, and `//` notes. Structural parameters (`@autodone`, `@parallel`) and repetition parameters (`@repeat-method`, `@repeat-rule`) are omitted from export for simplicity (KISS). Review intervals, perspective assignments, and attachments are also omitted and documented as known limitations.
- The `executeOmniJS()` utility uses synchronous `app.evaluateJavascript()` via JXA. It cannot execute async/Promise-based OmniJS scripts. This confirms that `document.makeFileWrapper` (which is async) cannot be used through our execution infrastructure.
- Maximum import size is bounded by OmniFocus application memory limits rather than by an explicit tool-level limit.
