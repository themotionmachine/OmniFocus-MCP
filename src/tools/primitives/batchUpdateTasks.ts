import type {
  BatchUpdateTasksInput,
  BatchUpdateTasksResponse
} from '../../contracts/bulk-tools/batch-update-tasks.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Batch-update properties on 1-100 tasks in OmniFocus.
 *
 * All specified properties are applied uniformly to all tasks.
 * Tag removals are processed before additions (FR-014).
 * plannedDate/clearPlannedDate require OmniFocus v4.7+ (version-gated at runtime).
 * note is appended to existing content.
 */
export async function batchUpdateTasks(
  params: BatchUpdateTasksInput
): Promise<BatchUpdateTasksResponse> {
  const script = generateBatchUpdateTasksScript(params);
  const result = await executeOmniJS(script);
  return result as BatchUpdateTasksResponse;
}

/**
 * Generate OmniJS script to batch-update task properties.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateBatchUpdateTasksScript(params: BatchUpdateTasksInput): string {
  const { items, properties } = params;

  const itemIdentifiers = items.map((item) => ({
    id: item.id ?? '',
    name: item.name ?? ''
  }));

  const props = {
    flagged: properties.flagged,
    dueDate: properties.dueDate ?? null,
    clearDueDate: properties.clearDueDate === true,
    deferDate: properties.deferDate ?? null,
    clearDeferDate: properties.clearDeferDate === true,
    estimatedMinutes: properties.estimatedMinutes ?? null,
    clearEstimatedMinutes: properties.clearEstimatedMinutes === true,
    plannedDate: properties.plannedDate ?? null,
    clearPlannedDate: properties.clearPlannedDate === true,
    addTags: properties.addTags ?? [],
    removeTags: properties.removeTags ?? [],
    note: properties.note ?? null
  };

  const hasVersionGated = props.plannedDate !== null || props.clearPlannedDate;

  return `(function() {
  try {
    var itemIdentifiers = ${JSON.stringify(itemIdentifiers)};
    var props = ${JSON.stringify(props)};

    // --- Version check for v4.7+ features ---
    var hasVersionGated = ${JSON.stringify(hasVersionGated)};
    var isV47 = app.userVersion.atLeast(new Version("4.7"));

    // --- Resolve tags once before item loop (performance) ---
    var addTagObjects = [];
    var removeTagObjects = [];

    for (var ti = 0; ti < props.addTags.length; ti++) {
      var tagRef = props.addTags[ti];
      var tagObj = Tag.byIdentifier(tagRef) || flattenedTags.byName(tagRef);
      if (!tagObj) {
        // Return error — tag not resolvable before loop
        // We continue and report per-item
        addTagObjects.push({ ref: tagRef, tag: null });
      } else {
        addTagObjects.push({ ref: tagRef, tag: tagObj });
      }
    }

    for (var ri = 0; ri < props.removeTags.length; ri++) {
      var rTagRef = props.removeTags[ri];
      var rTagObj = Tag.byIdentifier(rTagRef) || flattenedTags.byName(rTagRef);
      if (!rTagObj) {
        removeTagObjects.push({ ref: rTagRef, tag: null });
      } else {
        removeTagObjects.push({ ref: rTagRef, tag: rTagObj });
      }
    }

    // --- Per-item loop ---
    var results = [];
    var succeeded = 0;
    var failed = 0;

    itemIdentifiers.forEach(function(identifier) {
      var result = {
        itemId: identifier.id || '',
        itemName: identifier.name || '',
        itemType: 'task',
        success: false
      };

      try {
        var item = null;

        if (identifier.id) {
          item = Task.byIdentifier(identifier.id);
        } else if (identifier.name) {
          var tMatches = flattenedTasks.filter(function(t) { return t.name === identifier.name; });
          if (tMatches.length === 1) {
            item = tMatches[0];
          } else if (tMatches.length > 1) {
            result.error = "Multiple tasks match '" + identifier.name + "'. Use ID for precision.";
            result.code = 'DISAMBIGUATION_REQUIRED';
            result.candidates = tMatches.map(function(t) {
              return { id: t.id.primaryKey, name: t.name, type: 'task' };
            });
            results.push(result);
            failed++;
            return;
          }
        }

        if (!item) {
          result.error = 'Item not found: ' + (identifier.id || identifier.name);
          result.code = 'NOT_FOUND';
          results.push(result);
          failed++;
          return;
        }

        result.itemId = item.id.primaryKey;
        result.itemName = item.name;

        // --- Apply properties ---

        // flagged
        if (props.flagged !== undefined && props.flagged !== null) {
          item.flagged = props.flagged;
        }

        // dueDate / clearDueDate
        if (props.clearDueDate) {
          item.dueDate = null;
        } else if (props.dueDate) {
          item.dueDate = new Date(props.dueDate);
        }

        // deferDate / clearDeferDate
        if (props.clearDeferDate) {
          item.deferDate = null;
        } else if (props.deferDate) {
          item.deferDate = new Date(props.deferDate);
        }

        // estimatedMinutes / clearEstimatedMinutes
        if (props.clearEstimatedMinutes) {
          item.estimatedMinutes = null;
        } else if (props.estimatedMinutes !== null) {
          item.estimatedMinutes = props.estimatedMinutes;
        }

        // plannedDate / clearPlannedDate (v4.7+ only)
        if (props.clearPlannedDate || props.plannedDate !== null) {
          if (!isV47) {
            result.error = 'plannedDate/clearPlannedDate requires OmniFocus 4.7 or later';
            result.code = 'VERSION_NOT_SUPPORTED';
            results.push(result);
            failed++;
            return;
          }
          if (props.clearPlannedDate) {
            item.plannedDate = null;
          } else if (props.plannedDate !== null) {
            item.plannedDate = new Date(props.plannedDate);
          }
        }

        // Tags: removals first (FR-014)
        for (var ri2 = 0; ri2 < removeTagObjects.length; ri2++) {
          var rtEntry = removeTagObjects[ri2];
          if (!rtEntry.tag) {
            result.error = "Tag '" + rtEntry.ref + "' not found";
            result.code = 'TAG_NOT_FOUND';
            results.push(result);
            failed++;
            return;
          }
          item.removeTag(rtEntry.tag);
        }

        // Tags: additions
        for (var ai = 0; ai < addTagObjects.length; ai++) {
          var atEntry = addTagObjects[ai];
          if (!atEntry.tag) {
            result.error = "Tag '" + atEntry.ref + "' not found";
            result.code = 'TAG_NOT_FOUND';
            results.push(result);
            failed++;
            return;
          }
          item.addTag(atEntry.tag);
        }

        // note: append
        if (props.note !== null) {
          var existingNote = item.note || '';
          item.note = existingNote ? existingNote + '\\n' + props.note : props.note;
        }

        result.success = true;
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
