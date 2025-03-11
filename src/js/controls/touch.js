import * as THREE from 'three';

export class TouchInput {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    
    // Touch state
    this.touches = {};
    this.touchSensitivity = 0.01;
    this.joystickSize = 120;
    this.joystickPosition = new THREE.Vector2();
    this.joystickMovement = new THREE.Vector2();
    
    // Camera rotation
    this.pitchObject = new THREE.Object3D(); // Rotation around X-axis (looking up/down)
    this.yawObject = new THREE.Object3D();   // Rotation around Y-axis (looking left/right)
    
    // Set up camera hierarchy
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(this.camera);
    
    // Movement state
    this.moveDirection = new THREE.Vector2();
    
    // UI elements
    this.createTouchControls();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Check if device supports touch
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Show/hide touch controls based on device
    this.updateControlsVisibility();
  }
  
  createTouchControls() {
    // Create container for touch controls
    this.touchControlsContainer = document.createElement('div');
    this.touchControlsContainer.className = 'touch-controls';
    document.body.appendChild(this.touchControlsContainer);
    
    // Create left joystick (movement)
    this.leftJoystick = document.createElement('div');
    this.leftJoystick.className = 'joystick left-joystick';
    this.touchControlsContainer.appendChild(this.leftJoystick);
    
    this.leftJoystickKnob = document.createElement('div');
    this.leftJoystickKnob.className = 'joystick-knob';
    this.leftJoystick.appendChild(this.leftJoystickKnob);
    
    // Create right joystick (camera)
    this.rightJoystick = document.createElement('div');
    this.rightJoystick.className = 'joystick right-joystick';
    this.touchControlsContainer.appendChild(this.rightJoystick);
    
    this.rightJoystickKnob = document.createElement('div');
    this.rightJoystickKnob.className = 'joystick-knob';
    this.rightJoystick.appendChild(this.rightJoystickKnob);
    
    // Create action buttons
    this.actionButtonsContainer = document.createElement('div');
    this.actionButtonsContainer.className = 'action-buttons';
    this.touchControlsContainer.appendChild(this.actionButtonsContainer);
    
    // Jump button
    this.jumpButton = document.createElement('div');
    this.jumpButton.className = 'action-button jump-button';
    this.jumpButton.textContent = 'Jump';
    this.actionButtonsContainer.appendChild(this.jumpButton);
    
    // Fire button
    this.fireButton = document.createElement('div');
    this.fireButton.className = 'action-button fire-button';
    this.fireButton.textContent = 'Fire';
    this.actionButtonsContainer.appendChild(this.fireButton);
    
    // Add CSS for touch controls
    this.addTouchControlsStyles();
  }
  
  addTouchControlsStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .touch-controls {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
        display: none;
      }
      
      .joystick {
        position: absolute;
        width: ${this.joystickSize}px;
        height: ${this.joystickSize}px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        pointer-events: auto;
      }
      
      .left-joystick {
        bottom: 20px;
        left: 20px;
      }
      
      .right-joystick {
        bottom: 20px;
        right: 20px;
      }
      
      .joystick-knob {
        position: absolute;
        width: 50%;
        height: 50%;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        top: 25%;
        left: 25%;
        transition: transform 0.1s ease;
      }
      
      .action-buttons {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 20px;
      }
      
      .action-button {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        pointer-events: auto;
      }
      
      .jump-button {
        background: rgba(0, 255, 0, 0.3);
      }
      
      .fire-button {
        background: rgba(255, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(style);
  }
  
  setupEventListeners() {
    // Touch events for joysticks
    this.leftJoystick.addEventListener('touchstart', this.onLeftJoystickStart.bind(this));
    this.leftJoystick.addEventListener('touchmove', this.onLeftJoystickMove.bind(this));
    this.leftJoystick.addEventListener('touchend', this.onLeftJoystickEnd.bind(this));
    
    this.rightJoystick.addEventListener('touchstart', this.onRightJoystickStart.bind(this));
    this.rightJoystick.addEventListener('touchmove', this.onRightJoystickMove.bind(this));
    this.rightJoystick.addEventListener('touchend', this.onRightJoystickEnd.bind(this));
    
    // Touch events for action buttons
    this.jumpButton.addEventListener('touchstart', () => this.onActionButtonPress('jump'));
    this.jumpButton.addEventListener('touchend', () => this.onActionButtonRelease('jump'));
    
    this.fireButton.addEventListener('touchstart', () => this.onActionButtonPress('fire'));
    this.fireButton.addEventListener('touchend', () => this.onActionButtonRelease('fire'));
    
    // Window resize event
    window.addEventListener('resize', this.updateControlsVisibility.bind(this));
  }
  
  updateControlsVisibility() {
    // Show touch controls only on touch devices
    this.touchControlsContainer.style.display = this.isTouchDevice ? 'block' : 'none';
  }
  
  onLeftJoystickStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    this.leftJoystickActive = true;
    this.leftJoystickId = touch.identifier;
    this.leftJoystickStartX = touch.clientX;
    this.leftJoystickStartY = touch.clientY;
  }
  
  onLeftJoystickMove(event) {
    event.preventDefault();
    if (!this.leftJoystickActive) return;
    
    // Find the touch that started on this joystick
    let touch;
    for (let i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier === this.leftJoystickId) {
        touch = event.touches[i];
        break;
      }
    }
    
    if (!touch) return;
    
    // Calculate joystick movement
    const dx = touch.clientX - this.leftJoystickStartX;
    const dy = touch.clientY - this.leftJoystickStartY;
    
    // Limit movement to joystick radius
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = this.joystickSize / 2;
    const limitedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);
    
    const limitedX = Math.cos(angle) * limitedDistance;
    const limitedY = Math.sin(angle) * limitedDistance;
    
    // Update joystick knob position
    this.leftJoystickKnob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
    
    // Update movement direction (normalized)
    this.moveDirection.x = limitedX / maxDistance;
    this.moveDirection.y = limitedY / maxDistance;
  }
  
  onLeftJoystickEnd(event) {
    event.preventDefault();
    this.leftJoystickActive = false;
    this.leftJoystickKnob.style.transform = 'translate(0, 0)';
    this.moveDirection.set(0, 0);
  }
  
  onRightJoystickStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    this.rightJoystickActive = true;
    this.rightJoystickId = touch.identifier;
    this.rightJoystickStartX = touch.clientX;
    this.rightJoystickStartY = touch.clientY;
    this.rightJoystickLastX = touch.clientX;
    this.rightJoystickLastY = touch.clientY;
  }
  
  onRightJoystickMove(event) {
    event.preventDefault();
    if (!this.rightJoystickActive) return;
    
    // Find the touch that started on this joystick
    let touch;
    for (let i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier === this.rightJoystickId) {
        touch = event.touches[i];
        break;
      }
    }
    
    if (!touch) return;
    
    // Calculate joystick movement
    const dx = touch.clientX - this.rightJoystickLastX;
    const dy = touch.clientY - this.rightJoystickLastY;
    
    // Update camera rotation
    this.yawObject.rotation.y -= dx * this.touchSensitivity;
    this.pitchObject.rotation.x -= dy * this.touchSensitivity;
    
    // Limit pitch to avoid camera flipping
    this.pitchObject.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.pitchObject.rotation.x)
    );
    
    // Update joystick knob position
    const totalDx = touch.clientX - this.rightJoystickStartX;
    const totalDy = touch.clientY - this.rightJoystickStartY;
    
    const distance = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
    const maxDistance = this.joystickSize / 2;
    const limitedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(totalDy, totalDx);
    
    const limitedX = Math.cos(angle) * limitedDistance;
    const limitedY = Math.sin(angle) * limitedDistance;
    
    this.rightJoystickKnob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
    
    // Store last position for next frame
    this.rightJoystickLastX = touch.clientX;
    this.rightJoystickLastY = touch.clientY;
  }
  
  onRightJoystickEnd(event) {
    event.preventDefault();
    this.rightJoystickActive = false;
    this.rightJoystickKnob.style.transform = 'translate(0, 0)';
  }
  
  onActionButtonPress(action) {
    // Set action state
    this[`${action}Pressed`] = true;
  }
  
  onActionButtonRelease(action) {
    // Reset action state
    this[`${action}Pressed`] = false;
  }
  
  update() {
    // Nothing to update per frame
  }
  
  getMovement() {
    return this.moveDirection.clone();
  }
  
  isActionPressed(action) {
    return !!this[`${action}Pressed`];
  }
  
  getObject() {
    return this.yawObject;
  }
  
  setPosition(x, y, z) {
    this.yawObject.position.set(x, y, z);
  }
  
  isTouchEnabled() {
    return this.isTouchDevice;
  }
}
