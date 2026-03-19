# API Workaround Checklist: Attachments & Linked Files

**Purpose**: Validate that OmniJS API assumptions, constructor signatures, return types, error behaviors, and workaround patterns for FileWrapper, Data, URL, and linked file APIs are clearly documented, complete, and consistent across spec, plan, research, and data-model artifacts.
**Created**: 2026-03-18
**Feature**: [spec.md](../spec.md)

**Focus areas**: FileWrapper.withContents signature, Data.fromBase64 availability, task.attachments return type, task.removeAttachmentAtIndex error behavior, task.linkedFileURLs return type, task.addLinkedFileURL parameter type, macOS-only detection, base64 binary data handling within OmniJS IIFE pattern.
**Depth**: Standard
**Audience**: Author / Reviewer (PR)

## Requirement Completeness -- FileWrapper API

- [x] CHK001 - Is the exact signature of `FileWrapper.withContents(name, data)` documented with parameter types (`name: String | null`, `contents: Data | null`) and return type (`FileWrapper`)? [Completeness, Spec Assumptions]
  -- Resolved: Spec Assumptions updated to `FileWrapper.withContents(name: String or null, contents: Data or null)` with full parameter types. Also documented in Clarifications Session 2026-03-19.
- [x] CHK002 - Is it explicitly stated that `FileWrapper.withContents` is a class function (static method), not a constructor (no `new` keyword)? [Clarity, Spec Assumptions]
  -- Present in Spec Assumptions and Clarifications Session 2026-03-18.
- [x] CHK003 - Are the `FileWrapper` properties used for metadata extraction (`preferredFilename`, `filename`, `type`, `contents`, `contents.length`) each documented with their exact types and nullability? [Completeness, Spec Assumptions]
  -- Present in Spec Assumptions: `filename (String or null)`, `preferredFilename (String or null)`, `type (FileWrapper.Type enum)`, `contents (Data, read-only)`, `contents.length (Number)`.
- [x] CHK004 - Is the `FileWrapper.Type` enum documented as a structural enum with exact values (`File`, `Directory`, `Link`) and explicitly distinguished from UTI strings? [Clarity, Spec Clarifications]
  -- Present in Spec Clarifications Session 2026-03-18 and FR-001.
- [x] CHK005 - Is it documented that `wrapper.contents` returns a `Data` object (read-only) and that `Data.length` returns byte count as `Number`? [Completeness, Spec Assumptions]
  -- Present in Spec Assumptions.
- [x] CHK006 - Is the filename resolution chain (`preferredFilename || filename || 'unnamed'`) documented in both the spec (FR-001) and the data model (AttachmentInfo)? [Consistency, Spec FR-001, data-model.md]
  -- Present in FR-001, data-model.md AttachmentInfo, and Clarifications Session 2026-03-18 (Clarify Session).

## Requirement Completeness -- Data.fromBase64 API

- [x] CHK007 - Is `Data.fromBase64(string)` documented as available in the OmniJS runtime, including its parameter type (`String`) and return type (`Data`)? [Completeness, Spec FR-002]
  -- Present in Spec FR-002, Assumptions, Research R-002, and quickstart.md.
- [x] CHK008 - Is the undocumented error behavior of `Data.fromBase64()` on invalid input explicitly called out as a known risk requiring server-side validation? [Clarity, Spec Assumptions]
  -- Present in Spec Assumptions (updated): returns `null` on invalid input rather than throwing. Dual-layer validation documented.
- [x] CHK009 - Is the two-stage validation flow (TypeScript validates base64 format first, OmniJS decodes via `Data.fromBase64()` second) documented as an architectural decision? [Completeness, Plan AD-001]
  -- Present in Plan AD-001 (steps 1-8) and Research R-002.
- [x] CHK010 - Does the spec document what happens when `Data.fromBase64()` receives a valid but semantically empty string (e.g., base64 encoding of zero bytes)? [Remediated Gap]
  -- Resolved: Spec Clarifications Session 2026-03-19 documents that empty strings produce a zero-byte `Data` object. Zod `min(1)` blocks empty strings TypeScript-side; OmniJS null check provides defense-in-depth.

## Requirement Completeness -- task.attachments

- [x] CHK011 - Is `task.attachments` documented as returning an ordered array of `FileWrapper` objects (not strings, not IDs)? [Completeness, Spec Assumptions]
  -- Present in Spec Assumptions and Research R-001.
- [x] CHK012 - Is it stated that `task.attachments` is a read-only collection where positional indices are stable within a single operation but may shift after removal? [Clarity, Spec Assumptions]
  -- Present in Spec Assumptions and data-model.md Notes section.
