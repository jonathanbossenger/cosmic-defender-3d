/**
 * Logger - Handles error logging and debugging
 */
export class Logger {
  constructor(options = {}) {
    this.logFile = options.logFile || 'game.log';
    this.maxLogSize = options.maxLogSize || 1000; // Maximum number of log entries
    this.logs = [];
    this.errorHandlers = new Map();
    
    // Initialize error handling
    this.setupErrorHandling();
  }
  
  setupErrorHandling() {
    // Handle uncaught errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.logError('UNCAUGHT', {
        message,
        source,
        lineno,
        colno,
        stack: error?.stack
      });
      
      // Check if we have a handler for this error
      this.handleError(message, error);
      
      return false; // Let the error propagate
    };
    
    // Handle unhandled promise rejections
    window.onunhandledrejection = (event) => {
      this.logError('UNHANDLED_PROMISE', {
        message: event.reason?.message || event.reason,
        stack: event.reason?.stack
      });
      
      // Check if we have a handler for this error
      this.handleError(event.reason?.message || event.reason, event.reason);
    };
  }
  
  /**
   * Add an error handler for specific error types
   * @param {string} errorPattern - Regex pattern to match error message
   * @param {Function} handler - Handler function to call
   */
  addErrorHandler(errorPattern, handler) {
    this.errorHandlers.set(errorPattern, handler);
  }
  
  /**
   * Handle an error if we have a matching handler
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  handleError(message, error) {
    for (const [pattern, handler] of this.errorHandlers) {
      if (message.match(new RegExp(pattern))) {
        try {
          handler(error);
        } catch (handlerError) {
          this.logError('ERROR_HANDLER_FAILED', {
            originalError: message,
            handlerError: handlerError.message,
            stack: handlerError.stack
          });
        }
      }
    }
  }
  
  /**
   * Log an error with additional context
   * @param {string} type - Error type
   * @param {Object} data - Error data
   */
  logError(type, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      data
    };
    
    // Add to memory logs
    this.logs.push(logEntry);
    
    // Trim logs if they exceed max size
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }
    
    // Save to local storage
    this.saveToStorage();
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${type}]`, data);
    }
  }
  
  /**
   * Save logs to local storage
   */
  saveToStorage() {
    try {
      localStorage.setItem('gameLogs', JSON.stringify(this.logs));
    } catch (e) {
      console.warn('Failed to save logs to storage:', e);
    }
  }
  
  /**
   * Load logs from local storage
   */
  loadFromStorage() {
    try {
      const savedLogs = localStorage.getItem('gameLogs');
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (e) {
      console.warn('Failed to load logs from storage:', e);
    }
  }
  
  /**
   * Get all logs
   * @returns {Array} Array of log entries
   */
  getLogs() {
    return this.logs;
  }
  
  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.saveToStorage();
  }
  
  /**
   * Add common error handlers for known issues
   */
  addCommonErrorHandlers() {
    // Handle missing physics helper
    this.addErrorHandler('is not a function.*addBox', () => {
      console.warn('Physics helper not properly initialized. Checking physics setup...');
      
      // Check if physics object exists and has helper
      if (!window.game?.physics?.helper) {
        console.error('Physics helper missing. Attempting to reinitialize physics...');
        // Game would need to reinitialize physics here
      }
    });
    
    // Handle texture loader errors
    this.addErrorHandler('createTextureLoader.*not a function', () => {
      console.warn('TextureLoader not properly initialized. Using direct THREE.TextureLoader...');
      // Game would need to fix texture loading here
    });
    
    // Add more common error handlers as needed
  }
} 