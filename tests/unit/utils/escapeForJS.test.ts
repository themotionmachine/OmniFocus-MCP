import { describe, expect, it } from 'vitest';
import { escapeForJS } from '../../../src/utils/escapeForJS.js';

describe('escapeForJS', () => {
  it('should escape backslashes', () => {
    expect(escapeForJS('a\\b')).toBe('a\\\\b');
  });

  it('should escape double quotes', () => {
    expect(escapeForJS('say "hello"')).toBe('say \\"hello\\"');
  });

  it('should escape newlines', () => {
    expect(escapeForJS('line1\nline2')).toBe('line1\\nline2');
  });

  it('should escape carriage returns', () => {
    expect(escapeForJS('line1\rline2')).toBe('line1\\rline2');
  });

  it('should escape tabs', () => {
    expect(escapeForJS('col1\tcol2')).toBe('col1\\tcol2');
  });

  it('should pass through safe strings unchanged', () => {
    expect(escapeForJS('hello world 123')).toBe('hello world 123');
  });

  it('should handle empty string', () => {
    expect(escapeForJS('')).toBe('');
  });

  it('should escape JS line separator U+2028', () => {
    expect(escapeForJS('a\u2028b')).toBe('a\\u2028b');
  });

  it('should escape JS paragraph separator U+2029', () => {
    expect(escapeForJS('a\u2029b')).toBe('a\\u2029b');
  });

  it('should handle multiple escape sequences in one string', () => {
    expect(escapeForJS('a\\b"c\nd\re\tf')).toBe('a\\\\b\\"c\\nd\\re\\tf');
  });
});
