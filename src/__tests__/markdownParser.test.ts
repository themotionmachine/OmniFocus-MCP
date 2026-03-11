import { describe, it, expect } from 'vitest';
import {
  parseTask,
  parseMarkdownFile,
  tasksToMarkdown,
  updateTaskInMarkdown,
} from '../sync/markdownParser.js';
import type { ObsidianTask } from '../sync/markdownParser.js';

// ---------------------------------------------------------------------------
// parseTask
// ---------------------------------------------------------------------------

describe('parseTask', () => {
  it('should parse a basic incomplete task', () => {
    const task = parseTask('- [ ] Buy groceries', 0);
    expect(task).not.toBeNull();
    expect(task!.name).toBe('Buy groceries');
    expect(task!.completed).toBe(false);
    expect(task!.lineNumber).toBe(0);
  });

  it('should parse a completed task', () => {
    const task = parseTask('- [x] Buy groceries', 0);
    expect(task).not.toBeNull();
    expect(task!.completed).toBe(true);
  });

  it('should parse uppercase X as completed', () => {
    const task = parseTask('- [X] Done task', 0);
    expect(task).not.toBeNull();
    expect(task!.completed).toBe(true);
  });

  it('should return null for non-task lines', () => {
    expect(parseTask('# Heading', 0)).toBeNull();
    expect(parseTask('Some paragraph text', 1)).toBeNull();
    expect(parseTask('- Regular list item', 3)).toBeNull();
  });

  it('should return null for empty lines', () => {
    expect(parseTask('', 0)).toBeNull();
    expect(parseTask('   ', 1)).toBeNull();
  });

  it('should return null for malformed checkbox lines', () => {
    expect(parseTask('[ ] Not a task', 0)).toBeNull();
    expect(parseTask('1. [ ] Numbered list', 0)).toBeNull();
    expect(parseTask('* [ ] Asterisk list', 0)).toBeNull();
  });

  // Priority markers -------------------------------------------------------

  it('should extract high priority emoji marker', () => {
    const task = parseTask('- [ ] Important task ⏫', 0);
    expect(task!.priority).toBe('high');
  });

  it('should extract medium priority emoji marker', () => {
    const task = parseTask('- [ ] Normal task 🔼', 0);
    expect(task!.priority).toBe('medium');
  });

  it('should extract low priority emoji marker', () => {
    const task = parseTask('- [ ] Low task 🔽', 0);
    expect(task!.priority).toBe('low');
  });

  it('should extract parenthesised priority (A)', () => {
    const task = parseTask('- [ ] (A) High priority task', 0);
    expect(task!.priority).toBe('high');
  });

  it('should extract parenthesised priority (B)', () => {
    const task = parseTask('- [ ] (B) Medium priority task', 0);
    expect(task!.priority).toBe('medium');
  });

  it('should extract parenthesised priority (C)', () => {
    const task = parseTask('- [ ] (C) Low priority task', 0);
    expect(task!.priority).toBe('low');
  });

  it('should default to none priority', () => {
    const task = parseTask('- [ ] No priority', 0);
    expect(task!.priority).toBe('none');
  });

  // Due dates ---------------------------------------------------------------

  it('should extract due date with emoji', () => {
    const task = parseTask('- [ ] Task 📅 2024-01-15', 0);
    expect(task!.dueDate).toBe('2024-01-15');
  });

  it('should extract due date with inline field', () => {
    const task = parseTask('- [ ] Task [due:: 2024-06-01]', 0);
    expect(task!.dueDate).toBe('2024-06-01');
  });

  it('should return null due date when none present', () => {
    const task = parseTask('- [ ] Task without date', 0);
    expect(task!.dueDate).toBeNull();
  });

  // Defer / scheduled dates -------------------------------------------------

  it('should extract defer date with emoji', () => {
    const task = parseTask('- [ ] Task ⏳ 2024-01-10', 0);
    expect(task!.deferDate).toBe('2024-01-10');
  });

  it('should extract defer date with inline field', () => {
    const task = parseTask('- [ ] Task [defer:: 2024-03-01]', 0);
    expect(task!.deferDate).toBe('2024-03-01');
  });

  it('should extract scheduled date as defer date', () => {
    const task = parseTask('- [ ] Task [scheduled:: 2024-05-01]', 0);
    expect(task!.deferDate).toBe('2024-05-01');
  });

  it('should return null defer date when none present', () => {
    const task = parseTask('- [ ] Task without defer', 0);
    expect(task!.deferDate).toBeNull();
  });

  // Tags --------------------------------------------------------------------

  it('should extract #tags', () => {
    const task = parseTask('- [ ] Task #work #urgent', 0);
    expect(task!.tags).toEqual(['work', 'urgent']);
  });

  it('should extract tags with hyphens and slashes', () => {
    const task = parseTask('- [ ] Task #project-alpha #area/sub', 0);
    expect(task!.tags).toEqual(['project-alpha', 'area/sub']);
  });

  it('should return empty tags array when none present', () => {
    const task = parseTask('- [ ] Task without tags', 0);
    expect(task!.tags).toEqual([]);
  });

  // Context tags ------------------------------------------------------------

  it('should extract @context tags', () => {
    const task = parseTask('- [ ] Task @home @morning', 0);
    expect(task!.contextTags).toEqual(['home', 'morning']);
  });

  it('should return empty context tags array when none present', () => {
    const task = parseTask('- [ ] Task without context', 0);
    expect(task!.contextTags).toEqual([]);
  });

  // OmniFocus ID ------------------------------------------------------------

  it('should extract omnifocus ID from HTML comment', () => {
    const task = parseTask('- [ ] Task <!-- omnifocus:abc123 -->', 0);
    expect(task!.omnifocusId).toBe('abc123');
  });

  it('should return null omnifocusId when no ID present', () => {
    const task = parseTask('- [ ] Task without ID', 0);
    expect(task!.omnifocusId).toBeNull();
  });

  it('should strip omnifocus ID from task name', () => {
    const task = parseTask('- [ ] Task name <!-- omnifocus:abc123 -->', 0);
    expect(task!.name).toBe('Task name');
    expect(task!.omnifocusId).toBe('abc123');
  });

  // Indentation -------------------------------------------------------------

  it('should detect no indentation', () => {
    const task = parseTask('- [ ] Top level', 0);
    expect(task!.indent).toBe(0);
  });

  it('should detect indent level from 2 spaces', () => {
    const task = parseTask('  - [ ] Indented task', 0);
    expect(task!.indent).toBe(1);
  });

  it('should detect indent level from 4 spaces', () => {
    const task = parseTask('    - [ ] Double indented', 0);
    expect(task!.indent).toBe(2);
  });

  it('should detect indent level from tabs', () => {
    const task = parseTask('\t- [ ] Tabbed task', 0);
    expect(task!.indent).toBe(1);
  });

  // Combined metadata -------------------------------------------------------

  it('should clean task name by removing all metadata tokens', () => {
    const task = parseTask(
      '- [ ] Buy milk ⏫ 📅 2024-01-15 ⏳ 2024-01-10 #groceries @errands <!-- omnifocus:id1 -->',
      0,
    );
    expect(task!.name).toBe('Buy milk');
    expect(task!.priority).toBe('high');
    expect(task!.dueDate).toBe('2024-01-15');
    expect(task!.deferDate).toBe('2024-01-10');
    expect(task!.tags).toEqual(['groceries']);
    expect(task!.contextTags).toEqual(['errands']);
    expect(task!.omnifocusId).toBe('id1');
  });

  it('should preserve rawLine', () => {
    const line = '- [ ] Original line content';
    const task = parseTask(line, 5);
    expect(task!.rawLine).toBe(line);
    expect(task!.lineNumber).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// parseMarkdownFile
// ---------------------------------------------------------------------------

describe('parseMarkdownFile', () => {
  it('should extract title from first H1 heading', () => {
    const content = '# My Project\n\n- [ ] Task 1\n- [ ] Task 2';
    const result = parseMarkdownFile(content, 'test.md');
    expect(result.title).toBe('My Project');
  });

  it('should find H1 even if not on first line', () => {
    const content = 'Some text\n# The Title\n- [ ] Task';
    const result = parseMarkdownFile(content, 'test.md');
    expect(result.title).toBe('The Title');
  });

  it('should fall back to filename when no H1 present', () => {
    const content = '- [ ] Task 1\n- [ ] Task 2';
    const result = parseMarkdownFile(content, 'my-project.md');
    expect(result.title).toBe('my-project');
  });

  it('should strip .md extension from filename fallback', () => {
    const content = '- [ ] Task';
    const result = parseMarkdownFile(content, '/vault/Notes.md');
    expect(result.title).toBe('Notes');
  });

  // Frontmatter -------------------------------------------------------------

  it('should parse YAML frontmatter', () => {
    const content =
      '---\ntitle: My Project\npriority: 1\ntags: [a, b, c]\n---\n\n- [ ] Task 1';
    const result = parseMarkdownFile(content, 'test.md');
    expect(result.frontmatter.title).toBe('My Project');
    expect(result.frontmatter.priority).toBe(1);
    expect(result.frontmatter.tags).toEqual(['a', 'b', 'c']);
  });

  it('should handle boolean values in frontmatter', () => {
    const content = '---\nactive: true\narchived: false\n---\n\n- [ ] Task';
    const result = parseMarkdownFile(content, 'test.md');
    expect(result.frontmatter.active).toBe(true);
    expect(result.frontmatter.archived).toBe(false);
  });

  it('should return empty frontmatter when none present', () => {
    const content = '- [ ] Task 1';
    const result = parseMarkdownFile(content, 'test.md');
    expect(result.frontmatter).toEqual({});
  });

  it('should ignore unclosed frontmatter', () => {
    const content = '---\ntitle: oops\n- [ ] Task';
    const result = parseMarkdownFile(content, 'test.md');
    expect(result.frontmatter).toEqual({});
  });

  // Nested tasks ------------------------------------------------------------

  it('should build nested task hierarchy', () => {
    const content = [
      '- [ ] Parent task',
      '  - [ ] Child task 1',
      '  - [ ] Child task 2',
      '    - [ ] Grandchild',
    ].join('\n');

    const result = parseMarkdownFile(content, 'test.md');
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].name).toBe('Parent task');
    expect(result.tasks[0].children).toHaveLength(2);
    expect(result.tasks[0].children[0].name).toBe('Child task 1');
    expect(result.tasks[0].children[1].name).toBe('Child task 2');
    expect(result.tasks[0].children[1].children).toHaveLength(1);
    expect(result.tasks[0].children[1].children[0].name).toBe('Grandchild');
  });

  it('should handle multiple top-level tasks with children', () => {
    const content = [
      '- [ ] Parent A',
      '  - [ ] Child A1',
      '- [ ] Parent B',
      '  - [ ] Child B1',
    ].join('\n');

    const result = parseMarkdownFile(content, 'test.md');
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].children).toHaveLength(1);
    expect(result.tasks[1].children).toHaveLength(1);
  });

  it('should handle multiple top-level tasks without children', () => {
    const content = '- [ ] Task A\n- [ ] Task B\n- [ ] Task C';
    const result = parseMarkdownFile(content, 'test.md');
    expect(result.tasks).toHaveLength(3);
  });

  // Misc --------------------------------------------------------------------

  it('should skip non-task lines', () => {
    const content = '# Heading\n\nSome text\n\n- [ ] Only task\n\nMore text';
    const result = parseMarkdownFile(content, 'test.md');
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].name).toBe('Only task');
  });

  it('should preserve filePath and rawContent', () => {
    const content = '- [ ] Task';
    const result = parseMarkdownFile(content, '/path/to/file.md');
    expect(result.filePath).toBe('/path/to/file.md');
    expect(result.rawContent).toBe(content);
  });

  it('should handle empty content', () => {
    const result = parseMarkdownFile('', '/vault/empty.md');
    expect(result.tasks).toHaveLength(0);
    expect(result.title).toBe('empty');
  });
});

