import { describe, it, expect } from 'vitest';
import { escapeContent } from './scriptExecution.js';

describe('escapeContent', () => {
  it('escapes backslashes', () => {
    expect(escapeContent('hello\\world')).toBe('hello\\\\world');
  });

  it('escapes backticks', () => {
    expect(escapeContent('hello`world')).toBe('hello\\`world');
  });

  it('escapes dollar signs', () => {
    expect(escapeContent('hello$world')).toBe('hello\\$world');
  });

  it('escapes multiple special characters', () => {
    expect(escapeContent('$var = `cmd` \\ end')).toBe('\\$var = \\`cmd\\` \\\\ end');
  });

  it('leaves normal text unchanged', () => {
    expect(escapeContent('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(escapeContent('')).toBe('');
  });

  it('escapes backslashes before other chars (order matters)', () => {
    // A backslash followed by a backtick should produce \\`
    expect(escapeContent('\\`')).toBe('\\\\\\`');
  });
});
