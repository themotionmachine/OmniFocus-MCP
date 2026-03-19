/**
 * Escape a string for safe embedding in a JavaScript string literal.
 *
 * Used by OmniJS script generators to safely embed user-provided values
 * (IDs, names, notes, URLs) into generated double-quoted JS strings.
 */
export function escapeForJS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