// ---------------------------------------------------------------------------
// tasksToMarkdown
// ---------------------------------------------------------------------------

describe('tasksToMarkdown', () => {
  it('should serialize a basic task', () => {
    const task = parseTask('- [ ] Simple task', 0)!;
    const md = tasksToMarkdown([task]);
    expect(md).toBe('- [ ] Simple task');
  });

  it('should serialize a completed task', () => {
    const task = parseTask('- [x] Done task', 0)!;
    const md = tasksToMarkdown([task]);
    expect(md).toContain('- [x] Done task');
  });

  it('should serialize priority markers', () => {
    const task = parseTask('- [ ] Important ⏫', 0)!;
    const md = tasksToMarkdown([task]);
    expect(md).toContain('⏫');
  });

  it('should serialize medium priority marker', () => {
    const task = parseTask('- [ ] Medium 🔼', 0)!;
    const md = tasksToMarkdown([task]);
    expect(md).toContain('🔼');
  });

  it('should serialize low priority marker', () => {
    const task = parseTask('- [ ] Low 🔽', 0)!;
    const md = tasksToMarkdown([task]);
    expect(md).toContain('🔽');
  });

  it('should serialize due date', () => {
    const task = parseTask('- [ ] Task 📅 2024-01-15', 0)!;
    const md = tasksToMarkdown([task]);
    expect(md).toContain('📅 2024-01-15');
  });

  it('should serialize defer date', () => {
    const task = parseTask('- [ ] Task ⏳ 2024-01-10', 0)!;
    const md = tasksToMarkdown([task]);
    expect(md).toContain('⏳ 2024-01-10');
  });

  it('should serialize tags', () => {
    const task = parseTask('- [ ] Task #work #urgent', 0)!;
    const md = tasksToMarkdown([task]);
    expect(md).toContain('#work');
    expect(md).toContain('#urgent');
  });

  it('should serialize context tags', () => {
    const task = parseTask('- [ ] Task @home', 0)!;
    const md = tasksToMarkdown([task]);
    expect(md).toContain('@home');
  });

  it('should serialize omnifocus ID', () => {
    const task = parseTask('- [ ] Task <!-- omnifocus:xyz -->', 0)!;
    const md = tasksToMarkdown([task]);
    expect(md).toContain('<!-- omnifocus:xyz -->');
  });

  it('should handle nested tasks with indentation', () => {
    const content = '- [ ] Parent\n  - [ ] Child';
    const parsed = parseMarkdownFile(content, 'test.md');
    const md = tasksToMarkdown(parsed.tasks);
    expect(md).toContain('- [ ] Parent');
    expect(md).toContain('  - [ ] Child');
  });

  it('should serialize task with all metadata in correct order', () => {
    const tasks: ObsidianTask[] = [
      {
        name: 'Full task',
        completed: false,
        priority: 'high',
        dueDate: '2024-01-15',
        deferDate: '2024-01-10',
        tags: ['work', 'urgent'],
        contextTags: ['office'],
        note: '',
        children: [],
        indent: 0,
        rawLine: '',
        lineNumber: 0,
        omnifocusId: 'abc123',
      },
    ];
    const md = tasksToMarkdown(tasks);
    expect(md).toBe(
      '- [ ] Full task ⏫ 📅 2024-01-15 ⏳ 2024-01-10 #work #urgent @office <!-- omnifocus:abc123 -->',
    );
  });
});