- [x] CHK013 - Is the `task.addAttachment(fileWrapper)` method documented with its exact parameter type (`FileWrapper`) and return type? [Completeness, Research R-001]
  -- Present in Research R-001, data-model.md OmniJS API Mapping, and Spec Assumptions (updated with read-back verification requirement).

## Requirement Completeness -- task.removeAttachmentAtIndex

- [x] CHK014 - Is `task.removeAttachmentAtIndex(index)` documented with its exact parameter type (zero-based `Number` index)? [Completeness, Spec Assumptions]
  -- Present in Spec Assumptions and Research R-007.
- [x] CHK015 - Is the error behavior for out-of-bounds index documented -- does OmniJS throw an exception, return silently, or produce undefined behavior? [Remediated Gap]
  -- Resolved: Spec Assumptions updated to state the native method's error behavior is undocumented and may throw or fail silently. Spec Clarifications Session 2026-03-19 documents the OmniJS-side bounds checking requirement.
- [x] CHK016 - Is the spec's requirement (FR-010) for including the valid index range in the error message implementable given the (un)documented OmniJS exception behavior? [Clarity, Spec FR-010]
  -- Resolved: FR-010 is implementable because bounds checking is performed OmniJS-side BEFORE calling the native method, per Clarifications Session 2026-03-19.
- [x] CHK017 - Is it specified whether the bounds check for `removeAttachmentAtIndex` is performed server-side in the OmniJS script (before calling the native method) or relies on the native method's exception? [Remediated Gap]
  -- Resolved: Spec Clarifications Session 2026-03-19 explicitly specifies OmniJS-side bounds checking before calling the native method, following `removeNotification.ts` precedent. Also documented in Plan AD-007.

## Requirement Completeness -- task.linkedFileURLs

- [x] CHK018 - Is `task.linkedFileURLs` documented as returning an array of OmniJS `URL` objects (not strings)? [Completeness, Spec Assumptions]
  -- Present in Spec Assumptions and Research R-004.
- [x] CHK019 - Are the URL object properties used for response construction (`absoluteString`, `lastPathComponent`, `pathExtension`) each documented with their exact types? [Completeness, Spec Clarifications]
  -- Present in Spec Clarifications Session 2026-03-18 (Clarify Session), Research R-004, and Spec Assumptions (updated).
- [x] CHK020 - Is it documented what `lastPathComponent` and `pathExtension` return for edge-case URLs (e.g., `file:///path/to/directory/` with trailing slash, or `file:///noextension`)? [Remediated Gap]
  -- Resolved: Spec Assumptions updated and Clarifications Session 2026-03-19 documents: `lastPathComponent` returns empty string for trailing slashes, `"/"` for root URLs; `pathExtension` returns empty string when no extension. Values returned as-is without normalization.

## Requirement Completeness -- task.addLinkedFileURL

- [x] CHK021 - Is `task.addLinkedFileURL(url)` documented as accepting an OmniJS `URL` object (not a raw string)? [Completeness, Spec Assumptions]
  -- Present in Spec Assumptions and Research R-004.
- [x] CHK022 - Is the `URL.fromString(urlString)` constructor documented as the method for creating the URL object from a string in OmniJS? [Completeness, Research R-004]
  -- Present in Research R-004 and Spec FR-005.
- [x] CHK023 - Is the error behavior of `URL.fromString()` on invalid input (e.g., empty string, malformed URL) documented or flagged as a risk? [Remediated Gap]
  -- Resolved: Spec Assumptions updated and Clarifications Session 2026-03-19 documents: `URL.fromString()` may return `null` for malformed input (following `URL.Components.fromString()` null-return precedent). OmniJS script MUST check `if (!url)`. Also documented in Plan AD-007.
- [x] CHK024 - Is server-side `file://` scheme validation documented as occurring before the URL string reaches OmniJS? [Completeness, Spec FR-005]
  -- Present in Spec FR-005 and Research R-004.

## Requirement Clarity -- macOS Platform Detection

- [x] CHK025 - Is the decision that no explicit macOS platform check is needed clearly justified (server requires macOS for `osascript` execution)? [Clarity, Spec Edge Cases]
  -- Present in Spec Edge Cases section: "The MCP server requires macOS, so this scenario cannot occur in practice."
- [x] CHK026 - Is the linked file `file://` URL scheme restriction documented as inherently macOS-only behavior? [Clarity, Spec FR-005]
  -- Present in Spec FR-005 and User Story 5 priority justification.

## Requirement Clarity -- Base64 Binary Data in OmniJS IIFE

