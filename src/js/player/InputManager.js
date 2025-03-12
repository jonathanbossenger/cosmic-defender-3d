/**
 * InputManager - Handles keyboard and mouse input for the player
 */
export class InputManager {
  /**
   * Create a new input manager
   * @param {HTMLElement} element - DOM element to attach listeners to
   * @param {Object} options - Input options
   */
  constructor(element, options = {}) {
    this.element = element;
    
    // Default options
    this.options = Object.assign({
      enablePointerLock: true,
      preventContextMenu: true,
    }, options);
    
    // Input state
    this.isPointerLocked = false;
    this.mousePosition = { x: 0, y: 0 };
    this.mouseDelta = { x: 0, y: 0 };
    
    // Callbacks
    this.onKeyDown = null;
    this.onKeyUp = null;
    this.onMouseMove = null;
    this.onMouseDown = null;
    this.onMouseUp = null;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize input manager
   */
  init() {
    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.handlePointerLockError = this.handlePointerLockError.bind(this);
    
    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    this.element.addEventListener('mousemove', this.handleMouseMove);
    this.element.addEventListener('mousedown', this.handleMouseDown);
    this.element.addEventListener('mouseup', this.handleMouseUp);
    
    // Set up pointer lock if enabled
    if (this.options.enablePointerLock) {
      document.addEventListener('pointerlockchange', this.handlePointerLockChange);
      document.addEventListener('pointerlockerror', this.handlePointerLockError);
      
      // Request pointer lock on click
      this.element.addEventListener('click', () => {
        if (!this.isPointerLocked) {
          this.element.requestPointerLock();
        }
      });
    }
    
    // Prevent context menu if enabled
    if (this.options.preventContextMenu) {
      this.element.addEventListener('contextmenu', (event) => {
        event.preventDefault();
      });
    }
  }
  
  /**
   * Handle key down event
   * @param {KeyboardEvent} event - Key event
   */
  handleKeyDown(event) {
    // Ignore if typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Call callback if set
    if (this.onKeyDown) {
      this.onKeyDown(event.key);
    }
  }
  
  /**
   * Handle key up event
   * @param {KeyboardEvent} event - Key event
   */
  handleKeyUp(event) {
    // Ignore if typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Call callback if set
    if (this.onKeyUp) {
      this.onKeyUp(event.key);
    }
  }
  
  /**
   * Handle mouse move event
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseMove(event) {
    // Update mouse position
    this.mousePosition.x = event.clientX;
    this.mousePosition.y = event.clientY;
    
    // Calculate delta if pointer is locked
    if (this.isPointerLocked) {
      this.mouseDelta.x = event.movementX || 0;
      this.mouseDelta.y = event.movementY || 0;
    } else {
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }
    
    // Call callback if set
    if (this.onMouseMove) {
      this.onMouseMove(this.mouseDelta.x, this.mouseDelta.y);
    }
  }
  
  /**
   * Handle mouse down event
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseDown(event) {
    // Call callback if set
    if (this.onMouseDown) {
      this.onMouseDown(event.button);
    }
  }
  
  /**
   * Handle mouse up event
   * @param {MouseEvent} event - Mouse event
   */
  handleMouseUp(event) {
    // Call callback if set
    if (this.onMouseUp) {
      this.onMouseUp(event.button);
    }
  }
  
  /**
   * Handle pointer lock change
   */
  handlePointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.element;
  }
  
  /**
   * Handle pointer lock error
   */
  handlePointerLockError() {
    console.error('Pointer lock error');
  }
  
  /**
   * Set key down callback
   * @param {Function} callback - Callback function
   */
  setKeyDownCallback(callback) {
    this.onKeyDown = callback;
  }
  
  /**
   * Set key up callback
   * @param {Function} callback - Callback function
   */
  setKeyUpCallback(callback) {
    this.onKeyUp = callback;
  }
  
  /**
   * Set mouse move callback
   * @param {Function} callback - Callback function
   */
  setMouseMoveCallback(callback) {
    this.onMouseMove = callback;
  }
  
  /**
   * Set mouse down callback
   * @param {Function} callback - Callback function
   */
  setMouseDownCallback(callback) {
    this.onMouseDown = callback;
  }
  
  /**
   * Set mouse up callback
   * @param {Function} callback - Callback function
   */
  setMouseUpCallback(callback) {
    this.onMouseUp = callback;
  }
  
  /**
   * Dispose of input manager
   */
  dispose() {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.element.removeEventListener('mousemove', this.handleMouseMove);
    this.element.removeEventListener('mousedown', this.handleMouseDown);
    this.element.removeEventListener('mouseup', this.handleMouseUp);
    
    if (this.options.enablePointerLock) {
      document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
      document.removeEventListener('pointerlockerror', this.handlePointerLockError);
    }
  }
} 