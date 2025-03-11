/**
 * Object pool for efficient reuse of objects
 * This helps reduce garbage collection and improve performance
 */
export class PoolManager {
  /**
   * Create a new object pool
   * @param {Function} createFunc - Function to create a new object
   * @param {Function} resetFunc - Function to reset an object for reuse
   * @param {number} initialSize - Initial pool size
   */
  constructor(createFunc, resetFunc, initialSize = 10) {
    this.createFunc = createFunc;
    this.resetFunc = resetFunc;
    
    // Pool of available objects
    this.pool = [];
    
    // Active objects currently in use
    this.active = new Set();
    
    // Initialize pool with objects
    this.initialize(initialSize);
  }
  
  /**
   * Initialize the pool with a number of objects
   * @param {number} size - Number of objects to create
   */
  initialize(size) {
    for (let i = 0; i < size; i++) {
      this.pool.push(this.createFunc());
    }
  }
  
  /**
   * Get an object from the pool
   * @returns {Object} An object from the pool
   */
  get() {
    // If pool is empty, create a new object
    if (this.pool.length === 0) {
      this.pool.push(this.createFunc());
    }
    
    // Get object from pool
    const object = this.pool.pop();
    
    // Add to active set
    this.active.add(object);
    
    return object;
  }
  
  /**
   * Return an object to the pool
   * @param {Object} object - The object to return to the pool
   */
  release(object) {
    // If object is active, reset and return to pool
    if (this.active.has(object)) {
      this.active.delete(object);
      this.resetFunc(object);
      this.pool.push(object);
    }
  }
  
  /**
   * Release all active objects back to the pool
   */
  releaseAll() {
    this.active.forEach(object => {
      this.resetFunc(object);
      this.pool.push(object);
    });
    
    this.active.clear();
  }
  
  /**
   * Get the number of available objects in the pool
   * @returns {number} Number of available objects
   */
  getAvailableCount() {
    return this.pool.length;
  }
  
  /**
   * Get the number of active objects
   * @returns {number} Number of active objects
   */
  getActiveCount() {
    return this.active.size;
  }
  
  /**
   * Get all active objects
   * @returns {Array} Array of active objects
   */
  getActiveObjects() {
    return Array.from(this.active);
  }
  
  /**
   * Ensure the pool has at least the specified number of available objects
   * @param {number} minCount - Minimum number of available objects
   */
  ensureCapacity(minCount) {
    const needed = Math.max(0, minCount - this.pool.length);
    
    for (let i = 0; i < needed; i++) {
      this.pool.push(this.createFunc());
    }
  }
  
  /**
   * Trim the pool to a maximum size
   * @param {number} maxSize - Maximum pool size
   */
  trim(maxSize) {
    if (this.pool.length > maxSize) {
      this.pool.splice(maxSize, this.pool.length - maxSize);
    }
  }
}
