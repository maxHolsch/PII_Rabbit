/**
 * Centralized logging utility with buffering and exportability
 * Provides observability across all extension components
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  stack?: string;
}

class Logger {
  private buffer: LogEntry[] = [];
  private maxBuffer = 1000;
  private isDev = import.meta.env.DEV;

  log(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      stack: level === 'error' ? new Error().stack : undefined,
    };

    // Console output in dev mode
    if (this.isDev) {
      const consoleMethod = console[level] || console.log;
      consoleMethod(`[${category}] ${message}`, data || '');
    }

    // Buffer for export/debugging
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer.shift();
    }

    // Emit event for UI display (if event bus is available)
    if (typeof window !== 'undefined' && (window as any).eventBus) {
      (window as any).eventBus.emit('log:entry', entry);
    }
  }

  debug(category: string, message: string, data?: Record<string, unknown>): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: Record<string, unknown>): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: Record<string, unknown>): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: Record<string, unknown>): void {
    this.log('error', category, message, data);
  }

  exportLogs(): string {
    return JSON.stringify(this.buffer, null, 2);
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  getRecentLogs(count = 100): LogEntry[] {
    return this.buffer.slice(-count);
  }
}

// Singleton instance
export const logger = new Logger();
