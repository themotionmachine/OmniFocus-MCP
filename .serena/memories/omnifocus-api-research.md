# OmniFocus Omni Automation API Research

Research Date: 2025-12-11
Source: https://omni-automation.com/omnifocus/

## Core Entity APIs

### Task Class
**Properties (Read/Write unless marked r/o):**
- `name` (String) - Title of the task
- `note` (String) - Note content
- `flagged` (Boolean) - Flagged status
- `deferDate` (Date|null) - Defer until date
- `dueDate` (Date|null) - Due date
- `estimatedMinutes` (Number|null) - Time estimate (macOS v3.5+)
- `sequential` (Boolean) - Children form dependency chain
- `completedByChildren` (Boolean) - Auto-complete when children done
- `shouldUseFloatingTimeZone` (Boolean) - Floating timezone (v3.6+)
- `assignedContainer` (Project|Task|Inbox|null) - Tentative assignment
- `plannedDate` (Date|null) - Planned date (v4.7+, r/o getter)
- `repetitionRule` (Task.RepetitionRule|null) - Repetition settings
- `attachments` (Array of FileWrapper) - File attachments
- `active` (Boolean) - If false, task is dropped

**Properties (Read-Only):**
- `id` (ObjectIdentifier r/o) - Unique identifier
- `url` (URL|null r/o) - Link URL (v4.5+)
- `added` (Date|null r/o) - Creation date
- `modified` (Date|null r/o) - Last modified date
- `completed` (Boolean r/o) - Completion status
- `completionDate` (Date|null r/o) - When completed
- `dropDate` (Date|null r/o) - When dropped
- `taskStatus` (Task.Status r/o) - Current status enum
- `effectiveCompletedDate` (Date|null r/o) - Computed completion (v3.8)
- `effectiveDeferDate` (Date|null r/o) - Computed defer date
- `effectiveDropDate` (Date|null r/o) - Computed drop date (v3.8)
- `effectiveDueDate` (Date|null r/o) - Computed due date
- `effectiveFlagged` (Boolean r/o) - Computed flagged status
- `effectivePlannedDate` (Date|null r/o) - Computed planned (v4.7.1)
- `containingProject` (Project|null r/o) - Parent project
- `parent` (Task|null r/o) - Parent task
- `project` (Project|null r/o) - If root task of project
- `inInbox` (Boolean r/o) - Is direct child of inbox
- `hasChildren` (Boolean r/o) - Has child tasks
- `children` (Array of Task r/o) - Child tasks
- `tasks` (TaskArray r/o) - Direct children
- `flattenedTasks` (TaskArray r/o) - All descendant tasks
- `flattenedChildren` (TaskArray r/o) - Alias for flattenedTasks
- `tags` (TagArray r/o) - Associated tags
- `notifications` (Array of Task.Notification r/o) - Active notifications
- `linkedFileURLs` (Array of URL r/o) - Linked file bookmarks

**Positional Properties (r/o):**
- `after` (Task.ChildInsertionLocation)
- `before` (Task.ChildInsertionLocation)
- `beginning` (Task.ChildInsertionLocation)
- `ending` (Task.ChildInsertionLocation)
- `beginningOfTags` (Task.TagInsertionLocation)
- `endingOfTags` (Task.TagInsertionLocation)

**Class Functions:**
- `Task.byIdentifier(id)` → Task|null
- `Task.byParsingTransportText(text, singleTask)` → Array of Task

**Instance Functions:**
- `taskNamed(name)` / `childNamed(name)` → Task|null
- `markComplete(date?)` → Task
- `markIncomplete()`
- `drop(allOccurrences)` - Drop task (v3.8)
- `appendStringToNote(string)`
- `addTag(tag)` / `addTags(tags)`
- `removeTag(tag)` / `removeTags(tags)`
- `clearTags()` (v3.8)
- `afterTag(tag)` / `beforeTag(tag)` → TagInsertionLocation (v4.0)
- `moveTag(tag, location)` / `moveTags(tags, location)` (v4.0)
- `addNotification(dateOrOffset)` → Task.Notification (v3.8)
- `removeNotification(notification)` (v3.8)
- `addAttachment(fileWrapper)`
- `removeAttachmentAtIndex(index)`
- `addLinkedFileURL(url)`
- `removeLinkedFileWithURL(url)`
- `apply(function)` → ApplyResult|null

