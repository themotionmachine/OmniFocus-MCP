---
name: Bug report
about: Report a bug with the OmniFocus MCP Server
title: '[BUG] '
labels: 'bug'
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**Affected MCP Tool**
Which MCP tool is experiencing the issue? (e.g., `query_omnifocus`, `add_omnifocus_task`, `batch_add_items`)

**To Reproduce**
Steps to reproduce the behavior:
1. Call tool with parameters: `{...}`
2. Observe error: `...`
3. Expected result: `...`

**Tool Parameters**
Provide the exact parameters passed to the tool (redact sensitive information):
```json
{
  "param1": "value1",
  "param2": "value2"
}
```

**Error Output**
Provide the complete error message or unexpected output:
```
Error message or output here
```

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment (please complete the following information):**
 - macOS version: [e.g., macOS 14.1 Sonoma]
 - OmniFocus version: [e.g., OmniFocus 4.2.1]
 - MCP Client: [e.g., Claude Desktop 0.6.3, or custom MCP client]
 - Node.js version: [e.g., Node v20.11.0]
 - omnifocus-mcp version: [e.g., 1.2.3]

**JXA Script (if applicable)**
If the issue is related to JXA execution, provide the generated script or error:
```javascript
// JXA script here
```

**Additional context**
Add any other context about the problem here:
- Does the issue occur consistently or intermittently?
- Does it happen with specific OmniFocus database sizes?
- Are there any relevant OmniFocus perspectives or filters active?
- Any console logs or debug output?
