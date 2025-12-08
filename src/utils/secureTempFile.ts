import tmp from 'tmp';
import { writeSync, closeSync } from 'fs';

// Ensure temp files are cleaned up on process exit
tmp.setGracefulCleanup();

/**
 * Result from creating a secure temporary file.
 * Includes the file path and a cleanup function.
 */
export interface SecureTempFile {
  path: string;
  cleanup: () => void;
}

/**
 * Create and write to a secure temporary file using the tmp library.
 *
 * This addresses CWE-377 and CWE-378 by:
 * - Creating files atomically (no race condition)
 * - Setting secure permissions (0600 by default)
 * - Ensuring the file doesn't already exist
 * - Writing content via file descriptor (not path)
 * - Providing automatic cleanup
 *
 * @param content - The content to write to the file
 * @param prefix - Optional prefix for the filename (e.g., 'jxa_script')
 * @param extension - File extension including the dot (e.g., '.js', '.applescript')
 * @returns Object with the file path and cleanup function
 */
export function writeSecureTempFile(
  content: string,
  prefix: string = 'temp',
  extension: string = '.tmp'
): SecureTempFile {
  const file = tmp.fileSync({
    prefix: `${prefix}_`,
    postfix: extension,
    mode: 0o600, // Read/write for owner only
    discardDescriptor: false, // Keep fd for writing
  });

  // Write content using the secure file descriptor
  writeSync(file.fd, content, 0, 'utf8');
  closeSync(file.fd);

  return {
    path: file.name,
    cleanup: () => file.removeCallback(),
  };
}