- [x] CHK027 - Is the mechanism for embedding base64 strings in OmniJS script templates documented (string literal interpolation inside IIFE)? [Completeness, Plan AD-001]
  -- Present in Plan AD-001 (step 6: "Base64 string embedded in OmniJS script as string literal") and Spec Clarifications Session 2026-03-18 (Clarify Session).
- [x] CHK028 - Is the safe character set of base64 (`[A-Za-z0-9+/=]`) documented as compatible with JavaScript string literal delimiters? [Clarity, Research R-006]
  -- Present in Research R-006.
- [x] CHK029 - Is the `escapeForJS()` utility documented as the mechanism for safe string embedding, and is it confirmed as sufficient for base64 content? [Completeness, Research R-006]
  -- Present in Research R-006.
- [x] CHK030 - Is the memory concern of embedding large base64 strings (up to ~67 MB) as JavaScript string literals in `app.evaluateJavascript()` documented with the 50 MB hard limit as the mitigation? [Completeness, Spec NFR-001, NFR-002]
  -- Present in Spec NFR-001, NFR-002, and Clarifications Session 2026-03-18 (API Contracts Checklist).

## Requirement Consistency -- Cross-Artifact Alignment

- [x] CHK031 - Is the `FileWrapper.withContents(name, data)` signature consistent across spec (FR-002), plan (AD-001), research (R-001), data-model (OmniJS API Mapping), and quickstart? [Consistency]
  -- Consistent across all artifacts: class function, name + data parameters, returns FileWrapper.
- [x] CHK032 - Is the `Data.fromBase64(base64String)` usage consistent across spec (FR-002), plan (AD-001), research (R-002), and quickstart? [Consistency]
  -- Consistent across all artifacts.
- [x] CHK033 - Is the task/project resolution pattern (Task.byIdentifier -> Project.byIdentifier -> project.task) consistent across spec (FR-006), plan (AD-002), and research (R-005)? [Consistency]
  -- Consistent across all artifacts.
- [x] CHK034 - Are the size validation thresholds (10 MB warning, 50 MB rejection) consistent across spec (FR-007, FR-007a, NFR-001), plan (AD-001), research (R-003), and data-model? [Consistency]
  -- Consistent across all artifacts.

## Edge Case Coverage -- OmniJS Error Behavior

- [x] CHK035 - Is it specified what happens when `FileWrapper.withContents()` is called with a `null` name? Does OmniJS accept it or throw? [Remediated Gap]
  -- Resolved: Spec Assumptions updated to state `null` is explicitly allowed per Omni Automation docs (`name: String or null`). Zod `min(1)` on filename prevents both null and empty strings from reaching OmniJS. Clarifications Session 2026-03-19 documents the full decision.
- [x] CHK036 - Is it specified what happens when `task.addAttachment()` is called with an invalid FileWrapper (e.g., if `Data.fromBase64()` silently fails and returns null/undefined)? [Remediated Gap]
  -- Resolved: Spec Assumptions updated to state `addAttachment()` may fail silently on invalid input. Read-back verification pattern required (check `task.attachments` count after add). Clarifications Session 2026-03-19 and Plan AD-007 document the defense-in-depth approach.
- [x] CHK037 - Is the OmniJS try-catch pattern (Constitution Principle III) explicitly required for all 5 tool scripts in the spec or plan? [Completeness, Constitution III]
  -- Constitution Principle III mandates try-catch for all OmniJS scripts. Plan Constitution Check confirms PASS for Principle III. Plan AD-007 adds additional defensive checks within the try-catch for attachment-specific edge cases.

## Acceptance Criteria Quality

- [x] CHK038 - Can the acceptance scenario for `add_attachment` (US2-S1) be objectively verified given that `Data.fromBase64()` error behavior is undocumented? [Measurability, Spec US2]
  -- Resolved: Error behavior is now documented (returns null on invalid input). Dual-layer validation (TS regex + OmniJS null check) makes US2-S4 (invalid base64) objectively verifiable. US2-S1 (valid base64) is verifiable via read-back.
- [x] CHK039 - Can the acceptance scenario for `remove_attachment` out-of-bounds (US3-S3) be objectively verified given that `removeAttachmentAtIndex` error behavior is not fully documented? [Measurability, Spec US3]
  -- Resolved: OmniJS-side bounds checking (before native method call) makes US3-S3 objectively verifiable. The error message with valid range (FR-010) is generated by the script, not the native method.

## Notes

- All 39 items checked and verified
- 7 gaps found and remediated in Loop 1
- No items remain unresolved
