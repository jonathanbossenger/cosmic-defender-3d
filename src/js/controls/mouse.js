import * as THREE from 'three';

export class MouseInput {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    
    // Mouse state
    this.isLocked = false;
    this.mouseSensitivity = 0.002;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseMovement = new THREE.Vector2();
    
    // Camera rotation objects
    this.pitchObject = new THREE.Object3D(); // Rotation around X-axis (looking up/down)
    this.yawObject = new THREE.Object3D();   // Rotation around Y-axis (looking left/right)
    
    // Set up camera hierarchy
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(this.camera);
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Mouse movement
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Pointer lock events
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this));
    
    // Click to lock pointer
    this.domElement.addEventListener('click', this.requestPointerLock.bind(this));
  }
  
  requestPointerLock() {
    if (!this.isLocked) {
      this.domElement.requestPointerLock();
    }
  }
  
  exitPointerLock() {
    if (this.isLocked) {
      document.exitPointerLock();
    }
  }
  
  onPointerLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
    
    // Reset mouse movement when lock state changes
    this.mouseMovement.set(0, 0);
  }
  
  onPointerLockError() {
    console.error('Pointer lock error');
  }
  
  onMouseMove(event) {
    if (!this.isLocked) return;
    
    // Update mouse position
    this.mouseX += event.movementX;
    this.mouseY += event.movementY;
    
    // Store mouse movement for this frame
    this.mouseMovement.set(event.movementX, event.movementY);
    
    // Update camera rotation
    this.yawObject.rotation.y -= event.movementX * this.mouseSensitivity;
    this.pitchObject.rotation.x -= event.movementY * this.mouseSensitivity;
    
    // Limit pitch to avoid camera flipping
    this.pitchObject.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.pitchObject.rotation.x)
    );
  }
  
  update() {
    // Reset mouse movement after each frame
    this.mouseMovement.set(0, 0);
  }
  
  getDirection() {
    // Get the direction the camera is looking
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    return direction;
  }
  
  getObject() {
    return this.yawObject;
  }
  
  getMouseMovement() {
    return this.mouseMovement.clone();
  }
  
  setPosition(x, y, z) {
    this.yawObject.position.set(x, y, z);
  }
  
  setSensitivity(sensitivity) {
    this.mouseSensitivity = sensitivity;
  }
}
