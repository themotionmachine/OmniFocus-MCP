import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';

/**
 * Generate the library resource showing root folders and projects
 */
export async function getLibraryResource(): Promise<string> {
  try {
    // Get root folders
    const foldersResult = await queryOmnifocus({
      entity: 'folders',
      limit: 100
    });

    // Get root projects (projects without a folder)
    const projectsResult = await queryOmnifocus({
      entity: 'projects',
      limit: 100
    });

    // Filter to only root projects (no parent folder)
    const rootProjects = projectsResult.items?.filter(p => !p.folderName && !p.folderId) || [];

    // Count inbox tasks
    const inboxResult = await queryOmnifocus({
      entity: 'tasks',
      filters: { projectName: 'inbox' },
      summary: true
    });

    let output = '📚 OmniFocus Library\n\n';

    // Root folders
    if (foldersResult.items && foldersResult.items.length > 0) {
      output += `📁 Root Folders (${foldersResult.items.length}):\n`;
      for (const folder of foldersResult.items) {
        const count = folder.projectCount !== undefined ? ` (${folder.projectCount} projects)` : '';
        output += `  • ${folder.name}${count}\n`;
        output += `    └─ omnifocus://folder/${folder.id}\n`;
      }
      output += '\n';
    }

    // Root projects
    if (rootProjects.length > 0) {
      output += `📋 Root Projects (${rootProjects.length}):\n`;
      for (const project of rootProjects) {
        const taskCount = project.taskCount !== undefined ? ` (${project.taskCount} tasks)` : '';
        const status = project.status !== 'Active' ? ` [${project.status}]` : '';
        output += `  • ${project.name}${taskCount}${status}\n`;
        output += `    └─ omnifocus://project/${project.id}\n`;
      }
      output += '\n';
    }

    // Inbox
    output += `📥 Inbox: ${inboxResult.count || 0} tasks\n`;
    output += `    └─ omnifocus://inbox\n`;

    return output;

  } catch (error) {
    return `❌ Error loading library: ${error}`;
  }
}
