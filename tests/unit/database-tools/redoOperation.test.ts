import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateRedoScript, redoOperation } from '../../../src/tools/primitives/redoOperation.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T067: Unit tests for redoOperation primitive

describe('redoOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return performed=true when redo was executed', async () => {
    const mockResponse = { success: true, performed: true, canUndo: true, canRedo: false };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await redoOperation();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.performed).toBe(true);
      expect(result.canRedo).toBe(false);
    }
  });

  it('should return performed=false when stack was empty (FR-012)', async () => {
    const mockResponse = { success: true, performed: false, canUndo: false, canRedo: false };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await redoOperation();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.performed).toBe(false);
      expect(result.canRedo).toBe(false);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = { success: false, error: 'Redo failed' };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await redoOperation();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Redo failed');
    }
  });
});

describe('generateRedoScript', () => {
  it('should contain canRedo pre-check', () => {
    const script = generateRedoScript();

    expect(script).toContain('if (canRedo)');
  });

  it('should call redo() only when canRedo is true', () => {
    const script = generateRedoScript();

    expect(script).toContain('redo()');
    const canRedoIdx = script.indexOf('if (canRedo)');
    const redoIdx = script.indexOf('redo()');
    expect(redoIdx).toBeGreaterThan(canRedoIdx);
  });

  it('should return performed, canUndo, and canRedo post-state', () => {
    const script = generateRedoScript();

    expect(script).toContain('performed: performed');
    expect(script).toContain('canUndo: canUndo');
    expect(script).toContain('canRedo: canRedo');
  });

  it('should initialize performed as false', () => {
    const script = generateRedoScript();

    expect(script).toContain('var performed = false');
  });

  it('should wrap script in IIFE with try-catch', () => {
    const script = generateRedoScript();

    expect(script).toMatch(/^\(function\(\) \{/);
    expect(script).toContain('} catch (e) {');
    expect(script).toMatch(/\}\)\(\);$/);
  });
});
