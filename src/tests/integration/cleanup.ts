import { findItemsByPrefix, safeDeleteById, TEST_PREFIX } from './helpers.js';

async function main() {
  console.log(`Cleaning up all OmniFocus items with prefix "${TEST_PREFIX}"...`);
  const types = ['task', 'project', 'tag', 'folder'] as const;
  for (const type of types) {
    const items = await findItemsByPrefix(TEST_PREFIX, type);
    if (items.length === 0) {
      console.log(`  ${type}s: none found`);
      continue;
    }
    console.log(`  ${type}s: found ${items.length}`);
    for (const item of items) {
      try {
        await safeDeleteById(item.id, type);
        console.log(`    deleted: ${item.name}`);
      } catch (error: any) {
        console.warn(`    FAILED to delete ${item.name}: ${error.message}`);
      }
    }
  }
  console.log('Cleanup complete.');
}

main().catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
