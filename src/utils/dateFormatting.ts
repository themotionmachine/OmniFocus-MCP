/**
 * Version 2 of date formatting utilities that work around AppleScript restrictions
 * Dates must be constructed outside of tell blocks
 */

/**
 * Generate AppleScript to construct a date variable outside tell blocks
 * @param isoDateString - ISO format date string
 * @param varName - Name for the date variable
 * @returns AppleScript code to construct the date
 */
export function createDateOutsideTellBlock(isoDateString: string, varName: string): string {
  // Parse the ISO date string
  const date = new Date(isoDateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${isoDateString}`);
  }
  
  // Extract date components
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  // Generate AppleScript to construct date outside tell blocks
  return `copy current date to ${varName}
set year of ${varName} to ${year}
set month of ${varName} to ${month}
set day of ${varName} to ${day}
set hours of ${varName} to ${hours}
set minutes of ${varName} to ${minutes}
set seconds of ${varName} to ${seconds}`;
}

/**
 * Generate the complete AppleScript for date assignments
 * Returns both the pre-tell block code and the in-tell block assignment
 */
export interface DateAssignmentParts {
  preScript: string;  // Code to run before tell blocks
  assignmentScript: string; // Code to run inside tell blocks
}

/**
 * Generate date assignment that works with AppleScript restrictions
 */
export function generateDateAssignmentV2(
  objectName: string,
  propertyName: string,
  isoDateString: string | undefined
): DateAssignmentParts | null {
  if (isoDateString === undefined) {
    return null; // No date change requested
  }
  
  if (isoDateString === '') {
    // Clear the date
    return {
      preScript: '',
      assignmentScript: `set ${propertyName} of ${objectName} to missing value`
    };
  }
  
  // Generate unique variable name
  const varName = `dateVar${Math.random().toString(36).substr(2, 9)}`;
  
  // Generate the date construction (outside tell blocks)
  const preScript = createDateOutsideTellBlock(isoDateString, varName);
  
  // Generate the assignment (inside tell blocks)
  const assignmentScript = `set ${propertyName} of ${objectName} to ${varName}`;
  
  return {
    preScript,
    assignmentScript
  };
}