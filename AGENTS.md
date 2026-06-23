# Agent Context: OmniFocus MCP Fork

Temporary handoff notes for Codex/agent sessions working in this fork.

## Project Goal

This fork adapts `themotionmachine/OmniFocus-MCP` for safer agent access to OmniFocus. The upstream project is already a full Model Context Protocol server for querying, creating, editing, and removing OmniFocus tasks/projects/tags.

## Location Constraint

All project work must stay under `/Users/xh/Workspace/`. This repository is the working fork at:

```text
/Users/xh/Workspace/OmniFocus-MCP
```

Do not create project files outside `/Users/xh/Workspace/` unless the user explicitly changes that constraint.

## Relevant Local Repositories

- `/Users/xh/Workspace/OmniFocus-MCP` - user fork, active work target.
- `/Users/xh/Workspace/OmniFocus-MCP-upstream` - read-only upstream inspection clone.
- `/Users/xh/Workspace/omnifocus-agent-bridge` - tiny earlier prototype/scratchpad, not the main direction.

## Current Assessment

Forking upstream is preferred over copying pieces into the scratch bridge. Upstream already has:

- MCP stdio server wiring.
- Zod schemas for tools.
- Query filters and resource views.
- Add/edit/remove task and project operations.
- Tag and perspective support.
- Unit tests and integration tests.
- npm packaging via `omnifocus-mcp`.

Important implementation detail: the upstream server is not pure Omni Automation JavaScript. It uses both:

- OmniJS through JXA `Application("OmniFocus").evaluateJavascript(...)`, especially for reads/query/perspectives.
- Generated AppleScript through `osascript`, especially for mutations.

That pragmatic hybrid is acceptable unless the user later asks to convert mutations to OmniJS.

## Safety Direction

The main desired modification is a stricter safety/profile layer for agent use. The upstream server exposes powerful write tools directly, including destructive tools. Assume MCP client approvals may help, but do not rely on the client as the only safety boundary.

Preferred safety model:

- Read-only by default.
- Allow safe read tools/resources without friction: `query_omnifocus`, `dump_database`, `list_tags`, `list_perspectives`, `get_perspective_view`, resources.
- Require explicit opt-in for write tools.
- Treat these as high-risk and require extra confirmation or disable by default: `remove_item`, `batch_remove_items`, project/task status changes to completed/dropped, bulk edits, and broad batch operations.
- Prefer creating inbox tasks before moving/editing existing structures.
- Avoid silent destructive behavior.

## Initial Implementation Ideas

- Add a policy module that classifies tools as read, write, or destructive.
- Gate tool handlers through the policy before invoking primitives.
- Use environment variables or config for modes, for example:
  - `OMNIFOCUS_MCP_MODE=readonly|write|dangerous`
  - default: `readonly`
- Return clear MCP errors when a tool is blocked by policy.
- Add tests for blocked writes and allowed reads.
- Keep upstream changes small and easy to rebase.

## Commands

```sh
npm install
npm test
npm run build
```

Integration tests require OmniFocus and can create/remove `TEST:` prefixed items. Do not run integration tests casually without telling the user.

## Research Context

- User is interested in agents talking to OmniFocus 4.8.
- OmniFocus 4.8.x still has active Omni Automation support based on release notes checked earlier.
- The upstream README says macOS will request automation permission the first time the server talks to OmniFocus.
- Upstream latest release observed in the GitHub UI was v1.9.2 on June 11, 2026.

## Next Useful Steps

1. Run unit tests in the fork.
2. Identify all tool registrations in `src/server.ts`.
3. Add the safety policy layer with read-only default.
4. Add tests for safety behavior.
5. Build and smoke test.
6. Only after that, consider local OmniFocus integration testing.
