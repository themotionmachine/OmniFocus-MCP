import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync, realpathSync } from 'fs';
import { tmpdir, homedir } from 'os';
import { join } from 'path';
import { writeOutputFile } from './outputFile.js';

describe('writeOutputFile', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'of-mcp-out-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the text and returns the resolved path', () => {
    const path = join(dir, 'result.txt');
    const written = writeOutputFile(path, 'hello\nworld');
    expect(readFileSync(path, 'utf8')).toBe('hello\nworld');
    expect(written).toBe(join(realpathSync(dir), 'result.txt'));
  });

  it('overwrites an existing regular file', () => {
    const path = join(dir, 'result.txt');
    writeFileSync(path, 'old contents that are longer');
    writeOutputFile(path, 'new');
    expect(readFileSync(path, 'utf8')).toBe('new');
  });

  it('accepts /tmp, which is a symlink to /private/tmp on macOS', () => {
    const sub = mkdtempSync('/tmp/of-mcp-out-');
    try {
      writeOutputFile(join(sub, 'x.txt'), 'ok');
      expect(readFileSync(join(sub, 'x.txt'), 'utf8')).toBe('ok');
    } finally {
      rmSync(sub, { recursive: true, force: true });
    }
  });

  it('rejects a relative path', () => {
    expect(() => writeOutputFile('result.txt', 'x')).toThrow(/absolute/);
  });

  it('rejects a path outside the temp directories', () => {
    const path = join(homedir(), 'of-mcp-should-not-exist.txt');
    expect(() => writeOutputFile(path, 'x')).toThrow(/temp director/);
    expect(existsSync(path)).toBe(false);
  });

  it('rejects .. that climbs out of a temp directory', () => {
    const path = join(dir, '..', '..', '..', '..', '..', 'etc', 'of-mcp.txt');
    expect(() => writeOutputFile(path, 'x')).toThrow();
  });

  it('rejects a parent directory that is a symlink escaping the temp dirs', () => {
    const outside = mkdtempSync(join(homedir(), '.of-mcp-escape-'));
    try {
      symlinkSync(outside, join(dir, 'link'));
      expect(() => writeOutputFile(join(dir, 'link', 'x.txt'), 'x')).toThrow(/temp director/);
      expect(existsSync(join(outside, 'x.txt'))).toBe(false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('refuses to follow a symlink at the final path component', () => {
    const target = join(dir, 'target.txt');
    writeFileSync(target, 'untouched');
    symlinkSync(target, join(dir, 'link.txt'));
    expect(() => writeOutputFile(join(dir, 'link.txt'), 'x')).toThrow(/symlink/);
    expect(readFileSync(target, 'utf8')).toBe('untouched');
  });

  it('requires the parent directory to exist (no mkdir)', () => {
    expect(() => writeOutputFile(join(dir, 'missing', 'x.txt'), 'x')).toThrow(/does not exist/);
    expect(existsSync(join(dir, 'missing'))).toBe(false);
  });

  it('rejects a directory as the target', () => {
    mkdirSync(join(dir, 'sub'));
    expect(() => writeOutputFile(join(dir, 'sub'), 'x')).toThrow();
  });
});
