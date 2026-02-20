import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';
import { Logger } from '../utils/logger.js';

export async function readProject(uri: URL, variables: Variables, logger: Logger): Promise<ReadResourceResult> {
  const name = String(variables.name);
  logger.debug("resource:project", `Reading project: ${name}`);

  const result = await queryOmnifocus({
    entity: 'tasks',
    filters: { projectName: name },
    fields: ['id', 'name', 'flagged', 'dueDate', 'deferDate', 'taskStatus', 'tagNames', 'parentId', 'note', 'estimatedMinutes']
  });

  const data = result.success ? result.items ?? [] : { error: result.error };

  return {
    contents: [{
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(data, null, 2)
    }]
  };
}

export async function listProjects(): Promise<{ uri: string; name: string }[]> {
  const result = await queryOmnifocus({
    entity: 'projects',
    fields: ['name']
  });

  if (!result.success || !result.items) return [];

  return result.items.map((p: any) => ({
    uri: `omnifocus://project/${encodeURIComponent(p.name)}`,
    name: p.name
  }));
}

export async function completeProjectName(value: string): Promise<string[]> {
  const result = await queryOmnifocus({
    entity: 'projects',
    fields: ['name']
  });

  if (!result.success || !result.items) return [];

  return result.items
    .map((p: any) => p.name as string)
    .filter((name: string) => name.toLowerCase().includes(value.toLowerCase()));
}
