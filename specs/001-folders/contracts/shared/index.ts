/**
 * Shared Schema Contracts - Barrel Export
 *
 * This module exports all shared Zod schemas and types used across
 * multiple folder tool contracts. Import from here for consistent
 * access to shared definitions.
 *
 * @example
 * ```typescript
 * import {
 *   PositionSchema,
 *   FolderSchema,
 *   DisambiguationSchema,
 *   type Position,
 *   type Folder,
 *   type DisambiguationError,
 *   isDisambiguationError
 * } from './shared/index.js';
 * ```
 *
 * Zod version: 4.1.x
 */

// Disambiguation error schema for name-based lookups
export {
  type DisambiguationError,
  DisambiguationSchema,
  isDisambiguationError
} from './disambiguation.js';

// Folder entity schema for response payloads
export { type Folder, FolderSchema } from './folder.js';
// Position schema for folder placement operations
export { type Position, PositionSchema } from './position.js';
