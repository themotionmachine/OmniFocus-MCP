# Query OmniFocus Tool - Usage Examples

The `query_omnifocus` tool provides efficient, targeted queries against your OmniFocus database without loading everything into memory. This is much more context-efficient than using `dump_database`.

## Basic Usage

### Get all flagged tasks
```json
{
  "entity": "tasks",
  "filters": {
    "flagged": true
  }
}
```

### Get tasks due in the next 7 days
```json
{
  "entity": "tasks", 
  "filters": {
    "dueWithin": 7
  }
}
```

### Get next actions only
```json
{
  "entity": "tasks",
  "filters": {
    "status": ["Next"]
  }
}
```

### Get inbox tasks
```json
{
  "entity": "tasks",
  "filters": {
    "projectName": "inbox"
  }
}
```

## Advanced Filtering

### Get flagged tasks due this week with specific tags
```json
{
  "entity": "tasks",
  "filters": {
    "flagged": true,
    "dueWithin": 7,
    "tags": ["important", "work"]
  },
  "sortBy": "dueDate",
  "sortOrder": "asc"
}
```

### Get overdue and due soon tasks
```json
{
  "entity": "tasks",
  "filters": {
    "status": ["Overdue", "DueSoon"]
  },
  "sortBy": "dueDate"
}
```

### Get tasks in a specific project
```json
{
  "entity": "tasks",
  "filters": {
    "projectName": "Weekly Review"
  }
}
```

### Get tasks that will become available in the next 3 days
```json
{
  "entity": "tasks",
  "filters": {
    "deferredUntil": 3
  }
}
```

### Get tasks planned for this week
```json
{
  "entity": "tasks",
  "filters": {
    "plannedWithin": 7
  },
  "sortBy": "plannedDate"
}
```

### Get today's planned work
```json
{
  "entity": "tasks",
  "filters": {
    "plannedWithin": 0,
    "status": ["Next", "Available"]
  }
}
```

### Get tasks with notes
```json
{
  "entity": "tasks",
  "filters": {
    "hasNote": true
  },
  "fields": ["name", "note", "projectName"]
}
```

### Get tasks without notes (for review)
```json
{
  "entity": "tasks",
  "filters": {
    "hasNote": false,
    "status": ["Available", "Next"]
  },
  "sortBy": "modificationDate"
}
```

## Performance Optimization

### Get only specific fields (reduces response size)
```json
{
  "entity": "tasks",
  "filters": {
    "flagged": true
  },
  "fields": ["name", "note", "dueDate", "projectName"],
  "limit": 10
}
```

### Get just a count of matching items
```json
{
  "entity": "tasks",
  "filters": {
    "status": ["Next", "Available"]
  },
  "summary": true
}
```

### Limit results for large queries
```json
{
  "entity": "tasks",
  "filters": {
    "tags": ["someday"]
  },
  "limit": 20,
  "sortBy": "modificationDate",
  "sortOrder": "desc"
}
```

## Project Queries

### Get all active projects
```json
{
  "entity": "projects",
  "filters": {
    "status": ["Active"]
  }
}
```

### Get projects on hold
```json
{
  "entity": "projects",
  "filters": {
    "status": ["OnHold"]
  }
}
```

### Include completed projects
```json
{
  "entity": "projects",
  "includeCompleted": true
}
```

## Folder Queries

### Get all folders
```json
{
  "entity": "folders"
}
```

### Get folder structure with project counts
```json
{
  "entity": "folders",
  "fields": ["name", "projectCount", "path"]
}
```

## Complex Queries

### Daily planning query - get today's agenda
```json
{
  "entity": "tasks",
  "filters": {
    "status": ["Next", "Available", "DueSoon", "Overdue"],
    "dueWithin": 1
  },
  "sortBy": "dueDate",
  "limit": 20
}
```

### Weekly review - get stale tasks
```json
{
  "entity": "tasks",
  "filters": {
    "status": ["Available", "Blocked"],
    "hasNote": false
  },
  "sortBy": "modificationDate",
  "sortOrder": "asc",
  "limit": 30
}
```

### Get high-priority items (flagged or due soon)
```json
{
  "entity": "tasks",
  "filters": {
    "flagged": true
  },
  "limit": 10
}
```
Then separately:
```json
{
  "entity": "tasks",
  "filters": {
    "dueWithin": 3
  },
  "limit": 10
}
```

## Tips for Efficient Querying

1. **Use `summary: true`** when you only need counts, not full details
2. **Specify `fields`** to reduce response size when you don't need all data
3. **Use `limit`** to prevent overwhelming responses from large result sets
4. **Combine filters** to get exactly what you need in one query
5. **Sort strategically** - sort by the field most relevant to your use case

## Performance Comparison

| Operation | dump_database | query_omnifocus |
|-----------|--------------|-----------------|
| Get all flagged tasks | ~300-500 lines (full dump) | ~20-50 lines (just flagged) |
| Count overdue items | Full dump + client processing | Single line with `summary: true` |
| Get tasks for one project | Full dump + client filtering | Just those tasks |
| Check inbox | Full dump | Just inbox items |

## Common Use Cases

### Morning Planning
Get your most important tasks for the day:
```json
{
  "entity": "tasks",
  "filters": {
    "status": ["Next", "DueSoon", "Overdue"],
    "flagged": true
  },
  "sortBy": "dueDate",
  "limit": 15
}
```

Or get tasks you planned to work on today:
```json
{
  "entity": "tasks",
  "filters": {
    "plannedWithin": 0,
    "status": ["Next", "Available"]
  },
  "sortBy": "plannedDate",
  "fields": ["name", "plannedDate", "projectName", "estimatedMinutes"]
}
```

### Project Status Check
Quick count of tasks in a project:
```json
{
  "entity": "tasks",
  "filters": {
    "projectName": "Q4 Goals"
  },
  "summary": true
}
```

### Inbox Processing
See what's in your inbox:
```json
{
  "entity": "tasks",
  "filters": {
    "projectName": "inbox"
  },
  "fields": ["name", "note", "flagged", "dueDate", "tagNames"]
}
```

### Context-Based Views
Get all tasks for a specific context/tag:
```json
{
  "entity": "tasks",
  "filters": {
    "tags": ["home"],
    "status": ["Available", "Next"]
  },
  "sortBy": "estimatedMinutes",
  "sortOrder": "asc"
}
```