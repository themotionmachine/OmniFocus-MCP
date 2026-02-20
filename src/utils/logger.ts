import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { LoggingLevel } from "@modelcontextprotocol/sdk/types.js";

const LOG_LEVELS: LoggingLevel[] = [
  "debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"
];

export class Logger {
  private server: Server;
  private minLevel: LoggingLevel = "info";

  constructor(server: Server) {
    this.server = server;
  }

  setLevel(level: LoggingLevel): void {
    this.minLevel = level;
  }

  getLevel(): LoggingLevel {
    return this.minLevel;
  }

  private shouldLog(level: LoggingLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.minLevel);
  }

  private log(level: LoggingLevel, logger: string, data: unknown): void {
    if (!this.shouldLog(level)) return;

    try {
      this.server.sendLoggingMessage({ level, logger, data });
    } catch {
      // Connection may not be established yet; fall back to stderr
      console.error(`[${level}] [${logger}]`, data);
    }
  }

  debug(logger: string, data: unknown): void {
    this.log("debug", logger, data);
  }

  info(logger: string, data: unknown): void {
    this.log("info", logger, data);
  }

  notice(logger: string, data: unknown): void {
    this.log("notice", logger, data);
  }

  warning(logger: string, data: unknown): void {
    this.log("warning", logger, data);
  }

  error(logger: string, data: unknown): void {
    this.log("error", logger, data);
  }
}
