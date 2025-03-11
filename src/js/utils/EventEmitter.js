/**
 * EventEmitter - Simple event system for handling game events
 */
export class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Function to call when event is emitted
   * @param {Object} context - Context to bind the callback to
   * @returns {Object} Subscription object with remove method
   */
  on(event, callback, context = null) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    const listener = { callback, context };
    this.events[event].push(listener);
    
    // Return subscription object
    return {
      remove: () => this.off(event, callback, context)
    };
  }
  
  /**
   * Register a one-time event listener
   * @param {string} event - Event name
   * @param {Function} callback - Function to call when event is emitted
   * @param {Object} context - Context to bind the callback to
   * @returns {Object} Subscription object with remove method
   */
  once(event, callback, context = null) {
    const subscription = this.on(event, (...args) => {
      subscription.remove();
      callback.apply(context, args);
    }, context);
    
    return subscription;
  }
  
  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Function to remove
   * @param {Object} context - Context the callback was bound to
   */
  off(event, callback, context = null) {
    if (!this.events[event]) return;
    
    // If no callback specified, remove all listeners for this event
    if (!callback) {
      delete this.events[event];
      return;
    }
    
    // Filter out the specified callback
    this.events[event] = this.events[event].filter(listener => {
      return listener.callback !== callback || (context && listener.context !== context);
    });
    
    // Clean up empty event arrays
    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }
  
  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to listeners
   * @returns {boolean} Whether the event had listeners
   */
  emit(event, ...args) {
    if (!this.events[event]) return false;
    
    // Create a copy of the listeners array to avoid issues if listeners are removed during emission
    const listeners = [...this.events[event]];
    
    // Call each listener
    listeners.forEach(listener => {
      try {
        listener.callback.apply(listener.context, args);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    });
    
    return listeners.length > 0;
  }
  
  /**
   * Remove all event listeners
   * @param {string} event - Optional event name to clear only specific event
   */
  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
  
  /**
   * Get the number of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this.events[event] ? this.events[event].length : 0;
  }
  
  /**
   * Get all event names with registered listeners
   * @returns {Array} Array of event names
   */
  eventNames() {
    return Object.keys(this.events);
  }
} 