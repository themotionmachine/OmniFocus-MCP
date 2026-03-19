import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateMoveSectionsScript,
  moveSections
} from '../../../src/tools/primitives/moveSections.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('moveSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with per-item results for folders', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [{ itemId: 'folder1', itemName: 'My Folder', itemType: 'folder', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });

    const result = await moveSections({
      items: [{ id: 'folder1' }],
      position: { placement: 'ending' }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results[0].itemType).toBe('folder');
    }
  });

  it('returns success with per-item results for projects', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [{ itemId: 'proj1', itemName: 'My Project', itemType: 'project', success: true }],
      summary: { total: 1, succeeded: 1, failed: 0 }
    });

    const result = await moveSections({
      items: [{ id: 'proj1' }],
      position: { placement: 'ending' }
    });

    expect(result.success).toBe(true);
  });

  it('returns error when target not found', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Folder 'bad-id' not found",
      code: 'TARGET_NOT_FOUND'
    });

    const result = await moveSections({
      items: [{ id: 'folder1' }],
      position: { placement: 'beginning', relativeTo: 'bad-id' }
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('TARGET_NOT_FOUND');
  });

  it('handles partial failure in mixed batch', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      results: [
        { itemId: 'folder1', itemName: 'My Folder', itemType: 'folder', success: true },
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

    const result = await moveSections({
      items: [{ id: 'folder1' }, { id: 'bad' }],
      position: { placement: 'ending' }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.failed).toBe(1);
    }
  });
});

describe('generateMoveSectionsScript', () => {
  it('generates script with library root ending placement', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'folder1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('library');
    expect(script).toContain('ending');
    expect(script).toContain('moveSections');
    expect(script).toContain('(function()');
  });

  it('generates script with library root beginning placement', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'folder1' }],
      position: { placement: 'beginning' }
    });

    expect(script).toContain('library');
    expect(script).toContain('beginning');
  });

  it('generates script with folder target via relativeTo (beginning)', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'proj1' }],
      position: { placement: 'beginning', relativeTo: 'folder-id' }
    });

    expect(script).toContain('folder-id');
    expect(script).toContain('Folder.byIdentifier');
  });

  it('generates script with before placement', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'proj1' }],
      position: { placement: 'before', relativeTo: 'sibling-id' }
    });

    expect(script).toContain('sibling-id');
    expect(script).toContain('before');
  });

  it('generates script with after placement', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'proj1' }],
      position: { placement: 'after', relativeTo: 'sibling-id' }
    });

    expect(script).toContain('sibling-id');
    expect(script).toContain('after');
  });

  it('generates Folder-then-Project probe resolution (AD-14)', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'section1' }],
      position: { placement: 'ending' }
    });

    // Should try Folder first then Project
    const folderIdx = script.indexOf('Folder.byIdentifier');
    const projectIdx = script.indexOf('Project.byIdentifier');
    expect(folderIdx).toBeGreaterThanOrEqual(0);
    expect(projectIdx).toBeGreaterThanOrEqual(0);
    expect(folderIdx).toBeLessThan(projectIdx);
  });

  it('generates itemType field set to folder or project', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'section1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain("'folder'");
    expect(script).toContain("'project'");
  });

  it('generates name-based search in both flattenedFolders and flattenedProjects', () => {
    const script = generateMoveSectionsScript({
      items: [{ name: 'My Section' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('flattenedFolders');
    expect(script).toContain('flattenedProjects');
  });

  it('generates DISAMBIGUATION_REQUIRED for name lookup', () => {
    const script = generateMoveSectionsScript({
      items: [{ name: 'Ambiguous Section' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('DISAMBIGUATION_REQUIRED');
  });

  it('generates post-move verification (AD-12)', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'folder1' }],
      position: { placement: 'ending' }
    });

    // Should verify parentFolder after move
    expect(script).toContain('parentFolder');
  });

  it('generates TARGET_NOT_FOUND for invalid relativeTo target', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'folder1' }],
      position: { placement: 'before', relativeTo: 'sibling-id' }
    });

    expect(script).toContain('TARGET_NOT_FOUND');
  });

  it('generates RELATIVE_TARGET_NOT_FOUND for missing sibling', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'folder1' }],
      position: { placement: 'before', relativeTo: 'sibling-id' }
    });

    expect(script).toContain('RELATIVE_TARGET_NOT_FOUND');
  });

  it('generates NOT_FOUND for missing items', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'section1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('NOT_FOUND');
  });

  it('generates OPERATION_FAILED for per-item try-catch', () => {
    const script = generateMoveSectionsScript({
      items: [{ id: 'section1' }],
      position: { placement: 'ending' }
    });

    expect(script).toContain('OPERATION_FAILED');
  });
});
