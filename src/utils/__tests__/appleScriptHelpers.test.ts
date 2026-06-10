import { describe, it, expect } from 'vitest';
import { escapeAppleScriptString } from '../appleScriptHelpers.js';

describe('escapeAppleScriptString', () => {
  it('passes plain strings through unchanged', () => {
    expect(escapeAppleScriptString('Buy milk')).toBe('Buy milk');
  });

  it('escapes double quotes', () => {
    expect(escapeAppleScriptString('say "hello"')).toBe('say \\"hello\\"');
  });

  it('escapes backslashes', () => {
    expect(escapeAppleScriptString('C:\\path')).toBe('C:\\\\path');
  });

  it('escapes backslash-quote sequences without double-processing', () => {
    expect(escapeAppleScriptString('a\\"b')).toBe('a\\\\\\"b');
  });

  it('flattens newlines to spaces by default', () => {
    expect(escapeAppleScriptString('line1\nline2\rline3\r\nline4')).toBe(
      'line1 line2 line3  line4'
    );
  });

  it('preserves newlines as linefeed splices when requested', () => {
    expect(escapeAppleScriptString('line1\nline2', { preserveNewlines: true })).toBe(
      'line1" & linefeed & "line2'
    );
  });

  it('treats \\r\\n as a single linefeed splice', () => {
    expect(escapeAppleScriptString('a\r\nb', { preserveNewlines: true })).toBe(
      'a" & linefeed & "b'
    );
  });

  it('escapes quotes before splicing linefeeds so splices stay intact', () => {
    expect(escapeAppleScriptString('say "hi"\nbye', { preserveNewlines: true })).toBe(
      'say \\"hi\\"" & linefeed & "bye'
    );
  });

  it('handles empty strings', () => {
    expect(escapeAppleScriptString('')).toBe('');
  });
});
