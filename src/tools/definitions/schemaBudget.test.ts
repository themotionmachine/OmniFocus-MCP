import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

/**
 * Issue #105: tool schema descriptions load into EVERY session that touches the
 * server, before a single call is made. At their peak they cost ~13k chars
 * (~3.4k tokens) — more than a typical week of actual result traffic. The diet
 * brought them to ~7k; these ceilings keep incremental edits from silently
 * growing them back. If a new tool or a load-bearing clarification genuinely
 * needs room, raise the ceiling in the same PR — visibly.
 */

const definitionsDir = dirname(fileURLToPath(import.meta.url));

function describeChars(source: string): number {
  const matches = [...source.matchAll(/\.describe\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g)];
  return matches.reduce((sum, m) => sum + m[1].length, 0);
}

describe('schema description budget (#105)', () => {
  it('keeps the total .describe() text across all tools under budget', () => {
    let total = 0;
    for (const file of readdirSync(definitionsDir)) {
      if (!file.endsWith('.ts') || file.includes('test')) continue;
      total += describeChars(readFileSync(join(definitionsDir, file), 'utf8'));
    }
    expect(total).toBeLessThanOrEqual(6500);
  });

  it('keeps query_omnifocus — the historical worst offender — under its own budget', () => {
    // 5,473 chars before the diet; the fields list is most of what remains.
    const source = readFileSync(join(definitionsDir, 'queryOmnifocus.ts'), 'utf8');
    expect(describeChars(source)).toBeLessThanOrEqual(2800);
  });

  it('keeps the server.tool() registration descriptions under budget', () => {
    const source = readFileSync(join(definitionsDir, '..', '..', 'buildServer.ts'), 'utf8');
    const matches = [...source.matchAll(/server\.tool\(\s*"[^"]+",\s*"((?:[^"\\]|\\.)*)"/g)];
    expect(matches.length).toBeGreaterThan(0);
    const total = matches.reduce((sum, m) => sum + m[1].length, 0);
    expect(total).toBeLessThanOrEqual(1300);
  });
});