// ---------------------------------------------------------------------------
// updateTaskInMarkdown
// ---------------------------------------------------------------------------

describe('updateTaskInMarkdown', () => {
  it('should update completion status', () => {
    const content = '- [ ] Task to complete';
    const result = updateTaskInMarkdown(content, 0, { completed: true });
    expect(result).toContain('- [x]');
  });

  it('should update task name', () => {
    const content = '- [ ] Old name';
    const result = updateTaskInMarkdown(content, 0, { name: 'New name' });
    expect(result).toContain('New name');
    expect(result).not.toContain('Old name');
  });

  it('should update due date', () => {
    const content = '- [ ] Task 📅 2024-01-01';
    const result = updateTaskInMarkdown(content, 0, { dueDate: '2024-06-15' });
    expect(result).toContain('📅 2024-06-15');
    expect(result).not.toContain('2024-01-01');
  });

  it('should preserve indentation', () => {
    const content = 'text\n  - [ ] Indented task';
    const result = updateTaskInMarkdown(content, 1, { completed: true });
    expect(result).toContain('  - [x]');
  });

  it('should return content unchanged for non-task line', () => {
    const content = '# Heading\n- [ ] Task';
    const result = updateTaskInMarkdown(content, 0, { completed: true });
    expect(result).toBe(content);
  });

  it('should return content unchanged for out-of-bounds line number', () => {
    const content = '- [ ] Task';
    expect(updateTaskInMarkdown(content, 5, { completed: true })).toBe(content);
    expect(updateTaskInMarkdown(content, -1, { completed: true })).toBe(content);
  });

  it('should add omnifocus ID to a task', () => {
    const content = '- [ ] Task';
    const result = updateTaskInMarkdown(content, 0, { omnifocusId: 'new-id' });
    expect(result).toContain('<!-- omnifocus:new-id -->');
  });

  it('should preserve existing metadata when updating one field', () => {
    const content = '- [ ] Task ⏫ #work @office 📅 2024-01-15';
    const result = updateTaskInMarkdown(content, 0, { completed: true });
    expect(result).toContain('[x]');
    expect(result).toContain('⏫');
    expect(result).toContain('#work');
    expect(result).toContain('@office');
    expect(result).toContain('📅 2024-01-15');
  });

  it('should update tags', () => {
    const content = '- [ ] Task #old-tag';
    const result = updateTaskInMarkdown(content, 0, { tags: ['new-tag', 'other'] });
    expect(result).toContain('#new-tag');
    expect(result).toContain('#other');
    expect(result).not.toContain('#old-tag');
  });

  it('should update priority', () => {
    const content = '- [ ] Task ⏫';
    const result = updateTaskInMarkdown(content, 0, { priority: 'low' });
    expect(result).toContain('🔽');
    expect(result).not.toContain('⏫');
  });

  it('should preserve omnifocus ID when updating other fields', () => {
    const content = '- [ ] Task <!-- omnifocus:myId -->';
    const result = updateTaskInMarkdown(content, 0, { completed: true });
    expect(result).toContain('<!-- omnifocus:myId -->');
    expect(result).toContain('[x]');
  });
});

