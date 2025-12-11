/**
 * MCP-compliant logger for stdio transport.
 *
 * ## MCP Specification Compliance
 *
 * Per MCP specification (https://modelcontextprotocol.io/specification/2025-06-18/basic/transports):
 *
 * > "Servers MAY send UTF-8 strings to their stderr stream. These are NOT
 * > protocol messages and SHOULD NOT be parsed as JSON-RPC. Hosts SHOULD
 * > capture stderr and expose it for diagnostics."
 *
 * This means:
 * - **stdout**: RESERVED exclusively for JSON-RPC protocol messages
 * - **stderr**: MAY be used for logging (captured by host applications)
 *
 * ## Implementation
 *
 * This logger writes structured JSON to stderr, making logs:
 * - Machine-parseable for log aggregation tools
 * - Human-readable when inspected
 * - MCP-compliant (does not interfere with JSON-RPC on stdout)
 *
 * Claude Desktop captures stderr logs to:
 * `~/Library/Logs/Claude/mcp-server-omnifocus-mcp.log`
 *
 * ## Omni Automation Compatibility
 *
 * This logging approach is fully compatible with OmniJS scripts executed via
 * `osascript`. OmniJS script output flows through the JXA wrapper and is
 * returned as JSON-RPC responses on stdout. Logging to stderr keeps diagnostic
 * output separate from script results.
 *
 * ## Future Enhancement (Phase 20)
 *
 * Migrate to MCP protocol-native logging using `server.sendLoggingMessage()`
 * for client-visible structured logs. This requires refactoring from `McpServer`
 * to the low-level `Server` class.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 * @see https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/logging
 */

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context?: string;
  message: string;
  data?: unknown;
}

/**
 * Writes a structured log entry to stderr.
 * Uses process.stderr.write instead of console.error to avoid lint warnings
 * while maintaining MCP stdio transport compliance.
 */
function writeLog(level: LogLevel, message: string, context?: string, data?: unknown): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
    ...(data !== undefined && { data })
  };

  process.stderr.write(JSON.stringify(entry) + '\n');
}

/**
 * MCP-compliant logger that writes structured JSON to stderr.
 *
 * @example
 * ```typescript
 * import { logger } from './utils/logger.js';
 *
 * logger.info('Server started', 'server');
 * logger.error('Script failed', 'assignTags', { taskId: 'abc123' });
 * logger.debug('Processing item', 'batchOp', { index: 5, total: 10 });
 * ```
 */
export const logger = {
  /**
   * Log debug-level message (detailed diagnostic info)
   */
  debug(message: string, context?: string, data?: unknown): void {
    writeLog('debug', message, context, data);
  },

  /**
   * Log info-level message (general operational info)
   */
  info(message: string, context?: string, data?: unknown): void {
    writeLog('info', message, context, data);
  },

  /**
   * Log warning-level message (potential issues)
   */
  warning(message: string, context?: string, data?: unknown): void {
    writeLog('warning', message, context, data);
  },

  /**
   * Log error-level message (operation failures)
   */
  error(message: string, context?: string, data?: unknown): void {
    writeLog('error', message, context, data);
  }
};
