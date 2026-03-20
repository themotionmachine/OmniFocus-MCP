/**
 * Contract Index (Design Artifact)
 *
 * During implementation, search-tools and database-tools will be separate
 * contract directories under src/contracts/:
 *   - src/contracts/search-tools/index.ts
 *   - src/contracts/database-tools/index.ts
 */

export * from './database-tools.js';
export * from './search-tools.js';
