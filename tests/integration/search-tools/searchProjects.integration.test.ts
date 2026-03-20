import { afterEach, describe, expect, it } from 'vitest';
import { addFolder } from '../../../src/tools/primitives/addFolder.js';
import { createProject } from '../../../src/tools/primitives/createProject.js';
import { deleteProject } from '../../../src/tools/primitives/deleteProject.js';
import { removeFolder } from '../../../src/tools/primitives/removeFolder.js';
import { searchProjects } from '../../../src/tools/primitives/searchProjects.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('searchProjects integration', () => {
  skipIfOmniFocusUnavailable();

  const createdProjectIds: string[] = [];
  const createdFolderIds: string[] = [];

  afterEach(async () => {
    for (const id of [...createdProjectIds].reverse()) {
      try {
        await deleteProject({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdProjectIds.length = 0;

    for (const id of [...createdFolderIds].reverse()) {
      try {
        await removeFolder({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdFolderIds.length = 0;
  });

  it('should find a project by name and return correct fields', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const uniqueName = `SearchProjects Test - Find ${Date.now()}`;
    const projResult = await createProject({ name: uniqueName, folderId: testFolderId });
    expect(projResult.success).toBe(true);
    if (!projResult.success) return;
    createdProjectIds.push(projResult.id);
    await waitForSync();

    const result = await searchProjects({ query: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((p) => p.id === projResult.id);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.id).toBe(projResult.id);
        expect(found.name).toBe(uniqueName);
        expect(typeof found.status).toBe('string');
        // folderName can be null or a string
        expect(found.folderName === null || typeof found.folderName === 'string').toBe(true);
      }
    }
  });

  it('should populate folderName when project is inside a folder', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    // Create a named subfolder for this test
    const folderName = `SearchProjects Folder ${Date.now()}`;
    const folderResult = await addFolder({
      name: folderName,
      position: { placement: 'ending', relativeTo: testFolderId }
    });
    expect(folderResult.success).toBe(true);
    if (!folderResult.success) return;
    createdFolderIds.push(folderResult.id);
    await waitForSync();

    const uniqueName = `SearchProjects Test - InFolder ${Date.now()}`;
    const projResult = await createProject({
      name: uniqueName,
      folderId: folderResult.id
    });
    expect(projResult.success).toBe(true);
    if (!projResult.success) return;
    createdProjectIds.push(projResult.id);
    await waitForSync();

    const result = await searchProjects({ query: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((p) => p.id === projResult.id);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.folderName).toBe(folderName);
      }
    }
  });

  it('should have null folderName for root-level projects', async () => {
    const uniqueName = `SearchProjects Test - Root ${Date.now()}`;
    // Create at root (no folderId)
    const projResult = await createProject({ name: uniqueName });
    expect(projResult.success).toBe(true);
    if (!projResult.success) return;
    createdProjectIds.push(projResult.id);
    await waitForSync();

    const result = await searchProjects({ query: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((p) => p.id === projResult.id);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.folderName).toBeNull();
      }
    }
  });

  it('should respect the limit parameter and report totalMatches', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    const sharedToken = `LimitProj ${Date.now()}`;

    // Create 3 projects with the same search token
    for (let i = 0; i < 3; i++) {
      const projResult = await createProject({
        name: `SearchProjects Test - ${sharedToken} Item${i}`,
        folderId: testFolderId
      });
      if (projResult.success) createdProjectIds.push(projResult.id);
    }
    await waitForSync();

    const result = await searchProjects({ query: sharedToken, limit: 2 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results.length).toBeLessThanOrEqual(2);
      expect(result.totalMatches).toBeGreaterThanOrEqual(3);
    }
  });

  it('should return empty results for a query that matches nothing', async () => {
    const result = await searchProjects({ query: 'ZZZNOSUCHPROJECT_XYZABC_12345_UNIQUE' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    }
  });
});
