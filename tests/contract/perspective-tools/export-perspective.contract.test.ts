import { describe, expect, it } from 'vitest';
import {
  ExportPerspectiveErrorSchema,
  ExportPerspectiveFileSuccessSchema,
  ExportPerspectiveInputSchema,
  ExportPerspectiveMetadataSuccessSchema,
  ExportPerspectiveResponseSchema
} from '../../../src/contracts/perspective-tools/index.js';

describe('ExportPerspectiveInputSchema', () => {
  it('accepts name only', () => {
    const result = ExportPerspectiveInputSchema.safeParse({ name: 'Work' });
    expect(result.success).toBe(true);
  });

  it('accepts identifier only', () => {
    const result = ExportPerspectiveInputSchema.safeParse({ identifier: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('accepts name with saveTo', () => {
    const result = ExportPerspectiveInputSchema.safeParse({
      name: 'Work',
      saveTo: '/tmp/exports'
    });
    expect(result.success).toBe(true);
  });

  it('accepts identifier with saveTo', () => {
    const result = ExportPerspectiveInputSchema.safeParse({
      identifier: 'abc123',
      saveTo: '/tmp/exports'
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty input (no name or identifier)', () => {
    const result = ExportPerspectiveInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty saveTo string', () => {
    const result = ExportPerspectiveInputSchema.safeParse({
      name: 'Work',
      saveTo: ''
    });
    expect(result.success).toBe(false);
  });

  it('rejects relative saveTo path', () => {
    const result = ExportPerspectiveInputSchema.safeParse({
      name: 'Work',
      saveTo: 'relative/path'
    });
    expect(result.success).toBe(false);
  });

  it('rejects saveTo with path traversal', () => {
    const result = ExportPerspectiveInputSchema.safeParse({
      name: 'Work',
      saveTo: '/tmp/../etc'
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid absolute saveTo path', () => {
    const result = ExportPerspectiveInputSchema.safeParse({
      name: 'Work',
      saveTo: '/tmp/exports'
    });
    expect(result.success).toBe(true);
  });
});

describe('ExportPerspectiveFileSuccessSchema', () => {
  it('accepts valid file success response', () => {
    const result = ExportPerspectiveFileSuccessSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      filePath: '/tmp/exports/Work.ofocus-perspective',
      message: 'Exported successfully'
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing filePath', () => {
    const result = ExportPerspectiveFileSuccessSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      message: 'Exported'
    });
    expect(result.success).toBe(false);
  });
});

describe('ExportPerspectiveMetadataSuccessSchema', () => {
  it('accepts valid metadata success response', () => {
    const result = ExportPerspectiveMetadataSuccessSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      fileName: 'Work.ofocus-perspective',
      fileType: 'com.omnigroup.omnifocus.perspective',
      message: 'Export metadata retrieved'
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fileName', () => {
    const result = ExportPerspectiveMetadataSuccessSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      fileType: 'com.omnigroup.omnifocus.perspective',
      message: 'Export metadata'
    });
    expect(result.success).toBe(false);
  });
});

describe('ExportPerspectiveErrorSchema', () => {
  it('accepts NOT_FOUND error', () => {
    const result = ExportPerspectiveErrorSchema.safeParse({
      success: false,
      error: "Perspective 'Unknown' not found",
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });

  it('accepts BUILTIN_NOT_EXPORTABLE error', () => {
    const result = ExportPerspectiveErrorSchema.safeParse({
      success: false,
      error: 'Built-in perspectives cannot be exported',
      code: 'BUILTIN_NOT_EXPORTABLE'
    });
    expect(result.success).toBe(true);
  });

  it('accepts INVALID_DIRECTORY error', () => {
    const result = ExportPerspectiveErrorSchema.safeParse({
      success: false,
      error: 'Directory does not exist: /invalid/path',
      code: 'INVALID_DIRECTORY'
    });
    expect(result.success).toBe(true);
  });

  it('accepts DISAMBIGUATION_REQUIRED with candidates', () => {
    const result = ExportPerspectiveErrorSchema.safeParse({
      success: false,
      error: "Multiple perspectives match 'Work'",
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { name: 'Work Personal', identifier: 'id1' },
        { name: 'Work Projects', identifier: 'id2' }
      ]
    });
    expect(result.success).toBe(true);
  });
});

describe('ExportPerspectiveResponseSchema (z.union)', () => {
  it('parses file success response', () => {
    const result = ExportPerspectiveResponseSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      filePath: '/tmp/Work.ofocus-perspective',
      message: 'Exported'
    });
    expect(result.success).toBe(true);
  });

  it('parses metadata success response', () => {
    const result = ExportPerspectiveResponseSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      fileName: 'Work.ofocus-perspective',
      fileType: 'com.omnigroup.omnifocus.perspective',
      message: 'Metadata retrieved'
    });
    expect(result.success).toBe(true);
  });

  it('parses error response', () => {
    const result = ExportPerspectiveResponseSchema.safeParse({
      success: false,
      error: 'Not exportable',
      code: 'BUILTIN_NOT_EXPORTABLE'
    });
    expect(result.success).toBe(true);
  });
});
