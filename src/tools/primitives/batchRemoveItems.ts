import { type RemoveItemParams, removeItem } from './removeItem.js';

// Define the parameters for the batch removal operation
export type BatchRemoveItemsParams = RemoveItemParams;

// Define the result type for individual operations
type ItemResult = {
  success: boolean;
  id?: string | undefined;
  name?: string | undefined;
  error?: string | undefined;
};

// Define the result type for the batch operation
type BatchResult = {
  success: boolean;
  results: ItemResult[];
  error?: string;
};

/**
 * Remove multiple items (tasks or projects) from OmniFocus
 */
export async function batchRemoveItems(items: BatchRemoveItemsParams[]): Promise<BatchResult> {
  // Validate input
  if (!Array.isArray(items)) {
    return {
      success: false,
      results: [],
      error: 'Items parameter must be an array'
    };
  }

  if (items.length === 0) {
    return {
      success: false,
      results: [],
      error: 'Items array cannot be empty'
    };
  }

  try {
    // Results array to track individual operation outcomes
    const results: ItemResult[] = [];

    // Process each item in sequence
    for (const item of items) {
      try {
        // Remove item
        const itemResult = await removeItem(item);
        results.push({
          success: itemResult.success,
          id: itemResult.id,
          name: itemResult.name,
          error: itemResult.error
        });
      } catch (itemError: unknown) {
        // Handle individual item errors
        results.push({
          success: false,
          error: itemError instanceof Error ? itemError.message : 'Unknown error processing item'
        });
      }
    }

    // Determine overall success (true if at least one item was removed successfully)
    const overallSuccess = results.some((result) => result.success);

    return {
      success: overallSuccess,
      results: results
    };
  } catch (error: unknown) {
    console.error('Error in batchRemoveItems:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error in batchRemoveItems'
    };
  }
}