// ---------------------------------------------------------------------------
// Round-trip: parse then serialize
// ---------------------------------------------------------------------------

describe('round-trip: parse then serialize', () => {
  it('should round-trip a simple task', () => {
    const original = '- [ ] Simple task';
    const task = parseTask(original, 0)!;
    const serialized = tasksToMarkdown([task]);
    expect(serialized.trim()).toBe('- [ ] Simple task');
  });

  it('should round-trip a task with full metadata', () => {
    const original =
      '- [ ] Task ⏫ 📅 2024-01-15 ⏳ 2024-01-10 #work @office <!-- omnifocus:id1 -->';
    const task = parseTask(original, 0)!;
    const serialized = tasksToMarkdown([task]);

    // Re-parse the serialized version and verify all fields match
    const reparsed = parseTask(serialized, 0)!;
    expect(reparsed.name).toBe(task.name);
    expect(reparsed.completed).toBe(task.completed);
    expect(reparsed.priority).toBe(task.priority);
    expect(reparsed.dueDate).toBe(task.dueDate);
    expect(reparsed.deferDate).toBe(task.deferDate);
    expect(reparsed.tags).toEqual(task.tags);
    expect(reparsed.contextTags).toEqual(task.contextTags);
    expect(reparsed.omnifocusId).toBe(task.omnifocusId);
  });

  it('should round-trip a completed task', () => {
    const original = '- [x] Completed item #done';
    const task = parseTask(original, 0)!;
    const serialized = tasksToMarkdown([task]);
    const reparsed = parseTask(serialized, 0)!;
    expect(reparsed.completed).toBe(true);
    expect(reparsed.name).toBe('Completed item');
    expect(reparsed.tags).toEqual(['done']);
  });
});
