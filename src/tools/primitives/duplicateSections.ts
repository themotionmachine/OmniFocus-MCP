import type {
  DuplicateSectionsInput,
  DuplicateSectionsResponse
} from '../../contracts/bulk-tools/duplicate-sections.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Duplicate 1-100 sections (folders and/or projects) to a new location in OmniFocus.
 *
 * Copies preserve all contents: child projects, tasks, settings, review intervals.
 * Response includes newId and newName for each created copy (FR-017).
 * Item resolution probes Folder.byIdentifier first, then Project.byIdentifier (AD-14).
 */
export async function duplicateSections(
  params: DuplicateSectionsInput
): Promise<DuplicateSectionsResponse> {
  const script = generateDuplicateSectionsScript(params);
  const result = await executeOmniJS(script);
  return result as DuplicateSectionsResponse;
}

/**
 * Generate OmniJS script to duplicate sections to a target location.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateDuplicateSectionsScript(params: DuplicateSectionsInput): string {
  const { items, position } = params;

  const itemIdentifiers = items.map((item) => ({
    id: item.id ?? '',
    name: item.name ?? ''
  }));

  const pos = {
    placement: position.placement,
    relativeTo: position.relativeTo ?? ''
  };

  return `(function() {
  try {
    var itemIdentifiers = ${JSON.stringify(itemIdentifiers)};
    var pos = ${JSON.stringify(pos)};

    // --- Target position resolution (AD-11, AD-15) ---
    var targetPosition = null;

    if (pos.placement === 'before' || pos.placement === 'after') {
      // Relative placement: resolve sibling
      var sibling = Folder.byIdentifier(pos.relativeTo) || Project.byIdentifier(pos.relativeTo);
      if (!sibling) {
        return JSON.stringify({ success: false, error: "Relative section '" + pos.relativeTo + "' not found", code: 'RELATIVE_TARGET_NOT_FOUND' });
      }
      targetPosition = sibling[pos.placement === 'before' ? 'before' : 'after'];
    } else if (pos.relativeTo) {
      // beginning/ending within a folder
      var targetFolder = Folder.byIdentifier(pos.relativeTo);
      if (!targetFolder) {
        return JSON.stringify({ success: false, error: "Folder '" + pos.relativeTo + "' not found", code: 'TARGET_NOT_FOUND' });
      }
      targetPosition = targetFolder[pos.placement === 'beginning' ? 'beginning' : 'ending'];
    } else {
      // beginning/ending at library root
      targetPosition = library[pos.placement === 'beginning' ? 'beginning' : 'ending'];
    }

    // --- Per-item loop ---
    var results = [];
    var succeeded = 0;
    var failed = 0;

    itemIdentifiers.forEach(function(identifier) {
      var result = {
        itemId: identifier.id || '',
        itemName: identifier.name || '',
        itemType: 'folder',
        success: false
      };

      try {
        var item = null;

        if (identifier.id) {
          // Folder-then-Project probe (AD-14)
          item = Folder.byIdentifier(identifier.id);
          if (item) {
            result.itemType = 'folder';
          } else {
            item = Project.byIdentifier(identifier.id);
            if (item) {
              result.itemType = 'project';
            }
          }
        } else if (identifier.name) {
          var folderMatches = flattenedFolders.filter(function(f) { return f.name === identifier.name; });
          var projectMatches = flattenedProjects.filter(function(p) { return p.name === identifier.name; });
          var allMatches = folderMatches.map(function(f) { return { item: f, type: 'folder' }; })
            .concat(projectMatches.map(function(p) { return { item: p, type: 'project' }; }));

          if (allMatches.length === 1) {
            item = allMatches[0].item;
            result.itemType = allMatches[0].type;
          } else if (allMatches.length > 1) {
            result.error = "Multiple sections match '" + identifier.name + "'. Use ID for precision.";
            result.code = 'DISAMBIGUATION_REQUIRED';
            result.candidates = allMatches.map(function(m) {
              return { id: m.item.id.primaryKey, name: m.item.name, type: m.type };
            });
            results.push(result);
            failed++;
            return;
          }
        }

        if (!item) {
          result.error = 'Section not found: ' + (identifier.id || identifier.name);
          result.code = 'NOT_FOUND';
          results.push(result);
          failed++;
          return;
        }

        result.itemId = item.id.primaryKey;
        result.itemName = item.name;

        // Perform the duplication (AD-01)
        var copies = duplicateSections([item], targetPosition);
        var newCopy = copies[0];

        result.success = true;
        result.newId = newCopy.id.primaryKey;
        result.newName = newCopy.name;
        results.push(result);
        succeeded++;
      } catch (e) {
        result.error = e.message || String(e);
        result.code = 'OPERATION_FAILED';
        results.push(result);
        failed++;
      }
    });

    return JSON.stringify({
      success: true,
      results: results,
      summary: { total: itemIdentifiers.length, succeeded: succeeded, failed: failed }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
