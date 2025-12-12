import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { executeOmniFocusScript } from '../../../src/utils/scriptExecution.js';
import { writeSecureTempFile } from '../../../src/utils/secureTempFile.js';

vi.mock('../../../src/utils/scriptExecution.js', () => ({
  executeOmniFocusScript: vi.fn()
}));

vi.mock('../../../src/utils/secureTempFile.js', () => ({
  writeSecureTempFile: vi.fn()
}));

describe('createProject', () => {
  let capturedScript = '';

  beforeEach(() => {
    vi.clearAllMocks();
    capturedScript = '';

    // Mock writeSecureTempFile to capture the script
    vi.mocked(writeSecureTempFile).mockImplementation((script, _prefix, _ext) => {
      capturedScript = script;
      return {
        path: '/tmp/mock-script.js',
        cleanup: vi.fn()
      };
    });
  });

  it('should create project at top level', async () => {
    // T027
    const mockResponse = {
      success: true,
      project: {
        id: 'project123',
        name: 'New Project'
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await createProject({ name: 'New Project' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.project.id).toBe('project123');
      expect(result.project.name).toBe('New Project');
    }
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();
  });

  it('should create project in folder', async () => {
    // T028
    const mockResponse = {
      success: true,
      project: {
        id: 'project456',
        name: 'New'
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await createProject({
      name: 'New',
      folderId: 'folder123'
    });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();

    // Verify the script contains folder lookup logic
    expect(capturedScript).toContain('Folder.byIdentifier');
    expect(capturedScript).toContain('folder123');
  });

  it('should create project with sequential type', async () => {
    // T029
    const mockResponse = {
      success: true,
      project: {
        id: 'project789',
        name: 'Sequential'
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await createProject({
      name: 'Sequential',
      sequential: true
    });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();

    // Verify the script sets sequential=true and containsSingletonActions=false
    expect(capturedScript).toContain('sequential');
    expect(capturedScript).toContain('true');
    expect(capturedScript).toContain('containsSingletonActions');
    expect(capturedScript).toContain('false');
  });

  it('should create project with single-actions type', async () => {
    // T030
    const mockResponse = {
      success: true,
      project: {
        id: 'project101',
        name: 'SAL'
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await createProject({
      name: 'SAL',
      containsSingletonActions: true
    });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();

    // Verify the script sets sequential=false and containsSingletonActions=true
    expect(capturedScript).toContain('sequential');
    expect(capturedScript).toContain('false');
    expect(capturedScript).toContain('containsSingletonActions');
    expect(capturedScript).toContain('true');
  });

  it('should create project with both type flags (precedence)', async () => {
    // T031
    const mockResponse = {
      success: true,
      project: {
        id: 'project202',
        name: 'Both'
      }
    };

    vi.mocked(executeOmniFocusScript).mockResolvedValue(JSON.stringify(mockResponse));

    const result = await createProject({
      name: 'Both',
      sequential: true,
      containsSingletonActions: true
    });

    expect(result.success).toBe(true);
    expect(executeOmniFocusScript).toHaveBeenCalledOnce();

    // Verify containsSingletonActions wins (sequential auto-cleared)
    expect(capturedScript).toContain('containsSingletonActions');
    expect(capturedScript).toContain('true');
    // Sequential should be false when containsSingletonActions is true
    const sequentialMatch = capturedScript.match(/sequential\s*=\s*(true|false)/);
    expect(sequentialMatch).toBeTruthy();
    if (sequentialMatch) {
      expect(sequentialMatch[1]).toBe('false');
    }
  });
});
