import type {
  ParsedItem,
  ValidationSummary,
  ValidationWarning
} from '../../contracts/taskpaper-tools/shared/validation-types.js';
import type { ValidateTransportTextResponse } from '../../contracts/taskpaper-tools/validate-transport-text.js';
import { RECOGNIZED_TOKENS } from './taskpaper/token-map.js';

interface ValidateParams {
  text: string;
}

/**
 * Validate transport text without executing in OmniFocus.
 * Pure TypeScript parser -- no OmniJS, no side effects.
 *
 * @param params - Input with text to validate
 * @returns Structured validation result with parsed items, summary, and warnings
 */
export function validateTransportText(params: ValidateParams): ValidateTransportTextResponse {
  const { text } = params;
  const lines = text.split('\n');
  const warnings: ValidationWarning[] = [];
  const rootItems: ParsedItem[] = [];
  const allTags = new Set<string>();
  let taskCount = 0;
  let projectCount = 0;
  let maxDepth = 0;

  // Stack for building hierarchy: { item, depth }
  const stack: Array<{ item: ParsedItem; depth: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const lineNumber = i + 1;

    // Skip blank lines
    if (rawLine.trim() === '') continue;

    // Measure indentation (tab count)
    let tabDepth = 0;
    let pos = 0;
    let hasSpaceIndent = false;

    while (pos < rawLine.length) {
      if (rawLine[pos] === '\t') {
        tabDepth++;
        pos++;
      } else if (rawLine[pos] === ' ') {
        hasSpaceIndent = true;
        pos++;
      } else {
        break;
      }
    }

    if (hasSpaceIndent) {
      warnings.push({
        line: lineNumber,
        message: 'Line uses space indentation; tabs are expected for hierarchy',
        content: rawLine.trimEnd()
      });
    }

    const content = rawLine.substring(pos);

    // Determine line type
    const isTask = content.startsWith('- ');
    const isProject = !isTask && content.endsWith(':') && !content.startsWith('-');

    if (!isTask && !isProject) {
      // Unrecognized line
      warnings.push({
        line: lineNumber,
        message: 'Unrecognized line format (expected "- task" or "Project:")',
        content: rawLine.trimEnd()
      });
      continue;
    }

    // Extract the content to parse
    let itemContent: string;
    let itemType: 'task' | 'project';

    if (isTask) {
      itemContent = content.substring(2); // Remove "- "
      itemType = 'task';
      taskCount++;
    } else {
      itemContent = content.substring(0, content.length - 1); // Remove trailing ":"
      itemType = 'project';
      projectCount++;
    }

    if (tabDepth > maxDepth) {
      maxDepth = tabDepth;
    }

    // Extract metadata from item content
    const parsed = parseItemContent(itemContent);

    // Track unique tags
    for (const tag of parsed.tags) {
      allTags.add(tag);
    }

    // Check for unrecognized @ tokens
    checkUnrecognizedTokens(itemContent, lineNumber, rawLine.trimEnd(), warnings);

    const item: ParsedItem = {
      name: parsed.name,
      type: itemType,
      depth: tabDepth,
      tags: parsed.tags,
      dueDate: parsed.dueDate,
      deferDate: parsed.deferDate,
      doneDate: parsed.doneDate,
      flagged: parsed.flagged,
      estimate: parsed.estimate,
      note: parsed.note,
      projectName: parsed.projectName,
      children: []
    };

    // Insert into hierarchy based on depth
    // Pop stack entries that are at the same or deeper depth
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top && top.depth >= tabDepth) {
        stack.pop();
      } else {
        break;
      }
    }

    if (stack.length === 0) {
      rootItems.push(item);
    } else {
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.item.children.push(item);
      }
    }

    stack.push({ item, depth: tabDepth });
  }

  const summary: ValidationSummary = {
    tasks: taskCount,
    projects: projectCount,
    tags: allTags.size,
    maxDepth
  };

  return {
    success: true,
    items: rootItems,
    summary,
    warnings
  };
}