**Task.Status Enum:**
- Available, Blocked, Completed, Dropped, DueSoon, Next, Overdue

### Project Class
**Properties (Read/Write):**
- `name` (String)
- `note` (inherited via task)
- `status` (Project.Status) - Active, Done, Dropped, OnHold
- `sequential` (Boolean)
- `completedByChildren` (Boolean)
- `containsSingletonActions` (Boolean) - Single actions list
- `defaultSingletonActionHolder` (Boolean) - Default inbox destination
- `deferDate`, `dueDate`, `completionDate` (Date|null)
- `flagged` (Boolean)
- `repetitionRule` (Task.RepetitionRule|null)
- `reviewInterval` (Project.ReviewInterval|null)
- `shouldUseFloatingTimeZone` (Boolean)

**Properties (Read-Only):**
- `task` (Task r/o) - Root task (IMPORTANT for accessing properties)
- `parentFolder` (Folder|null r/o)
- `nextTask` (Task|null r/o) - Next actionable task
- `lastReviewDate`, `nextReviewDate` (Date|null)
- `children`, `tasks` (TaskArray r/o)
- `flattenedTasks`, `flattenedChildren` (TaskArray r/o)
- `hasChildren` (Boolean r/o)
- `tags` (TagArray r/o)
- `taskStatus` (Task.Status r/o)
- `completed` (Boolean r/o)
- `effectiveCompletedDate`, `effectiveDeferDate`, `effectiveDropDate`, `effectiveDueDate`, `effectiveFlagged` (r/o)
- Positional: `after`, `before`, `beginning`, `ending`

**Class Functions:**
- `Project.byIdentifier(id)` → Project|null

**Instance Functions:**
- `taskNamed(name)` → Task|null
- `appendStringToNote(string)`
- `markComplete(date?)` / `markIncomplete()`
- `addTag/addTags/removeTag/removeTags/clearTags()`
- `addNotification/removeNotification()`
- `addAttachment/removeAttachmentAtIndex()`
- `addLinkedFileURL/removeLinkedFileWithURL()`

**Project.Status Enum:**
- Active, Done, Dropped, OnHold

**Project.ReviewInterval Class:**
- `steps` (Number) - Count of units
- `unit` (String) - "days", "weeks", "months", "years"

### Folder Class
**Properties:**
- `name` (String)
- `status` (Folder.Status) - Active, Dropped
- `parent` (Folder|null r/o)
- `children` (Array of Project|Folder r/o)
- `folders` (Array of Folder r/o)
- `projects` (Array of Project r/o)
- `sections` (Array of Folder|Project)
- `flattenedFolders`, `flattenedProjects`, `flattenedSections`, `flattenedChildren` (r/o)
- Positional: `after`, `before`, `beginning`, `ending`

**Class Functions:**
- `Folder.byIdentifier(id)` → Folder|null

**Instance Functions:**
- `folderNamed(name)` → Folder|null
- `projectNamed(name)` → Project|null
- `apply(function)` → ApplyResult|null

### Tag Class
**Properties:**
- `name` (String)
- `status` (Tag.Status) - Active, Dropped, OnHold
- `active` (Boolean)
- `effectiveActive` (Boolean r/o)
- `allowsNextAction` (Boolean)
- `parent` (Tag|null r/o)
- `children` (Array of Tag r/o)
- `tags` (TagArray r/o)
- `flattenedTags` (TagArray r/o)
- `tasks` (TaskArray r/o) - Tasks with this tag
- `availableTasks` (TaskArray r/o)
- `remainingTasks` (TaskArray r/o)
- Positional: `after`, `before`, `beginning`, `ending`

**Class Functions:**
- `Tag.byIdentifier(id)` → Tag|null

**Instance Functions:**
- `tagNamed(name)` → Tag|null
- `apply(function)` → ApplyResult|null
- `moveTags(tags, position)`

## Database/Library APIs

### Database Class (Global Context)
**Properties:**
- `inbox` (Inbox r/o) - Tasks in inbox
- `library` (Library r/o) - Top-level folders/projects
- `tags` (Tags r/o) - Top-level tags
- `folders` (FolderArray r/o) - Top-level folders
- `projects` (ProjectArray r/o) - Top-level projects
- `flattenedFolders`, `flattenedProjects`, `flattenedTasks`, `flattenedTags`, `flattenedSections` (r/o)
- `settings` (Settings r/o) - Database preferences
- `document` (DatabaseDocument|null r/o)
- `canUndo`, `canRedo` (Boolean r/o)

