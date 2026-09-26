# query_omnifocus Reference

Every parameter, filter, field and allowed value of the `query_omnifocus` tool, as implemented. The schema lives in `src/tools/definitions/queryOmnifocus.ts` and the behavior in `src/tools/primitives/queryOmnifocus.ts`; when this file and the code disagree, the code wins. A test (`src/tools/definitions/queryReference.test.ts`) fails if a filter or top-level parameter is added to the schema without being documented here. Worked examples are in [QUERY_TOOL_EXAMPLES.md](QUERY_TOOL_EXAMPLES.md).

**Filter names are not field names.** Filters go in `filters` and select items; fields go in `fields` and pick what each result contains. The two vocabularies overlap only in places. For example, the filter is `inbox` but the field is `inInbox`, and the filter is `isRepeating` while the fields are `isRepeating`, `repetitionRule` and so on. Don't pass a field name as a filter: it will be rejected.

## Top-level parameters

| Parameter | Type | Default | Behavior |
|---|---|---|---|
| `entity` | `"tasks"` \| `"projects"` \| `"folders"` | required | What to query. |
| `filters` | object | none | Narrow the results. See [Filters](#filters). |
| `fields` | string[] | per-entity default set | Only return these fields. Names are checked against a per-entity allowlist; see [Fields](#fields). |
| `limit` | non-negative integer | no limit | Keep the first N items after sorting. `0` means no limit. When the result count equals `limit`, the response adds a note that more may be available. |
| `sortBy` | enum | OmniFocus order | Sort before `limit` is applied. One of the keys in [Sorting](#sorting). |
| `sortOrder` | `"asc"` \| `"desc"` | `"asc"` | Sort direction. Ignored without `sortBy`. |
| `includeCompleted` | boolean | `false` | Include completed and dropped items. See [includeCompleted](#includecompleted). |
| `summary` | boolean | `false` | Return only `Found N <entity> matching your criteria.` The count is taken after `limit`, so `summary` with `limit: 10` never reports more than 10. |

### Unknown keys are rejected

Input is strict at every level. A misspelled or invented key, whether at the top level or inside `filters`, fails validation and the error names the key. Passing a field name as a filter (`"filters": {"inInbox": true}`) fails this way, where older versions silently ignored it and ran the query unfiltered.

A filter that is valid for some entity but does not apply to the one being queried (for example `reviewDue` on tasks) is **not** rejected. It is silently ignored. Check the [applicability table](#which-filters-apply-to-which-entity).

## Filters

All filters combine with **AND**: an item must pass every filter given. The two array filters, `tags` and `status`, use **OR** within the array: the item needs at least one of the listed values.

```json
{
  "entity": "tasks",
  "filters": {
    "flagged": true,
    "status": ["Next", "Available"],
    "tags": ["home", "errands"]
  }
}
```

This returns flagged tasks that are (Next or Available) and tagged (home or errands).

### Which filters apply to which entity

| Filter | Type | Tasks | Projects | Folders |
|---|---|:-:|:-:|:-:|
| `projectId` | string | yes | yes | ignored |
| `projectName` | string | yes | yes | ignored |
| `taskName` | string | yes | ignored | ignored |
| `folderId` | string | yes | yes | ignored |
| `folderName` | string | yes | yes | ignored |
| `tags` | string[] | yes | yes | ignored |
| `status` | enum[] | yes | yes | ignored |
| `flagged` | boolean | yes | yes | ignored |
| `hasNote` | boolean | yes | yes | ignored |
| `inbox` | boolean | yes | ignored | ignored |
| `isRepeating` | boolean | yes | ignored | ignored |
| `reviewDue` | boolean | ignored | yes | ignored |
| `dueWithin` | date value | yes | yes | ignored |
| `deferredUntil` | date value | yes | yes | ignored |
| `plannedWithin` | date value | yes | ignored | ignored |
| `dueOn` | date value | yes | yes | ignored |
| `deferOn` | date value | yes | yes | ignored |
| `plannedOn` | date value | yes | ignored | ignored |
| `addedWithin` | date value | yes | yes | ignored |
| `addedOn` | date value | yes | yes | ignored |
| `completedWithin` | date value | yes | yes | ignored |
| `completedOn` | date value | yes | yes | ignored |
| `droppedWithin` | date value | yes | yes | ignored |
| `droppedOn` | date value | yes | yes | ignored |

No filter applies to `entity: "folders"`. A folder query returns every folder, minus dropped ones unless `includeCompleted` is true, and then `sortBy` and `limit` shape it.

### Container and name filters

**`projectId`**: exact match against the containing project's id (for tasks) or the project's own id (for projects). Either id form works: the id `query_omnifocus` returns for a project (its root task id, which `edit_item` and `remove_item` also use) or the OmniJS project id. Inbox tasks have no project and never match.

**`projectName`**: case-insensitive substring match on the project name. `"review"` matches "Weekly Review" and "Review Documents".
- On tasks, the value `"inbox"` (any case, exactly that word) also matches inbox tasks. It still matches tasks in any project whose name contains "inbox". No other value matches inbox tasks.
- On projects, `"inbox"` has no special meaning.

**`taskName`** (tasks only): case-insensitive substring match on the task name.

**`folderId`**: exact folder id. It matches items in that folder **and every subfolder below it**. Projects match on the folder that contains them; tasks match on their containing project's folder, so inbox tasks never match. An id that doesn't exist matches nothing. It returns no error.

**`folderName`**: case-insensitive substring match on folder names. Every matching folder counts, each with its subfolders, so `"work"` can pull in several folder trees. If `folderId` is also given, `folderName` is ignored.

### Tag, status and flag filters

**`tags`**: tag names, **exact and case-sensitive** (`"Work"` does not match a tag named `work`). OR within the array. Matching is against the item's own tags.

**`status`**: an array of these exact, case-sensitive values:

| Entity | Allowed values |
|---|---|
| Tasks | `Next`, `Available`, `Blocked`, `DueSoon`, `Overdue`, `Completed`, `Dropped` |
| Projects | `Active`, `OnHold`, `Done`, `Dropped` |

The schema accepts one combined enum. A value outside it (`"next"`, `"Waiting"`) is a validation error. A value from the other entity's list (`"Active"` on tasks) passes validation but matches nothing. `Completed` and `Dropped` tasks, and `Done` and `Dropped` projects, only appear with `includeCompleted: true`. `OnHold` projects are included by default.

| Task status | Meaning |
|---|---|
| `Next` | The next action in its project or action group |
| `Available` | Actionable now |
| `Blocked` | Not actionable yet: waiting on an earlier task in a sequential list, or deferred |
| `DueSoon` | Due within OmniFocus's "due soon" window |
| `Overdue` | Due date has passed |
| `Completed` | Completed |
| `Dropped` | Dropped |

Folders have their own status (`Active`, `Dropped`), which is available as a field. No filter applies to folders, so it can't be filtered on.

**`flagged`**: `true` returns only items whose own flag is set. `false` returns only unflagged items.

**`hasNote`**: `true` means the note is non-empty after trimming whitespace. `false` means the note is empty or only whitespace.

**`inbox`** (tasks only): `true` returns only inbox tasks. `false` returns only tasks that are not in the inbox.

**`isRepeating`** (tasks only): `true` returns only tasks with a repetition rule. `false` returns only tasks without one. It is ignored on projects, even though projects can repeat.

**`reviewDue`** (projects only): `true` returns projects whose next review date is set and falls on or before the end of today. `false` returns projects with no review date or a review date after today.

### Date filters

#### Accepted values

Every date filter accepts the same three forms. This includes the backward-looking ones (`addedWithin`, `completedWithin`, `droppedWithin`).

| Form | Example | Resolves to |
|---|---|---|
| number | `7`, `0`, `-1` | That many days from today. Negative numbers are the past (used with `*On` filters). |
| named string | `"today"`, `"tomorrow"`, `"this week"`, `"next week"` | Fixed day counts: 0, 1, 7, 14. These are not calendar weeks. Case-insensitive; surrounding whitespace is trimmed. |
| ISO date | `"2026-10-01"` | That local calendar date, converted to a day count relative to today. |

Anything else (`"yesterday"`, `"next month"`, `"10/01/2026"`) is an error that lists the accepted forms. The error is returned; the query does not run unfiltered.

Every date filter compares the item's **own** date (`dueDate`, `deferDate`, `plannedDate`), not the inherited `effective*` date. A subtask whose due date comes only from its parent doesn't match `dueWithin`.

#### `*On`: exact calendar day

`dueOn`, `deferOn`, `plannedOn` (tasks only), `addedOn`, `completedOn`, `droppedOn`.

The item's date falls on the local calendar day *today + N*: `0` is today, `-1` is yesterday, `1` is tomorrow, and `"2026-10-01"` is that date. Named strings are fixed offsets: `"this week"` means exactly 7 days from today, not "sometime this week". An item with no date never matches.

For "due today, not overdue", use `dueOn: 0`. `dueWithin: 0` also includes overdue tasks (see below).

#### Forward-looking `*Within`: up to a cutoff

`dueWithin`, `deferredUntil`, `plannedWithin` (tasks only).

The item's date is set and falls **on or before the end of day N** (local time; `0` is today). There is no lower bound:

- **Past dates match.** `dueWithin: 7` includes overdue tasks. `deferredUntil: 3` includes tasks whose defer date has already passed and that are available now, not only tasks still deferred.
- **The whole last day counts.** `dueWithin: 0` (or `"today"`) means "due by the end of today, overdue included". `dueWithin: "2026-10-01"` includes everything due on October 1. Before v1.17.0 the cutoff was the current time of day, so `dueWithin: 0` missed tasks due later today.

`deferredUntil` is implemented and applied, to both tasks and projects. To get only items that are still deferred, add a status filter (deferred tasks report `Blocked`) or read `deferDate` from the results.

#### Backward-looking `*Within`: since a start point

`addedWithin`, `completedWithin`, `droppedWithin`.

The item's date is set and falls **on or after local midnight N days ago**, with no upper bound. `0` means since midnight today. `7` or `"this week"` means since midnight seven days ago. An ISO date means on or after that date. Named strings are not negated: `"tomorrow"` here means since midnight yesterday.

#### Which date each filter reads

| Filter(s) | Date checked |
|---|---|
| `dueWithin`, `dueOn` | due date |
| `deferredUntil`, `deferOn` | defer date |
| `plannedWithin`, `plannedOn` | planned date (tasks only) |
| `addedWithin`, `addedOn` | creation date (a project's is read from its root task) |
| `completedWithin`, `completedOn` | completion date. Dropped items have none; use `droppedWithin`/`droppedOn` for those |
| `droppedWithin`, `droppedOn` | drop date |

`completedWithin`, `completedOn`, `droppedWithin` and `droppedOn` **require `includeCompleted: true`**. Without it, completed and dropped items are removed before these filters run, so the result is empty.

### includeCompleted

With `includeCompleted: false` (the default), these are excluded before any filter runs:

- **tasks**: status `Completed` or `Dropped`
- **projects**: status `Done` or `Dropped`, and any project inside a dropped folder, including one nested at any depth below a dropped folder, even if its own status is still `Active`
- **folders**: dropped folders and every folder beneath them

Repeating items keep their completed occurrences as separate rows. With `includeCompleted: true` these past occurrences come back with the same name, and often the same rule, as the live item. They are history, not duplicates. The `isPastOccurrence` field marks them, and the text output labels them `⟲ past occurrence — not a duplicate`.

## Fields

Without `fields`, each entity returns a default set:

- **tasks**: `id`, `name`, `flagged`, `taskStatus`, `dueDate`, `deferDate`, `plannedDate`, `tagNames`, `projectName`, `estimatedMinutes`, `note`, `isPastOccurrence`
- **projects**: `id`, `name`, `status`, `folderName`, `taskCount`, `tagNames`, `flagged`, `dueDate`, `deferDate`, `note`, `nextReviewDate`, `reviewInterval`, `isPastOccurrence`
- **folders**: `id`, `name`, `projectCount`, `path`, `parentFolderID`

With `fields`, every name is checked against the entity's allowlist (`VALID_FIELDS` in the primitive). One unknown name fails the whole query, and the error lists every valid field for that entity. `modified` and `added` are accepted as aliases, and they are returned under the keys `modificationDate` and `creationDate`.

Dates are local ISO 8601 with a UTC offset, for example `"2026-10-01T00:00:00+01:00"`, or `null` when unset.

### Task fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Task id |
| `name` | string | Task name |
| `note` | string | Note text (`""` if none) |
| `flagged` | boolean | Own flag |
| `taskStatus` | string | One of the task status values above |
| `dueDate`, `deferDate`, `plannedDate` | date | Dates set on this task |
| `effectiveDueDate`, `effectiveDeferDate`, `effectivePlannedDate` | date | Dates in effect, including ones inherited from a parent or project |
| `completionDate` | date | When completed |
| `dropDate`, `effectiveDropDate` | date | When dropped (own / in effect) |
| `estimatedMinutes` | number \| null | Time estimate |
| `tagNames` | string[] | Tag names |
| `tags` | string[] | Tag ids |
| `projectName` | string \| null | Containing project's name, `"Inbox"` for inbox tasks |
| `projectId` | string \| null | Containing project's id (the form `edit_item` accepts) |
| `parentId` | string \| null | Parent task id |
| `childIds` | string[] | Child task ids |
| `hasChildren` | boolean | Has subtasks |
| `sequential` | boolean | Subtasks must be done in order |
| `completedByChildren` | boolean | Completes when its children are done |
| `inInbox` | boolean | In the inbox (the filter for this is `inbox`) |
| `isRepeating` | boolean | Has a repetition rule |
| `repetitionRule` | string \| null | ICS rule, e.g. `FREQ=WEEKLY;INTERVAL=2` |
| `repetitionMethod` | string \| null | `Fixed`, `DeferUntilDate` or `DueDate` |
| `repetitionAnchor` | string \| null | Date a fixed schedule counts from: `DeferDate`, `DueDate` or `PlannedDate` |
| `repetitionSchedule` | string \| null | `Regularly` (fixed) or `FromCompletion` |
| `catchUpAutomatically` | boolean \| null | Fixed repeats: whether missed occurrences are skipped to catch up |
| `isPastOccurrence` | boolean | A completed or dropped occurrence of a repeating task, i.e. history |
| `modificationDate` (alias `modified`) | date | Last modified |
| `creationDate` (alias `added`) | date | Created |

`repetitionAnchor`, `repetitionSchedule` and `catchUpAutomatically` come from OmniFocus 4.7's repetition model and are `null` for non-repeating items. `repetitionMethod` alone reports `Fixed` for both due-anchored and defer-anchored fixed rules, so read `repetitionAnchor` to tell them apart.

### Project fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Project id: the root task id, which `edit_item` and `remove_item` accept |
| `name` | string | Project name |
| `status` | string | `Active`, `OnHold`, `Done` or `Dropped` |
| `note` | string | Note text |
| `flagged` | boolean | Own flag |
| `folderName`, `folderID` | string \| null | Containing folder |
| `sequential` | boolean | Tasks must be done in order |
| `dueDate`, `deferDate` | date | Dates set on the project |
| `effectiveDueDate`, `effectiveDeferDate` | date | Dates in effect |
| `completionDate` | date | When completed |
| `dropDate`, `effectiveDropDate` | date | When dropped |
| `completedByChildren` | boolean | Completes when its tasks are done |
| `containsSingletonActions` | boolean | Is a single-actions list |
| `taskCount` | number | Number of top-level tasks |
| `tasks` | string[] | Top-level task ids |
| `tagNames` | string[] | Tag names |
| `nextReviewDate` | date | Next review |
| `reviewInterval` | string \| null | e.g. `"2 weeks"` |
| `isRepeating`, `repetitionRule`, `repetitionMethod`, `repetitionAnchor`, `repetitionSchedule`, `catchUpAutomatically` | | As for tasks |
| `isPastOccurrence` | boolean | A done or dropped occurrence of a repeating project |
| `modificationDate` (alias `modified`) | date | Last modified |
| `creationDate` (alias `added`) | date | Created |

### Folder fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Folder id |
| `name` | string | Folder name |
| `path` | string | Full path from the top level, e.g. `"PhD/Dissertation/Project 3"` |
| `parentFolderID` | string \| null | Parent folder id, `null` at the top level |
| `status` | string | `Active` or `Dropped` (the folder's own status) |
| `projectCount` | number | Projects directly in this folder |
| `projects` | string[] | Their ids |
| `subfolders` | string[] | Direct subfolder ids |

## Sorting

`sortBy` takes one of a fixed set of keys; anything else is rejected with the list of valid keys. Sorting happens before `limit`. Nulls sort last in both directions.

| `sortBy` | Sorts by |
|---|---|
| `name` | Name, alphabetical |
| `dueDate`, `deferDate` | That date (tasks and projects) |
| `plannedDate` | Planned date (tasks; projects have none) |
| `estimatedMinutes` | Estimate (tasks) |
| `modificationDate`, `creationDate` | Last modified / date added (tasks and projects) |
| `taskStatus` | Urgency: Overdue, DueSoon, Next, Available, Blocked, Completed, Dropped. On projects, project status: Active, OnHold, Done, Dropped |

Before v1.17.0, `sortBy` was an unvalidated string: `modificationDate`, `creationDate` and `taskStatus` silently did nothing, and an unknown name returned no error.

## Tips

- Ask only for the fields you need, and use `summary: true` when you only need a count.
- `projectName` is a partial match, so `"Home"` also matches "Home Renovation". For an exact project, use `projectId`.
- Tag names and status values are case-sensitive. Project, task and folder names are not.
- For "due today" use `dueOn: 0`. For "due by the end of this week, including overdue", use `dueWithin: 7`.
- For completion history, set `includeCompleted: true` together with `completedWithin` or `completedOn`.
