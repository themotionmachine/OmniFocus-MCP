/**
 * Generate the OmniJS `resolveItem` function body for embedding in scripts.
 *
 * Centralises the 4-type resolver (Project → Folder → Task → Tag) so that
 * lookup-order changes only need to happen here.
 *
 * @param options.includeNote - When true, resolver returns a `note` property
 *   (used by expandNotes / collapseNotes). Folders and tags return `''`.
 */
export function generateResolveItemSnippet(options?: { includeNote?: boolean }): string {
  const n = options?.includeNote ?? false;

  // Build the return-object suffix for each type
  const projectFields = n
    ? 'id: project.id.primaryKey, name: project.name, note: project.note'
    : 'id: project.id.primaryKey, name: project.name';
  const folderFields = n
    ? "id: folder.id.primaryKey, name: folder.name, note: ''"
    : 'id: folder.id.primaryKey, name: folder.name';
  const taskFields = n
    ? 'id: task.id.primaryKey, name: task.name, note: task.note'
    : 'id: task.id.primaryKey, name: task.name';
  const tagFields = n
    ? "id: tag.id.primaryKey, name: tag.name, note: ''"
    : 'id: tag.id.primaryKey, name: tag.name';

  // Name-match fields
  const pMatch = n
    ? 'id: p.id.primaryKey, name: p.name, note: p.note'
    : 'id: p.id.primaryKey, name: p.name';
  const fMatch = n
    ? "id: f.id.primaryKey, name: f.name, note: ''"
    : 'id: f.id.primaryKey, name: f.name';
  const tMatch = n
    ? 'id: t.id.primaryKey, name: t.name, note: t.note'
    : 'id: t.id.primaryKey, name: t.name';
  const gMatch = n
    ? "id: t.id.primaryKey, name: t.name, note: ''"
    : 'id: t.id.primaryKey, name: t.name';

  return `    function resolveItem(identifier) {
      if (identifier.id) {
        // Try project/folder BEFORE task — every project has a root task
        // with the same ID, so Task.byIdentifier would match first and
        // cause NODE_NOT_FOUND for valid content-tree targets.
        var project = Project.byIdentifier(identifier.id);
        if (project) return { object: project, type: 'project', ${projectFields} };
        var folder = Folder.byIdentifier(identifier.id);
        if (folder) return { object: folder, type: 'folder', ${folderFields} };
        var task = Task.byIdentifier(identifier.id);
        if (task) return { object: task, type: 'task', ${taskFields} };
        var tag = Tag.byIdentifier(identifier.id);
        if (tag) return { object: tag, type: 'tag', ${tagFields} };
        return null;
      }
      if (identifier.name) {
        var matches = [];
        flattenedProjects.forEach(function(p) { if (p.name === identifier.name) matches.push({ object: p, type: 'project', ${pMatch} }); });
        flattenedFolders.forEach(function(f) { if (f.name === identifier.name) matches.push({ object: f, type: 'folder', ${fMatch} }); });
        flattenedTasks.forEach(function(t) { if (t.name === identifier.name) matches.push({ object: t, type: 'task', ${tMatch} }); });
        flattenedTags.forEach(function(t) { if (t.name === identifier.name) matches.push({ object: t, type: 'tag', ${gMatch} }); });
        if (matches.length === 0) return null;
        if (matches.length === 1) return matches[0];
        return { disambiguation: true, candidates: matches };
      }
      return null;
    }`;
}
