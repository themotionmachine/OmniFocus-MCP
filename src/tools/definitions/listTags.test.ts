import { describe, it, expect } from 'vitest';
import { renderTagTree } from './listTags.js';
import type { TagInfo } from '../primitives/listTags.js';

const tag = (id: string, parentTagID: string | null = null): TagInfo => ({
  id,
  name: id,
  parentTagID,
  parentName: parentTagID,
  active: true,
  allowsNextAction: true,
  taskCount: 0,
});

const lines = (text: string) => text.split('\n').filter(l => l.startsWith(' ') || l.startsWith('-'));

describe('renderTagTree', () => {
  it('indents tags nested more than one level deep (#136)', () => {
    const out = renderTagTree([tag('grand'), tag('parent', 'grand'), tag('child', 'parent'), tag('leaf', 'child')]);
    expect(lines(out)).toEqual([
      '- **grand** (id: grand)',
      '  - **parent** (id: parent)',
      '    - **child** (id: child)',
      '      - **leaf** (id: leaf)',
    ]);
  });

  it('changes output when a tag is re-nested one level deeper (#136)', () => {
    // Before the fix, moving `c` from root to under `p` (itself under `g`)
    // produced byte-identical output, which looked like a stale cache.
    const before = renderTagTree([tag('g'), tag('p', 'g'), tag('c')]);
    const after = renderTagTree([tag('g'), tag('p', 'g'), tag('c', 'p')]);
    expect(after).not.toBe(before);
    expect(lines(after)).toContain('    - **c** (id: c)');
  });

  it('renders a tag whose parent was filtered out at root, with its subtree', () => {
    const out = renderTagTree([tag('orphan', 'missing'), tag('kid', 'orphan')]);
    expect(lines(out)).toEqual(['- **orphan** (id: orphan)', '  - **kid** (id: kid)']);
  });

  it('still lists every tag if parent links form a cycle', () => {
    const out = renderTagTree([tag('a', 'b'), tag('b', 'a')]);
    expect(lines(out)).toHaveLength(2);
  });

  it('keeps the total count header', () => {
    expect(renderTagTree([tag('a'), tag('b', 'a')])).toMatch(/^## Tags \(2\)/);
  });
});
