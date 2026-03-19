import {
  type SetProjectTypeInput,
  type SetProjectTypeResponse,
  SetProjectTypeResponseSchema
} from '../../contracts/status-tools/set-project-type.js';
import { escapeForJS } from '../../utils/escapeForJS.js';
import { executeOmniJS } from '../../utils/scriptExecution.js';

/**
 * Set a project's type to sequential, parallel, or single-actions.
 *
 * Handles mutual exclusion automatically:
 * - 'sequential'     → sequential=true,  containsSingletonActions=false
 * - 'parallel'       → sequential=false, containsSingletonActions=false
 * - 'single-actions' → containsSingletonActions=true, sequential=false
 *
 * @param params - Input parameters (id or name, and projectType)
 * @returns Promise resolving to success or error response
 */
export async function setProjectType(params: SetProjectTypeInput): Promise<SetProjectTypeResponse> {
  const script = generateSetProjectTypeScript(params);
  const result = await executeOmniJS(script);
  return SetProjectTypeResponseSchema.parse(result);
}

/**
 * Generate OmniJS script to set a project's type.
 * Exported for manual testing in OmniFocus Script Editor.
 */
export function generateSetProjectTypeScript(params: SetProjectTypeInput): string {
  const { id, name, projectType } = params;

  const escapedId = id ? escapeForJS(id) : null;
  const escapedName = name ? escapeForJS(name) : null;
  const escapedProjectType = escapeForJS(projectType);

  const lookupBlock = escapedId
    ? `
    // Lookup by ID (takes precedence)
    project = Project.byIdentifier("${escapedId}");
    if (!project) {
      return JSON.stringify({
        success: false,
        error: "Project '${escapedId}' not found"
      });
    }`
    : `
    // Lookup by name
    var matches = flattenedProjects.filter(function(p) {
      return p.name === "${escapedName}";
    });

    if (matches.length === 0) {
      return JSON.stringify({
        success: false,
        error: "Project '${escapedName}' not found"
      });
    }

    if (matches.length > 1) {
      var ids = matches.map(function(p) {
        return p.id.primaryKey;
      });
      return JSON.stringify({
        success: false,
        error: "Multiple projects match '${escapedName}'",
        code: 'DISAMBIGUATION_REQUIRED',
        matchingIds: ids
      });
    }

    project = matches[0];`;

  return `(function() {
  try {
    var project = null;
${lookupBlock}

    var projectType = "${escapedProjectType}";
    switch (projectType) {
      case 'sequential':
        project.sequential = true;
        project.containsSingletonActions = false;
        break;
      case 'parallel':
        project.sequential = false;
        project.containsSingletonActions = false;
        break;
      case 'single-actions':
        project.containsSingletonActions = true;
        project.sequential = false;
        break;
    }

    return JSON.stringify({
      success: true,
      id: project.id.primaryKey,
      name: project.name,
      projectType: projectType,
      sequential: project.sequential,
      containsSingletonActions: project.containsSingletonActions
    });
  } catch (e) {
    return JSON.stringify({
      success: false,
      error: e.message || String(e)
    });
  }
})();`;
}
