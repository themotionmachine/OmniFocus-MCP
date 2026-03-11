/**
 * Markdown Task Parser for Obsidian format.
 *
 * Parses Obsidian-flavoured markdown task lists, extracting metadata such as
 * priority markers, dates, tags, context tags, and OmniFocus sync IDs.
 *
 * Implements GitHub issues #1 and #2.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ObsidianTask {
  name: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low' | 'none';
  dueDate: string | null;
  deferDate: string | null;
  tags: string[];
  contextTags: string[];
  note: string;
  children: ObsidianTask[];
  indent: number;
  rawLine: string;
  lineNumber: number;
  omnifocusId: string | null;
}

export interface ParsedMarkdownFile {
  filePath: string;
  title: string;
  tasks: ObsidianTask[];
  frontmatter: Record<string, any>;
  rawContent: string;
}

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

/** Matches a markdown task line, capturing indent, checkbox char, and rest. */
const TASK_RE = /^(\s*)-\s+\[([ xX])\]\s+(.*)/;

/** Priority emoji markers */
const PRIORITY_HIGH_RE = /⏫/g;
const PRIORITY_MEDIUM_RE = /🔼/g;
const PRIORITY_LOW_RE = /🔽/g;

/** Parenthesised priority markers: (A) = high, (B) = medium, (C) = low */
const PRIORITY_PAREN_RE = /\(([A-Ca-c])\)/g;

/** Due date patterns */
const DUE_EMOJI_RE = /📅\s*(\d{4}-\d{2}-\d{2})/g;
const DUE_INLINE_RE = /\[due::\s*(\d{4}-\d{2}-\d{2})\]/g;

/** Defer / scheduled date patterns */
const DEFER_EMOJI_RE = /⏳\s*(\d{4}-\d{2}-\d{2})/g;
const DEFER_INLINE_RE = /\[defer::\s*(\d{4}-\d{2}-\d{2})\]/g;
const SCHEDULED_INLINE_RE = /\[scheduled::\s*(\d{4}-\d{2}-\d{2})\]/g;

/** Tags: #word-chars but NOT inside inline fields like [due:: ...] */
const TAG_RE = /#([\w][\w/-]*)/g;

/** Context tags: @word */
const CONTEXT_RE = /@([\w][\w/-]*)/g;

/** OmniFocus ID metadata embedded as HTML comment */
const OMNIFOCUS_ID_RE = /<!--\s*omnifocus:(\S+)\s*-->/;

/** YAML frontmatter delimiter */
const FRONTMATTER_RE = /^---\s*$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectIndent(raw: string): number {
  const match = raw.match(/^(\s*)/);
  if (!match) return 0;
  const ws = match[1];
  // Count tabs as 1 indent level, spaces as floor(n/2) levels
  const tabs = (ws.match(/\t/g) || []).length;
  const spaces = ws.replace(/\t/g, '').length;
  return tabs + Math.floor(spaces / 2);
}

function extractFirst(text: string, ...patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    const m = pattern.exec(text);
    if (m) return m[1];
  }
  return null;
}

function extractPriority(text: string): 'high' | 'medium' | 'low' | 'none' {
  if (PRIORITY_HIGH_RE.test(text)) {
    PRIORITY_HIGH_RE.lastIndex = 0;
    return 'high';
  }
  if (PRIORITY_MEDIUM_RE.test(text)) {
    PRIORITY_MEDIUM_RE.lastIndex = 0;
    return 'medium';
  }
  if (PRIORITY_LOW_RE.test(text)) {
    PRIORITY_LOW_RE.lastIndex = 0;
    return 'low';
  }

  PRIORITY_PAREN_RE.lastIndex = 0;
  const m = PRIORITY_PAREN_RE.exec(text);
  if (m) {
    const letter = m[1].toUpperCase();
    if (letter === 'A') return 'high';
    if (letter === 'B') return 'medium';
    if (letter === 'C') return 'low';
  }

  return 'none';
}

function extractAllMatches(text: string, pattern: RegExp): string[] {
  const results: string[] = [];
  pattern.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    results.push(m[1]);
  }
  return results;
}

