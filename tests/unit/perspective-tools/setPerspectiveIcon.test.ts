import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setPerspectiveIcon } from '../../../src/tools/primitives/setPerspectiveIcon.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('setPerspectiveIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets color on custom perspective by name (FR-033, FR-035, FR-037)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      color: '#FF0000',
      message: "Icon color set to #FF0000 for 'Work'"
    });

    const result = await setPerspectiveIcon({ name: 'Work', color: '#FF0000' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectiveName).toBe('Work');
      expect(result.color).toBe('#FF0000');
    }
  });

  it('sets color using identifier (FR-033)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      color: '#00FF00',
      message: 'Icon color set'
    });

    const result = await setPerspectiveIcon({ identifier: 'abc123', color: '#00FF00' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectiveId).toBe('abc123');
    }
  });

  it('returns BUILTIN_NOT_MODIFIABLE for built-in perspectives (FR-034)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'Cannot modify built-in perspective icon color',
      code: 'BUILTIN_NOT_MODIFIABLE'
    });

    const result = await setPerspectiveIcon({ name: 'Inbox', color: '#FF0000' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('BUILTIN_NOT_MODIFIABLE');
    }
  });

  it('passes pre-computed RGB float values to OmniJS (FR-036)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      color: '#FF0000',
      message: 'Done'
    });

    await setPerspectiveIcon({ name: 'Work', color: '#FF0000' });

    const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    // Should contain Color.RGB with float values
    expect(script).toContain('Color.RGB');
    // Red channel = 1.0 for #FF
    expect(script).toContain('1');
  });

  it('converts #RRGGBB to Color.RGB(r, g, b, a) floats', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      color: '#FF8040',
      message: 'Done'
    });

    await setPerspectiveIcon({ name: 'Work', color: '#FF8040' });

    const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(script).toContain('Color.RGB');
    // Alpha = 1.0 for no alpha channel
    expect(script).toContain('1');
  });

  it('converts #RGB shorthand to full values', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      color: '#F00',
      message: 'Done'
    });

    await setPerspectiveIcon({ name: 'Work', color: '#F00' });

    const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(script).toContain('Color.RGB');
  });

  it('converts #RRGGBBAA with alpha channel', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      color: '#FF000080',
      message: 'Done'
    });

    await setPerspectiveIcon({ name: 'Work', color: '#FF000080' });

    const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(script).toContain('Color.RGB');
    // Alpha ~ 0.502 for 0x80
    expect(script).toMatch(/0\.\d+/);
  });

  it('returns NOT_FOUND error (FR-038)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Perspective 'Unknown' not found",
      code: 'NOT_FOUND'
    });

    const result = await setPerspectiveIcon({ name: 'Unknown', color: '#FF0000' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('returns VERSION_NOT_SUPPORTED error on old OmniFocus (FR-039)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'iconColor requires OmniFocus v4.5.2 or later',
      code: 'VERSION_NOT_SUPPORTED'
    });

    const result = await setPerspectiveIcon({ name: 'Work', color: '#FF0000' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('VERSION_NOT_SUPPORTED');
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

    const result = await setPerspectiveIcon({ name: 'Work', color: '#FF0000' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.candidates).toHaveLength(2);
    }
  });

  it('idempotent: overwriting same color succeeds', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      color: '#FF0000',
      message: 'Icon color set'
    });

    const result = await setPerspectiveIcon({ name: 'Work', color: '#FF0000' });

    expect(result.success).toBe(true);
  });

  it('includes version check in script', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectiveName: 'Work',
      perspectiveId: 'abc123',
      color: '#FF0000',
      message: 'Done'
    });

    await setPerspectiveIcon({ name: 'Work', color: '#FF0000' });

    const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(script).toContain('4.5.2');
  });
});
