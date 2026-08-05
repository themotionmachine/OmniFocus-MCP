import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { existsSync } from "fs";
import { Logger } from './logger.js';
import { JXA_FORMAT_DATE_SOURCE } from './dateSerialization.js';

const execAsync = promisify(exec);
const MAX_BUFFER = 10 * 1024 * 1024; // 10MB — default 1MB is too small for large OmniFocus databases

let _logger: Logger | null = null;

export function setScriptLogger(logger: Logger): void {
  _logger = logger;
}

// --- osascript contention control (issue #80, problem B) -----------------------
// OmniFocus.app is a single-threaded shared resource. Under concurrency it
// returns `AppleEvent timed out (-1712)` and, at the default timeout, hangs each
// caller for ~120s. We can't fix cross-process contention from inside one server,
// but we can stop a single server from making it worse and fail fast instead of
// hanging: (1) bound how many osascript children we run at once, (2) impose a
// Node-level timeout that kills a stuck osascript, (3) retry timeouts with
// backoff — but ONLY for idempotent reads. A -1712 on a write may have partially
// applied, so retrying a create could duplicate; writes fail fast and honestly.

function resolvePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const MAX_CONCURRENT_OSASCRIPT = resolvePositiveIntEnv('OMNIFOCUS_MCP_MAX_CONCURRENT_OSASCRIPT', 4);
const OSASCRIPT_TIMEOUT_MS = resolvePositiveIntEnv('OMNIFOCUS_MCP_OSASCRIPT_TIMEOUT_MS', 60_000);

/** Minimal FIFO semaphore bounding concurrent work. */
export class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];
  constructor(private readonly max: number) {}
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

const osascriptSemaphore = new Semaphore(MAX_CONCURRENT_OSASCRIPT);

/**
 * A -1712 AppleEvent timeout, or a Node-level kill of a stuck osascript, is
 * transient contention and safe to retry for reads. Genuine script errors are
 * not (and must not be retried).
 */
