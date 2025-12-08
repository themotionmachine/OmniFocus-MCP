---
name: speckit-autopilot
description: Monitors conversations for spec-kit workflow triggers and suggests appropriate /speckit.* commands. Detects tech pivots ("switch to", "use X instead", "migrate to"), requirement changes ("add feature", "remove", "also include"), principle additions ("we should always", "add rule"), and ambiguities. Helps maintain spec-driven development discipline without manual tracking.
---

# Spec-Kit Autopilot

## Purpose

Passive monitor that detects when spec-kit commands should be invoked based on conversation context. Helps maintain spec-driven development discipline by catching pivots, changes, and ambiguities that require specification updates.

## When This Skill Activates

Automatically suggested when detecting:

- **Tech pivots**: "switch to", "use X instead", "migrate to", "replace with"
- **Requirement changes**: "add feature", "remove", "also include", "new requirement"
- **Principle additions**: "we should always", "add rule", "establish pattern"
- **Ambiguities**: "not sure", "unclear", "need to decide", "which approach"
- **Scope changes**: "expand to", "reduce scope", "phase 2", "defer"

---

## Trigger-to-Command Mapping

### Constitution Triggers → `/speckit.constitution`

**Detected phrases:**

- "We should always..."
- "Add a rule that..."
- "Establish as a principle..."
- "Make it a standard that..."
- "From now on, we..."
- "Project-wide policy..."

**Action:** Suggest updating constitution with new principle

**Example:**

```text
User: "We should always use TypeScript strict mode"
→ Suggest: /speckit.constitution to add this as Article X
```

---

### Specification Triggers → `/speckit.specify`

**Detected phrases:**

- "New feature..."
- "Add capability to..."
- "Users should be able to..."
- "Implement..."
- "Build..."
- "Create a..."

**Action:** Suggest creating/updating feature specification

**Example:**

```text
User: "Add a dark mode toggle to the settings"
→ Suggest: /speckit.specify to define the feature requirements
```

---

### Clarification Triggers → `/speckit.clarify`

**Detected phrases:**

- "Not sure about..."
- "Which approach..."
- "Need to decide..."
- "Unclear requirement..."
- "What if..."
- "Edge case..."
- "How should we handle..."

**Action:** Suggest running clarification workflow

**Example:**

```text
User: "Not sure if dark mode should persist across sessions"
→ Suggest: /speckit.clarify to systematically address ambiguities
```

---

### Plan Triggers → `/speckit.plan`

**Detected phrases:**

- "Switch to..."
- "Use X instead of Y..."
- "Migrate to..."
- "Replace with..."
- "Change approach to..."
- "Pivot to..."
- "Technical decision..."

**Action:** Suggest updating implementation plan

**Example:**

```text
User: "Let's use Tailwind instead of styled-components"
→ Suggest: /speckit.plan to update technical approach
```

---

### Task Triggers → `/speckit.tasks`

**Detected phrases:**

- "Break this down..."
- "What are the steps..."
- "Task list for..."
- "Implementation order..."
- "Dependencies between..."

**Action:** Suggest generating task breakdown

**Example:**

```text
User: "Break down the authentication implementation"
→ Suggest: /speckit.tasks to create actionable task list
```

---

### Analyze Triggers → `/speckit.analyze`

**Detected phrases:**

- "Check consistency..."
- "Verify alignment..."
- "Are specs in sync..."
- "Cross-reference..."
- "Validate artifacts..."

**Action:** Suggest running consistency analysis

**Example:**

```text
User: "Make sure the plan matches the spec"
→ Suggest: /speckit.analyze for cross-artifact validation
```

---

### Checklist Triggers → `/speckit.checklist`

**Detected phrases:**

- "Checklist for..."
- "Quality check..."
- "Requirements quality..."
- "Validate requirements..."
- "Review checklist..."
- "Spec quality..."
- "Is the spec ready..."
- "Requirements complete..."

**Action:** Suggest generating requirements quality checklist ("unit tests for English")

**Example:**

```text
User: "Create a UX checklist for the landing page spec"
→ Suggest: /speckit.checklist to validate requirements quality
```

---

### TasksToIssues Triggers → `/speckit.taskstoissues`

**Detected phrases:**

- "Convert to issues..."
- "GitHub issue..."
- "Create issues from tasks..."
- "Turn into tickets..."

**Action:** Suggest converting tasks.md to GitHub issues

**Example:**

```text
User: "Convert these tasks to GitHub issues"
→ Suggest: /speckit.taskstoissues for issue creation
```

---

### Implement Triggers → `/speckit.implement`

**Detected phrases:**

- "Start implementation..."
- "Begin building..."
- "Start coding..."
- "Execute the plan..."

