import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { writeSecureTempFile } from './secureTempFile.js';

const execFileAsync = promisify(execFile);

// Helper function to execute OmniFocus scripts
export async function executeJXA(script: string): Promise<unknown[]> {
  const tempFile = writeSecureTempFile(script, 'jxa_script', '.js');

  try {
    // Execute the script using osascript (execFile prevents command injection)
    const { stdout, stderr } = await execFileAsync('osascript', [
      '-l',
      'JavaScript',
      tempFile.path
    ]);

    if (stderr) {
      console.error('Script stderr output:', stderr);
    }

    // Parse the output as JSON
    try {
      const result = JSON.parse(stdout);
      return result;
    } catch (e) {
      console.error('Failed to parse script output as JSON:', e);

      // If this contains a "Found X tasks" message, treat it as a successful non-JSON response
      if (stdout.includes('Found') && stdout.includes('tasks')) {
        return [];
      }

      return [];
    }
  } catch (error) {
    console.error('Failed to execute JXA script:', error);
    throw error;
  } finally {
    // Clean up the temporary file
    tempFile.cleanup();
  }
}

// Function to execute scripts in OmniFocus using the URL scheme
export async function executeOmniFocusScript(
  scriptPath: string,
  _args?: unknown
): Promise<unknown> {
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
      console.error('Script stderr output:', stderr);
    }

    // Parse the output as JSON
    try {
      return JSON.parse(stdout);
    } catch (parseError) {
      console.error('Error parsing script output:', parseError);
      return stdout;
    }
  } catch (error) {
    console.error('Failed to execute OmniFocus script:', error);
    throw error;
  } finally {
    // Clean up the temporary file
    if (tempFile) {
      tempFile.cleanup();
    }
  }
}
