/**
 * Folder Tool Contracts - Barrel Export
 *
 * This module exports all Zod schemas and types for folder management tools.
 * Use this as the primary import point for implementation code.
 *
 * @example
 * ```typescript
 * import {
 *   // Shared schemas
 *   PositionSchema,
 *   FolderSchema,
 *   DisambiguationSchema,
 *
 *   // Tool-specific schemas
 *   ListFoldersInputSchema,
 *   AddFolderInputSchema,
 *   EditFolderInputSchema,
 *   RemoveFolderInputSchema,
 *   MoveFolderInputSchema,
 *
 *   // Types
 *   type Position,
 *   type Folder,
 *   type ListFoldersInput,
 *   type ListFoldersResponse,
 *   // ... etc
 * } from './contracts/index.js';
 * ```
 *
 * Zod version: 4.1.x
 */

// =============================================================================
// Shared Schemas (used by multiple tools)
// =============================================================================

export {
  type DisambiguationError,
  // Disambiguation error for name lookups
  DisambiguationSchema,
  type Folder,
  // Folder entity for response payloads
  FolderSchema,
  isDisambiguationError,
  type Position,
  // Position schema for placement operations
  PositionSchema
} from './shared/index.js';

// =============================================================================
// list_folders
// =============================================================================

export {
  ListFoldersErrorSchema,
  type ListFoldersInput,
  ListFoldersInputSchema,
  type ListFoldersResponse,
  ListFoldersResponseSchema,
  ListFoldersSuccessSchema
} from './list-folders.js';

// =============================================================================
// add_folder
// =============================================================================

export {
  AddFolderErrorSchema,
  type AddFolderInput,
  AddFolderInputSchema,
  type AddFolderResponse,
  AddFolderResponseSchema,
  AddFolderSuccessSchema
} from './add-folder.js';

// =============================================================================
// edit_folder
// =============================================================================

export {
  EditFolderDisambiguationSchema,
  EditFolderErrorSchema,
  type EditFolderInput,
  EditFolderInputSchema,
  type EditFolderResponse,
  EditFolderResponseSchema,
  EditFolderSuccessSchema
} from './edit-folder.js';

// =============================================================================
// remove_folder
// =============================================================================

export {
  RemoveFolderDisambiguationSchema,
  RemoveFolderErrorSchema,
  type RemoveFolderInput,
  RemoveFolderInputSchema,
  type RemoveFolderResponse,
  RemoveFolderResponseSchema,
  RemoveFolderSuccessSchema
} from './remove-folder.js';

// =============================================================================
// move_folder
// =============================================================================

export {
  MoveFolderDisambiguationSchema,
  MoveFolderErrorSchema,
  type MoveFolderInput,
  MoveFolderInputSchema,
  type MoveFolderResponse,
  MoveFolderResponseSchema,
  MoveFolderSuccessSchema
} from './move-folder.js';
