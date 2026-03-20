import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateUndoScript, undoOperation } from '../../../src/tools/primitives/undoOperation.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

// T066: Unit tests for undoOperation primitive

describe('undoOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return performed=true when undo was executed', async () => {
    const mockResponse = { success: true, performed: true, canUndo: true, canRedo: true };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await undoOperation();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.performed).toBe(true);
      expect(result.canUndo).toBe(true);
      expect(result.canRedo).toBe(true);
    }
  });

  it('should return performed=false when stack was empty (FR-012)', async () => {
    const mockResponse = { success: true, performed: false, canUndo: false, canRedo: false };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await undoOperation();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.performed).toBe(false);
      expect(result.canUndo).toBe(false);
    }
  });

  it('should propagate error response from OmniJS', async () => {
    const mockResponse = { success: false, error: 'Undo failed' };
    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await undoOperation();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Undo failed');
    }
  });
});

describe('generateUndoScript', () => {
  it('should contain canUndo pre-check', () => {
    const script = generateUndoScript();

    expect(script).toContain('if (canUndo)');
  });

  it('should call undo() only when canUndo is true', () => {
    const script = generateUndoScript();

    expect(script).toContain('undo()');
    // undo() should be inside the canUndo check block
    const canUndoIdx = script.indexOf('if (canUndo)');
    const undoIdx = script.indexOf('undo()');
    expect(undoIdx).toBeGreaterThan(canUndoIdx);
  });

  it('should return performed, canUndo, and canRedo post-state', () => {
    const script = generateUndoScript();

    expect(script).toContain('performed: performed');
    expect(script).toContain('canUndo: canUndo');
    expect(script).toContain('canRedo: canRedo');
  });

  it('should initialize performed as false', () => {
    const script = generateUndoScript();

    expect(script).toContain('var performed = false');
  });

  it('should wrap script in IIFE with try-catch', () => {
    const script = generateUndoScript();

    expect(script).toMatch(/^\(function\(\) \{/);
    expect(script).toContain('} catch (e) {');
    expect(script).toMatch(/\}\)\(\);$/);
  });
});
