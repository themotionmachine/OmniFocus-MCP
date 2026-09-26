import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { z } from 'zod';
import { schema } from './queryOmnifocus.js';

/**
 * Issue #137: QUERY_TOOL_REFERENCE.md documented 7 of ~25 filters and claimed
 * deferredUntil was unimplemented. Agents read that file, so every missing name
 * is an invitation to invent one. This guard derives the key lists from the live
 * Zod schema, so adding a filter or top-level option without documenting it
 * fails here rather than in a user's session.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const reference = readFileSync(join(repoRoot, 'QUERY_TOOL_REFERENCE.md'), 'utf8');

/** A key counts as documented only when it appears as inline code: `key`. */
function undocumented(keys: string[]): string[] {
  return keys.filter(k => !reference.includes('`' + k + '`'));
}

const filtersSchema = schema.shape.filters.unwrap();
const filterKeys = Object.keys(filtersSchema.shape);
const topLevelKeys = Object.keys(schema.shape);

describe('QUERY_TOOL_REFERENCE.md stays in sync with the query_omnifocus schema', () => {
  it('derives a non-trivial key list from the schema', () => {
    // Guards the guard: if unwrap() or .shape stopped yielding keys, every
    // "is documented" check below would pass vacuously.
    expect(filterKeys.length).toBeGreaterThan(20);
    expect(topLevelKeys).toContain('filters');
  });

  it('documents every filter key', () => {
    expect(undocumented(filterKeys)).toEqual([]);
  });

  it('documents every top-level parameter', () => {
    expect(undocumented(topLevelKeys)).toEqual([]);
  });

  it('documents every allowed status value', () => {
    const statusEnum = filtersSchema.shape.status.unwrap().element as z.ZodEnum<[string, ...string[]]>;
    expect(undocumented([...statusEnum.options])).toEqual([]);
  });

  it('no longer claims deferredUntil is unimplemented', () => {
    expect(reference).not.toMatch(/not yet implemented/i);
  });
});
