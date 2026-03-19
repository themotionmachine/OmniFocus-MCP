import { describe, expect, it } from 'vitest';
import {
  SetPerspectiveIconErrorSchema,
  SetPerspectiveIconInputSchema,
  SetPerspectiveIconResponseSchema,
  SetPerspectiveIconSuccessSchema
} from '../../../src/contracts/perspective-tools/index.js';

describe('SetPerspectiveIconInputSchema - hex color validation', () => {
  it('accepts #RGB format', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: '#F00' });
    expect(result.success).toBe(true);
  });

  it('accepts #RGBA format', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: '#F00F' });
    expect(result.success).toBe(true);
  });

  it('accepts #RRGGBB format', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: '#FF0000' });
    expect(result.success).toBe(true);
  });

  it('accepts #RRGGBBAA format', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: '#FF000080' });
    expect(result.success).toBe(true);
  });

  it('accepts lowercase hex', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: '#ff0000' });
    expect(result.success).toBe(true);
  });

  it('accepts mixed case hex', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: '#Ff0000' });
    expect(result.success).toBe(true);
  });

  it('rejects color without hash prefix', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: 'FF0000' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex length (5 digits)', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: '#FF000' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex length (7 digits)', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: '#FF00000' });
    expect(result.success).toBe(false);
  });

  it('rejects non-hex characters', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: '#GGGGGG' });
    expect(result.success).toBe(false);
  });

  it('rejects color name string', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ name: 'Work', color: 'red' });
    expect(result.success).toBe(false);
  });

  it('requires identifier or name', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({ color: '#FF0000' });
    expect(result.success).toBe(false);
  });

  it('accepts identifier with color', () => {
    const result = SetPerspectiveIconInputSchema.safeParse({
      identifier: 'abc123',
      color: '#FF0000'
    });
    expect(result.success).toBe(true);
  });
});

describe('SetPerspectiveIconSuccessSchema', () => {
  it('accepts valid success response', () => {
    const result = SetPerspectiveIconSuccessSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      color: '#FF0000',
      message: 'Icon color set to #FF0000'
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing perspectiveId', () => {
    const result = SetPerspectiveIconSuccessSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      color: '#FF0000',
      message: 'Done'
    });
    expect(result.success).toBe(false);
  });
});

describe('SetPerspectiveIconErrorSchema', () => {
  it('accepts NOT_FOUND error', () => {
    const result = SetPerspectiveIconErrorSchema.safeParse({
      success: false,
      error: "Perspective 'Unknown' not found",
      code: 'NOT_FOUND'
    });
    expect(result.success).toBe(true);
  });

  it('accepts BUILTIN_NOT_MODIFIABLE error', () => {
    const result = SetPerspectiveIconErrorSchema.safeParse({
      success: false,
      error: 'Cannot modify built-in perspective icon',
      code: 'BUILTIN_NOT_MODIFIABLE'
    });
    expect(result.success).toBe(true);
  });

  it('accepts VERSION_NOT_SUPPORTED error', () => {
    const result = SetPerspectiveIconErrorSchema.safeParse({
      success: false,
      error: 'iconColor requires OmniFocus v4.5.2+',
      code: 'VERSION_NOT_SUPPORTED'
    });
    expect(result.success).toBe(true);
  });

  it('accepts DISAMBIGUATION_REQUIRED with candidates', () => {
    const result = SetPerspectiveIconErrorSchema.safeParse({
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

describe('SetPerspectiveIconResponseSchema', () => {
  it('parses success response', () => {
    const result = SetPerspectiveIconResponseSchema.safeParse({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      color: '#FF0000',
      message: 'Done'
    });
    expect(result.success).toBe(true);
  });

  it('parses error response', () => {
    const result = SetPerspectiveIconResponseSchema.safeParse({
      success: false,
      error: 'Version not supported',
      code: 'VERSION_NOT_SUPPORTED'
    });
    expect(result.success).toBe(true);
  });
});
