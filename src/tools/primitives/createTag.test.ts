import { describe, it, expect } from 'vitest';
import { generateAppleScript, CreateTagParams } from './createTag.js';

describe('createTag generateAppleScript', () => {
  it('creates a top-level tag', () => {
    const script = generateAppleScript({ name: 'Errands' });
    expect(script).toContain('make new tag with properties {name:"Errands"}');
    expect(script).not.toContain('at end of tags of parentTag');
    expect(script).not.toContain('Parent tag not found');
  });

  it('nests under a parent tag by name', () => {
    const script = generateAppleScript({ name: 'Groceries', parentTagName: 'Errands' });
    expect(script).toContain('first flattened tag where name = "Errands"');
    expect(script).toContain('make new tag with properties {name:"Groceries"} at end of tags of parentTag');
    expect(script).toContain('Parent tag not found: Errands');
  });

  it('nests under a parent tag by id', () => {
    const script = generateAppleScript({ name: 'Groceries', parentTagID: 'abc123' });
    expect(script).toContain('first flattened tag whose id is "abc123"');
    expect(script).toContain('make new tag with properties {name:"Groceries"} at end of tags of parentTag');
    expect(script).toContain('Parent tag not found: abc123');
  });

  it('prefers parentTagID over parentTagName when both are given', () => {
    const script = generateAppleScript({ name: 'X', parentTagID: 'id99', parentTagName: 'ByName' });
    expect(script).toContain('first flattened tag whose id is "id99"');
    expect(script).not.toContain('first flattened tag where name = "ByName"');
  });

  it('escapes special characters in the tag name', () => {
    const script = generateAppleScript({ name: 'My "Tag"' });
    expect(script).toContain('My \\"Tag\\"');
  });

  it('escapes special characters in the parent name', () => {
    const script = generateAppleScript({ name: 'Child', parentTagName: 'Pa "rent"' });
    expect(script).toContain('Pa \\"rent\\"');
  });

  it('returns success JSON shape with tagId', () => {
    const script = generateAppleScript({ name: 'T' });
    expect(script).toContain('set tagId to id of newTag as string');
    expect(script).toContain('\\"success\\":true');
    expect(script).toContain('\\"tagId\\":');
  });
});
