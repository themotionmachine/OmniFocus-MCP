import { describe, it, expect } from 'vitest';
import { _testExports as primitives } from '../primitives/queryOmnifocus.js';
import { _testExports as definitions } from '../definitions/queryOmnifocus.js';

const { escapeJXA, generateFilterConditions, generateFieldMapping } = primitives;
const { formatTasks, formatFilters } = definitions;

// ============================================================
// escapeJXA
// ============================================================
describe('escapeJXA', () => {
  it('returns plain string unchanged', () => {
    expect(escapeJXA('hello world')).toBe('hello world');
  });

  it('escapes double quotes', () => {
    expect(escapeJXA('test"inject')).toBe('test\\"inject');
  });

  it('escapes backslashes before quotes', () => {
    expect(escapeJXA('path\\to\\"file')).toBe('path\\\\to\\\\\\"file');
  });

  it('escapes newlines and carriage returns', () => {
    expect(escapeJXA('line1\nline2\rline3')).toBe('line1\\nline2\\rline3');
  });

  it('handles empty string', () => {
    expect(escapeJXA('')).toBe('');
  });

  it('handles non-ASCII (CJK) characters unchanged', () => {
    expect(escapeJXA('send email')).toBe('send email');
  });

  it('handles combined special characters', () => {
    expect(escapeJXA('a"b\\c\nd')).toBe('a\\"b\\\\c\\nd');
  });
});

// ============================================================
// generateFilterConditions - taskName filter
// ============================================================
describe('generateFilterConditions - taskName', () => {
  it('generates case-insensitive includes check for taskName', () => {
    const result = generateFilterConditions('tasks', { taskName: 'Email' });
    expect(result).toContain('.toLowerCase()');
    expect(result).toContain('.includes("email")');
  });

  it('escapes special chars in taskName', () => {
    const result = generateFilterConditions('tasks', { taskName: 'test"value' });
    expect(result).toContain('test\\"value');
    expect(result).not.toContain('test"value"');
  });

  it('does not generate taskName filter for projects entity', () => {
    const result = generateFilterConditions('projects', { taskName: 'anything' });
    expect(result).not.toContain('taskName');
    expect(result).not.toContain('includes');
  });

  it('combines taskName and projectName filters', () => {
    const result = generateFilterConditions('tasks', {
      taskName: 'email',
      projectName: 'devices',
    });
    expect(result).toContain('email');
    expect(result).toContain('devices');
    // Both should produce return false conditions
    const returnFalseCount = (result.match(/return false/g) || []).length;
    expect(returnFalseCount).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// generateFilterConditions - injection safety (all filters)
// ============================================================
describe('generateFilterConditions - injection safety', () => {
  it('escapes projectName with quotes', () => {
    const result = generateFilterConditions('tasks', { projectName: 'a"b' });
    expect(result).toContain('a\\"b');
  });

  it('escapes projectId with quotes', () => {
    const result = generateFilterConditions('tasks', { projectId: 'id"bad' });
    expect(result).toContain('id\\"bad');
  });

  it('escapes tags with quotes', () => {
    const result = generateFilterConditions('tasks', { tags: ['tag"evil'] });
    expect(result).toContain('tag\\"evil');
  });

  it('escapes status with quotes', () => {
    const result = generateFilterConditions('tasks', { status: ['Next"bad'] });
    expect(result).toContain('Next\\"bad');
  });

  it('escapes folderId with quotes (projects entity)', () => {
    const result = generateFilterConditions('projects', { folderId: 'f"id' });
    expect(result).toContain('f\\"id');
  });
});

// ============================================================
// generateFieldMapping - hierarchy fields
// ============================================================
describe('generateFieldMapping - hierarchy fields', () => {
  it('includes parentId mapping when requested', () => {
    const result = generateFieldMapping('tasks', ['parentId']);
    expect(result).toContain('parentId');
    expect(result).toContain('item.parent');
  });

  it('includes childIds mapping when requested', () => {
    const result = generateFieldMapping('tasks', ['childIds']);
    expect(result).toContain('childIds');
    expect(result).toContain('item.children');
  });

  it('includes hasChildren mapping when requested', () => {
    const result = generateFieldMapping('tasks', ['hasChildren']);
    expect(result).toContain('hasChildren');
    expect(result).toContain('item.children');
  });

  it('default task fields do NOT include hierarchy (keeps response small)', () => {
    const result = generateFieldMapping('tasks');
    expect(result).not.toContain('parentId');
    expect(result).not.toContain('childIds');
    expect(result).not.toContain('hasChildren');
  });

  it('maps multiple fields correctly', () => {
    const result = generateFieldMapping('tasks', ['id', 'name', 'parentId', 'childIds']);
    expect(result).toContain('id: item.id.primaryKey');
    expect(result).toContain('name');
    expect(result).toContain('parentId');
    expect(result).toContain('childIds');
  });
});

// ============================================================
// formatTasks - hierarchy display
// ============================================================
describe('formatTasks - hierarchy fields display', () => {
  it('shows parentId when present', () => {
    const result = formatTasks([
      { name: 'Child Task', id: 'child1', parentId: 'parent1' },
    ]);
    expect(result).toContain('[parent: parent1]');
  });

  it('shows children when hasChildren is true', () => {
    const result = formatTasks([
      { name: 'Parent Task', id: 'p1', hasChildren: true, childIds: ['c1', 'c2'] },
    ]);
    expect(result).toContain('[children: c1, c2]');
  });

  it('does NOT show children section when hasChildren is false', () => {
    const result = formatTasks([
      { name: 'Leaf Task', id: 'l1', hasChildren: false, childIds: [] },
    ]);
    expect(result).not.toContain('[children');
  });

  it('does NOT show parent when parentId is null/undefined', () => {
    const result = formatTasks([
      { name: 'Root Task', id: 'r1', parentId: null },
    ]);
    expect(result).not.toContain('[parent');
  });

  it('does NOT show hierarchy fields when they are absent from data', () => {
    const result = formatTasks([
      { name: 'Simple Task', id: 's1' },
    ]);
    expect(result).not.toContain('[parent');
    expect(result).not.toContain('[children');
  });
});

// ============================================================
// formatFilters - taskName display
// ============================================================
describe('formatFilters', () => {
  it('displays taskName filter', () => {
    const result = formatFilters({ taskName: 'email' });
    expect(result).toContain('taskName: "email"');
  });

  it('displays combined filters', () => {
    const result = formatFilters({ projectName: 'Test', taskName: 'foo' });
    expect(result).toContain('project: "Test"');
    expect(result).toContain('taskName: "foo"');
  });

  it('returns empty string for empty filters', () => {
    const result = formatFilters({});
    expect(result).toBe('');
  });
});
