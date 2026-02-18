import { z } from 'zod';
import { listTags, TagInfo } from '../primitives/listTags.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  includeDropped: z.boolean().optional().describe("Include dropped/inactive tags. Default: false")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    const result = await listTags({
      includeDropped: args.includeDropped ?? false
    });

    if (result.success) {
      const tags = result.tags || [];

      if (tags.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: "No tags found."
          }]
        };
      }

      // Separate top-level tags from nested tags
      const topLevel = tags.filter(t => !t.parentTagID);
      const nested = tags.filter(t => t.parentTagID);

      // Group nested tags by parent ID
      const childrenByParent = new Map<string, TagInfo[]>();
      nested.forEach(t => {
        const parentId = t.parentTagID!;
        if (!childrenByParent.has(parentId)) {
          childrenByParent.set(parentId, []);
        }
        childrenByParent.get(parentId)!.push(t);
      });

      let output = `## Tags (${tags.length})\n\n`;

      topLevel.forEach(tag => {
        output += formatTag(tag, '');
        const children = childrenByParent.get(tag.id);
        if (children) {
          children.forEach(child => {
            output += formatTag(child, '  ');
          });
        }
      });

      // Handle orphaned nested tags (parent might be dropped/filtered out)
      const renderedParents = new Set(topLevel.map(t => t.id));
      childrenByParent.forEach((children, parentId) => {
        if (!renderedParents.has(parentId)) {
          children.forEach(child => {
            output += formatTag(child, '');
          });
        }
      });

      return {
        content: [{
          type: "text" as const,
          text: output
        }]
      };
    } else {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to list tags: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Error listing tags: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error listing tags: ${error.message}`
      }],
      isError: true
    };
  }
}

export function formatTag(tag: TagInfo, indent: string): string {
  const status = tag.active ? '' : ' (inactive)';
  const tasks = tag.taskCount > 0 ? ` [${tag.taskCount} tasks]` : '';
  return `${indent}- **${tag.name}**${status}${tasks} (id: ${tag.id})\n`;
}