**Action:** Suggest starting implementation workflow

**Example:**

```text
User: "Let's start building this feature"
→ Suggest: /speckit.implement to begin phased implementation
```

---

## Response Format

When triggers are detected, suggest the appropriate command:

```markdown
**Spec-Kit Suggestion**

I detected a [trigger type] that may require updating your specifications:

> "[quoted user statement]"

**Recommended action:** Run `/speckit.[command]` to [specific benefit]

Would you like me to run this command now?
```

---

## Integration with Agents

**IMPORTANT:** For complex spec-kit workflows, PROACTIVELY launch the supporting subagent instead of just suggesting the slash command. The subagents provide deeper, more thorough analysis.

| Trigger Keywords | Slash Command | **LAUNCH THIS AGENT** |
|------------------|---------------|----------------------|
| new feature, add capability, user story | `/speckit.specify` | **`spec-writer`** |
| not sure, what if, edge case, unclear | `/speckit.clarify` | **`clarification-analyst`** |
| break down, steps, task list, dependencies | `/speckit.tasks` | **`task-decomposer`** |
| switch to, migrate, technical decision | `/speckit.plan` | **`plan-reviewer`** |
| checklist, requirements quality | `/speckit.checklist` | N/A (interactive) |
| convert to issues, github issue | `/speckit.taskstoissues` | N/A (automated) |
| start implementation, begin building | `/speckit.implement` | N/A (phased execution) |

### When to Use Subagents vs Slash Commands

**Use the SUBAGENT when:**

- The request is complex or multi-faceted
- Deep analysis or research is needed
- User explicitly asks for thoroughness
- Multiple ambiguities or decisions need resolution

**Use the SLASH COMMAND when:**

- The request is straightforward
- User wants quick results
- Following an established workflow
- Generating artifacts from existing context

### Example Proactive Invocation

```text
User: "I want to add a newsletter signup feature"

GOOD (Proactive agent use):
→ "I'll launch the spec-writer agent to draft a comprehensive specification..."

ACCEPTABLE (Slash command suggestion):
→ "Would you like me to run /speckit.specify to create a spec for this feature?"
```

---

## Research Delegation

**ALL spec-kit agents should PROACTIVELY delegate to `research-specialist` when needing external context.**

The `research-specialist` agent intelligently routes research requests to the appropriate MCP servers:

| Research Need | MCP Server Used |
|---------------|-----------------|
| Library/framework documentation | **Context7** |
| AWS service info & patterns | **AWS Documentation MCP** |
| Debugging, forums, GitHub issues | **Tavily** (web search) |
| Astro framework questions | **Astro Docs MCP** |
| Tailwind CSS utilities | **Tailwind MCP** |
| shadcn/ui components | **shadcn Registry MCP** |

**When to trigger research delegation:**

- Spec-writer needs to understand a library's API
- Clarification-analyst needs to verify technical constraints
- Plan-reviewer needs to validate technology compatibility
- Task-decomposer needs complexity estimates for unfamiliar tech

**Example workflow:**

```text
User: "Add AWS CloudFront caching to the landing page"

1. spec-writer launches for specification
2. spec-writer delegates to research-specialist:
   "What are CloudFront's caching behaviors and invalidation options?"
3. research-specialist routes to AWS docs MCP
4. Findings incorporated into spec
```

---

## Skip Conditions

**Don't suggest spec-kit commands when:**

- User explicitly says "don't update specs"
- Currently in the middle of implementing (context: coding)
- User is asking informational questions only
- Conversation is about debugging existing code
- User has already run the relevant command recently

---

## Best Practices

1. **Be helpful, not annoying** - Only suggest when genuinely useful
2. **Provide context** - Explain WHY the command is relevant
3. **Offer choice** - Ask if user wants to run, don't auto-run
4. **Track recent commands** - Avoid suggesting same command repeatedly
5. **Prioritize** - If multiple triggers, suggest most important first

---

## Quick Reference

| Trigger Pattern | Suggested Command |
|-----------------|-------------------|
| "we should always...", "from now on..." | `/speckit.constitution` |
| "new feature...", "users should be able..." | `/speckit.specify` |
| "not sure about...", "what if...", "edge case..." | `/speckit.clarify` |
| "switch to...", "use X instead", "technical decision..." | `/speckit.plan` |
| "break down...", "what are the steps...", "dependencies..." | `/speckit.tasks` |
| "check consistency...", "in sync...", "cross-reference..." | `/speckit.analyze` |
| "checklist for...", "requirements quality...", "spec ready..." | `/speckit.checklist` |
| "convert to issues...", "github issue...", "create tickets..." | `/speckit.taskstoissues` |
| "start implementation...", "begin building...", "execute plan..." | `/speckit.implement` |