**Functions:**
- `folderNamed(name)`, `projectNamed(name)`, `tagNamed(name)`, `taskNamed(name)` → Object|null
- `foldersMatching(search)`, `projectsMatching(search)`, `tagsMatching(search)` → Array
- `objectForURL(url)` → DatabaseObject|null (v4.5+)
- `moveTasks(tasks, position)`, `duplicateTasks(tasks, position)` → Array
- `moveSections(sections, position)`, `duplicateSections(sections, position)` → Array
- `moveTags(tags, position)`, `duplicateTags(tags, position)` → Array
- `convertTasksToProjects(tasks, position)` → Array of Project
- `deleteObject(object)`
- `copyTasksToPasteboard(tasks, pasteboard)`
- `canPasteTasks(pasteboard)` → Boolean
- `pasteTasksFromPasteboard(pasteboard)` → Array of Task
- `save()`, `undo()`, `redo()`, `cleanUp()`

### Inbox, Library, Tags Classes
**Common Properties:**
- `beginning`, `ending` (InsertionLocation r/o)

**Common Functions:**
- `apply(function)` → ApplyResult|null

### Settings Class
**Functions:**
- `objectForKey(key)` → Object|null
- `setObjectForKey(value, key)`
- `defaultObjectForKey(key)` → Object|null
- `hasNonDefaultObjectForKey(key)` → Boolean
- `boolForKey(key)`, `setBoolForKey(value, key)`
- `integerForKey(key)`, `setIntegerForKey(value, key)`
- `keys` (Array of String r/o)

**Common Settings Keys:**
- DefaultStartTime, DefaultDueTime, DueSoonGranularity, InboxIsActive

## UI/Window APIs

### DocumentWindow Class
**Properties:**
- `perspective` (Perspective.BuiltIn|Perspective.Custom|null)
- `focus` (Array of Project|Folder|null) - Focused items
- `selection` (Selection r/o)
- `content` (ContentTree|null r/o) - Outline tree
- `sidebar` (SidebarTree|null r/o)
- `sidebarVisible`, `inspectorVisible`, `toolbarVisible` (Boolean) (v4+)
- `isCompact` (Boolean r/o)
- `isTab` (Boolean r/o)
- `tabGroupWindows` (Array of DocumentWindow r/o)

**Functions:**
- `close()`
- `selectObjects(objects)`
- `forecastDayForDate(date)` → ForecastDay
- `selectForecastDays(days)`

### Selection Class
**Properties:**
- `tasks`, `projects`, `folders`, `tags` (Arrays r/o)
- `databaseObjects`, `allObjects` (Arrays r/o)
- `database`, `window` (r/o)

### Perspective Classes
**Perspective.BuiltIn:**
- Flagged, Forecast, Inbox, Nearby (iOS), Projects, Review, Search, Tags

**Perspective.Custom:**
- `name`, `identifier` (String r/o)
- `iconColor` (Color|null) (v4.5.2)
- `archivedFilterRules` (Object) (v4.2) - JSON filter rules
- `archivedTopLevelFilterAggregation` (String|null) (v4.2)
- `byName(name)`, `byIdentifier(uuid)` → Perspective.Custom|null
- `fileWrapper()` → FileWrapper
- `writeFileRepresentationIntoDirectory(parentURL)` → URL

### Tree/TreeNode Classes (Outline)
**Tree Properties:**
- `rootNode` (TreeNode r/o)
- `selectedNodes` (Array of TreeNode r/o)

**Tree Functions:**
- `nodeForObject(object)` → TreeNode|null
- `nodesForObjects(objects)` → Array of TreeNode
- `reveal(nodes)`, `select(nodes, extending?)`
- `copyNodes(nodes, pasteboard)`, `paste(pasteboard, parentNode?, childIndex?)`

**TreeNode Properties:**
- `object` (Object r/o) - Wrapped database object
- `parent`, `rootNode` (TreeNode r/o)
- `children` (Array of TreeNode r/o)
- `childCount`, `index`, `level` (Number r/o)
- `isExpanded`, `isNoteExpanded`, `isRevealed`, `isRootNode`, `isSelectable`, `isSelected` (Boolean)
- `canExpand`, `canCollapse` (Boolean r/o)