/**
 * Strip all known metadata tokens from the task text to produce the clean
 * task name / note remainder.
 */
function cleanTaskName(text: string): string {
  return text
    .replace(PRIORITY_HIGH_RE, '')
    .replace(PRIORITY_MEDIUM_RE, '')
    .replace(PRIORITY_LOW_RE, '')
    .replace(PRIORITY_PAREN_RE, '')
    .replace(DUE_EMOJI_RE, '')
    .replace(DUE_INLINE_RE, '')
    .replace(DEFER_EMOJI_RE, '')
    .replace(DEFER_INLINE_RE, '')
    .replace(SCHEDULED_INLINE_RE, '')
    .replace(TAG_RE, '')
    .replace(CONTEXT_RE, '')
    .replace(OMNIFOCUS_ID_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Frontmatter parser (simple YAML subset)
// ---------------------------------------------------------------------------

function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  bodyStart: number;
} {
  const lines = content.split('\n');
  if (lines.length === 0 || !FRONTMATTER_RE.test(lines[0])) {
    return { frontmatter: {}, bodyStart: 0 };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (FRONTMATTER_RE.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: {}, bodyStart: 0 };
  }

  const yamlLines = lines.slice(1, endIndex);
  const frontmatter: Record<string, any> = {};

  for (const line of yamlLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: any = line.slice(colonIdx + 1).trim();

    // Attempt basic type coercion
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (value !== '' && !isNaN(Number(value))) value = Number(value);
    // Handle simple YAML arrays: [a, b, c]
    else if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
    }

    if (key) frontmatter[key] = value;
  }

  return { frontmatter, bodyStart: endIndex + 1 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a single markdown line into an ObsidianTask.
 * Returns `null` if the line is not a valid task.
 */
export function parseTask(line: string, lineNumber: number): ObsidianTask | null {
  const taskMatch = line.match(TASK_RE);
  if (!taskMatch) return null;

  const completed = taskMatch[2] !== ' ';
  const rest = taskMatch[3];

  const priority = extractPriority(rest);

  const dueDate = extractFirst(rest, DUE_EMOJI_RE, DUE_INLINE_RE);
  const deferDate = extractFirst(rest, DEFER_EMOJI_RE, DEFER_INLINE_RE, SCHEDULED_INLINE_RE);

  const tags = extractAllMatches(rest, TAG_RE);
  const contextTags = extractAllMatches(rest, CONTEXT_RE);

  const idMatch = rest.match(OMNIFOCUS_ID_RE);
  const omnifocusId = idMatch ? idMatch[1] : null;

  const name = cleanTaskName(rest);

  return {
    name,
    completed,
    priority,
    dueDate,
    deferDate,
    tags,
    contextTags,
    note: '',
    children: [],
    indent: detectIndent(line),
    rawLine: line,
    lineNumber,
    omnifocusId,
  };
}

/**
 * Parse an entire markdown file into a ParsedMarkdownFile structure.
 * Tasks are nested into parent/child hierarchies based on indentation.
 */
export function parseMarkdownFile(content: string, filePath: string): ParsedMarkdownFile {
  const { frontmatter, bodyStart } = parseFrontmatter(content);
  const lines = content.split('\n');

  // Extract title from first H1 heading, or fall back to filename
  let title = '';
  for (let i = bodyStart; i < lines.length; i++) {
    const h1Match = lines[i].match(/^#\s+(.*)/);
    if (h1Match) {
      title = h1Match[1].trim();
      break;
    }
  }
  if (!title) {
    // Derive from file path: strip directory and extension
    const parts = filePath.split('/');
    const filename = parts[parts.length - 1] || filePath;
    title = filename.replace(/\.md$/i, '');
  }

  // First pass: parse all task lines
  const allTasks: ObsidianTask[] = [];
  for (let i = 0; i < lines.length; i++) {
    const task = parseTask(lines[i], i);
    if (task) {
      allTasks.push(task);
    }
  }

  // Second pass: build tree based on indent
  const rootTasks: ObsidianTask[] = [];
  const stack: ObsidianTask[] = [];

  for (const task of allTasks) {
    // Pop stack until we find a parent with smaller indent
    while (stack.length > 0 && stack[stack.length - 1].indent >= task.indent) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].children.push(task);
    } else {
      rootTasks.push(task);
    }

    stack.push(task);
  }

  return {
    filePath,
    title,
    tasks: rootTasks,
    frontmatter,
    rawContent: content,
  };
}

/**
 * Serialise an array of ObsidianTask objects back to markdown text.
 */
export function tasksToMarkdown(tasks: ObsidianTask[], baseIndent: number = 0): string {
  const lines: string[] = [];

  for (const task of tasks) {
    const indent = '  '.repeat(baseIndent);
    const checkbox = task.completed ? '[x]' : '[ ]';
    let line = `${indent}- ${checkbox} ${task.name}`;

    // Priority
    if (task.priority === 'high') line += ' ⏫';
    else if (task.priority === 'medium') line += ' 🔼';
    else if (task.priority === 'low') line += ' 🔽';

    // Due date
    if (task.dueDate) line += ` 📅 ${task.dueDate}`;

    // Defer date
    if (task.deferDate) line += ` ⏳ ${task.deferDate}`;

    // Tags
    for (const tag of task.tags) {
      line += ` #${tag}`;
    }

    // Context tags
    for (const ctx of task.contextTags) {
      line += ` @${ctx}`;
    }

    // OmniFocus ID
    if (task.omnifocusId) {
      line += ` <!-- omnifocus:${task.omnifocusId} -->`;
    }

    lines.push(line);

    // Recurse for children
    if (task.children.length > 0) {
      lines.push(tasksToMarkdown(task.children, baseIndent + 1));
    }
  }

  return lines.join('\n');
}

/**
 * Update a specific task line in markdown content.
 * Rebuilds the line from the existing parsed task merged with the supplied
 * updates, preserving indentation and the OmniFocus ID.
 */
export function updateTaskInMarkdown(
  content: string,
  lineNumber: number,
  updates: Partial<ObsidianTask> & { flagged?: boolean },
): string {
  const lines = content.split('\n');
  if (lineNumber < 0 || lineNumber >= lines.length) return content;

  const line = lines[lineNumber];
  const task = parseTask(line, lineNumber);
  if (!task) return content;

  const indentStr = line.match(/^(\s*)/)?.[1] ?? '';

  const completed = updates.completed !== undefined ? updates.completed : task.completed;
  const checkbox = completed ? '[x]' : '[ ]';
  const name = updates.name !== undefined ? updates.name : task.name;
  const priority = updates.priority !== undefined ? updates.priority : task.priority;
  const dueDate = updates.dueDate !== undefined ? updates.dueDate : task.dueDate;
  const deferDate = updates.deferDate !== undefined ? updates.deferDate : task.deferDate;
  const tags = updates.tags !== undefined ? updates.tags : task.tags;
  const contextTags = updates.contextTags !== undefined ? updates.contextTags : task.contextTags;
  const omnifocusId = updates.omnifocusId !== undefined ? updates.omnifocusId : task.omnifocusId;

  let newLine = `${indentStr}- ${checkbox} ${name}`;

  if (priority === 'high') newLine += ' ⏫';
  else if (priority === 'medium') newLine += ' 🔼';
  else if (priority === 'low') newLine += ' 🔽';

  if (dueDate) newLine += ` 📅 ${dueDate}`;
  if (deferDate) newLine += ` ⏳ ${deferDate}`;
  if (tags.length > 0) newLine += ' ' + tags.map((t) => `#${t}`).join(' ');
  if (contextTags.length > 0) newLine += ' ' + contextTags.map((c) => `@${c}`).join(' ');
  if (omnifocusId) newLine += ` <!-- omnifocus:${omnifocusId} -->`;

  lines[lineNumber] = newLine;
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Legacy compatibility alias
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `parseTask` instead.
 */
export const parseTaskLine = parseTask;
