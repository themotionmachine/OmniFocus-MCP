import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { existsSync } from "fs";

const execAsync = promisify(exec);

// Helper function to execute OmniFocus scripts
export async function executeJXA(script: string): Promise<any[]> {
  try {
    // Write the script to a temporary file in the system temp directory
    const tempFile = join(tmpdir(), `jxa_script_${Date.now()}.js`);

    // Write the script to the temporary file
    writeFileSync(tempFile, script);

    // Execute the script using osascript
    const { stdout, stderr } = await execAsync(
      `osascript -l JavaScript ${tempFile}`
    );

    if (stderr) {
      console.error("Script stderr output:", stderr);
    }

    // Clean up the temporary file
    unlinkSync(tempFile);

    // Parse the output as JSON
    try {
      const result = JSON.parse(stdout);
      return result;
    } catch (e) {
      console.error("Failed to parse script output as JSON:", e);

      // If this contains a "Found X tasks" message, treat it as a successful non-JSON response
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

const escapeContent = (content: string) => {
  return content
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/`/g, "\\`") // Escape backticks
    .replace(/\$/g, "\\$"); // Escape dollar signs
};

// Function to execute scripts in OmniFocus using the URL scheme
// Update src/utils/scriptExecution.ts
export async function executeOmniFocusScript(
  scriptPath: string,
  args?: string[]
): Promise<any> {
  try {
    // Get the actual script path (existing code remains the same)
    let actualPath;
    if (scriptPath.startsWith("@")) {
      const scriptName = scriptPath.substring(1);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      const distPath = join(
        __dirname,
        "..",
        "utils",
        "omnifocusScripts",
        scriptName
      );
      const srcPath = join(
        __dirname,
        "..",
        "..",
        "src",
        "utils",
        "omnifocusScripts",
        scriptName
      );

      if (existsSync(distPath)) {
        actualPath = distPath;
      } else if (existsSync(srcPath)) {
        actualPath = srcPath;
      } else {
        actualPath = join(__dirname, "..", "omnifocusScripts", scriptName);
      }
    } else {
      actualPath = scriptPath;
    }

    // Read the script file
    const scriptContent = readFileSync(actualPath, "utf8");

    // Create a wrapper script that sets up arguments and executes the original script
    let wrappedScript = scriptContent;

    if (args && args.length > 0) {
      const quotedArgs = args
        .map((arg) => `"${escapeContent(arg)}"`)
        .join(", ");
      wrappedScript = `
// Set up arguments
const argv = [${quotedArgs}];

${scriptContent}`;
    }

    // Create a temporary file for our JXA wrapper script
    const tempFile = join(tmpdir(), `jxa_wrapper_${Date.now()}.js`);

    // Escape the script content properly for use in JXA
    const escapedScript = escapeContent(wrappedScript);

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

    // Write the JXA script to the temporary file
    writeFileSync(tempFile, jxaScript);

    // Execute the JXA script using osascript
    const { stdout, stderr } = await execAsync(
      `osascript -l JavaScript ${tempFile}`
    );

    // Clean up the temporary file
    unlinkSync(tempFile);

    if (stderr) {
      console.error("Script stderr output:", stderr);
    }

    // Parse the output as JSON
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
