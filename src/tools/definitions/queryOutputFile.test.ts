import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, existsSync, realpathSync } from 'fs';
import { tmpdir, homedir } from 'os';
import { join } from 'path';

vi.mock('../primitives/queryOmnifocus.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../primitives/queryOmnifocus.js')>();
  return { ...actual, queryOmnifocus: vi.fn() };
});

import { queryOmnifocus } from '../primitives/queryOmnifocus.js';
import { handler } from './queryOmnifocus.js';

const mocked = vi.mocked(queryOmnifocus);
const extra = {} as any;

describe('query_omnifocus outputFile', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'of-mcp-q-'));
    mocked.mockReset();
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('writes the same text the tool would return inline, and returns a summary', async () => {
    const items = [
      { id: 'aaaaaaaaaaa', name: 'Wait for PR', note: 'https://github.com/o/r/pull/1', tagNames: ['Waiting 🕰'] },
      { id: 'bbbbbbbbbbb', name: 'Other' },
    ];
    mocked.mockResolvedValue({ success: true, items, count: 2 } as any);
    const inline = await handler({ entity: 'tasks' }, extra);

    const path = join(dir, 'out.txt');
    const res = await handler({ entity: 'tasks', outputFile: path }, extra);

    expect(readFileSync(path, 'utf8')).toBe(inline.content[0].text);
    expect(res.isError).toBeUndefined();
    expect(res.content[0].text).toMatch(/^Wrote 2 tasks \([\d,]+ chars\) to /);
    expect(res.content[0].text).toContain(join(realpathSync(dir), 'out.txt'));
    expect(res.content[0].text).not.toContain('Wait for PR');
  });

  it('does not pass outputFile through to the query', async () => {
    mocked.mockResolvedValue({ success: true, items: [], count: 0 } as any);
    await handler({ entity: 'tasks', outputFile: join(dir, 'o.txt') }, extra);
    expect(mocked.mock.calls[0][0]).not.toHaveProperty('outputFile');
  });

  it('writes an empty result too, and says what it was', async () => {
    mocked.mockResolvedValue({ success: true, items: [], count: 0 } as any);
    const path = join(dir, 'empty.txt');
    const res = await handler({ entity: 'tasks', outputFile: path }, extra);
    expect(readFileSync(path, 'utf8')).toBe('No tasks found matching the specified criteria.');
    expect(res.content[0].text).toContain('No tasks found');
  });

  it('writes a query failure to the file and stays an error', async () => {
    mocked.mockResolvedValue({ success: false, error: 'boom' } as any);
    const path = join(dir, 'err.txt');
    const res = await handler({ entity: 'tasks', outputFile: path }, extra);
    expect(readFileSync(path, 'utf8')).toBe('Query failed: boom');
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/^Query failed; wrote the error/);
  });

  it('rejects a relative path without writing', async () => {
    mocked.mockResolvedValue({ success: true, items: [], count: 0 } as any);
    const res = await handler({ entity: 'tasks', outputFile: 'out.txt' }, extra);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/absolute/);
  });

  it('rejects a path outside the temp directories without writing', async () => {
    mocked.mockResolvedValue({ success: true, items: [], count: 0 } as any);
    const path = join(homedir(), 'of-mcp-should-not-exist.txt');
    const res = await handler({ entity: 'tasks', outputFile: path }, extra);
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/temp director/);
    expect(existsSync(path)).toBe(false);
  });
});
