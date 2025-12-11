---
name: implementation-orchestrator
description: "Guides parallel execution of implementation tasks during /speckit.implement. Detects [P] markers in tasks.md and spawns multiple omnifocus-developer subagents in parallel using the Task tool. MUST BE USED when executing tasks.md with parallel opportunities. Ensures TDD compliance, proper task ordering, and efficient parallel execution."
---

# Implementation Orchestrator Skill

## Purpose

This skill orchestrates parallel execution of implementation tasks from tasks.md. It guides when and how to spawn multiple `omnifocus-developer` subagents for tasks marked with `[P]` (parallel-safe).

## Parallel Execution Pattern

When processing tasks.md, identify parallel opportunities and spawn subagents:

### Detection Pattern

Tasks marked with `[P]` can run in parallel:

```markdown
- [ ] T014 [P] [US1] Write contract test for list_tags input schema
- [ ] T015 [P] [US1] Write contract test for list_tags response schema
- [ ] T016 [P] [US1] Write unit test for listTags primitive success case
```

### Spawning Pattern

For parallel tasks, use the **Task tool** with multiple invocations in a **single message**:

```text
[Invoke Task tool with omnifocus-developer subagent for T014]
[Invoke Task tool with omnifocus-developer subagent for T015]
[Invoke Task tool with omnifocus-developer subagent for T016]
```

**CRITICAL**: All parallel Task tool calls MUST be in the same message to execute concurrently.

## Task Tool Configuration

When spawning omnifocus-developer agents:

```yaml
subagent_type: omnifocus-developer
model: sonnet
description: "[Task ID] - [Brief description]"
prompt: |
  Execute task [TASK_ID] from tasks.md:

  **Task**: [Full task description]
  **File Path**: [Target file path]
  **Dependencies**: [List any dependencies]
  **Acceptance Criteria**: [From tasks.md]

  Follow TDD red-green-refactor cycle:
  1. Write the failing test first (RED)
  2. Verify test fails with `pnpm test`
  3. Implement minimum code (GREEN)
  4. Verify test passes with `pnpm test`
  5. Refactor if needed (REFACTOR)
  6. Run `pnpm build` to verify compilation

  Mark task complete when done.
```

## Execution Strategy

### Phase-Based Execution

1. **Sequential Phases First**: Complete blocking prerequisites
2. **Parallel Tasks Within Phase**: Spawn subagents for [P] tasks
3. **Wait for Completion**: Use AgentOutputTool to gather results
4. **Checkpoint Validation**: Verify all phase tasks complete before next phase

### Task Ordering Rules

```text
Phase 1 (Setup) → Must complete before Phase 2
  └── T001 [P], T002 [P], T003 [P], T004 [P] → All parallel

Phase 2 (Foundational) → Must complete before Phase 3-8
  └── T005 [P], T006 [P], T007 [P], T008 [P] → Schema tasks parallel
  └── T009 → Index file (depends on T005-T008)
  └── T010 [P], T011 [P], T012 [P], T013 [P] → Test tasks parallel

Phase 3-8 (User Stories) → Can run in parallel after Phase 2
  └── Each story has RED → GREEN → REFACTOR sequence
  └── [P] tasks within RED phase can run parallel
```

## Parallel Spawning Examples

### Example 1: Setup Phase (4 parallel tasks)

```text
Spawning 4 omnifocus-developer agents in parallel for Phase 1 Setup:

Task T001: Create contracts directory structure
Task T002: Verify tools primitives directory
Task T003: Verify tools definitions directory
Task T004: Create test directories
```

All 4 Task tool calls in ONE message.

### Example 2: RED Phase Tests (6 parallel tasks)

```text
Spawning 6 omnifocus-developer agents for US1 RED phase:

Task T014: Contract test for list_tags input schema
Task T015: Contract test for list_tags response schema
Task T016: Unit test for listTags primitive success case
Task T017: Unit test with status filter
Task T018: Unit test with parentId filter
Task T019: Unit test with includeChildren
```

All 6 Task tool calls in ONE message.

### Example 3: User Stories in Parallel (6 parallel tracks)

After Phase 2 completes, spawn 6 agents for each user story:

```text
Spawning 6 omnifocus-developer agents for parallel user stories:

Agent 1: Execute US1 (list_tags) T014-T026
Agent 2: Execute US2 (create_tag) T027-T039
Agent 3: Execute US3 (edit_tag) T040-T053
Agent 4: Execute US4 (delete_tag) T054-T066
Agent 5: Execute US5 (assign_tags) T067-T080
Agent 6: Execute US6 (remove_tags) T081-T095
```

