import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';

/**
 * Generate a folder resource showing its contents and hierarchy
 */
export async function getFolderResource(folderId: string): Promise<string> {
  try {
    // Get all folders to find this one and build path
    const allFoldersResult = await queryOmnifocus({
      entity: 'folders',
      limit: 1000
    });

    const folder = allFoldersResult.items?.find(f => f.id === folderId);

    if (!folder) {
      return `❌ Folder not found: ${folderId}`;
    }

    let output = `📁 ${folder.name}\n\n`;

    // Build path
    if (folder.parentFolderId || folder.parentFolderName) {
      const pathParts = [folder.name];
      let currentId = folder.parentFolderId;

      // Walk up the hierarchy
      while (currentId) {
        const parent = allFoldersResult.items?.find(f => f.id === currentId);
        if (!parent) break;
        pathParts.unshift(parent.name);
        currentId = parent.parentFolderId;
      }

      output += `Path: ${pathParts.join(' → ')}\n`;
    } else {
      output += `Path: Root → ${folder.name}\n`;
    }

    if (folder.parentFolderName) {
      output += `Parent: ${folder.parentFolderName}`;
      if (folder.parentFolderId) {
        output += ` (omnifocus://folder/${folder.parentFolderId})`;
      }
      output += '\n';
    }

    output += '\n';

    // Get subfolders
    const subfoldersResult = await queryOmnifocus({
      entity: 'folders',
      limit: 1000
    });

    const subfolders = subfoldersResult.items?.filter(f => f.parentFolderId === folderId) || [];

    // Get projects in this folder
    const projectsResult = await queryOmnifocus({
      entity: 'projects',
      limit: 1000
    });

    const projects = projectsResult.items?.filter(p => p.folderId === folderId) || [];

    // Show subfolders
    if (subfolders.length > 0) {
      output += `📁 Subfolders (${subfolders.length}):\n`;
      for (const subfolder of subfolders) {
        const count = subfolder.projectCount !== undefined ? ` (${subfolder.projectCount} projects)` : '';
        output += `  • ${subfolder.name}${count}\n`;
        output += `    └─ omnifocus://folder/${subfolder.id}\n`;
      }
      output += '\n';
    }

    // Show projects
    if (projects.length > 0) {
      output += `📋 Projects (${projects.length}):\n`;
      for (const project of projects) {
        const taskCount = project.taskCount !== undefined ? ` (${project.taskCount} tasks)` : '';
        const status = project.status !== 'Active' ? ` [${project.status}]` : '';
        const due = project.dueDate ? ` (due: ${new Date(project.dueDate).toLocaleDateString()})` : '';

        output += `  • ${project.name}${taskCount}${status}${due}\n`;
        output += `    └─ omnifocus://project/${project.id}\n`;
      }
    } else {
      output += `📋 Projects: (none at this level)\n`;
    }

    if (subfolders.length === 0 && projects.length === 0) {
      output += '\n(Empty folder)\n';
    }

    return output;

  } catch (error) {
    return `❌ Error loading folder: ${error}`;
  }
}
