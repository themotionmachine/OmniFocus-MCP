import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readPerspective } from './perspective.js';
import { readProject } from './project.js';
import { getPerspectiveView } from '../tools/primitives/getPerspectiveView.js';
import { queryOmnifocus } from '../tools/primitives/queryOmnifocus.js';

vi.mock('../tools/primitives/getPerspectiveView.js', () => ({
  getPerspectiveView: vi.fn(),
}));

vi.mock('../tools/primitives/queryOmnifocus.js', () => ({
  queryOmnifocus: vi.fn(),
}));

const logger = {
  debug: vi.fn(),
} as any;

describe('resource URI decoding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decodes project names before querying tasks', async () => {
    vi.mocked(queryOmnifocus).mockResolvedValue({
      success: true,
      items: [{ name: 'Do the thing' }],
    } as any);

    await readProject(
      new URL('omnifocus://project/Live%20better'),
      { name: 'Live%20better' },
      logger
    );

    expect(queryOmnifocus).toHaveBeenCalledWith(expect.objectContaining({
      filters: { projectName: 'Live better' },
    }));
  });

  it('decodes perspective names before reading the perspective view', async () => {
    vi.mocked(getPerspectiveView).mockResolvedValue({
      success: true,
      items: [],
    } as any);

    await readPerspective(
      new URL('omnifocus://perspective/Top%20Bugs'),
      { name: 'Top%20Bugs' },
      logger
    );

    expect(getPerspectiveView).toHaveBeenCalledWith({
      perspectiveName: 'Top Bugs',
    });
  });
});