## Result Collection

Use **AgentOutputTool** to collect results:

```text
1. Spawn parallel agents
2. Continue with independent work OR use AgentOutputTool(block=false) to check status
3. When all agents complete, use AgentOutputTool(block=true) to collect results
4. Update tasks.md with [X] for completed tasks
5. Report failures and continue with next phase
```

## Error Handling

### Per-Task Failures

- Mark failed task in tasks.md
- Log error with context
- Continue with remaining parallel tasks
- Report summary at phase end

### Dependency Failures

- If dependency fails, skip dependent tasks
- Mark skipped tasks with reason
- Continue with independent tasks

## Official Omni Automation Documentation

Base URL: <https://omni-automation.com/omnifocus/>

When subagents need API details, they should reference:

### Core Entities

| Entity | URL |
|--------|-----|
| Task | <https://omni-automation.com/omnifocus/task.html> |
| Project | <https://omni-automation.com/omnifocus/project.html> |
| Folder | <https://omni-automation.com/omnifocus/folder.html> |
| Tag | <https://omni-automation.com/omnifocus/tag.html> |
| Inbox | <https://omni-automation.com/omnifocus/inbox.html> |

### Database & Navigation

| Resource | URL |
|----------|-----|
| Database | <https://omni-automation.com/omnifocus/database.html> |
| Database Object | <https://omni-automation.com/omnifocus/database-object.html> |
| Library | <https://omni-automation.com/omnifocus/library.html> |
| Perspective | <https://omni-automation.com/omnifocus/perspective.html> |

### API Reference

| Resource | URL |
|----------|-----|
| **All Functions** | <https://omni-automation.com/omnifocus/of-functions.html> |
| **All Classes** | <https://omni-automation.com/omnifocus/of-classes.html> |

**Usage**: Use `mcp__tavily-mcp__tavily-extract` to fetch specific documentation pages when implementing OmniJS scripts.

## Integration Points

### Works With

- `/speckit.implement` command (primary trigger)
- `omnifocus-developer` agent (spawned workers)
- `auto-error-resolver` agent (fix compilation errors)
- `research-specialist` agent (lookup docs when stuck)

### Inputs

- `tasks.md` with [P] markers and phase structure
- `plan.md` for architecture context
- `spec.md` for requirements reference

### Outputs

- Updated `tasks.md` with [X] completions
- Progress reports per phase
- Error summaries for failures

## Decision Tree

```text
Processing tasks.md phase:
│
├─ All tasks in phase are [P]?
│   └─ YES → Spawn ALL as parallel Task tool calls in ONE message
│
├─ Some tasks are [P]?
│   ├─ Sequential tasks first
│   └─ Then spawn [P] tasks in parallel
│
└─ No [P] tasks?
    └─ Execute sequentially
```

## TDD Compliance Verification

Each spawned agent MUST verify TDD compliance:

```text
RED Phase Check:
- [ ] Test file exists
- [ ] Test imports correct modules
- [ ] Running `pnpm test` shows FAILING test
- [ ] Failure message is meaningful

GREEN Phase Check:
- [ ] Implementation file exists
- [ ] Running `pnpm test` shows PASSING test
- [ ] No extra implementation beyond test requirements

REFACTOR Phase Check:
- [ ] Code is clean and follows conventions
- [ ] `pnpm test` still passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm typecheck` passes
```

## Performance Optimization

### Maximum Parallel Agents

Recommend limiting to 6-8 parallel agents to:

- Avoid resource contention
- Maintain readable progress output
- Allow proper error tracking

### Background Execution

For long-running tasks, use `run_in_background: true`:

```yaml
Task tool parameters:
  subagent_type: omnifocus-developer
  run_in_background: true
  description: "T014 - Contract test for list_tags"
  prompt: "..."
```

Then use AgentOutputTool to check progress periodically.

## Summary Table

| Scenario | Action |
|----------|--------|
| [P] tasks in same phase | Single message with multiple Task calls |
| Sequential tasks | One Task call at a time |
| Phase checkpoint | Wait for all agents, verify completion |
| Task failure | Log error, continue others, report at end |
| TDD violation | Flag and correct before continuing |
| Max parallelism | 6-8 agents recommended |

Remember: The goal is efficient, parallel execution while maintaining TDD discipline and code quality.
