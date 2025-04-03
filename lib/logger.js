/**
 * Simple logger utility for the MCP server
 */
class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    this.enableTimestamp = options.enableTimestamp !== false;
  }

  /**
   * Get current timestamp in ISO format
   * @returns {string} Formatted timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format a log message with optional timestamp
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @returns {string} Formatted log message
   */
  formatMessage(level, message) {
    const timestamp = this.enableTimestamp ? `[${this.getTimestamp()}] ` : '';
    return `${timestamp}[${level.toUpperCase()}] ${message}`;
  }

  /**
   * Check if the given log level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean} Whether the level should be logged
   */
  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  /**
   * Log an error message
   * @param {string} message - Error message
   */
  error(message) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message));
    }
  }

  /**
   * Log a warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message));
    }
  }

  /**
   * Log an info message
   * @param {string} message - Info message
   */
  info(message) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message));
    }
  }

  /**
   * Log a debug message
   * @param {string} message - Debug message
   */
  debug(message) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message));
    }
  }

  /**
   * Log an object as JSON
   * @param {string} level - Log level
   * @param {string} label - Label for the object
   * @param {object} obj - Object to log
   */
  logObject(level, label, obj) {
    if (this.shouldLog(level)) {
      const message = `${label}: ${JSON.stringify(obj, null, 2)}`;
      switch (level) {
        case 'error':
          this.error(message);
          break;
        case 'warn':
          this.warn(message);
          break;
        case 'info':
          this.info(message);
          break;
        case 'debug':
          this.debug(message);
          break;
        default:
          this.info(message);
      }
    }
  }
}

// Create a default logger instance
const logger = new Logger({ logLevel: process.env.LOG_LEVEL || 'info' });

export default logger;
