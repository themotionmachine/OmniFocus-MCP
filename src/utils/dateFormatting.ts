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
  // Date-only strings (YYYY-MM-DD) are interpreted as UTC by new Date(),
  // which shifts the calendar day in timezones behind UTC. Append T00:00:00
  // to force local-time interpretation so "2026-04-10" means April 10th local.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(isoDateString)
    ? isoDateString + 'T00:00:00'
    : isoDateString;

  const date = new Date(normalized);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${isoDateString}`);
  }

  // Extract date components (always local time after normalization)
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  // Generate AppleScript to construct date outside tell blocks.
  //
  // `set day to 1` FIRST is load-bearing, not tidiness (issue #91). This scaffolds
  // off `current date`, so the intermediate date carries *today's* day-of-month.
  // Setting the month while that day is out of range for the target month makes
  // AppleScript roll the date forward, and the later `set day` cannot undo it:
  //
  //     today = Jul 31, target = Nov 1
  //       set month to 11  -> Nov 31 is invalid -> rolls to Dec 1
  //       set day to 1     -> already 1, no-op  -> stays Dec 1   (a month late)
  //
  // Normalizing the day to 1 up front makes every intermediate valid in every
  // month, so year/month/day can then be set without rollover. This silently
  // corrupted any date written on the 29th-31st toward a shorter month.
  return `copy current date to ${varName}
set day of ${varName} to 1
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