**TreeNode Functions:**
- `expand(completely?)`, `collapse(completely?)`
- `expandNote(completely?)`, `collapseNote(completely?)`
- `reveal()`, `apply(function)`
- `childAtIndex(index)` → TreeNode

## Advanced Features

### Repetition Rules (Task.RepetitionRule)
**Properties:**
- `ruleString` (String r/o) - ICS format rule
- `method` (Task.RepetitionMethod r/o) - Deprecated
- `scheduleType` (Task.RepetitionScheduleType r/o) (v4.7+)
- `anchorDateKey` (Task.AnchorDateKey r/o) (v4.7+)
- `catchUpAutomatically` (Boolean r/o) (v4.7+)

**Constructor:**
```javascript
new Task.RepetitionRule(
  ruleString,           // ICS string e.g. "FREQ=WEEKLY"
  method,               // Deprecated, use null
  scheduleType,         // Task.RepetitionScheduleType (v4.7+)
  anchorDateKey,        // Task.AnchorDateKey (v4.7+)
  catchUpAutomatically  // Boolean (v4.7+)
)
```

**Task.RepetitionScheduleType:** FromCompletion, None, Regularly
**Task.AnchorDateKey:** DeferDate, DueDate, PlannedDate

### Notifications (Task.Notification)
**Properties:**
- `absoluteFireDate` (Date) - For absolute notifications
- `relativeFireOffset` (Number) - Minutes offset for relative
- `initialFireDate`, `nextFireDate` (Date r/o)
- `kind` (Task.Notification.Kind r/o) - Absolute, DueRelative, Unknown
- `isSnoozed` (Boolean r/o)
- `repeatInterval` (Number) - Seconds between repeats
- `task` (Task|null r/o)
- `usesFloatingTimeZone` (Boolean r/o)

### Forecast (ForecastDay)
**Properties:**
- `date` (Date r/o)
- `name` (String r/o)
- `kind` (ForecastDay.Kind r/o) - Day, Today, Past, FutureMonth, DistantFuture
- `badgeCount`, `deferredCount` (Number r/o)
- `badgeKind()` → ForecastDay.Status

**ForecastDay.Status:** Available, DueSoon, NoneAvailable, Overdue

### Attachments & Linked Files
**Attachments:** Files stored in database (FileWrapper)
**Linked Files:** URL bookmarks to external files

### Transport Text (TaskPaper-like)
`Task.byParsingTransportText(text, singleTask)` parses shorthand:
- `-- ` for new tasks
- `> ` or `:: ` for project
- `@ ` for tag
- `# ` for dates
- `$ ` for duration
- `! ` for flagged
- `// ` for notes

### Apply Function
Used to iterate hierarchies with control:
```javascript
container.apply(item => {
  // Process item
  // Return ApplyResult.Stop to halt
  // Return ApplyResult.SkipChildren to skip descendants
  // Return ApplyResult.SkipPeers to skip siblings
})
```

## Application Object
**Properties:**
- `name`, `version` (String r/o)
- `userVersion`, `buildVersion` (Version r/o)
- `platformName` (String r/o) - "macOS", "iOS"
- `commandKeyDown`, `controlKeyDown`, `optionKeyDown`, `shiftKeyDown` (Boolean r/o) - macOS only

## Document Functions
- `document.newWindow()` → Promise
- `document.newTabOnWindow(window)` → Promise (macOS)
- `document.sync()` → Promise of Boolean
- `document.makeFileWrapper(baseName, fileTypeID)` → Promise of FileWrapper

## Version Requirements Summary
- v3.5: estimatedMinutes (macOS)
- v3.6: shouldUseFloatingTimeZone
- v3.8: drop(), addNotification(), removeNotification(), clearTags(), effectiveCompletedDate, effectiveDropDate
- v4.0: Tag ordering (afterTag, beforeTag, moveTag, moveTags)
- v4.2: Perspective filter rules (archivedFilterRules, archivedTopLevelFilterAggregation)
- v4.5: objectForURL(), url property
- v4.5.2: iconColor on custom perspectives
- v4.7: plannedDate, effectivePlannedDate, new repetition parameters
- v4.7.1: effectivePlannedDate computed
