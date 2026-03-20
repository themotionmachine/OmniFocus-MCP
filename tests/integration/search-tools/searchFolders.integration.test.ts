import { afterEach, describe, expect, it } from 'vitest';
import { addFolder } from '../../../src/tools/primitives/addFolder.js';
import { removeFolder } from '../../../src/tools/primitives/removeFolder.js';
import { searchFolders } from '../../../src/tools/primitives/searchFolders.js';
import { skipIfOmniFocusUnavailable, waitForSync } from '../helpers/index.js';
import { getTestFolderId } from '../setup.js';

describe('searchFolders integration', () => {
  skipIfOmniFocusUnavailable();

  const createdFolderIds: string[] = [];

  afterEach(async () => {
    // Clean up in reverse order (children before parents)
    for (const id of [...createdFolderIds].reverse()) {
      try {
        await removeFolder({ id });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdFolderIds.length = 0;
  });

  it('should find a folder by name and return correct fields', async () => {
    const uniqueName = `SearchFolders Test - Find ${Date.now()}`;
    const folderResult = await addFolder({ name: uniqueName });
    expect(folderResult.success).toBe(true);
    if (!folderResult.success) return;
    createdFolderIds.push(folderResult.id);
    await waitForSync();

    const result = await searchFolders({ query: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((f) => f.id === folderResult.id);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.id).toBe(folderResult.id);
        expect(found.name).toBe(uniqueName);
        // parentFolderName can be null or a string
        expect(found.parentFolderName === null || typeof found.parentFolderName === 'string').toBe(
          true
        );
      }
    }
  });

  it('should populate parentFolderName for nested folders', async () => {
    const testFolderId = getTestFolderId();
    expect(testFolderId).toBeTruthy();
    if (!testFolderId) return;

    // Create a parent folder inside the test folder
    const parentName = `SearchFolders Test - Parent ${Date.now()}`;
    const parentResult = await addFolder({
      name: parentName,
      position: { placement: 'ending', relativeTo: testFolderId }
    });
    expect(parentResult.success).toBe(true);
    if (!parentResult.success) return;
    createdFolderIds.push(parentResult.id);
    await waitForSync();

    // Create a child folder inside the parent
    const childName = `SearchFolders Test - Child ${Date.now()}`;
    const childResult = await addFolder({
      name: childName,
      position: { placement: 'ending', relativeTo: parentResult.id }
    });
    expect(childResult.success).toBe(true);
    if (!childResult.success) return;
    createdFolderIds.push(childResult.id);
    await waitForSync();

    const result = await searchFolders({ query: childName });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((f) => f.id === childResult.id);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.parentFolderName).toBe(parentName);
      }
    }
  });

  it('should have null parentFolderName for root-level folders', async () => {
    const uniqueName = `SearchFolders Test - RootLevel ${Date.now()}`;
    const folderResult = await addFolder({ name: uniqueName });
    expect(folderResult.success).toBe(true);
    if (!folderResult.success) return;
    createdFolderIds.push(folderResult.id);
    await waitForSync();

    const result = await searchFolders({ query: uniqueName });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((f) => f.id === folderResult.id);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.parentFolderName).toBeNull();
      }
    }
  });

  it('should respect the limit parameter and report totalMatches', async () => {
    const sharedToken = `LimitFolder ${Date.now()}`;

    // Create 3 folders with the same search token
    for (let i = 0; i < 3; i++) {
      const folderResult = await addFolder({
        name: `SearchFolders Test - ${sharedToken} Item${i}`
      });
      if (folderResult.success) createdFolderIds.push(folderResult.id);
    }
    await waitForSync();

    const result = await searchFolders({ query: sharedToken, limit: 2 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results.length).toBeLessThanOrEqual(2);
      expect(result.totalMatches).toBeGreaterThanOrEqual(3);
    }
  });

  it('should return empty results for a query that matches nothing', async () => {
    const result = await searchFolders({ query: 'ZZZNOSUCHFOLDER_XYZABC_12345_UNIQUE' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    }
  });
});
