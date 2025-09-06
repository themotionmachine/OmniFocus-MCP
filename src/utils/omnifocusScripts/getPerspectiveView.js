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
        error: "Could not find perspective named '" + perspectiveName + "'"
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
      if (value === "remaining") {
        result = !task.completed && task.taskStatus !== Task.Status.Dropped;
      } else if (value === "completed") {
        result = task.completed;
      } else if (value === "dropped") {
        result = task.taskStatus === Task.Status.Dropped;
      } else if (value === "available") {
        // "available" is defined here: https://support.omnigroup.com/documentation/omnifocus/universal/4.3.3/en/glossary/#view-options
        const isActive = !task.completed && task.taskStatus !== Task.Status.Dropped;
        const isAvailable = task.taskStatus !== Task.Status.Blocked && 
                           (!task.deferDate || task.deferDate <= new Date());
        result = isActive && isAvailable;
      } else if (value === "firstAvailable") {
        // "firstAvailable" specifically means the Available status
        result = task.taskStatus === Task.Status.Available;
      } else {
        result = false;
      }
      return result;
    };
    
    var evaluateActionStatus = (task, value) => {
      if (value === "due") return task.taskStatus === Task.Status.DueSoon || task.taskStatus === Task.Status.Overdue;
      if (value === "flagged") return task.flagged;
      return false;
    };
    
    var evaluateActionHasDueDate = (task, value) => (task.dueDate !== null) === value;
    var evaluateActionHasDeferDate = (task, value) => (task.deferDate !== null) === value;
    var evaluateActionHasDuration = (task, value) => (task.estimatedMinutes !== null) === value;
    var evaluateActionWithinDuration = (task, value) => task.estimatedMinutes !== null && task.estimatedMinutes <= value;
    var evaluateActionIsProject = (task, value) => (task.children && task.children.length > 0 && task.containingProject === null) === value;
    var evaluateActionIsGroup = (task, value) => (task.children && task.children.length > 0 && task.containingProject !== null) === value;
    var evaluateActionIsProjectOrGroup = (task, value) => (task.children && task.children.length > 0) === value;
    var evaluateActionRepeats = (task, value) => (task.repetitionRule !== null) === value;
    var evaluateActionIsUntagged = (task, value) => (task.tags.length === 0) === value;
    var evaluateActionHasTagWithStatus = (task, value) => {
      return task.tags.some(tag => {
        // Map OmniFocus tag status values
        if (value === "remaining") return !tag.effectivelyDropped;
        if (value === "active") return tag.effectivelyActive;
        if (value === "onHold") return tag.effectivelyOnHold;
        if (value === "dropped") return tag.effectivelyDropped;
        return false;
      });
    };
    var evaluateActionIsLeaf = (task, value) => (!task.children || task.children.length === 0) === value;
    var evaluateActionHasNoProject = (task, value) => (task.containingProject === null) === value;
    var evaluateActionIsInSingleActionsList = (task, value) => {
      // Check if task is in a single actions list (project with single action list status)
      const project = task.containingProject;
      return project && project.status === Project.Status.SingleActions === value;
    };
    var evaluateActionHasProjectWithStatus = (task, value) => {
      const project = task.containingProject;
      if (!project) return false;
      const statusMap = {
        "active": Project.Status.Active,
        "remaining": !project.effectivelyCompleted && !project.effectivelyDropped,
        "onHold": Project.Status.OnHold,
        "completed": project.effectivelyCompleted,
        "dropped": project.effectivelyDropped,
        "stalled": Project.Status.Stalled,
        "pending": Project.Status.Pending
      };
      if (value === "remaining") {
        return !project.effectivelyCompleted && !project.effectivelyDropped;
      }
      return project.status === statusMap[value];
    };
    
    var evaluateActionHasAnyOfTags = (task, value) => {
      if (!Array.isArray(value) || task.tags.length === 0) return false;
      const taskTagIds = task.tags.map(tag => tag.id.primaryKey);
      return value.some(tagId => taskTagIds.includes(tagId));
    };
    
    var evaluateActionHasAllOfTags = (task, value) => {
      if (!Array.isArray(value) || task.tags.length === 0) return false;
      const taskTagIds = task.tags.map(tag => tag.id.primaryKey);
      return value.every(tagId => taskTagIds.includes(tagId));
    };
    
    var evaluateActionWithinFocus = (task, value) => {
      if (!Array.isArray(value)) return false;
      
      // Check if task is within any of the focus projects/folders at any depth
      function isWithinHierarchy(item) {
        if (!item) return false;
        
        // Check if this item itself is in the focus list
        if (value.includes(item.id.primaryKey)) {
          return true;
        }
        
        // For projects, check parent folder hierarchy
        if (item.parentFolder) {
          return isWithinHierarchy(item.parentFolder);
        }
        
        // For folders, check parent folder hierarchy  
        if (item.parent && item.parent !== item) {
          return isWithinHierarchy(item.parent);
        }
        
        return false;
      }
      
      // Start with the task's containing project
      if (task.containingProject) {
        return isWithinHierarchy(task.containingProject);
      }
      
      // If no containing project, check if task itself is somehow in focus
      return value.includes(task.id.primaryKey);
    };
    
    var evaluateActionMatchingSearch = (task, value) => {
      if (!Array.isArray(value)) return false;
      const searchText = (task.name + " " + (task.note || "")).toLowerCase();
      return value.some(term => searchText.includes(term.toLowerCase()));
    };
    
    // Date evaluation functions
    var evaluateActionDateIsToday = (task, dateField) => {
      const fieldDate = task[dateField + 'Date']; // e.g., dueDate, deferDate
      if (!fieldDate) return false;
      const today = new Date();
      return fieldDate.toDateString() === today.toDateString();
    };
    
    var evaluateActionDateIsYesterday = (task, dateField) => {
      const fieldDate = task[dateField + 'Date'];
      if (!fieldDate) return false;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return fieldDate.toDateString() === yesterday.toDateString();
    };
    
    var evaluateActionDateIsTomorrow = (task, dateField) => {
      const fieldDate = task[dateField + 'Date'];
      if (!fieldDate) return false;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return fieldDate.toDateString() === tomorrow.toDateString();
    };

    // filter rules and values are defined here: https://omni-automation.com/omnifocus/perspective.html
    var possibleRuleTypes = {
        'actionAvailability': evaluateActionAvailability,
        'actionStatus': evaluateActionStatus,
        'actionHasDueDate': evaluateActionHasDueDate,
        'actionHasDeferDate': evaluateActionHasDeferDate,
        'actionHasDuration': evaluateActionHasDuration,
        'actionWithinDuration': evaluateActionWithinDuration,
        'actionIsProject': evaluateActionIsProject,
        'actionIsGroup': evaluateActionIsGroup,
        'actionIsProjectOrGroup': evaluateActionIsProjectOrGroup,
        'actionRepeats': evaluateActionRepeats,
        'actionIsUntagged': evaluateActionIsUntagged,
        'actionHasTagWithStatus': evaluateActionHasTagWithStatus,
        'actionHasAnyOfTags': evaluateActionHasAnyOfTags,
        'actionHasAllOfTags': evaluateActionHasAllOfTags,
        'actionIsLeaf': evaluateActionIsLeaf,
        'actionHasNoProject': evaluateActionHasNoProject,
        'actionIsInSingleActionsList': evaluateActionIsInSingleActionsList,
        'actionHasProjectWithStatus': evaluateActionHasProjectWithStatus,
        'actionWithinFocus': evaluateActionWithinFocus,
        'actionMatchingSearch': evaluateActionMatchingSearch,
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
        
        // Add other date conditions as needed
        return false;
      }
      
      // Handle standard rules
      for (const [key, value] of Object.entries(rule)) {
        if (possibleRuleTypes[key]) {
          return possibleRuleTypes[key](task, value);
        }
      }
      
      return false;
    }

    function evaluateTask(task, filters, aggregationType = "all") {
      if (!Array.isArray(filters) || filters.length === 0) return true;
      
      const results = filters.map(filter => {
        if (filter.aggregateType && filter.aggregateRules) {
          // Handle nested aggregate rules
          return evaluateTask(task, filter.aggregateRules, filter.aggregateType);
        } else {
          // Handle single rule
          return evaluateRule(task, filter);
        }
      });
      
      switch (aggregationType) {
        case "any":
          return results.some(result => result);
        case "all":
          return results.every(result => result);
        case "none":
          return results.every(result => !result);
        default:
          return results.every(result => result);
      }
    }

    // Helper functions
    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }
    
    function getTaskDetails(task) {      
      // Task status mapping to match queryOmnifocus.ts
      const taskStatusMap = {
        [Task.Status.Available]: "Available",
        [Task.Status.Blocked]: "Blocked", 
        [Task.Status.Completed]: "Completed",
        [Task.Status.Dropped]: "Dropped",
        [Task.Status.DueSoon]: "DueSoon",
        [Task.Status.Next]: "Next",
        [Task.Status.Overdue]: "Overdue"
      };
      
      return {
        id: task.id.primaryKey,
        name: task.name,
        completed: Boolean(task.completed),
        flagged: Boolean(task.flagged),
        note: task.note || '',
        dueDate: formatDate(task.dueDate),
        deferDate: formatDate(task.deferDate),
        completionDate: formatDate(task.completionDate),
        estimatedMinutes: task.estimatedMinutes ? Number(task.estimatedMinutes) : null,
        taskStatus: taskStatusMap[task.taskStatus] || "Unknown",
        projectName: task.containingProject ? task.containingProject.name : null,
        tagNames: (task.tags || []).map(tag => tag.name).filter(name => name)
      };
    }

    let perspectiveRules = null;
    let perspectiveAggregation = "all";
    let isCustomPerspective = false;
    
    try {
      isCustomPerspective = currentPerspective && 
                           currentPerspective !== Perspective.BuiltIn.Inbox &&
                           currentPerspective !== Perspective.BuiltIn.Projects &&
                           currentPerspective !== Perspective.BuiltIn.Tags &&
                           currentPerspective !== Perspective.BuiltIn.Forecast &&
                           currentPerspective !== Perspective.BuiltIn.Flagged &&
                           currentPerspective !== Perspective.BuiltIn.Review;
      
      if (isCustomPerspective && currentPerspective.archivedFilterRules) {
        if (typeof currentPerspective.archivedFilterRules === 'string') {
          perspectiveRules = JSON.parse(currentPerspective.archivedFilterRules);
        } else {
          perspectiveRules = currentPerspective.archivedFilterRules;
        }
        perspectiveAggregation = currentPerspective.archivedTopLevelFilterAggregation || "all";
      }
    } catch (e) {
      // If we can't parse the rules, fall back to getting all available tasks
    }

    let filteredTasks = [];
  
    
    if (isCustomPerspective && perspectiveRules) {
      flattenedTasks.forEach(task => {
        if (evaluateTask(task, perspectiveRules, perspectiveAggregation)) {
          filteredTasks.push(getTaskDetails(task));
        }
      });
    } else {
      // Use built-in perspective logic for default perspectives
      if (perspectiveName === "Inbox") {
        inbox.forEach(task => {
          filteredTasks.push(getTaskDetails(task));
        });
      } else if (perspectiveName === "Flagged") {
        flattenedTasks.forEach(task => {
          if (task.flagged && !task.completed) {
            filteredTasks.push(getTaskDetails(task));
          }
        });
      } else if (perspectiveName === "Projects") {
        flattenedProjects.forEach(project => {
          if (project.status === Project.Status.Active) {
            const projectTask = project.task;
            if (projectTask) {
              filteredTasks.push(getTaskDetails(projectTask));
            }
          }
        });
      } else if (perspectiveName === "Tags") {
        flattenedTags.forEach(tag => {
          tag.remainingTasks.forEach(task => {
            const taskDetail = getTaskDetails(task);
            if (!filteredTasks.some(item => item.id === taskDetail.id)) {
              filteredTasks.push(taskDetail);
            }
          });
        });
      } else {
        flattenedTasks.forEach(task => {
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
      items: filteredTasks.slice(0, limit) 
    };
    
    try {
      return JSON.stringify(response);
    } catch (jsonError) {
      return JSON.stringify({
        success: false,
        error: "JSON serialization error: " + jsonError.toString(),
        itemCount: filteredTasks.length
      });
    }
    
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
}

(() => {
  if (typeof perspectiveName !== 'undefined' && typeof requestedLimit !== 'undefined') {
    return getPerspectiveViewByName(perspectiveName, requestedLimit);
  } else {
    // Fallback to current window perspective for backwards compatibility
    const window = document.windows[0];
    if (window && window.perspective) {
      return getPerspectiveViewByName(window.perspective.name || "Unknown", 100);
    } else {
      return JSON.stringify({
        success: false,
        error: "No perspective specified and no active window found"
      });
    }
  }
})()