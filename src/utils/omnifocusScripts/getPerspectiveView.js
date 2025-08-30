// OmniJS script to get the current perspective view in OmniFocus
(() => {
  try {
    // Note: We can't easily switch perspectives via OmniJS
    // We can only report what's currently visible in the window
    
    // Get the current window and its perspective
    const window = document.windows[0];
    if (!window) {
      return JSON.stringify({
        success: false,
        error: "No OmniFocus window is open"
      });
    }
    
    // Get the current perspective
    const currentPerspective = window.perspective;
    let perspectiveName = "Unknown";
    
    // Identify the perspective
    if (currentPerspective) {
      if (currentPerspective === Perspective.BuiltIn.Inbox) {
        perspectiveName = "Inbox";
      } else if (currentPerspective === Perspective.BuiltIn.Projects) {
        perspectiveName = "Projects";
      } else if (currentPerspective === Perspective.BuiltIn.Tags) {
        perspectiveName = "Tags";
      } else if (currentPerspective === Perspective.BuiltIn.Forecast) {
        perspectiveName = "Forecast";
      } else if (currentPerspective === Perspective.BuiltIn.Flagged) {
        perspectiveName = "Flagged";
      } else if (currentPerspective === Perspective.BuiltIn.Review) {
        perspectiveName = "Review";
      } else if (currentPerspective.name) {
        // Custom perspective
        perspectiveName = currentPerspective.name;
      }
    }
    
    // Get visible items based on the perspective
    const items = [];
    const selection = window.selection;
    const selectedTasks = selection.tasks;
    const selectedProjects = selection.projects;
    
    // Helper function to format dates
    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }
    
    // Helper to get task details
    function getTaskDetails(task) {
      const details = {
        id: task.id.primaryKey,
        name: task.name,
        completed: task.completed,
        flagged: task.flagged,
        note: task.note || '',
        dueDate: formatDate(task.dueDate),
        deferDate: formatDate(task.deferDate),
        completionDate: formatDate(task.completionDate),
        estimatedMinutes: task.estimatedMinutes
      };
      
      // Task status
      const statusMap = {
        [Task.Status.Available]: "Available",
        [Task.Status.Blocked]: "Blocked",
        [Task.Status.Completed]: "Completed",
        [Task.Status.Dropped]: "Dropped",
        [Task.Status.DueSoon]: "DueSoon",
        [Task.Status.Next]: "Next",
        [Task.Status.Overdue]: "Overdue"
      };
      details.taskStatus = statusMap[task.taskStatus] || "Unknown";
      
      // Project context
      const project = task.containingProject;
      details.projectName = project ? project.name : null;
      
      // Tags
      details.tagNames = task.tags.map(tag => tag.name);
      
      return details;
    }
    
    // Get project details
    function getProjectDetails(project) {
      return {
        id: project.id.primaryKey,
        name: project.name,
        type: 'project',
        status: project.status,
        note: project.note || '',
        flagged: project.flagged || false,
        dueDate: formatDate(project.dueDate),
        deferDate: formatDate(project.deferDate),
        folderName: project.parentFolder ? project.parentFolder.name : null
      };
    }
    
    // Try to get content based on perspective type
    if (perspectiveName === "Inbox") {
      // Get inbox tasks - inbox is a global in OmniJS
      inbox.forEach(task => {
        items.push(getTaskDetails(task));
      });
    } else if (perspectiveName === "Projects") {
      // Get all projects - using flattenedProjects global
      flattenedProjects.forEach(project => {
        if (project.status === Project.Status.Active) {
          items.push(getProjectDetails(project));
        }
      });
    } else if (perspectiveName === "Tags") {
      // Get tagged tasks - using flattenedTags global
      flattenedTags.forEach(tag => {
        tag.remainingTasks.forEach(task => {
          const taskDetail = getTaskDetails(task);
          if (!items.some(item => item.id === taskDetail.id)) {
            items.push(taskDetail);
          }
        });
      });
    } else if (perspectiveName === "Flagged") {
      // Get flagged items - using flattenedTasks global
      flattenedTasks.forEach(task => {
        if (task.flagged && !task.completed) {
          items.push(getTaskDetails(task));
        }
      });
    } else {
      // For other perspectives, try to get selected or visible items
      if (selectedTasks.length > 0) {
        selectedTasks.forEach(task => {
          items.push(getTaskDetails(task));
        });
      }
      if (selectedProjects.length > 0) {
        selectedProjects.forEach(project => {
          items.push(getProjectDetails(project));
        });
      }
      
      // If no selection, get some available tasks
      if (items.length === 0) {
        const availableTasks = flattenedTasks.filter(task => 
          task.taskStatus === Task.Status.Available && !task.completed
        );
        availableTasks.slice(0, 100).forEach(task => {
          items.push(getTaskDetails(task));
        });
      }
    }
    
    return JSON.stringify({
      success: true,
      perspectiveName: perspectiveName,
      items: items.slice(0, 100) // Limit to 100 items by default
    });
    
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})()