/**
 * Logger utility for consistent logging across the application.
 * All API endpoints and socket events should log at the start of execution.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatParams(params?: object): string {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }
  return ' ' + JSON.stringify(params);
}

function getTimestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  /**
   * Log API requests
   * Format: [API] <METHOD> <PATH> <PARAMS>
   */
  api(method: string, path: string, params?: object): void {
    console.log(`[${getTimestamp()}] [API] ${method} ${path}${formatParams(params)}`);
  },

  /**
   * Log Socket.io events
   * Format: [SOCKET] <EVENT> <PARAMS>
   */
  socket(event: string, params?: object): void {
    console.log(`[${getTimestamp()}] [SOCKET] ${event}${formatParams(params)}`);
  },

  /**
   * Log debug information for internal operations
   */
  debug(context: string, data?: object): void {
    console.log(`[${getTimestamp()}] [DEBUG] ${context}${formatParams(data)}`);
  },

  /**
   * Log informational messages
   */
  info(message: string, data?: object): void {
    console.log(`[${getTimestamp()}] [INFO] ${message}${formatParams(data)}`);
  },

  /**
   * Log warnings
   */
  warn(message: string, data?: object): void {
    console.warn(`[${getTimestamp()}] [WARN] ${message}${formatParams(data)}`);
  },

  /**
   * Log errors
   */
  error(context: string, error: unknown): void {
    const errorMessage: string =
      error instanceof Error ? error.message : String(error);
    const errorStack: string | undefined =
      error instanceof Error ? error.stack : undefined;

    console.error(`[${getTimestamp()}] [ERROR] ${context}: ${errorMessage}`);
    if (errorStack) {
      console.error(errorStack);
    }
  },
};
