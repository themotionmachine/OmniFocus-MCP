import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportPerspective } from '../../../src/tools/primitives/exportPerspective.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('exportPerspective', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns metadata when saveTo is omitted (FR-027, FR-030)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      fileName: 'Work.ofocus-perspective',
      fileType: 'com.omnigroup.omnifocus.perspective',
      message: 'Export metadata for Work perspective'
    });

    const result = await exportPerspective({ name: 'Work' });

    expect(result.success).toBe(true);
    if (result.success && 'fileName' in result) {
      expect(result.fileName).toBe('Work.ofocus-perspective');
      expect(result.fileType).toBe('com.omnigroup.omnifocus.perspective');
    }
  });

  it('writes file and returns filePath when saveTo is provided (FR-028, FR-029)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      filePath: '/tmp/exports/Work.ofocus-perspective',
      message: 'Exported Work perspective to /tmp/exports/Work.ofocus-perspective'
    });

    const result = await exportPerspective({ name: 'Work', saveTo: '/tmp/exports' });

    expect(result.success).toBe(true);
    if (result.success && 'filePath' in result) {
      expect(result.filePath).toContain('Work.ofocus-perspective');
    }
  });

  it('returns BUILTIN_NOT_EXPORTABLE for built-in perspectives (FR-026)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'Built-in perspectives cannot be exported',
      code: 'BUILTIN_NOT_EXPORTABLE'
    });

    const result = await exportPerspective({ name: 'Inbox' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('BUILTIN_NOT_EXPORTABLE');
    }
  });

  it('returns NOT_FOUND error for unknown perspective (FR-031)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Perspective 'Unknown' not found",
      code: 'NOT_FOUND'
    });

    const result = await exportPerspective({ name: 'Unknown' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('returns INVALID_DIRECTORY error for non-existent directory (FR-032)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'Directory does not exist: /nonexistent/path',
      code: 'INVALID_DIRECTORY'
    });

    const result = await exportPerspective({
      name: 'Work',
      saveTo: '/nonexistent/path'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_DIRECTORY');
    }
  });

  it('returns DISAMBIGUATION_REQUIRED with candidates', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Multiple perspectives match 'Work'",
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { name: 'Work Personal', identifier: 'id1' },
        { name: 'Work Projects', identifier: 'id2' }
      ]
    });

    const result = await exportPerspective({ name: 'Work' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.candidates).toHaveLength(2);
    }
  });

  it('includes saveTo path in script when provided', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      filePath: '/tmp/Work.ofocus-perspective',
      message: 'Exported'
    });

    await exportPerspective({ name: 'Work', saveTo: '/tmp/exports' });

    const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(script).toContain('/tmp/exports');
  });

  it('uses identifier lookup when identifier is provided', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      fileName: 'Work.ofocus-perspective',
      fileType: 'com.omnigroup.omnifocus.perspective',
      message: 'Metadata'
    });

    await exportPerspective({ identifier: 'abc123' });

    const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(script).toContain('abc123');
  });

  it('calls executeOmniJS once', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      fileName: 'Work.ofocus-perspective',
      fileType: 'com.omnigroup.omnifocus.perspective',
      message: 'Metadata'
    });

    await exportPerspective({ name: 'Work' });

    expect(vi.mocked(executeOmniJS)).toHaveBeenCalledOnce();
  });
});
