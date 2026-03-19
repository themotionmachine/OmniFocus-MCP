import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  duplicateSections,
  generateDuplicateSectionsScript
} from '../../../src/tools/primitives/duplicateSections.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('duplicateSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with newId and newName for each copy', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: 'proj1',
          itemName: 'My Project',
          itemType: 'project',
          success: true,
          newId: 'copy-id',
          newName: 'My Project'
        }
      ],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });

    const result = await duplicateSections({
      items: [{ id: 'proj1' }],
      position: { placement: 'ending' }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].newId).toBe('copy-id');
    }
  });

  it('returns error when target not found', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Folder 'bad-id' not found",
      code: 'TARGET_NOT_FOUND'
    });

    const result = await duplicateSections({
      items: [{ id: 'proj1' }],
      position: { placement: 'beginning', relativeTo: 'bad-id' }
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('TARGET_NOT_FOUND');
  });

  it('handles partial failure', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        {
          itemId: 'proj1',
          itemName: 'Project 1',
          itemType: 'project',
          success: true,
          newId: 'copy1',
          newName: 'Project 1'
        },
        {
          itemId: 'bad',
          itemName: '',
          itemType: 'folder',
          success: false,
          error: 'Not found',
          code: 'NOT_FOUND'
        }
      ],
      summary: { total: 2, succeeded: 1, failed: 1 }
    });

    const result = await duplicateSections({
      items: [{ id: 'proj1' }, { id: 'bad' }],
      position: { placement: 'ending' }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.failed).toBe(1);
    }
  });
});

describe('generateDuplicateSectionsScript', () => {
  it('generates script with library root ending placement', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'proj1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('library');
    expect(script).toContain('duplicateSections');
    expect(script).toContain('(function()');
  });

  it('generates script calling duplicateSections with array and position', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'proj1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('duplicateSections([');
  });

  it('generates script accessing [0] of duplicateSections result', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'proj1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('[0]');
  });

  it('generates Folder-then-Project probe resolution (AD-14)', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'section1' }],
      position: { placement: 'ending' }
    });

    const folderIdx = script.indexOf('Folder.byIdentifier');
    const projectIdx = script.indexOf('Project.byIdentifier');
    expect(folderIdx).toBeGreaterThanOrEqual(0);
    expect(projectIdx).toBeGreaterThanOrEqual(0);
    expect(folderIdx).toBeLessThan(projectIdx);
  });

  it('generates newId and newName extraction', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'proj1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('newId');
    expect(script).toContain('newName');
    expect(script).toContain('primaryKey');
  });

  it('generates folder target via relativeTo', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'proj1' }],
      position: { placement: 'beginning', relativeTo: 'folder-id' }
    });

    expect(script).toContain('folder-id');
    expect(script).toContain('Folder.byIdentifier');
  });

  it('generates before placement with relativeTo', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'proj1' }],
      position: { placement: 'before', relativeTo: 'sibling-id' }
    });

    expect(script).toContain('sibling-id');
    expect(script).toContain('RELATIVE_TARGET_NOT_FOUND');
  });

  it('generates name-based search in both flattenedFolders and flattenedProjects', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ name: 'My Section' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('flattenedFolders');
    expect(script).toContain('flattenedProjects');
  });

  it('generates DISAMBIGUATION_REQUIRED for name lookup', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ name: 'Ambiguous Section' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('DISAMBIGUATION_REQUIRED');
  });

  it('generates NOT_FOUND for missing items', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'section1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('NOT_FOUND');
  });

  it('generates OPERATION_FAILED for per-item try-catch', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'section1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('OPERATION_FAILED');
  });

  it('generates TARGET_NOT_FOUND for invalid relativeTo', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'proj1' }],
      position: { placement: 'beginning', relativeTo: 'folder-id' }
    });

    expect(script).toContain('TARGET_NOT_FOUND');
  });

  it('generates itemType field correctly for folders and projects', () => {
    const script = generateDuplicateSectionsScript({
      items: [{ id: 'section1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain("'folder'");
    expect(script).toContain("'project'");
  });
});
