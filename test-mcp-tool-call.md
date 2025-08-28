# Testing OmniFocus MCP Tools from Claude

## How to test the tools in Claude:

### 1. Create a Project with a Date
Ask Claude:
```
Create a new project in OmniFocus called "Test Project August" with a due date of August 30, 2025
```

### 2. Create a Task with Dates  
Ask Claude:
```
Add a task called "Test Task" to the inbox with a due date of September 1, 2025 and a defer date of August 31, 2025
```

### 3. Edit a Task
Ask Claude:
```
Edit the task "Test Task" in OmniFocus to change its due date to September 15, 2025
```

## If these fail, check:

1. **Server logs** - Look for error messages when Claude tries to call the tools
2. **Tool names** - Claude should be calling tools like `add_project`, not `omnifocus:add_project`
3. **Parameter format** - Dates should be in ISO format like "2025-08-30T00:00:00"

## Debug Information

When Claude calls a tool, you should see in the logs something like:
```
Message from client: {"method":"tools/call","params":{"name":"add_project","arguments":{"name":"Test Project","dueDate":"2025-08-30T00:00:00"}},"jsonrpc":"2.0","id":X}
```

If you see "Tool execution failed" in Claude, check:
- Is the tool name exactly as registered?
- Are required parameters provided?
- Is the date format correct?

## Common Issues:

1. **Wrong tool namespace** - Claude might be trying to prefix tools with "omnifocus:" which doesn't match the registration
2. **Date format issues** - Even though we fixed the AppleScript, the tool handler might have validation issues
3. **Parameter validation** - The Zod schema might be rejecting the parameters

Share the exact error from the server logs when Claude fails to call a tool, and I can help diagnose the specific issue.