import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { executeOmniJS } from '../../../src/utils/scriptExecution.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniJS: vi.fn()
}));

describe('createProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create project at top level', async () => {
    // T027
    const mockResponse = {
      success: true,
      id: 'project123',
      name: 'New Project'
    };

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await createProject({ name: 'New Project' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe('project123');
      expect(result.name).toBe('New Project');
    }
    expect(executeOmniJS).toHaveBeenCalledOnce();
  });

  it('should create project in folder', async () => {
    // T028
    const mockResponse = {
      success: true,
      id: 'project456',
      name: 'New'
    };

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await createProject({
      name: 'New',
      folderId: 'folder123'
    });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalledOnce();

    // Verify the script contains folder lookup logic
    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(scriptContent).toContain('Folder.byIdentifier');
    expect(scriptContent).toContain('folder123');
  });

  it('should create project with sequential type', async () => {
    // T029
    const mockResponse = {
      success: true,
      id: 'project789',
      name: 'Sequential'
    };

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await createProject({
      name: 'Sequential',
      sequential: true
    });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalledOnce();

    // Verify the script sets sequential=true and containsSingletonActions=false
    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(scriptContent).toContain('sequential');
    expect(scriptContent).toContain('true');
    expect(scriptContent).toContain('containsSingletonActions');
    expect(scriptContent).toContain('false');
  });

  it('should create project with single-actions type', async () => {
    // T030
    const mockResponse = {
      success: true,
      id: 'project101',
      name: 'SAL'
    };

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await createProject({
      name: 'SAL',
      containsSingletonActions: true
    });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalledOnce();

    // Verify the script sets sequential=false and containsSingletonActions=true
    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(scriptContent).toContain('sequential');
    expect(scriptContent).toContain('false');
    expect(scriptContent).toContain('containsSingletonActions');
    expect(scriptContent).toContain('true');
  });

  it('should create project with both type flags (precedence)', async () => {
    // T031
    const mockResponse = {
      success: true,
      id: 'project202',
      name: 'Both'
    };

    vi.mocked(executeOmniJS).mockResolvedValue(mockResponse);

    const result = await createProject({
      name: 'Both',
      sequential: true,
      containsSingletonActions: true
    });

    expect(result.success).toBe(true);
    expect(executeOmniJS).toHaveBeenCalledOnce();

    // Verify containsSingletonActions wins (sequential auto-cleared)
    const scriptContent = vi.mocked(executeOmniJS).mock.calls[0][0] as string;
    expect(scriptContent).toContain('containsSingletonActions');
    expect(scriptContent).toContain('true');
    // Sequential should be false when containsSingletonActions is true
    const sequentialMatch = scriptContent.match(/sequential\s*=\s*(true|false)/);
    expect(sequentialMatch).toBeTruthy();
    if (sequentialMatch) {
      expect(sequentialMatch[1]).toBe('false');
    }
  });
});
