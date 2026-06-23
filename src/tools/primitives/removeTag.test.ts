import { describe, it, expect } from 'vitest';
import { generateAppleScript } from './removeTag.js';

describe('removeTag generateAppleScript', () => {
  it('generates tag removal by name', () => {
    const script = generateAppleScript({ name: 'Old Tag' });

    expect(script).toContain('first flattened tag whose name is "Old Tag"');
    expect(script).toContain('delete foundTag');
  });

  it('generates tag removal by id', () => {
    const script = generateAppleScript({ id: 'abc123' });

    expect(script).toContain('first flattened tag whose id is "abc123"');
    expect(script).toContain('delete foundTag');
  });

  it('falls back to name when id lookup fails', () => {
    const script = generateAppleScript({ id: 'abc123', name: 'Old Tag' });

    expect(script).toContain('first flattened tag whose id is "abc123"');
    expect(script).toContain('if foundTag is missing value then');
    expect(script).toContain('first flattened tag whose name is "Old Tag"');
  });

  it('returns error when neither id nor name provided', () => {
    const script = generateAppleScript({});

    expect(script).toContain('Either id or name must be provided');
  });

  it('escapes special characters in tag identifiers', () => {
    const script = generateAppleScript({ name: 'My "Tag"' });

    expect(script).toContain('My \\"Tag\\"');
  });
});
