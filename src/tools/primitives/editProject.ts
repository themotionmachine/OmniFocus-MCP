import type { EditProjectInput, EditProjectResponse } from '../../contracts/project-tools/index.js';
import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Edit a project's properties using Omni Automation JavaScript.
 *
 * @param params - Edit parameters (id or name to identify, plus update fields)
 * @returns Promise with updated project info, disambiguation error, or standard error
 */
export async function editProject(params: EditProjectInput): Promise<EditProjectResponse> {
  const script = generateEditProjectScript(params);
  const tempFile = writeSecureTempFile(script, 'edit_project', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return JSON.parse(result as string) as EditProjectResponse;
  } finally {
    tempFile.cleanup();
  }
}

/**
 * Generate OmniJS script to edit a project.
 */
function generateEditProjectScript(params: EditProjectInput): string {
  const {
    id,
    name,
    newName,
    note,
    status,
    sequential,
    containsSingletonActions,
    completedByChildren,
    defaultSingletonActionHolder,
    flagged,
    deferDate,
    dueDate,
    reviewInterval,
    shouldUseFloatingTimeZone,
    estimatedMinutes
  } = params;

  // Escape strings for JavaScript
  const escapeForJS = (str: string): string =>
    str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

  // Build the script
  const idCheck = id
    ? `
    try {
      project = Project.byIdentifier("${escapeForJS(id)}");
    } catch (e) {
      // Project.byIdentifier throws if not found
      project = null;
    }
    `
    : '';

  const nameCheck = name
    ? `
    if (!project) {
      var projectName = "${escapeForJS(name)}";
      var matches = flattenedProjects.filter(function(p) { return p.name === projectName; });
      if (matches.length === 0) {
        return JSON.stringify({ success: false, error: "Project '" + projectName + "' not found" });
      }
      if (matches.length > 1) {
        var matchingIds = matches.map(function(p) { return p.id.primaryKey; });
        return JSON.stringify({
          success: false,
          error: "Ambiguous project name '" + projectName + "'. Found " + matches.length + " matches.",
          code: "DISAMBIGUATION_REQUIRED",
          matchingIds: matchingIds
        });
      }
      project = matches[0];
    }
    `
    : '';

  // Name update
  const nameUpdate = newName !== undefined ? `project.name = "${escapeForJS(newName)}";` : '';

  // Note update
  const noteUpdate = note !== undefined ? `project.note = "${escapeForJS(note)}";` : '';

  // Status mapping
  const statusUpdate =
    status !== undefined
      ? `
    if ("${status}" === "Active") {
      project.status = Project.Status.Active;
    } else if ("${status}" === "OnHold") {
      project.status = Project.Status.OnHold;
    } else if ("${status}" === "Done") {
      project.status = Project.Status.Done;
    } else if ("${status}" === "Dropped") {
      project.status = Project.Status.Dropped;
    }
  `
      : '';

  // Project type updates with auto-clear logic
  // If sequential=true, clear containsSingletonActions (auto-clear)
  // If containsSingletonActions=true, clear sequential (auto-clear)
  // Setting to false does NOT trigger auto-clear
  let typeUpdates = '';

  // Process sequential first
  if (sequential === true) {
    typeUpdates += `
    project.sequential = true;
    project.containsSingletonActions = false; // auto-clear
  `;
  } else if (sequential === false) {
    typeUpdates += `
    project.sequential = false;
  `;
  }

  // Process containsSingletonActions second (wins if both true)
  if (containsSingletonActions === true) {
    typeUpdates += `
    project.containsSingletonActions = true;
    project.sequential = false; // auto-clear
  `;
  } else if (containsSingletonActions === false) {
    typeUpdates += `
    project.containsSingletonActions = false;
  `;
  }

  // Boolean property updates
  const completedByChildrenUpdate =
    completedByChildren !== undefined
      ? `project.completedByChildren = ${completedByChildren};`
      : '';
  const defaultSingletonActionHolderUpdate =
    defaultSingletonActionHolder !== undefined
      ? `project.defaultSingletonActionHolder = ${defaultSingletonActionHolder};`
      : '';
  const flaggedUpdate = flagged !== undefined ? `project.flagged = ${flagged};` : '';
  const shouldUseFloatingTimeZoneUpdate =
    shouldUseFloatingTimeZone !== undefined
      ? `project.shouldUseFloatingTimeZone = ${shouldUseFloatingTimeZone};`
      : '';

  // Date updates (null to clear, ISO 8601 string to set)
  let deferDateUpdate = '';
  if (deferDate !== undefined) {
    if (deferDate === null) {
      deferDateUpdate = 'project.deferDate = null;';
    } else {
      deferDateUpdate = `project.deferDate = new Date("${escapeForJS(deferDate)}");`;
    }
  }

  let dueDateUpdate = '';
  if (dueDate !== undefined) {
    if (dueDate === null) {
      dueDateUpdate = 'project.dueDate = null;';
    } else {
      dueDateUpdate = `project.dueDate = new Date("${escapeForJS(dueDate)}");`;
    }
  }

  // Review interval update (null to clear, object to set)
  let reviewIntervalUpdate = '';
  if (reviewInterval !== undefined) {
    if (reviewInterval === null) {
      reviewIntervalUpdate = 'project.reviewInterval = null;';
    } else {
      // Map unit names: 'days' -> 'Day', 'weeks' -> 'Week', etc.
      const unitMap: Record<string, string> = {
        days: 'Day',
        weeks: 'Week',
        months: 'Month',
        years: 'Year'
      };
      const unitValue = unitMap[reviewInterval.unit] || 'Day';
      reviewIntervalUpdate = `project.reviewInterval = { steps: ${reviewInterval.steps}, unit: ReviewInterval.Unit.${unitValue} };`;
    }
  }

  // Estimated minutes update (null to clear, number to set)
  let estimatedMinutesUpdate = '';
  if (estimatedMinutes !== undefined) {
    if (estimatedMinutes === null) {
      estimatedMinutesUpdate = 'project.estimatedMinutes = null;';
    } else {
      estimatedMinutesUpdate = `project.estimatedMinutes = ${estimatedMinutes};`;
    }
  }

  return `(function() {
  try {
    var project = null;
    ${idCheck}
    ${nameCheck}

    if (!project) {
      return JSON.stringify({ success: false, error: "Project not found" });
    }

    // Apply updates
    ${nameUpdate}
    ${noteUpdate}
    ${statusUpdate}
    ${typeUpdates}
    ${completedByChildrenUpdate}
    ${defaultSingletonActionHolderUpdate}
    ${flaggedUpdate}
    ${deferDateUpdate}
    ${dueDateUpdate}
    ${reviewIntervalUpdate}
    ${shouldUseFloatingTimeZoneUpdate}
    ${estimatedMinutesUpdate}

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || String(e) });
  }
})();`;
}
