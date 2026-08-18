import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname, basename } from 'path';

/**
 * Issue #105: tool schema descriptions load into EVERY session that touches the
 * server, before a single call is made. At their peak they cost ~13k chars
 * (~3.4k tokens) — more than a typical week of actual result traffic. The diet
 * brought them to ~7k; these ceilings keep incremental edits from silently
 * growing them back. If a new tool or a load-bearing clarification genuinely
 * needs room, raise the ceiling in the same PR — visibly.
 *
 * The measurement weights shared shape modules by how many tools import them.
 * Sharing a Zod object in *source* does not share it on the *wire*: each tool's
 * serialized JSON schema carries its own copy of every description. An unweighted
 * count made the `repeat` shape (#116) look ~1.3k chars cheaper than it is.
 */

const definitionsDir = dirname(fileURLToPath(import.meta.url));

/** Matches `.describe("…")` and `.describe('…')` — both styles are in use. */
const DESCRIBE_RE = /\.describe\(\s*(["'])((?:(?!\1)[^\\]|\\.)*)\1\s*\)/g;

function describeChars(source: string): number {
  return [...source.matchAll(DESCRIBE_RE)].reduce((sum, m) => sum + m[2].length, 0);
}

function definitionFiles(): string[] {
  return readdirSync(definitionsDir).filter(f => f.endsWith('.ts') && !f.includes('test'));
}

/**
 * Per-file description cost, with shared modules multiplied by their importer
 * count — i.e. what the client actually receives across all tool schemas.
 */
function weightedCosts(): Record<string, number> {
  const files = definitionFiles();
  const sources = new Map(files.map(f => [f, readFileSync(join(definitionsDir, f), 'utf8')]));
  const costs: Record<string, number> = {};

  for (const file of files) {
    const own = describeChars(sources.get(file)!);
    if (own === 0) continue;
    const stem = basename(file, '.ts');
    // How many OTHER definition files import this one? A module nobody imports
    // is a tool schema in its own right and counts once.
    const importers = files.filter(
      other => other !== file && new RegExp(`from\\s+['"]\\./${stem}\\.js['"]`).test(sources.get(other)!)
    ).length;
    costs[file] = own * Math.max(1, importers);
  }
  return costs;
}

describe('schema description budget (#105)', () => {
  it('keeps the wire-weighted total across all tools under budget', () => {
    const costs = weightedCosts();
    const total = Object.values(costs).reduce((a, b) => a + b, 0);
    // Raised from 6500 to 8200 in #116 to fund the `repeat` shape on four write
    // tools (~1.7k weighted). Deliberate, not drift.
    expect(total).toBeLessThanOrEqual(8200);
  });

  it('keeps query_omnifocus — the historical worst offender — under its own budget', () => {
    // 5,473 chars before the diet; the fields list is most of what remains.
    const source = readFileSync(join(definitionsDir, 'queryOmnifocus.ts'), 'utf8');
    expect(describeChars(source)).toBeLessThanOrEqual(2800);
  });

  it('keeps the shared repeat shape lean, since every character is paid 4x', () => {
    const source = readFileSync(join(definitionsDir, 'repeatSchema.ts'), 'utf8');
    expect(describeChars(source)).toBeLessThanOrEqual(500);
  });

  it('keeps the server.tool() registration descriptions under budget', () => {
    const source = readFileSync(join(definitionsDir, '..', '..', 'buildServer.ts'), 'utf8');
    const matches = [...source.matchAll(/server\.tool\(\s*"[^"]+",\s*"((?:[^"\\]|\\.)*)"/g)];
    expect(matches.length).toBeGreaterThan(0);
    const total = matches.reduce((sum, m) => sum + m[1].length, 0);
    expect(total).toBeLessThanOrEqual(1300);
  });

  it('actually detects sharing — repeatSchema is weighted above its raw size', () => {
    // Guards the weighting itself: if the import detection breaks, the budget
    // silently reverts to undercounting shared shapes.
    const raw = describeChars(readFileSync(join(definitionsDir, 'repeatSchema.ts'), 'utf8'));
    expect(weightedCosts()['repeatSchema.ts']).toBeGreaterThan(raw);
  });
});
