import { describe, it, expect } from 'vitest';
import { generateFolderLookupScript, generateProjectLookupScript } from './appleScriptHelpers.js';

describe('generateFolderLookupScript', () => {
  it('generates simple name lookup for single-component path', () => {
    const result = generateFolderLookupScript('Work', 'destFolder', 'error');
    expect(result).toContain('first flattened folder where name = "Work"');
    expect(result).not.toContain('pathComponents');
    expect(result).not.toContain('ancestorOk');
  });

  it('generates ancestor chain walk for multi-segment path', () => {
    const result = generateFolderLookupScript('Work/Engineering', 'destFolder', 'error');
    expect(result).toContain('"Work"');
    expect(result).toContain('"Engineering"');
    expect(result).toContain('pathComponents');
    expect(result).toContain('ancestorOk');
    expect(result).toContain('name of aFolder = "Engineering"');
    expect(result).toContain('container of currentItem');
  });

  it('handles three-level paths correctly', () => {
    const result = generateFolderLookupScript('A/B/C', 'theFolder', 'error');
    expect(result).toContain('"A", "B", "C"');
    expect(result).toContain('name of aFolder = "C"');
    expect(result).toContain('pathComponents');
  });

  it('escapes special characters in folder names', () => {
    const result = generateFolderLookupScript('My "Folder"', 'f', 'error');
    expect(result).toContain('My \\"Folder\\"');
  });

  it('escapes backslashes in folder names', () => {
    const result = generateFolderLookupScript('Back\\slash', 'f', 'error');
    expect(result).toContain('Back\\\\slash');
  });

  it('escapes special characters in path segments', () => {
    const result = generateFolderLookupScript('Parent/Child "Folder"', 'f', 'error');
    expect(result).toContain('Child \\"Folder\\"');
    expect(result).toContain('"Parent"');
  });

  it('returns missing value for empty input', () => {
    const result = generateFolderLookupScript('', 'f', 'error');
    expect(result).toContain('set f to missing value');
    expect(result).not.toContain('flattened folder');
  });

  it('returns missing value for slash-only input', () => {
    const result = generateFolderLookupScript('/', 'f', 'error');
    expect(result).toContain('set f to missing value');
  });

  it('uses the provided variable name', () => {
    const result = generateFolderLookupScript('Work', 'myVar', 'error');
    expect(result).toContain('set myVar to missing value');
    expect(result).toContain('set myVar to first flattened folder');
    expect(result).toContain('if myVar is missing value');
  });

  it('embeds error return JSON in the return statement', () => {
    const errorJson = '{\\\"success\\\":false}';
    const result = generateFolderLookupScript('Work', 'f', errorJson);
    expect(result).toContain(`return "${errorJson}"`);
  });

  it('checks folder not found with error return for multi-segment paths', () => {
    const errorJson = 'not-found-error';
    const result = generateFolderLookupScript('A/B', 'f', errorJson);
    expect(result).toContain('if f is missing value');
    expect(result).toContain(`return "${errorJson}"`);
  });

  it('strips empty segments from paths with trailing slashes', () => {
    const result = generateFolderLookupScript('Work/', 'f', 'error');
    // Should behave like single "Work" — no ancestor walk
    expect(result).toContain('first flattened folder where name = "Work"');
    expect(result).not.toContain('pathComponents');
  });
});

describe('generateProjectLookupScript', () => {
  it('generates simple name lookup for unqualified project name', () => {
    const result = generateProjectLookupScript('Marketing', 'destProject', 'error');
    expect(result).toContain('first flattened project whose name is "Marketing"');
    expect(result).not.toContain('folderPath');
  });

  it('generates folder-qualified lookup for path', () => {
    const result = generateProjectLookupScript('Work/Community Outreach', 'destProject', 'error');
    expect(result).toContain('"Community Outreach"');
    expect(result).toContain('folderPath');
    expect(result).toContain('"Work"');
    expect(result).toContain('container of aProject');
    expect(result).toContain('ancestorOk');
  });

  it('handles nested folder paths', () => {
    const result = generateProjectLookupScript('Personal/Committees/Outreach', 'p', 'error');
    expect(result).toContain('"Personal", "Committees"');
    expect(result).toContain('"Outreach"');
    expect(result).toContain('folderPath');
  });

  it('returns missing value for empty input', () => {
    const result = generateProjectLookupScript('', 'p', 'error');
    expect(result).toContain('set p to missing value');
    expect(result).not.toContain('flattened projects');
  });

  it('escapes special characters in project name', () => {
    const result = generateProjectLookupScript('My "Project"', 'p', 'error');
    expect(result).toContain('My \\"Project\\"');
  });

  it('uses the provided variable name', () => {
    const result = generateProjectLookupScript('Test', 'myProj', 'error');
    expect(result).toContain('set myProj to missing value');
    expect(result).toContain('set myProj to first flattened project whose name is "Test"');
    expect(result).toContain('if myProj is missing value');
  });

  it('embeds error return JSON', () => {
    const errorJson = '{\\\"success\\\":false}';
    const result = generateProjectLookupScript('Test', 'p', errorJson);
    expect(result).toContain(`return "${errorJson}"`);
  });
});
