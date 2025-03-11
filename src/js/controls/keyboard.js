export class KeyboardInput {
  constructor() {
    // Key states
    this.keys = {};
    
    // Key mappings
    this.keyMap = {
      // Movement
      forward: ['KeyW', 'ArrowUp'],
      backward: ['KeyS', 'ArrowDown'],
      left: ['KeyA', 'ArrowLeft'],
      right: ['KeyD', 'ArrowRight'],
      
      // Actions
      jump: ['Space'],
      sprint: ['ShiftLeft', 'ShiftRight'],
      crouch: ['ControlLeft', 'ControlRight', 'KeyC'],
      dodge: ['KeyQ', 'KeyE'],
      
      // Weapons
      fire: ['Mouse0'], // Left mouse button
      altFire: ['Mouse2'], // Right mouse button
      reload: ['KeyR'],
      
      // UI
      pause: ['Escape', 'KeyP'],
      inventory: ['KeyI', 'Tab'],
      
      // Debug
      debug: ['F3']
    };
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse button events (handled as keyboard events for consistency)
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Prevent default behavior for game keys
    window.addEventListener('keydown', (event) => {
      // Prevent default for game keys (e.g., prevent spacebar from scrolling)
      for (const action in this.keyMap) {
        if (this.keyMap[action].includes(event.code)) {
          event.preventDefault();
          break;
        }
      }
    });
  }
  
  handleKeyDown(event) {
    this.keys[event.code] = true;
  }
  
  handleKeyUp(event) {
    this.keys[event.code] = false;
  }
  
  handleMouseDown(event) {
    this.keys[`Mouse${event.button}`] = true;
  }
  
  handleMouseUp(event) {
    this.keys[`Mouse${event.button}`] = false;
  }
  
  // Check if any key for a specific action is pressed
  isPressed(action) {
    if (!this.keyMap[action]) {
      console.warn(`Action "${action}" not found in key map`);
      return false;
    }
    
    return this.keyMap[action].some(key => this.keys[key]);
  }
  
  // Check if a specific key is pressed
  isKeyPressed(keyCode) {
    return !!this.keys[keyCode];
  }
  
  // Get all currently pressed keys
  getPressedKeys() {
    return Object.keys(this.keys).filter(key => this.keys[key]);
  }
  
  // Add a custom key mapping
  addKeyMapping(action, keys) {
    if (!Array.isArray(keys)) {
      keys = [keys];
    }
    
    this.keyMap[action] = keys;
  }
  
  // Reset all key states (useful when losing focus)
  resetKeys() {
    for (const key in this.keys) {
      this.keys[key] = false;
    }
  }
}
