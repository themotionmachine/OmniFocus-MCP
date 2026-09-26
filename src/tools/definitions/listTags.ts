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

      return {
        content: [{
          type: "text" as const,
          text: renderTagTree(tags)
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

/**
 * Render tags as an indented tree, at any depth (#136).
 *
 * This used to render exactly one level: root tags, then their direct children.
 * A grandchild's parent is not a root tag, so it fell through to the
 * "orphan" branch and printed at root with no indent. Re-nesting tags two
 * levels down therefore left `list_tags` output byte-identical, which read as
 * a stale cache even though the underlying data was correct.
 *
 * A tag whose parent is absent from `tags` (e.g. filtered out as inactive) is
 * rendered at root along with its own subtree, so nothing is dropped.
 */
export function renderTagTree(tags: TagInfo[]): string {
  const present = new Set(tags.map(t => t.id));
  const childrenByParent = new Map<string, TagInfo[]>();
  const roots: TagInfo[] = [];

  for (const tag of tags) {
    if (tag.parentTagID && present.has(tag.parentTagID) && tag.parentTagID !== tag.id) {
      const siblings = childrenByParent.get(tag.parentTagID) ?? [];
      siblings.push(tag);
      childrenByParent.set(tag.parentTagID, siblings);
    } else {
      roots.push(tag);
    }
  }

  let output = `## Tags (${tags.length})\n\n`;
  const rendered = new Set<string>();

  const renderSubtree = (tag: TagInfo, depth: number): void => {
    if (rendered.has(tag.id)) return; // defensive: never loop on a malformed cycle
    rendered.add(tag.id);
    output += formatTag(tag, '  '.repeat(depth));
    for (const child of childrenByParent.get(tag.id) ?? []) {
      renderSubtree(child, depth + 1);
    }
  };

  roots.forEach(tag => renderSubtree(tag, 0));

  // Only reachable if the parent links form a cycle; still show every tag.
  tags.forEach(tag => renderSubtree(tag, 0));

  return output;
}

function formatTag(tag: TagInfo, indent: string): string {
  const status = tag.active ? '' : ' (inactive)';
  const tasks = tag.taskCount > 0 ? ` [${tag.taskCount} tasks]` : '';
  return `${indent}- **${tag.name}**${status}${tasks} (id: ${tag.id})\n`;
}
