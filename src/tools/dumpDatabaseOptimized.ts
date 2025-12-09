import type { OmnifocusDatabase } from '../types.js';
import { getCacheManager } from '../utils/cacheManager.js';
import { executeOmniFocusScript } from '../utils/scriptExecution.js';
import { writeSecureTempFile } from '../utils/secureTempFile.js';
import { dumpDatabase as originalDumpDatabase } from './dumpDatabase.js';

/**
 * Optimized version of dumpDatabase that uses caching
 * Falls back to original implementation if caching fails
 */
export async function dumpDatabaseOptimized(options?: {
  forceRefresh?: boolean;
  cacheKey?: string;
}): Promise<OmnifocusDatabase> {
  const cacheManager = getCacheManager({
    ttlSeconds: 300, // 5 minute cache
    useChecksum: true // Validate with database checksum
  });

  const cacheKey = options?.cacheKey || 'full-dump';

  // Check if we should force a refresh
  if (!options?.forceRefresh) {
    const cached = await cacheManager.get(cacheKey);
    if (cached) {
      cacheManager.trackHit();
      console.log(`Cache hit for ${cacheKey}. Stats:`, cacheManager.getStats());
      return cached;
    }
  }

  cacheManager.trackMiss();
  console.log(`Cache miss for ${cacheKey}. Fetching fresh data...`);

  // Fetch fresh data using the original implementation
  const freshData = await originalDumpDatabase();

  // Store in cache for next time
  await cacheManager.set(cacheKey, freshData);

  return freshData;
}

/**
 * Get just database statistics without full dump
 * Much more efficient for overview information
 */
export async function getDatabaseStats(): Promise<{
  taskCount: number;
  activeTaskCount: number;
  projectCount: number;
  activeProjectCount: number;
  folderCount: number;
  tagCount: number;
  overdueCount: number;
  nextActionCount: number;
  flaggedCount: number;
  inboxCount: number;
  lastModified: string;
}> {
  const script = `
    (() => {
      try {
        // Calculate statistics without fetching full data
        const allTasks = flattenedTasks;
        const activeTasks = allTasks.filter(task =>
          task.taskStatus !== Task.Status.Completed &&
          task.taskStatus !== Task.Status.Dropped
        );

        const allProjects = flattenedProjects;
        const activeProjects = allProjects.filter(project =>
          project.status === Project.Status.Active
        );

        // Count specific task statuses
        const overdueCount = activeTasks.filter(task =>
          task.taskStatus === Task.Status.Overdue
        ).length;

        const nextActionCount = activeTasks.filter(task =>
          task.taskStatus === Task.Status.Next
        ).length;

        const flaggedCount = activeTasks.filter(task => task.flagged).length;

        const inboxCount = activeTasks.filter(task => task.inInbox).length;

        // Get latest modification time
        let lastModified = new Date(0);
        allTasks.forEach(task => {
          if (task.modificationDate && task.modificationDate > lastModified) {
            lastModified = task.modificationDate;
          }
        });

        return JSON.stringify({
          taskCount: allTasks.length,
          activeTaskCount: activeTasks.length,
          projectCount: allProjects.length,
          activeProjectCount: activeProjects.length,
          folderCount: flattenedFolders.length,
          tagCount: flattenedTags.filter(tag => tag.active).length,
          overdueCount: overdueCount,
          nextActionCount: nextActionCount,
          flaggedCount: flaggedCount,
          inboxCount: inboxCount,
          lastModified: lastModified.toISOString()
        });

      } catch (error) {
        return JSON.stringify({
          error: "Failed to get database stats: " + error.toString()
        });
      }
    })();
  `;

  // Write script to secure temp file and execute
  const tempFile = writeSecureTempFile(script, 'omnifocus_stats', '.js');

  try {
    const result = (await executeOmniFocusScript(tempFile.path)) as {
      error?: string;
      taskCount: number;
      activeTaskCount: number;
      projectCount: number;
      activeProjectCount: number;
      folderCount: number;
      tagCount: number;
      overdueCount: number;
      nextActionCount: number;
      flaggedCount: number;
      inboxCount: number;
      lastModified: string;
    };

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  } finally {
    tempFile.cleanup();
  }
}

/**
 * Get incremental changes since a specific timestamp
 * Much more efficient for periodic updates
 */
export async function getChangesSince(since: Date): Promise<{
  newTasks: unknown[];
  updatedTasks: unknown[];
  completedTasks: unknown[];
  newProjects: unknown[];
  updatedProjects: unknown[];
}> {
  const script = `
    (() => {
      try {
        const sinceDate = new Date("${since.toISOString()}");

        // Find tasks that changed since the given date
        const allTasks = flattenedTasks;

        const newTasks = allTasks.filter(task =>
          task.creationDate && task.creationDate > sinceDate
        ).map(task => ({
          id: task.id.primaryKey,
          name: task.name,
          creationDate: task.creationDate.toISOString()
        }));

        const updatedTasks = allTasks.filter(task =>
          task.modificationDate &&
          task.modificationDate > sinceDate &&
          task.creationDate &&
          task.creationDate <= sinceDate
        ).map(task => ({
          id: task.id.primaryKey,
          name: task.name,
          modificationDate: task.modificationDate.toISOString()
        }));

        const completedTasks = allTasks.filter(task =>
          task.completionDate &&
          task.completionDate > sinceDate
        ).map(task => ({
          id: task.id.primaryKey,
          name: task.name,
          completionDate: task.completionDate.toISOString()
        }));

        // Find projects that changed
        const allProjects = flattenedProjects;

        const newProjects = allProjects.filter(project =>
          project.creationDate && project.creationDate > sinceDate
        ).map(project => ({
          id: project.id.primaryKey,
          name: project.name,
          creationDate: project.creationDate.toISOString()
        }));

        const updatedProjects = allProjects.filter(project =>
          project.modificationDate &&
          project.modificationDate > sinceDate &&
          project.creationDate &&
          project.creationDate <= sinceDate
        ).map(project => ({
          id: project.id.primaryKey,
          name: project.name,
          modificationDate: project.modificationDate.toISOString()
        }));

        return JSON.stringify({
          newTasks: newTasks,
          updatedTasks: updatedTasks,
          completedTasks: completedTasks,
          newProjects: newProjects,
          updatedProjects: updatedProjects
        });

      } catch (error) {
        return JSON.stringify({
          error: "Failed to get changes: " + error.toString()
        });
      }
    })();
  `;

  // Write script to secure temp file and execute
  const tempFile = writeSecureTempFile(script, 'omnifocus_changes', '.js');

  try {
    const result = (await executeOmniFocusScript(tempFile.path)) as {
      error?: string;
      newTasks: unknown[];
      updatedTasks: unknown[];
      completedTasks: unknown[];
      newProjects: unknown[];
      updatedProjects: unknown[];
    };

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  } finally {
    tempFile.cleanup();
  }
}
