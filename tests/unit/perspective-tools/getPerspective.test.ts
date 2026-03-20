import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPerspective } from '../../../src/tools/primitives/getPerspective.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('getPerspective', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('looks up custom perspective by name (FR-009, FR-010)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspective: {
        name: 'Work',
        identifier: 'abc123',
        type: 'custom',
        filterRules: { available: true },
        filterAggregation: 'all'
      }
    });

    const result = await getPerspective({ name: 'Work' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspective.name).toBe('Work');
      expect(result.perspective.type).toBe('custom');
    }
  });

  it('looks up custom perspective by identifier (FR-009, FR-010)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspective: {
        name: 'Work',
        identifier: 'abc123',
        type: 'custom',
        filterRules: null,
        filterAggregation: null
      }
    });

    const result = await getPerspective({ identifier: 'abc123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspective.type).toBe('custom');
    }
  });

  it('returns custom perspective detail with filter rules (FR-011, FR-012)', async () => {
    const filterRules = { tags: ['work'], availability: ['available'] };
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspective: {
        name: 'Work',
        identifier: 'abc123',
        type: 'custom',
        filterRules,
        filterAggregation: 'all'
      }
    });

    const result = await getPerspective({ name: 'Work' });

    expect(result.success).toBe(true);
    if (result.success && result.perspective.type === 'custom') {
      expect(result.perspective.filterRules).toEqual(filterRules);
      expect(result.perspective.filterAggregation).toBe('all');
    }
  });

  it('returns null filterRules and filterAggregation on pre-v4.2 (FR-012a)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspective: {
        name: 'Work',
        identifier: 'abc123',
        type: 'custom',
        filterRules: null,
        filterAggregation: null
      }
    });

    const result = await getPerspective({ name: 'Work' });

    expect(result.success).toBe(true);
    if (result.success && result.perspective.type === 'custom') {
      expect(result.perspective.filterRules).toBeNull();
      expect(result.perspective.filterAggregation).toBeNull();
    }
  });

  it('returns built-in perspective detail (FR-016)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspective: {
        name: 'Inbox',
        type: 'builtin'
      }
    });

    const result = await getPerspective({ name: 'Inbox' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspective.type).toBe('builtin');
      expect(result.perspective.name).toBe('Inbox');
    }
  });

  it('returns NOT_FOUND error (FR-013)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Perspective 'Unknown' not found",
      code: 'NOT_FOUND'
    });

    const result = await getPerspective({ name: 'Unknown' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('returns DISAMBIGUATION_REQUIRED with candidates (FR-014, FR-042)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: "Multiple perspectives match 'Work'",
      code: 'DISAMBIGUATION_REQUIRED',
      candidates: [
        { name: 'Work Personal', identifier: 'id1' },
        { name: 'Work Projects', identifier: 'id2' }
      ]
    });

    const result = await getPerspective({ name: 'Work' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('DISAMBIGUATION_REQUIRED');
      expect(result.candidates).toHaveLength(2);
    }
  });

  it('identifier takes precedence over name', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspective: {
        name: 'Work',
        identifier: 'abc123',
        type: 'custom',
        filterRules: null,
        filterAggregation: null
      }
    });

    await getPerspective({ name: 'Work', identifier: 'abc123' });

    const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(script).toContain('abc123');
    // Identifier lookup should be attempted first
    expect(script.indexOf('byIdentifier')).toBeLessThanOrEqual(script.indexOf('byName'));
  });

  it('calls executeOmniJS with a script containing the lookup target', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspective: { name: 'Inbox', type: 'builtin' }
    });

    await getPerspective({ name: 'Inbox' });

    expect(vi.mocked(executeOmniJS)).toHaveBeenCalledOnce();
    const script = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(script).toContain('Perspective');
  });
});
