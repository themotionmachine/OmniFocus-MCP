import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { getPerspectiveView } from '../tools/primitives/getPerspectiveView.js';
import { listPerspectives } from '../tools/primitives/listPerspectives.js';
import { Logger } from '../utils/logger.js';

export async function readPerspective(uri: URL, variables: Variables, logger: Logger): Promise<ReadResourceResult> {
  const name = String(variables.name);
  logger.debug("resource:perspective", `Reading perspective: ${name}`);

  const result = await getPerspectiveView({ perspectiveName: name });

  const data = result.success ? result.items ?? [] : { error: result.error };

  return {
    contents: [{
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(data, null, 2)
    }]
  };
}

export async function listAllPerspectives(): Promise<{ uri: string; name: string }[]> {
  const result = await listPerspectives({ includeBuiltIn: true, includeCustom: true });

  if (!result.success || !result.perspectives) return [];

  return result.perspectives.map((p: any) => ({
    uri: `omnifocus://perspective/${encodeURIComponent(p.name)}`,
    name: p.name
  }));
}

export async function completePerspectiveName(value: string): Promise<string[]> {
  const result = await listPerspectives({ includeBuiltIn: true, includeCustom: true });

  if (!result.success || !result.perspectives) return [];

  return result.perspectives
    .map((p: any) => p.name as string)
    .filter((name: string) => name.toLowerCase().includes(value.toLowerCase()));
}
