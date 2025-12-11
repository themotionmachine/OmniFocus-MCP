/**
 * MCP-compliant logger for stdio transport.
 *
 * Per MCP specification (https://modelcontextprotocol.io/specification/2025-06-18/basic/transports):
 * - stdout is RESERVED for JSON-RPC protocol messages
 * - stderr MAY be used for logging (captured by host applications)
 *
 * This logger writes structured JSON to stderr, which Claude Desktop captures to:
 * ~/Library/Logs/Claude/mcp-server-omnifocus-mcp.log
 *
 * Future Enhancement (Phase 20): Migrate to MCP protocol-native logging using
 * server.sendLoggingMessage() for client-visible structured logs.
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
