import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listPerspectives } from '../../../src/tools/primitives/listPerspectives.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('listPerspectives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all perspectives (FR-001, FR-002)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectives: [
        { name: 'Inbox', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Projects', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Work', type: 'custom', identifier: 'abc123', filterAggregation: 'all' }
      ],
      totalCount: 3
    });

    const result = await listPerspectives({ type: 'all' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectives).toHaveLength(3);
      expect(result.totalCount).toBe(3);
    }
  });

  it('filters to builtin only (FR-003)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectives: [
        { name: 'Flagged', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Forecast', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Inbox', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Projects', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Review', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Tags', type: 'builtin', identifier: null, filterAggregation: null }
      ],
      totalCount: 6
    });

    const result = await listPerspectives({ type: 'builtin' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectives).toHaveLength(6);
      expect(result.perspectives.every((p) => p.type === 'builtin')).toBe(true);
    }
  });

  it('filters to custom only (FR-003)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectives: [
        { name: 'Work', type: 'custom', identifier: 'abc123', filterAggregation: 'all' }
      ],
      totalCount: 1
    });

    const result = await listPerspectives({ type: 'custom' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectives).toHaveLength(1);
      expect(result.perspectives[0].type).toBe('custom');
    }
  });

  it('returns built-in perspectives with null identifier (FR-004)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectives: [{ name: 'Inbox', type: 'builtin', identifier: null, filterAggregation: null }],
      totalCount: 1
    });

    const result = await listPerspectives({ type: 'builtin' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectives[0].identifier).toBeNull();
    }
  });

  it('returns custom perspectives with metadata (FR-005)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectives: [
        { name: 'Work', type: 'custom', identifier: 'abc123', filterAggregation: 'all' }
      ],
      totalCount: 1
    });

    const result = await listPerspectives({ type: 'custom' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectives[0].identifier).toBe('abc123');
      expect(result.perspectives[0].filterAggregation).toBe('all');
    }
  });

  it('returns sorted alphabetically by name (FR-006)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectives: [
        { name: 'Flagged', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Forecast', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Inbox', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Projects', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Review', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Tags', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Alpha Custom', type: 'custom', identifier: 'id1', filterAggregation: null },
        { name: 'Zeta Custom', type: 'custom', identifier: 'id2', filterAggregation: null }
      ],
      totalCount: 8
    });

    const result = await listPerspectives({ type: 'all' });

    expect(result.success).toBe(true);
    if (result.success) {
      const builtIns = result.perspectives.filter((p) => p.type === 'builtin');
      const customs = result.perspectives.filter((p) => p.type === 'custom');
      // Built-ins should come before customs
      expect(result.perspectives.indexOf(builtIns[0])).toBeLessThan(
        result.perspectives.indexOf(customs[0])
      );
    }
  });

  it('returns matching totalCount (FR-007)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectives: [
        { name: 'Inbox', type: 'builtin', identifier: null, filterAggregation: null },
        { name: 'Work', type: 'custom', identifier: 'id1', filterAggregation: null }
      ],
      totalCount: 2
    });

    const result = await listPerspectives({ type: 'all' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.totalCount).toBe(result.perspectives.length);
    }
  });

  it('returns null filterAggregation for custom on pre-v4.2 (FR-008)', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectives: [
        { name: 'Work', type: 'custom', identifier: 'abc123', filterAggregation: null }
      ],
      totalCount: 1
    });

    const result = await listPerspectives({ type: 'custom' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectives[0].filterAggregation).toBeNull();
    }
  });

  it('returns empty array when no custom perspectives exist', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectives: [],
      totalCount: 0
    });

    const result = await listPerspectives({ type: 'custom' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.perspectives).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    }
  });

  it('returns error on script failure', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: false,
      error: 'Script execution failed'
    });

    const result = await listPerspectives({ type: 'all' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('calls executeOmniJS with a script string', async () => {
    vi.mocked(executeOmniJS).mockResolvedValue({
      success: true,
      perspectives: [],
      totalCount: 0
    });

    await listPerspectives({ type: 'all' });

    expect(vi.mocked(executeOmniJS)).toHaveBeenCalledOnce();
    const script = vi.mocked(executeOmniJS).mock.calls[0][0];
    expect(typeof script).toBe('string');
    expect(script).toContain('Perspective');
  });
});
