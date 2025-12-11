/**
 * Tag Tools Contracts Index
 *
 * Re-exports all tag management tool contracts for convenient imports.
 */

// assign_tags
export {
  type AssignTagsError,
  AssignTagsErrorSchema,
  type AssignTagsInput,
  AssignTagsInputSchema,
  type AssignTagsResponse,
  AssignTagsResponseSchema,
  type AssignTagsSuccess,
  AssignTagsSuccessSchema
} from './assign-tags.js';
// create_tag
export {
  CreateTagErrorSchema,
  type CreateTagInput,
  CreateTagInputSchema,
  type CreateTagResponse,
  CreateTagResponseSchema,
  CreateTagSuccessSchema
} from './create-tag.js';
// delete_tag
export {
  type DeleteTagError,
  DeleteTagErrorSchema,
  type DeleteTagInput,
  DeleteTagInputSchema,
  type DeleteTagResponse,
  DeleteTagResponseSchema,
  type DeleteTagSuccess,
  DeleteTagSuccessSchema
} from './delete-tag.js';
// edit_tag
export {
  type EditTagError,
  EditTagErrorSchema,
  type EditTagInput,
  EditTagInputSchema,
  type EditTagResponse,
  EditTagResponseSchema,
  type EditTagSuccess,
  EditTagSuccessSchema
} from './edit-tag.js';

// list_tags
export {
  type ListTagsError,
  ListTagsErrorSchema,
  type ListTagsInput,
  ListTagsInputSchema,
  type ListTagsResponse,
  ListTagsResponseSchema,
  type ListTagsSuccess,
  ListTagsSuccessSchema
} from './list-tags.js';
// remove_tags
export {
  type RemoveTagsError,
  RemoveTagsErrorSchema,
  type RemoveTagsInput,
  RemoveTagsInputSchema,
  type RemoveTagsResponse,
  RemoveTagsResponseSchema,
  type RemoveTagsSuccess,
  RemoveTagsSuccessSchema
} from './remove-tags.js';
export {
  type BatchItemResult,
  BatchItemResultSchema
} from './shared/batch-result.js';
export {
  type DisambiguationError,
  DisambiguationErrorSchema
} from './shared/disambiguation.js';
export {
  type TagPosition,
  TagPositionSchema
} from './shared/position.js';
// Shared schemas
export {
  type Tag,
  TagSchema
} from './shared/tag.js';
