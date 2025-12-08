---
name: research-specialist
description: Guides intelligent research delegation to the research-specialist agent. Helps determine when to invoke the agent vs. do quick lookups, which MCP server will be used, and how to phrase effective research requests. MUST BE USED PROACTIVELY when needing library docs, AWS info, debugging solutions, or external context.
---

# Research Specialist Skill

## Purpose

This skill guides when and how to delegate research tasks to the `research-specialist` agent. It helps determine the most efficient path to gather external context—whether through direct MCP tool calls for simple lookups or full agent delegation for complex research.

## Decision Framework: Agent vs. Direct Lookup

### Use the `research-specialist` AGENT when

- Research requires **multiple sources** (e.g., AWS docs + community solutions)
- Question is **open-ended** (e.g., "How do others implement X?")
- Need **synthesis** across different information types
- Research may require **follow-up queries** based on initial findings
- Task requires **comprehensive analysis** with recommendations

### Use DIRECT MCP tool calls when

- Single, specific lookup (e.g., "What's the Tailwind class for flex-wrap?")
- Known source (e.g., definitely AWS docs, definitely library API)
- Quick reference check (e.g., "Does Motion support spring animations?")
- No synthesis needed, just retrieval

---

## MCP Server Routing Quick Reference

Know which MCP server handles each research domain:

| Research Topic | MCP Server | Direct Tool |
|---------------|------------|-------------|
| **AWS Services** | aws-documentation-mcp-server | `mcp__aws-documentation-mcp-server__search_documentation` |
| **AWS Patterns/CDK** | aws-knowledge-mcp-server | `mcp__aws-knowledge-mcp-server__aws___search_documentation` |
| **AWS Regional Availability** | aws-knowledge-mcp-server | `mcp__aws-knowledge-mcp-server__aws___get_regional_availability` |
| **Library APIs** | context7 | `mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs` |
| **Astro Framework** | Astro_docs | `mcp__Astro_docs__search_astro_docs` |
| **Tailwind CSS** | tailwindcss | `mcp__tailwindcss__search_tailwind_docs` |
| **shadcn/ui** | shadcn | `mcp__shadcn__search_items_in_registries` |
| **Web/Forums/GitHub** | tavily-mcp | `mcp__tavily-mcp__tavily-search` |
| **URL Content** | tavily-mcp | `mcp__tavily-mcp__tavily-extract` |

---

## Trigger Patterns

### INVOKE research-specialist agent for

**Library/Framework Research:**

- "How does [library] handle [feature]?"
- "What's the best way to implement [pattern] with [library]?"
- "Compare [library A] vs [library B] for [use case]"
- "Find examples of [pattern] in [framework]"

**AWS Research:**

- "How do I configure [AWS service] for [use case]?"
- "What are the limits/quotas for [AWS service]?"
- "Is [AWS feature] available in [region]?"
- "Best practices for [AWS architecture pattern]"

**Debugging/Problem Solving:**

- "I'm getting [error message], how do others solve this?"
- "Why might [behavior] be happening?"
- "Find solutions for [specific problem]"
- "Has anyone else encountered [issue]?"

**Technical Decisions:**

- "What are the pros/cons of [approach]?"
- "Should I use [option A] or [option B]?"
- "What's the recommended way to [task]?"

---

## Effective Research Request Patterns

When invoking the research-specialist agent, phrase requests clearly:

### Good Request Patterns

```text
"Research Motion for React's animation API - specifically how to implement
spring animations with custom physics parameters. Include code examples."

"Find AWS CloudFront documentation on cache behaviors and invalidation
strategies. Also search for community experiences with cache invalidation
timing issues."

"Look up the Astro documentation for content collections and also search
for examples of using content collections with MDX and custom components."
```

### Include When Relevant

- **Specific technology/library name**
- **Desired output** (code examples, configuration, comparison)
- **Context** (why you need this, what problem you're solving)
- **Multiple sources** if cross-referencing is helpful

---

## Integration with Other Skills

### With speckit-autopilot

When spec-kit agents need external context, they should delegate to research-specialist:

```text
spec-writer → "Research newsletter signup patterns and email validation libraries"
plan-reviewer → "Verify AWS Amplify supports this authentication flow"
clarification-analyst → "What are typical rate limits for this API?"
task-decomposer → "Research complexity of integrating [library]"
```

### With astro-dev-guidelines

For Astro-specific questions, research-specialist routes to Astro docs:

```text
"How do Astro content collections work with TypeScript?"
→ Routes to mcp__Astro_docs__search_astro_docs
```

### With aws-monitoring

For monitoring-related AWS research:

```text
"What CloudWatch metrics are available for Amplify?"
→ Routes to aws-documentation-mcp-server
```

---

## Response Expectations

When research-specialist returns, expect:

1. **Quick Answer** - Direct answer to the question
2. **Sources Used** - Which MCP servers provided information
3. **Detailed Findings** - Organized by source type
4. **Code Examples** - When applicable
5. **Recommendations** - Actionable next steps
6. **Caveats** - Limitations, version dependencies, edge cases

---

## Anti-Patterns

**DON'T:**

- Invoke agent for single-value lookups (use direct MCP call)
- Ask vague questions without context
- Ignore the routing guide and use generic web search for everything
- Skip research when making technical decisions based on assumptions

**DO:**

- Check routing guide for optimal MCP server
- Provide context in research requests
- Use agent for multi-source synthesis
- Cite research findings in specifications and plans

---

## Examples

### Example 1: Direct Lookup (No Agent Needed)

```text
User: "What's the Tailwind class for centering items in a flex container?"

Action: Direct MCP call
Tool: mcp__tailwindcss__get_tailwind_utilities
Query: "flex center items"

No need for full agent - single source, simple lookup.
```

### Example 2: Agent Delegation (Research Needed)

```text
User: "How should we implement form validation for the contact form?"

Action: Invoke research-specialist agent
Request: "Research form validation approaches for React. Compare react-hook-form
vs formik vs native validation. Look for Astro-specific considerations.
Include accessibility best practices."

Agent will query:
- Context7 for react-hook-form and formik docs
- Astro_docs for form handling in Astro
- Tavily for community comparisons and a11y patterns
```

### Example 3: AWS Research

```text
User: "Can we use CloudFront Functions for the redirect logic?"

Action: Invoke research-specialist agent
Request: "Research CloudFront Functions capabilities and limitations.
Compare to Lambda@Edge for redirect use cases. Check if our requirements
fit within CloudFront Functions constraints."

Agent will query:
- aws-documentation-mcp-server for CloudFront Functions docs
- aws-knowledge-mcp-server for comparison patterns
- Tavily for real-world experiences and gotchas
```

---

## Quick Decision Tree

```text
Need external information?
│
├─ Single specific fact? → Direct MCP tool call
│   └─ Know which source? → Use that MCP server's tool
│
└─ Complex/multi-source? → Invoke research-specialist agent
    └─ Provide clear request with context
```

Remember: The research-specialist agent exists to provide evidence-based answers. Use it to replace assumptions with facts.