export function isRetryableOsascriptError(err: unknown): boolean {
  const e = err as { message?: string; stderr?: string; killed?: boolean; signal?: string };
  const text = `${e?.message ?? ''} ${e?.stderr ?? ''}`;
  return (
    e?.killed === true ||
    e?.signal === 'SIGTERM' ||
    text.includes('-1712') ||
    text.includes('AppleEvent timed out') ||
    text.includes('timed out')
  );
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `attempt`, retrying with backoff while `shouldRetry(err)` holds. Extracted
 * (with injectable sleep) so the retry policy is unit-testable without osascript.
 */
export async function withOsascriptRetry<T>(
  attempt: () => Promise<T>,
  opts: {
    shouldRetry: (err: unknown) => boolean;
    backoffsMs?: number[];
    sleepFn?: (ms: number) => Promise<void>;
  }
): Promise<T> {
  const backoffs = opts.backoffsMs ?? [500, 1500];
  const doSleep = opts.sleepFn ?? sleep;
  let i = 0;
  for (;;) {
    try {
      return await attempt();
    } catch (err) {
      if (i >= backoffs.length || !opts.shouldRetry(err)) throw err;
      _logger?.error('scriptExecution', `osascript retryable failure (attempt ${i + 1}); retrying`);
      await doSleep(backoffs[i]);
      i++;
    }
  }
}

export interface RunOsascriptOptions {
  language?: 'AppleScript' | 'JavaScript';
  maxBuffer?: number;
  timeoutMs?: number;
  /** Only enable for idempotent reads — see the note above. */
  retryOnTimeout?: boolean;
}

/**
 * Execute an osascript file behind the shared concurrency gate with a hard
 * timeout, optionally retrying transient timeouts. All osascript invocations in
 * the server route through here so the bounds actually apply globally per-process.
 */
export async function runOsascriptFile(
  tempFile: string,
  options: RunOsascriptOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  const {
    language,
    maxBuffer = MAX_BUFFER,
    timeoutMs = OSASCRIPT_TIMEOUT_MS,
    retryOnTimeout = false,
  } = options;
  const langFlag = language === 'JavaScript' ? '-l JavaScript ' : '';
  const cmd = `osascript ${langFlag}"${tempFile}"`;

  const attempt = () =>
    osascriptSemaphore.run(() =>
      execAsync(cmd, { maxBuffer, timeout: timeoutMs, killSignal: 'SIGTERM' })
    );

  if (!retryOnTimeout) return attempt();
  return withOsascriptRetry(attempt, { shouldRetry: isRetryableOsascriptError });
}

// Helper function to execute OmniFocus scripts
export async function executeJXA(script: string): Promise<any[]> {
  const start = Date.now();
  try {
    // Write the script to a temporary file in the system temp directory
    const tempFile = join(tmpdir(), `jxa_script_${crypto.randomUUID()}.js`);

    // Write the script to the temporary file
    writeFileSync(tempFile, script);

    _logger?.debug("scriptExecution", "Executing JXA script");

    // Execute the script using osascript (read path — safe to retry on -1712)
    const { stdout, stderr } = await runOsascriptFile(tempFile, {
      language: 'JavaScript',
      retryOnTimeout: true,
    });

    if (stderr) {
      console.error("Script stderr output:", stderr);
    }

    // Clean up the temporary file
    unlinkSync(tempFile);

    const elapsed = Date.now() - start;
    _logger?.debug("scriptExecution", `JXA script completed in ${elapsed}ms`);

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
    const elapsed = Date.now() - start;
    _logger?.error("scriptExecution", `JXA script failed after ${elapsed}ms: ${error}`);
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
export async function executeOmniFocusScript(
  scriptPath: string,
  args?: string[]
): Promise<any> {
  const start = Date.now();
  try {
    // Get the actual script path
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

    // Create a wrapper script that sets up arguments and executes the original script.
    //
    // Every payload gets `formatDate` from the canonical implementation (#91) instead
    // of declaring its own. The payloads each used to carry a `toISOString()` copy,
    // which meant a timezone fix had to be applied in N places or silently only
    // half-land. Payloads must NOT declare `formatDate` themselves — a `function`
    // declaration alongside this `const` is a redeclaration SyntaxError, which the
    // prelude test asserts against.
    let wrappedScript = `${JXA_FORMAT_DATE_SOURCE}\n\n${scriptContent}`;

    if (args && args.length > 0) {
      const quotedArgs = args
        .map((arg) => `"${escapeContent(arg)}"`)
        .join(", ");
      wrappedScript = `${JXA_FORMAT_DATE_SOURCE}

// Set up arguments
const argv = [${quotedArgs}];

${scriptContent}`;
    }

    // Create a temporary file for our JXA wrapper script
    const tempFile = join(tmpdir(), `jxa_wrapper_${crypto.randomUUID()}.js`);

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

    _logger?.debug("scriptExecution", `Executing OmniFocus script: ${scriptPath}`);

    // Write the JXA script to the temporary file
    writeFileSync(tempFile, jxaScript);

    // Execute the JXA script using osascript (read path — safe to retry on -1712)
    const { stdout, stderr } = await runOsascriptFile(tempFile, {
      language: 'JavaScript',
      retryOnTimeout: true,
    });

    // Clean up the temporary file
    unlinkSync(tempFile);

    if (stderr) {
      console.error("Script stderr output:", stderr);
    }

    const elapsed = Date.now() - start;
    _logger?.debug("scriptExecution", `OmniFocus script completed in ${elapsed}ms`);

    // Parse the output as JSON
    try {
      return JSON.parse(stdout);
    } catch (parseError) {
      console.error("Error parsing script output:", parseError);
      return stdout;
    }
  } catch (error) {
    const elapsed = Date.now() - start;
    _logger?.error("scriptExecution", `OmniFocus script failed after ${elapsed}ms: ${error}`);
    console.error("Failed to execute OmniFocus script:", error);
    throw error;
  }
}
