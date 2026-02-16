// OmniJS script to list all tags in OmniFocus
(() => {
  try {
    const tags = [];

    // Build a parent name lookup for resolving parentTagID → parentName
    const parentNameMap = {};
    flattenedTags.forEach(tag => {
      parentNameMap[tag.id.primaryKey] = tag.name;
    });

    flattenedTags.forEach(tag => {
      try {
        const tagId = tag.id.primaryKey;
        const parentTagID = tag.parent ? tag.parent.id.primaryKey : null;

        // Count remaining (non-completed, non-dropped) tasks for this tag
        let taskCount = 0;
        try {
          taskCount = tag.remainingTasks.length;
        } catch (e) {
          // Fallback: count tasks manually
          try {
            taskCount = tag.tasks.filter(t =>
              t.taskStatus !== Task.Status.Completed &&
              t.taskStatus !== Task.Status.Dropped
            ).length;
          } catch (e2) {
            taskCount = 0;
          }
        }

        tags.push({
          id: tagId,
          name: tag.name,
          parentTagID: parentTagID,
          parentName: parentTagID ? (parentNameMap[parentTagID] || null) : null,
          active: tag.active,
          allowsNextAction: tag.allowsNextAction,
          taskCount: taskCount
        });
      } catch (tagError) {
        // Skip tags that error during processing
      }
    });

    return JSON.stringify({
      success: true,
      tags: tags
    });

  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.toString()
    });
  }
})()