interface ParsedContent {
  name: string;
  tags: string[];
  dueDate: string | null;
  deferDate: string | null;
  doneDate: string | null;
  flagged: boolean;
  estimate: string | null;
  note: string | null;
  projectName: string | null;
}

function parseItemContent(content: string): ParsedContent {
  let remaining = content;
  let note: string | null = null;
  let projectName: string | null = null;

  // Extract note (// at end) - must be done before other parsing
  const noteMatch = remaining.match(/\s*\/\/(.*)$/);
  if (noteMatch && noteMatch[1] !== undefined) {
    note = noteMatch[1].trim();
    remaining = remaining.substring(0, remaining.length - noteMatch[0].length);
  }

  // Extract ::ProjectName
  const projectMatch = remaining.match(/\s*::(.+?)(?=\s+@|\s*$)/);
  if (projectMatch && projectMatch[1] !== undefined) {
    projectName = projectMatch[1].trim();
    remaining = remaining.replace(projectMatch[0], '');
  }

  // Extract @tags(...)
  const tags: string[] = [];
  const tagsMatch = remaining.match(/@tags\(([^)]*)\)/);
  if (tagsMatch && tagsMatch[1] !== undefined) {
    const tagList = tagsMatch[1]
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    tags.push(...tagList);
    remaining = remaining.replace(tagsMatch[0], '');
  }

  // Extract @due(date)
  let dueDate: string | null = null;
  const dueMatch = remaining.match(/@due\(([^)]*)\)/);
  if (dueMatch && dueMatch[1] !== undefined) {
    dueDate = dueMatch[1].trim();
    remaining = remaining.replace(dueMatch[0], '');
  }

  // Extract @defer(date)
  let deferDate: string | null = null;
  const deferMatch = remaining.match(/@defer\(([^)]*)\)/);
  if (deferMatch && deferMatch[1] !== undefined) {
    deferDate = deferMatch[1].trim();
    remaining = remaining.replace(deferMatch[0], '');
  }

  // Extract @done(date)
  let doneDate: string | null = null;
  const doneMatch = remaining.match(/@done\(([^)]*)\)/);
  if (doneMatch && doneMatch[1] !== undefined) {
    doneDate = doneMatch[1].trim();
    remaining = remaining.replace(doneMatch[0], '');
  }

  // Extract @estimate(duration)
  let estimate: string | null = null;
  const estimateMatch = remaining.match(/@estimate\(([^)]*)\)/);
  if (estimateMatch && estimateMatch[1] !== undefined) {
    estimate = estimateMatch[1].trim();
    remaining = remaining.replace(estimateMatch[0], '');
  }

  // Extract @flagged
  const flagged = /@flagged(?:\s|$)/.test(remaining);
  if (flagged) {
    remaining = remaining.replace(/@flagged/, '');
  }

  // Remove other recognized tokens with values (@autodone, @parallel, @repeat-method, @repeat-rule)
  remaining = remaining.replace(/@autodone\([^)]*\)/g, '');
  remaining = remaining.replace(/@parallel\([^)]*\)/g, '');
  remaining = remaining.replace(/@repeat-method\([^)]*\)/g, '');
  remaining = remaining.replace(/@repeat-rule\([^)]*\)/g, '');

  const name = remaining.trim();

  return {
    name,
    tags,
    dueDate,
    deferDate,
    doneDate,
    flagged,
    estimate,
    note,
    projectName
  };
}

function checkUnrecognizedTokens(
  content: string,
  lineNumber: number,
  rawLine: string,
  warnings: ValidationWarning[]
): void {
  // Find all @token patterns in the content
  const tokenPattern = /@[\w-]+/g;
  let match: RegExpExecArray | null = tokenPattern.exec(content);

  while (match !== null) {
    const token = match[0];
    if (!RECOGNIZED_TOKENS.has(token)) {
      warnings.push({
        line: lineNumber,
        message: `Unrecognized token: ${token}`,
        content: rawLine
      });
    }
    match = tokenPattern.exec(content);
  }
}
