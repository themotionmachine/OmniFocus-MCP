import { describe, it, expect } from 'vitest';
import {
  escapeAppleScriptString,
  escapeForJsonInAppleScript,
  JSON_ESCAPE_HANDLER,
} from '../appleScriptHelpers.js';

/**
 * Render what an AppleScript double-quoted string literal evaluates to at
 * runtime: `\"` becomes `"`, `\\` becomes `\`. This is the missing half of the
 * pipeline that made #103 invisible to source-level assertions — the bug only
 * appears after AppleScript has *unescaped* the source.
 */
function renderAppleScriptLiteral(source: string): string {
  return source.replace(/\\(.)/g, '$1');
}

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

/**
 * Issue #103: values spliced into hand-built JSON payloads need TWO escape
 * layers (JSON first, then AppleScript). escapeAppleScriptString alone keeps the
 * *source* well-formed but re-materializes raw quotes in the *output*, so the
 * server reported an error for a write that succeeded.
 */
describe('escapeForJsonInAppleScript (#103)', () => {
  // Simulate the full pipeline: TS builds AppleScript source, AppleScript
  // evaluates the literal, JSON.parse reads the runtime output.
  const roundTrip = (value: string): string =>
    JSON.parse(`"${renderAppleScriptLiteral(escapeForJsonInAppleScript(value))}"`);

  it('round-trips double quotes — the exact repro from the issue', () => {
    const name = 'Start the resume refresh: retitle the headline to "policy infrastructure engineer"';
    expect(roundTrip(name)).toBe(name);
  });

  it('round-trips backslashes', () => {
    expect(roundTrip('path\\to\\thing')).toBe('path\\to\\thing');
  });

  it('round-trips newlines and tabs', () => {
    expect(roundTrip('line1\nline2\ttabbed')).toBe('line1\nline2\ttabbed');
  });

  it('passes curly quotes and inch marks through untouched', () => {
    // Curly quotes are JSON-safe as-is; straight quotes (inch marks) are the
    // dangerous ones. Both appeared in the week of traces that surfaced #103.
    const name = '“Smart” quotes and a 27" monitor';
    expect(roundTrip(name)).toBe(name);
  });

  it('is a plain passthrough for benign names', () => {
    expect(escapeForJsonInAppleScript('Buy milk')).toBe('Buy milk');
  });
});

describe('JSON_ESCAPE_HANDLER (#103)', () => {
  it('defines a jsonEscape handler', () => {
    expect(JSON_ESCAPE_HANDLER).toContain('on jsonEscape(theText)');
    expect(JSON_ESCAPE_HANDLER).toContain('end jsonEscape');
  });

  it('escapes backslash before quote — the order that cannot double-escape', () => {
    const backslashIndex = JSON_ESCAPE_HANDLER.indexOf('"\\\\"');
    const quoteIndex = JSON_ESCAPE_HANDLER.indexOf('"\\""');
    expect(backslashIndex).toBeGreaterThan(-1);
    expect(quoteIndex).toBeGreaterThan(-1);
    expect(backslashIndex).toBeLessThan(quoteIndex);
  });

  it('handles the control characters JSON.parse rejects raw', () => {
    for (const constant of ['linefeed', 'return', 'tab']) {
      expect(JSON_ESCAPE_HANDLER).toContain(`set AppleScript's text item delimiters to ${constant}`);
    }
  });

  it('restores the caller text item delimiters', () => {
    expect(JSON_ESCAPE_HANDLER).toContain('set oldDelims to');
    expect(JSON_ESCAPE_HANDLER).toContain('set AppleScript\'s text item delimiters to oldDelims');
  });
});
