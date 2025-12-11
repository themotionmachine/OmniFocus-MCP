import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { logger } from './logger.js';
import { writeSecureTempFile } from './secureTempFile.js';

const execFileAsync = promisify(execFile);

// Helper function to execute OmniFocus scripts
export async function executeJXA(script: string): Promise<unknown[]> {
  // Validate input
  if (typeof script !== 'string' || script.trim().length === 0) {
    throw new Error('Script parameter must be a non-empty string');
  }

  const tempFile = writeSecureTempFile(script, 'jxa_script', '.js');

  try {
    // Execute the script using osascript (execFile prevents command injection)
    const { stdout, stderr } = await execFileAsync('osascript', [
      '-l',
      'JavaScript',
      tempFile.path
    ]);

    if (stderr) {
      logger.warning('Script stderr output', 'executeJXA', { stderr });
    }

    // Parse the output as JSON
    try {
      const result = JSON.parse(stdout);
      return result;
    } catch (e) {
      const parseError = e instanceof Error ? e : new Error(String(e));
      logger.error('Failed to parse script output as JSON', 'executeJXA', {
        message: parseError.message
      });
      logger.debug('Script output was', 'executeJXA', { stdout });

      // If this contains a "Found X tasks" message, treat it as a successful non-JSON response
      if (stdout.includes('Found') && stdout.includes('tasks')) {
        return [];
      }

      // Return empty array for backwards compatibility, but log the issue
      logger.warning('Returning empty array due to parse failure', 'executeJXA');
      return [];
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to execute JXA script', 'executeJXA', { message: err.message });
    logger.debug('Script content (first 200 chars)', 'executeJXA', {
      snippet: script.substring(0, 200)
    });
    // Re-throw with enhanced error message
    throw new Error(`JXA execution failed: ${err.message}`);
  } finally {
    // Clean up the temporary file
    tempFile.cleanup();
  }
}

// Function to execute scripts in OmniFocus using the URL scheme
export async function executeOmniFocusScript(scriptPath: string): Promise<unknown> {
  // Validate input
  if (typeof scriptPath !== 'string' || scriptPath.trim().length === 0) {
    throw new Error('Script path must be a non-empty string');
  }

  let tempFile: { path: string; cleanup: () => void } | null = null;

  try {
    // Get the actual script path (existing code remains the same)
    let actualPath: string;
    if (scriptPath.startsWith('@')) {
      const scriptName = scriptPath.substring(1);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      const distPath = join(__dirname, '..', 'utils', 'omnifocusScripts', scriptName);
      const srcPath = join(__dirname, '..', '..', 'src', 'utils', 'omnifocusScripts', scriptName);

      if (existsSync(distPath)) {
        actualPath = distPath;
      } else if (existsSync(srcPath)) {
        actualPath = srcPath;
      } else {
        actualPath = join(__dirname, '..', 'omnifocusScripts', scriptName);
      }
    } else {
      actualPath = scriptPath;
    }

    // Read the script file
    const scriptContent = readFileSync(actualPath, 'utf8');

    // Escape the script content properly for use in JXA
    const escapedScript = scriptContent
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');

    // Create a JXA script that will execute our OmniJS script in OmniFocus
    const jxaScript = `
    function run() {
      try {
        const app = Application('OmniFocus');
        app.includeStandardAdditions = true;

        // Run the OmniJS script in OmniFocus and capture the output
        const result = app.evaluateJavascript(\`${escapedScript}\`);

        // Return the result
        return result;
      } catch (e) {
        return JSON.stringify({ error: e.message });
      }
    }
    `;

    // Write the JXA script to a secure temporary file
    tempFile = writeSecureTempFile(jxaScript, 'jxa_wrapper', '.js');

    // Execute the JXA script using osascript (execFile prevents command injection)
    const { stdout, stderr } = await execFileAsync('osascript', [
      '-l',
      'JavaScript',
      tempFile.path
    ]);

    if (stderr) {
      logger.warning('Script stderr output', 'executeOmniFocusScript', { stderr });
    }

    // Parse the output as JSON
    try {
      return JSON.parse(stdout);
    } catch (parseError) {
      const err = parseError instanceof Error ? parseError : new Error(String(parseError));
      logger.error('Error parsing script output', 'executeOmniFocusScript', {
        message: err.message
      });
      logger.debug('Script output was', 'executeOmniFocusScript', { stdout });
      // Return stdout as fallback but log the parsing failure
      return stdout;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to execute OmniFocus script', 'executeOmniFocusScript', {
      message: err.message
    });
    logger.debug('Script path', 'executeOmniFocusScript', { scriptPath });
    // Re-throw with enhanced context
    throw new Error(`OmniFocus script execution failed: ${err.message}`);
  } finally {
    // Clean up the temporary file
    if (tempFile) {
      tempFile.cleanup();
    }
  }
}
