# Error Handling Patterns

## OmniJS Error Handling

All OmniJS scripts MUST follow this pattern:

```javascript
try {
    // ... OmniJS logic ...
    JSON.stringify({ success: true, data: result });
} catch (e) {
    JSON.stringify({ success: false, error: e.toString() });
}
```

## MCP Tool Handlers

- Validate all inputs with Zod schemas before processing
- Return structured errors with actionable messages
- Never let exceptions bubble up unhandled
- Include context for debugging (item IDs, operation type)

## Partial Failures

- Batch operations should not fail entirely on single item failure
- Store individual results at original array indices
- Return both successes and failures with clear status

## Error Messages

- Be specific: "Task 'abc123' not found" not "Item not found"
- Include operation context: "Failed to add task: parent project 'xyz' not found"
- Never expose internal stack traces to MCP clients

## Silent Failures

- OmniJS errors often produce empty results, not error messages
- Always wrap OmniJS in try-catch with JSON returns
- Test scripts in Script Editor (⌘-⌃-O) before integrating
