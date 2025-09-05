import { exec, spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

// Helper function to execute OmniFocus scripts
export async function executeJXA(script: string): Promise<any[]> {
  try {
    const stdout = await runOsascript(script, { language: 'JavaScript' });
    try {
      const result = JSON.parse(stdout);
      return result;
    } catch (e) {
      console.error("Failed to parse script output as JSON:", e);
      if (stdout.includes("Found") && stdout.includes("tasks")) {
        return [];
      }
      return [];
    }
  } catch (error) {
    console.error("Failed to execute JXA script:", error);
    throw error;
  }
}

// Function to execute scripts in OmniFocus using the URL scheme
// Update src/utils/scriptExecution.ts
export async function executeOmniFocusScript(scriptPath: string, args?: any): Promise<any> {
  try {
    // Get the actual script path (existing code remains the same)
    let actualPath;
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
    const escapedScript = scriptContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    
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
    const stdout = await runOsascript(jxaScript, { language: 'JavaScript' });
    try {
      return JSON.parse(stdout);
    } catch (parseError) {
      console.error("Error parsing script output:", parseError);
      return stdout;
    }
  } catch (error) {
    console.error("Failed to execute OmniFocus script:", error);
    throw error;
  }
}

// Execute a raw AppleScript via osascript using stdin.
// Provides better control over stdio and supports timeouts.
export function runAppleScript(script: string, options?: { timeoutMs?: number }): Promise<string> {
  return runOsascript(script, { language: 'AppleScript', timeoutMs: options?.timeoutMs });
}

// Shared runner for osascript using stdin. Set language to 'JavaScript' for JXA.
function runOsascript(script: string, opts?: { language?: 'JavaScript' | 'AppleScript'; timeoutMs?: number }): Promise<string> {
  const timeoutMs = opts?.timeoutMs ?? 30000;
  const args = ['-s', 'o'];
  if (opts?.language === 'JavaScript') {
    args.push('-l', 'JavaScript');
  }
  args.push('-');

  return new Promise((resolve, reject) => {
    const proc = spawn('osascript', args);

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill('SIGKILL');
        reject(new Error(`osascript timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        const msg = (stderr.trim() || stdout.trim() || `osascript exited with code ${code}`);
        reject(new Error(msg));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.stdin.write(script);
    proc.stdin.end();
  });
}
    
