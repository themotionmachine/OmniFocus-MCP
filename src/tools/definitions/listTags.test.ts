import { describe, it, expect } from 'vitest';
import { formatTag } from './listTags.js';
import type { TagInfo } from '../primitives/listTags.js';

describe('formatTag', () => {
  const makeTag = (overrides: Partial<TagInfo> = {}): TagInfo => ({
    id: 'tag1',
    name: 'Work',
    parentTagID: null,
    parentName: null,
    active: true,
    allowsNextAction: true,
    taskCount: 5,
    ...overrides,
  });

  it('formats active tag with tasks', () => {
    const result = formatTag(makeTag(), '');
    expect(result).toBe('- **Work** [5 tasks] (id: tag1)\n');
  });

  it('formats inactive tag with (inactive) suffix', () => {
    const result = formatTag(makeTag({ active: false }), '');
    expect(result).toContain('(inactive)');
    expect(result).toBe('- **Work** (inactive) [5 tasks] (id: tag1)\n');
  });

  it('does not show task count when zero', () => {
    const result = formatTag(makeTag({ taskCount: 0 }), '');
    expect(result).not.toContain('tasks');
    expect(result).toBe('- **Work** (id: tag1)\n');
  });

  it('applies indent prefix', () => {
    const result = formatTag(makeTag(), '  ');
    expect(result.startsWith('  - **Work**')).toBe(true);
  });

  it('shows tag name in bold', () => {
    const result = formatTag(makeTag({ name: 'Custom Tag' }), '');
    expect(result).toContain('**Custom Tag**');
  });

  it('includes tag id', () => {
    const result = formatTag(makeTag({ id: 'xyz789' }), '');
    expect(result).toContain('(id: xyz789)');
  });

  it('shows single task count correctly', () => {
    const result = formatTag(makeTag({ taskCount: 1 }), '');
    expect(result).toContain('[1 tasks]');
  });
});
