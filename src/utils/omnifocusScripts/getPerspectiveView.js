// OmniJS script to get perspective view in OmniFocus using rule evaluation
// Usage: Call with perspective name and limit as parameters
// Example: getPerspectiveViewByName("Today", 100)

function getPerspectiveViewByName(perspectiveName, limit = 100) {
  try {
    let currentPerspective = null;

    if (perspectiveName.toLowerCase() === "inbox") {
      currentPerspective = Perspective.BuiltIn.Inbox;
    } else if (perspectiveName.toLowerCase() === "projects") {
      currentPerspective = Perspective.BuiltIn.Projects;
    } else if (perspectiveName.toLowerCase() === "tags") {
      currentPerspective = Perspective.BuiltIn.Tags;
    } else if (perspectiveName.toLowerCase() === "forecast") {
      currentPerspective = Perspective.BuiltIn.Forecast;
    } else if (perspectiveName.toLowerCase() === "flagged") {
      currentPerspective = Perspective.BuiltIn.Flagged;
    } else if (perspectiveName.toLowerCase() === "review") {
      currentPerspective = Perspective.BuiltIn.Review;
    } else {
      currentPerspective = Perspective.Custom.byName(perspectiveName);
    }

    if (!currentPerspective) {
      return JSON.stringify({
        success: false,
        error: "Could not find perspective named '" + perspectiveName + "'",
      });
    }
    let perspectiveDisplayName = "Unknown";

    if (currentPerspective) {
      if (currentPerspective === Perspective.BuiltIn.Inbox) {
        perspectiveDisplayName = "Inbox";
      } else if (currentPerspective === Perspective.BuiltIn.Projects) {
        perspectiveDisplayName = "Projects";
      } else if (currentPerspective === Perspective.BuiltIn.Tags) {
        perspectiveDisplayName = "Tags";
      } else if (currentPerspective === Perspective.BuiltIn.Forecast) {
        perspectiveDisplayName = "Forecast";
      } else if (currentPerspective === Perspective.BuiltIn.Flagged) {
        perspectiveDisplayName = "Flagged";
      } else if (currentPerspective === Perspective.BuiltIn.Review) {
        perspectiveDisplayName = "Review";
      } else if (currentPerspective.name) {
        perspectiveDisplayName = currentPerspective.name;
      }
    }

    var evaluateActionAvailability = (task, value) => {
      let result;
      // task.completed is unreliable for repeating tasks: a completed occurrence
      // reads back completed:false while task.taskStatus is Completed (the next
      // occurrence hasn't been generated yet). taskStatus is the source of truth
      // for whether an action is finished — keying "remaining"/"completed"/
      // "available" off task.completed let every past occurrence of a repeating
      // task slip through "Availability: Available" and flood perspectives.
      const isFinished =
        task.taskStatus === Task.Status.Completed ||
        task.taskStatus === Task.Status.Dropped;
      if (value === "remaining") {
        result = !isFinished;
      } else if (value === "completed") {
        result = task.taskStatus === Task.Status.Completed;
      } else if (value === "dropped") {
        result = task.taskStatus === Task.Status.Dropped;
      } else if (value === "available") {
        // "available" is defined here: https://support.omnigroup.com/documentation/omnifocus/universal/4.3.3/en/glossary/#view-options
        const isAvailable =
          task.taskStatus !== Task.Status.Blocked &&
          (!task.deferDate || task.deferDate <= new Date());
        result = !isFinished && isAvailable;
      } else if (value === "firstAvailable") {
        // "firstAvailable" specifically means the Available status
        result = task.taskStatus === Task.Status.Available;
      } else {
        result = false;
      }
      return result;
    };

    var evaluateActionStatus = (task, value) => {
      if (value === "due")
        return (
          task.taskStatus === Task.Status.DueSoon ||
          task.taskStatus === Task.Status.Overdue
        );
      if (value === "flagged") return task.flagged;
      return false;
    };

    var evaluateActionHasDueDate = (task, value) =>
      (task.dueDate !== null) === value;
    var evaluateActionHasDeferDate = (task, value) =>
      (task.deferDate !== null) === value;
    var evaluateActionHasDuration = (task, value) =>
      (task.estimatedMinutes !== null) === value;
    var evaluateActionWithinDuration = (task, value) =>
      task.estimatedMinutes !== null && task.estimatedMinutes <= value;
    var evaluateActionIsProject = (task, value) =>
      (task.children &&
        task.children.length > 0 &&
        task.containingProject === null) === value;
    var evaluateActionIsGroup = (task, value) =>
      (task.children &&
        task.children.length > 0 &&
        task.containingProject !== null) === value;
    var evaluateActionIsProjectOrGroup = (task, value) =>
      (task.children && task.children.length > 0) === value;
    var evaluateActionRepeats = (task, value) =>
      (task.repetitionRule !== null) === value;
    var evaluateActionIsUntagged = (task, value) =>
      (task.tags.length === 0) === value;
    // The adverb-form names Tag.effectivelyDropped/effectivelyActive/
    // effectivelyOnHold do NOT exist (verified against
    // app.getTypeScriptDeclarations() — zero matches — and by probing a live
    // tag; all read back as undefined). The adjective-form `effectiveActive`
    // DOES exist (inherited from ActiveObject) but is the wrong tool here: for a
    // Tag it only tracks "not dropped" — a live probe shows an on-hold tag
    // reads effectiveActive:true. The perspective editor treats Active and
    // On Hold as distinct rule values (that's why "remaining" — meaning "not
    // dropped" — is a separate value), so we need the real Tag.Status, folded
    // up the parent chain. `tag.parent` and `tag.status` are both real
    // properties; Tag.Status members are Active, Dropped, OnHold.
    var tagAncestryHasStatus = (tag, status) => {
      for (var t = tag; t; t = t.parent) {
        if (t.status === status) return true;
      }
      return false;
    };
    var evaluateActionHasTagWithStatus = (task, value) => {
      return task.tags.some((tag) => {
        const droppedInChain = tagAncestryHasStatus(tag, Tag.Status.Dropped);
        if (value === "dropped") return droppedInChain;
        if (value === "remaining") return !droppedInChain;
        const onHoldInChain = tagAncestryHasStatus(tag, Tag.Status.OnHold);
        if (value === "onHold") return !droppedInChain && onHoldInChain;
        if (value === "active") return !droppedInChain && !onHoldInChain;
        return false;
      });
    };
    var evaluateActionIsLeaf = (task, value) =>
      (!task.children || task.children.length === 0) === value;
    var evaluateActionHasNoProject = (task, value) =>
      (task.containingProject === null) === value;
    // Project.Status has no `SingleActions` member (only Active/Done/Dropped/
    // OnHold), so this always compared against `undefined` and never matched.
    // Being in a single actions list is its own boolean property.
    var evaluateActionIsInSingleActionsList = (task, value) => {
      const project = task.containingProject;
      if (!project) return false;
      return Boolean(project.containsSingletonActions) === value;
    };
    // Project.effectivelyCompleted/effectivelyDropped do not exist (same class
    // of bug as the tag statuses above); "remaining" was always true, "completed"
    // and "dropped" were always false. "stalled" and "pending" mapped to
    // Project.Status.Stalled/.Pending, which also don't exist — Project.Status
    // has only Active/Done/Dropped/OnHold, so both always evaluated false.
    //
    // OmniFocus's own glossary confirms "Stalled" and "Pending" are legacy names
    // for compound conditions, not literal statuses:
    //   Stalled -> "Has an active project which has no remaining actions"
    //   Pending -> "Has an active project which has a future defer date"
    // (https://support.omnigroup.com/documentation/omnifocus/universal/4.8.11/en/glossary/#stalled,
    //  .../#pending — unchanged since 4.3.3.)
    //
    // The glossary's "no remaining actions" reading is self-contradictory once you
    // account for how this rule is actually used: every real perspective pairs
    // {actionHasProjectWithStatus: "stalled"} with {actionAvailability: "remaining"}
    // at the TASK level (AND'd together). A task can't be "remaining" while its own
    // project has zero remaining tasks — it would be one. Verified live: that literal
    // reading matched 25 active projects, almost all placeholder projects with zero
    // tasks; the classic GTD reading below ("has work left, but none of it is
    // currently actionable") matched 3 real in-progress projects and is what makes
    // the paired rule non-vacuous.
    // OmniJS doesn't expose an "effectively active" flag on Project — a project's
    // own `.status` stays Active even when a containing folder has been dropped,
    // which hides it from the app despite the field never changing. Walk `.parent`
    // (not `.parentFolder`, which only exists on Project, not Folder itself) to
    // check the whole chain.
    function isAncestorFolderDropped(project) {
      var folder = project.parentFolder;
      while (folder) {
        if (folder.status === Folder.Status.Dropped) return true;
        folder = folder.parent;
      }
      return false;
    }

    // Memoized per project id for the lifetime of this getPerspectiveViewByName
    // call: {actionHasProjectWithStatus: "stalled"} is typically paired with
    // {actionAvailability: "remaining"} at the task level, so evaluateTask calls
    // into this once per remaining task in a project, not once per project —
    // without the cache, an N-task stalled project re-scans its own M-task list
    // N times.
    var _stalledProjectCache = new Map();
    function isProjectStalled(project) {
      const key = project.id.primaryKey;
      if (_stalledProjectCache.has(key)) return _stalledProjectCache.get(key);
      const remaining = project.flattenedTasks.filter(
        (t) => !t.completed && t.taskStatus !== Task.Status.Dropped
      );
      const hasActionableTask = remaining.some(
        (t) =>
          t.taskStatus === Task.Status.Available ||
          t.taskStatus === Task.Status.Next ||
          t.taskStatus === Task.Status.DueSoon ||
          t.taskStatus === Task.Status.Overdue
      );
      const result =
        project.status === Project.Status.Active &&
        !isAncestorFolderDropped(project) &&
        remaining.length > 0 &&
        !hasActionableTask;
      _stalledProjectCache.set(key, result);
      return result;
    }

    var evaluateActionHasProjectWithStatus = (task, value) => {
      const project = task.containingProject;
      if (!project) return false;
      // Project is not an ActiveObject and exposes no effective status, so a
      // project inside a dropped folder keeps status:Active. Fold the folder
      // chain in by hand — consistently, not just for stalled/pending.
      const folderDropped = isAncestorFolderDropped(project);
      if (value === "remaining") {
        return (
          !project.completed &&
          project.status !== Project.Status.Dropped &&
          !folderDropped
        );
      }
      if (value === "stalled") {
        return isProjectStalled(project);
      }
      if (value === "pending") {
        const deferDate = project.effectiveDeferDate;
        return (
          project.status === Project.Status.Active &&
          !folderDropped &&
          deferDate !== null &&
          deferDate > new Date()
        );
      }
      if (value === "dropped") {
        return project.status === Project.Status.Dropped || folderDropped;
      }
      if (value === "active") {
        return project.status === Project.Status.Active && !folderDropped;
      }
      const statusMap = {
        onHold: Project.Status.OnHold,
        completed: Project.Status.Done,
      };
      return project.status === statusMap[value];
    };

    var evaluateActionHasAnyOfTags = (task, value) => {
      if (!Array.isArray(value) || task.tags.length === 0) return false;
      const taskTagIds = task.tags.map((tag) => tag.id.primaryKey);
      return value.some((tagId) => taskTagIds.includes(tagId));
    };

    var evaluateActionHasAllOfTags = (task, value) => {
      if (!Array.isArray(value) || task.tags.length === 0) return false;
      const taskTagIds = task.tags.map((tag) => tag.id.primaryKey);
      return value.every((tagId) => taskTagIds.includes(tagId));
    };

    var evaluateActionWithinFocus = (task, value) => {
      if (!Array.isArray(value)) return false;

      function isWithinHierarchy(item) {
        if (!item) return false;

        if (value.includes(item.id.primaryKey)) {
          return true;
        }

        if (item.parentFolder) {
          return isWithinHierarchy(item.parentFolder);
        }

        if (item.parent && item.parent !== item) {
          return isWithinHierarchy(item.parent);
        }

        return false;
      }

      if (task.containingProject) {
        return isWithinHierarchy(task.containingProject);
      }

      // Task has no containing project — don't match the task's own ID
      // against the focus list, as the list contains project/folder IDs
      return false;
    };

    var evaluateActionMatchingSearch = (task, value) => {
      if (!Array.isArray(value)) return false;
      const searchText = (task.name + " " + (task.note || "")).toLowerCase();
      return value.some((term) => searchText.includes(term.toLowerCase()));
    };

    // Perspective rules name date fields as "due"/"defer"/"completed"/"dropped"/
    // "added"/"changed" (https://omni-automation.com/omnifocus/perspective.html),
    // but the real OmniJS Task properties don't follow one consistent "<field>Date"
    // pattern: "dropped" is dropDate (not droppedDate), and "added"/"changed" have
    // no Date suffix at all (added, modified). The old suffix-concatenation
    // approach silently produced a nonexistent property name for those three,
    // so any rule filtering on drop/added/changed date never matched anything.
    var DATE_FIELD_PROPERTY = {
      due: "dueDate",
      defer: "deferDate",
      planned: "plannedDate",
      completed: "completionDate",
      dropped: "dropDate",
      added: "added",
      changed: "modified",
    };

    var getTaskDateField = (task, dateField) => {
      const prop = DATE_FIELD_PROPERTY[dateField];
      return prop ? task[prop] : undefined;
    };

    var evaluateActionDateIsToday = (task, dateField) => {
      const fieldDate = getTaskDateField(task, dateField);
      if (!fieldDate) return false;
      const today = new Date();
      return fieldDate.toDateString() === today.toDateString();
    };

    var evaluateActionDateIsYesterday = (task, dateField) => {
      const fieldDate = getTaskDateField(task, dateField);
      if (!fieldDate) return false;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return fieldDate.toDateString() === yesterday.toDateString();
    };

    var evaluateActionDateIsTomorrow = (task, dateField) => {
      const fieldDate = getTaskDateField(task, dateField);
      if (!fieldDate) return false;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return fieldDate.toDateString() === tomorrow.toDateString();
    };

    // Shared by evaluateActionDateIsInThePast/InTheNext, which are identical
    // apart from the offset's sign and which side of `now` the window falls on.
    // Keeping the hour/day/week/month/year cases in one place means a future
    // fix (a new component, a unit bug) can't be applied to one side and
    // forgotten on the other — exactly the class of bug this file was already
    // full of.
    function applyRelativeOffset(date, amount, component, sign) {
      const delta = sign * amount;
      if (component === "hour") date.setHours(date.getHours() + delta);
      else if (component === "day") date.setDate(date.getDate() + delta);
      else if (component === "week") date.setDate(date.getDate() + delta * 7);
      else if (component === "month") date.setMonth(date.getMonth() + delta);
      else if (component === "year") date.setFullYear(date.getFullYear() + delta);
      else return null;
      return date;
    }

    var evaluateActionDateIsInThePast = (task, dateField, value) => {
      const fieldDate = getTaskDateField(task, dateField);
      if (!fieldDate) return false;
      const now = new Date();

      // value === true means "any time before now" (no relative window)
      if (typeof value !== "object" || value === null) {
        return fieldDate <= now;
      }

      const { relativeBeforeAmount, relativeComponent } = value;
      if (relativeBeforeAmount === undefined || relativeComponent === undefined) {
        return fieldDate <= now;
      }

      const cutoff = applyRelativeOffset(new Date(), relativeBeforeAmount, relativeComponent, -1);
      if (!cutoff) return fieldDate <= now;
      return fieldDate >= cutoff && fieldDate <= now;
    };

    // Forward-looking counterpart to actionDateIsInThePast, documented at
    // https://omni-automation.com/omnifocus/perspective.html but never
    // implemented — any rule using it fell through to unknownRuleTypes and
    // matched nothing, silently, since a date-field rule short-circuits the
    // whole evaluateRule branch once it recognizes `rule.actionDateField`.
    var evaluateActionDateIsInTheNext = (task, dateField, value) => {
      const fieldDate = getTaskDateField(task, dateField);
      if (!fieldDate) return false;
      const now = new Date();

      if (typeof value !== "object" || value === null) {
        return fieldDate >= now;
      }

      const { relativeAfterAmount, relativeComponent } = value;
      if (relativeAfterAmount === undefined || relativeComponent === undefined) {
        return fieldDate >= now;
      }

      const cutoff = applyRelativeOffset(new Date(), relativeAfterAmount, relativeComponent, 1);
      if (!cutoff) return fieldDate >= now;
      return fieldDate <= cutoff && fieldDate >= now;
    };

    // filter rules and values are defined here: https://omni-automation.com/omnifocus/perspective.html
    var possibleRuleTypes = {
      actionAvailability: evaluateActionAvailability,
      actionStatus: evaluateActionStatus,
      actionHasDueDate: evaluateActionHasDueDate,
      actionHasDeferDate: evaluateActionHasDeferDate,
      actionHasDuration: evaluateActionHasDuration,
      actionWithinDuration: evaluateActionWithinDuration,
      actionIsProject: evaluateActionIsProject,
      actionIsGroup: evaluateActionIsGroup,
      actionIsProjectOrGroup: evaluateActionIsProjectOrGroup,
      actionRepeats: evaluateActionRepeats,
      actionIsUntagged: evaluateActionIsUntagged,
      actionHasTagWithStatus: evaluateActionHasTagWithStatus,
      actionHasAnyOfTags: evaluateActionHasAnyOfTags,
      actionHasAllOfTags: evaluateActionHasAllOfTags,
      actionIsLeaf: evaluateActionIsLeaf,
      actionHasNoProject: evaluateActionHasNoProject,
      actionIsInSingleActionsList: evaluateActionIsInSingleActionsList,
      actionHasProjectWithStatus: evaluateActionHasProjectWithStatus,
      actionWithinFocus: evaluateActionWithinFocus,
      actionMatchingSearch: evaluateActionMatchingSearch,
    };

    function evaluateRule(task, rule) {
      // Handle complex date field rules
      if (rule.actionDateField) {
        const dateField = rule.actionDateField;

        // Check for date-specific conditions
        if (rule.actionDateIsToday) {
          return evaluateActionDateIsToday(task, dateField);
        }
        if (rule.actionDateIsYesterday) {
          return evaluateActionDateIsYesterday(task, dateField);
        }
        if (rule.actionDateIsTomorrow) {
          return evaluateActionDateIsTomorrow(task, dateField);
        }
        if (rule.actionDateIsInThePast) {
          return evaluateActionDateIsInThePast(task, dateField, rule.actionDateIsInThePast);
        }
        if (rule.actionDateIsInTheNext) {
          return evaluateActionDateIsInTheNext(task, dateField, rule.actionDateIsInTheNext);
        }

        // Record any unrecognised date conditions so callers can diagnose gaps
        const knownDateKeys = new Set(["actionDateField", "actionDateIsToday", "actionDateIsYesterday", "actionDateIsTomorrow", "actionDateIsInThePast", "actionDateIsInTheNext"]);
        Object.keys(rule).forEach((k) => {
          if (!knownDateKeys.has(k)) {
            const entry = k + "(field=" + dateField + ", value=" + JSON.stringify(rule[k]) + ")";
            if (!unknownRuleTypes.includes(entry)) unknownRuleTypes.push(entry);
          }
        });
        return false;
      }

      // Handle standard rules
      for (const [key, value] of Object.entries(rule)) {
        if (possibleRuleTypes[key]) {
          return possibleRuleTypes[key](task, value);
        }
      }

      // Record unrecognised rule types so callers can diagnose gaps
      Object.keys(rule).forEach((k) => {
        const entry = "unknown:" + k + "=" + JSON.stringify(rule[k]);
        if (!unknownRuleTypes.includes(entry)) unknownRuleTypes.push(entry);
      });
      return false;
    }

    function evaluateTask(task, filters, aggregationType = "all") {
      if (!Array.isArray(filters) || filters.length === 0) return true;

      // Disabled rules (toggled off in the perspective editor) must be excluded
      // from aggregation entirely, not coerced to a boolean. Coercing them to
      // true breaks "none" groups (every result must be false) and would create
      // false positives in "any" groups; coercing to false breaks "all" groups.
      const activeFilters = filters.filter(
        (filter) => filter.disabledRule === undefined
      );

      // A group consisting only of disabled rules imposes no constraint.
      if (activeFilters.length === 0) return true;

      const results = activeFilters.map((filter) => {
        if (filter.aggregateType && filter.aggregateRules) {
          // Handle nested aggregate rules
          return evaluateTask(
            task,
            filter.aggregateRules,
            filter.aggregateType
          );
        } else {
          // Handle single rule
          return evaluateRule(task, filter);
        }
      });

      switch (aggregationType) {
        case "any":
          return results.some((result) => result);
        case "all":
          return results.every((result) => result);
        case "none":
          return results.every((result) => !result);
        default:
          return results.every((result) => result);
      }
    }

    // Helper functions.
    // formatDate is supplied by the executor prelude (see
    // src/utils/dateSerialization.ts). Do not redeclare it here — #91.

    function getTaskDetails(task) {
      // Task status mapping to match queryOmnifocus.ts
      const taskStatusMap = {
        [Task.Status.Available]: "Available",
        [Task.Status.Blocked]: "Blocked",
        [Task.Status.Completed]: "Completed",
        [Task.Status.Dropped]: "Dropped",
        [Task.Status.DueSoon]: "DueSoon",
        [Task.Status.Next]: "Next",
        [Task.Status.Overdue]: "Overdue",
      };

      return {
        id: task.id.primaryKey,
        name: task.name,
        completed: Boolean(task.completed),
        flagged: Boolean(task.flagged),
        note: task.note || "",
        dueDate: formatDate(task.dueDate),
        deferDate: formatDate(task.deferDate),
        completionDate: formatDate(task.completionDate),
        estimatedMinutes: task.estimatedMinutes
          ? Number(task.estimatedMinutes)
          : null,
        taskStatus: taskStatusMap[task.taskStatus] || "Unknown",
        projectName: task.containingProject
          ? task.containingProject.name
          : null,
        tagNames: (task.tags || [])
          .map((tag) => tag.name)
          .filter((name) => name),
      };
    }

    let perspectiveRules = null;
    let perspectiveAggregation = "all";
    let isCustomPerspective = false;

    try {
      isCustomPerspective =
        currentPerspective &&
        currentPerspective !== Perspective.BuiltIn.Inbox &&
        currentPerspective !== Perspective.BuiltIn.Projects &&
        currentPerspective !== Perspective.BuiltIn.Tags &&
        currentPerspective !== Perspective.BuiltIn.Forecast &&
        currentPerspective !== Perspective.BuiltIn.Flagged &&
        currentPerspective !== Perspective.BuiltIn.Review;

      if (isCustomPerspective && currentPerspective.archivedFilterRules) {
        if (typeof currentPerspective.archivedFilterRules === "string") {
          perspectiveRules = JSON.parse(currentPerspective.archivedFilterRules);
        } else {
          perspectiveRules = currentPerspective.archivedFilterRules;
        }
        perspectiveAggregation =
          currentPerspective.archivedTopLevelFilterAggregation || "all";
      }
    } catch (e) {
      // If we can't parse the rules, fall back to getting all available tasks
      perspectiveRules = null;
      var ruleParseError = e.toString();
    }

    let filteredTasks = [];
    let unknownRuleTypes = [];
    let tasksEvaluated = 0;

    // A project's own root task ("project header" row). Action-list
    // perspectives display actions, not the project root, so OmniFocus hides
    // these in the GUI; we must skip them to avoid spurious header rows.
    function isProjectRootTask(task) {
      const proj = task.containingProject;
      return !!(
        proj &&
        proj.task &&
        proj.task.id.primaryKey === task.id.primaryKey
      );
    }

    if (isCustomPerspective && perspectiveRules) {
      flattenedTasks.forEach((task) => {
        tasksEvaluated++;
        if (isProjectRootTask(task)) return;
        if (evaluateTask(task, perspectiveRules, perspectiveAggregation)) {
          filteredTasks.push(getTaskDetails(task));
        }
      });
    } else {
      // Use built-in perspective logic for default perspectives
      if (perspectiveName === "Inbox") {
        inbox.forEach((task) => {
          tasksEvaluated++;
          filteredTasks.push(getTaskDetails(task));
        });
      } else if (perspectiveName === "Flagged") {
        flattenedTasks.forEach((task) => {
          tasksEvaluated++;
          if (task.flagged && !task.completed) {
            filteredTasks.push(getTaskDetails(task));
          }
        });
      } else if (perspectiveName === "Projects") {
        flattenedProjects.forEach((project) => {
          tasksEvaluated++;
          if (project.status === Project.Status.Active) {
            const projectTask = project.task;
            if (projectTask) {
              filteredTasks.push(getTaskDetails(projectTask));
            }
          }
        });
      } else if (perspectiveName === "Tags") {
        flattenedTags.forEach((tag) => {
          tag.remainingTasks.forEach((task) => {
            tasksEvaluated++;
            const taskDetail = getTaskDetails(task);
            if (!filteredTasks.some((item) => item.id === taskDetail.id)) {
              filteredTasks.push(taskDetail);
            }
          });
        });
      } else {
        flattenedTasks.forEach((task) => {
          tasksEvaluated++;
          if (task.taskStatus === Task.Status.Available && !task.completed) {
            filteredTasks.push(getTaskDetails(task));
          }
        });
      }
    }

    const response = {
      success: true,
      perspectiveName: perspectiveDisplayName,
      isCustomPerspective: isCustomPerspective,
      rulesUsed: perspectiveRules !== null,
      aggregationType: perspectiveAggregation,
      ruleParseError: typeof ruleParseError !== "undefined" ? ruleParseError : undefined,
      debug: {
        rules: perspectiveRules,
        tasksEvaluated: tasksEvaluated,
        unknownRuleTypes: unknownRuleTypes.length > 0 ? unknownRuleTypes : undefined,
      },
      items: filteredTasks.slice(0, limit),
    };

    try {
      return JSON.stringify(response);
    } catch (jsonError) {
      return JSON.stringify({
        success: false,
        error: "JSON serialization error: " + jsonError.toString(),
        itemCount: filteredTasks.length,
      });
    }
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString(),
    });
  }
}

(() => {
  // Check for command-line arguments passed via the wrapper
  if (
    typeof perspectiveName !== "undefined" &&
    typeof requestedLimit !== "undefined"
  ) {
    return getPerspectiveViewByName(perspectiveName, requestedLimit);
  }

  // Check for arguments passed via osascript
  if (typeof argv !== "undefined" && argv.length >= 2) {
    const argPerspectiveName = argv[0];
    const argLimit = parseInt(argv[1]) || 100;
    return getPerspectiveViewByName(argPerspectiveName, argLimit);
  }

  // Fallback to current window perspective for backwards compatibility
  const window = document.windows[0];
  if (window && window.perspective) {
    return getPerspectiveViewByName(window.perspective.name || "Unknown", 100);
  } else {
    return JSON.stringify({
      success: false,
      error: "No perspective specified and no active window found",
    });
  }
})();
