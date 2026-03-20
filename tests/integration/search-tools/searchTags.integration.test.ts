import { afterEach, describe, expect, it } from 'vitest';
import { searchTags } from '../../../src/tools/primitives/searchTags.js';
import {
  createTestTag,
  deleteTestTag,
  skipIfOmniFocusUnavailable,
  waitForSync
} from '../helpers/index.js';

describe('searchTags integration', () => {
  skipIfOmniFocusUnavailable();

  const createdTagIds: string[] = [];

  afterEach(async () => {
    // Clean up in reverse order (children before parents)
    for (const id of [...createdTagIds].reverse()) {
      try {
        await deleteTestTag(id);
      } catch {
        // Ignore cleanup errors
      }
    }
    createdTagIds.length = 0;
  });

  it('should find a tag by name and return correct fields', async () => {
    const uniqueSuffix = `Find ${Date.now()}`;
    const tagId = await createTestTag(uniqueSuffix);
    createdTagIds.push(tagId);
    await waitForSync();

    // Search using part of the unique suffix
    const result = await searchTags({ query: uniqueSuffix });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((t) => t.id === tagId);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.id).toBe(tagId);
        expect(found.name).toContain(uniqueSuffix);
        expect(typeof found.status).toBe('string');
        // parentTagName can be null or a string
        expect(found.parentTagName === null || typeof found.parentTagName === 'string').toBe(true);
      }
    }
  });

  it('should populate parentTagName for nested tags', async () => {
    const parentSuffix = `Parent ${Date.now()}`;
    const parentId = await createTestTag(parentSuffix);
    createdTagIds.push(parentId);
    await waitForSync();

    const childSuffix = `Child ${Date.now()}`;
    const childId = await createTestTag(childSuffix, parentId);
    createdTagIds.push(childId);
    await waitForSync();

    const result = await searchTags({ query: childSuffix });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((t) => t.id === childId);
      expect(found).toBeTruthy();
      if (found) {
        // The parent tag name should be the full name including prefix
        expect(typeof found.parentTagName).toBe('string');
        expect(found.parentTagName).toContain(parentSuffix);
      }
    }
  });

  it('should have null parentTagName for root-level tags', async () => {
    const uniqueSuffix = `RootLevel ${Date.now()}`;
    const tagId = await createTestTag(uniqueSuffix);
    createdTagIds.push(tagId);
    await waitForSync();

    const result = await searchTags({ query: uniqueSuffix });

    expect(result.success).toBe(true);
    if (result.success) {
      const found = result.results.find((t) => t.id === tagId);
      expect(found).toBeTruthy();
      if (found) {
        expect(found.parentTagName).toBeNull();
      }
    }
  });

  it('should respect the limit parameter and report totalMatches', async () => {
    const sharedToken = `LimitTag ${Date.now()}`;

    // Create 3 tags with the same search token
    for (let i = 0; i < 3; i++) {
      const tagId = await createTestTag(`${sharedToken} Item${i}`);
      createdTagIds.push(tagId);
    }
    await waitForSync();

    const result = await searchTags({ query: sharedToken, limit: 2 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results.length).toBeLessThanOrEqual(2);
      expect(result.totalMatches).toBeGreaterThanOrEqual(3);
    }
  });

  it('should return empty results for a query that matches nothing', async () => {
    const result = await searchTags({ query: 'ZZZNOSUCHTAG_XYZABC_12345_UNIQUE' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.results).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
    }
  });
});
