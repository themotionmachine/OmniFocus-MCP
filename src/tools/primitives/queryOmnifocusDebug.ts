import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { writeSecureTempFile } from '../../utils/secureTempFile.js';

/**
 * Debug version of queryOmnifocus that returns raw field information
 * Useful for understanding what fields are available in OmniFocus
 */
export async function queryOmnifocusDebug(entity: 'task' | 'project' | 'folder'): Promise<unknown> {
  const script = `
    (() => {
      try {
        // Get first item of the requested type
        let item;
        const entityType = "${entity}";

        if (entityType === "task") {
          item = flattenedTasks[0];
        } else if (entityType === "project") {
          item = flattenedProjects[0];
        } else if (entityType === "folder") {
          item = flattenedFolders[0];
        }

        if (!item) {
          return JSON.stringify({ error: "No items found" });
        }

        // Get all properties of the item
        const properties = {};
        const skipProps = ['constructor', 'toString', 'valueOf'];

        for (let prop in item) {
          if (skipProps.includes(prop)) continue;

          try {
            const value = item[prop];
            const valueType = typeof value;

            if (value === null) {
              properties[prop] = { type: 'null', value: null };
            } else if (value === undefined) {
              properties[prop] = { type: 'undefined', value: undefined };
            } else if (valueType === 'function') {
              properties[prop] = { type: 'function', value: '[Function]' };
            } else if (value instanceof Date) {
              properties[prop] = { type: 'Date', value: value.toISOString() };
            } else if (Array.isArray(value)) {
              properties[prop] = {
                type: 'Array',
                length: value.length,
                sample: value.length > 0 ? value[0] : null
              };
            } else if (valueType === 'object') {
              // Try to get ID if it's an OmniFocus object
              if (value.id && value.id.primaryKey) {
                properties[prop] = {
                  type: 'OFObject',
                  id: value.id.primaryKey,
                  name: value.name || null
                };
              } else {
                properties[prop] = { type: 'object', keys: Object.keys(value) };
              }
            } else {
              properties[prop] = { type: valueType, value: value };
            }
          } catch (e) {
            properties[prop] = { type: 'error', error: e.toString() };
          }
        }

        // Also check specific expected properties
        const checkProps = [
          'id', 'name', 'note', 'flagged', 'dueDate', 'deferDate',
          'estimatedMinutes', 'modificationDate', 'creationDate',
          'completionDate', 'taskStatus', 'status', 'tasks', 'projects',
          'containingProject', 'parentFolder', 'parent', 'children'
        ];

        const expectedProps = {};
        checkProps.forEach(prop => {
          try {
            const value = item[prop];
            if (value !== undefined) {
              if (value && value.id && value.id.primaryKey) {
                expectedProps[prop] = {
                  exists: true,
                  type: 'OFObject',
                  id: value.id.primaryKey
                };
              } else if (value instanceof Date) {
                expectedProps[prop] = {
                  exists: true,
                  type: 'Date',
                  value: value.toISOString()
                };
              } else if (Array.isArray(value)) {
                expectedProps[prop] = {
                  exists: true,
                  type: 'Array',
                  length: value.length
                };
              } else {
                expectedProps[prop] = {
                  exists: true,
                  type: typeof value,
                  value: value
                };
              }
            } else {
              expectedProps[prop] = { exists: false };
            }
          } catch (e) {
            expectedProps[prop] = { exists: false, error: e.toString() };
          }
        });

        return JSON.stringify({
          entityType: entityType,
          itemName: item.name || 'Unnamed',
          allProperties: properties,
          expectedProperties: expectedProps
        }, null, 2);

      } catch (error) {
        return JSON.stringify({ error: error.toString() });
      }
    })();
  `;

  // Write script to secure temp file and execute
  const tempFile = writeSecureTempFile(script, 'omnifocus_debug', '.js');

  try {
    const result = await executeOmniFocusScript(tempFile.path);
    return result;
  } finally {
    tempFile.cleanup();
  }
}
