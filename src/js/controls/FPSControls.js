import * as THREE from 'three';

export class FPSControls {
  constructor(camera, domElement, physics) {
    this.camera = camera;
    this.domElement = domElement;
    this.physics = physics;
    
    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.canJump = false;
    
    // Player state
    this.playerHeight = 2.0;
    this.playerSpeed = 10.0;
    this.playerJumpForce = 10.0;
    this.playerVelocity = new THREE.Vector3();
    this.playerDirection = new THREE.Vector3();
    
    // Mouse look
    this.lookSensitivity = 0.002;
    this.pitchObject = new THREE.Object3D();
    this.yawObject = new THREE.Object3D();
    this.yawObject.position.y = this.playerHeight;
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(this.camera);
    
    // Lock pointer on click
    this.domElement.addEventListener('click', () => {
      this.domElement.requestPointerLock();
    });
    
    // Setup event listeners
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Create player collision body
    this.createPlayerBody();
  }
  
  createPlayerBody() {
    // Create a physics body for the player
    // This will be implemented in the Physics class
    this.playerBody = this.physics.createPlayerBody(
      this.yawObject.position.x,
      this.yawObject.position.y,
      this.yawObject.position.z
    );
  }
  
  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW':
        this.moveForward = true;
        break;
      case 'KeyA':
        this.moveLeft = true;
        break;
      case 'KeyS':
        this.moveBackward = true;
        break;
      case 'KeyD':
        this.moveRight = true;
        break;
      case 'Space':
        if (this.canJump) {
          this.playerVelocity.y = this.playerJumpForce;
          this.canJump = false;
        }
        break;
    }
  }
  
  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
        this.moveForward = false;
        break;
      case 'KeyA':
        this.moveLeft = false;
        break;
      case 'KeyS':
        this.moveBackward = false;
        break;
      case 'KeyD':
        this.moveRight = false;
        break;
    }
  }
  
  onMouseMove(event) {
    if (document.pointerLockElement === this.domElement) {
      // Update camera rotation based on mouse movement
      this.yawObject.rotation.y -= event.movementX * this.lookSensitivity;
      this.pitchObject.rotation.x -= event.movementY * this.lookSensitivity;
      
      // Limit pitch to avoid camera flipping
      this.pitchObject.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.pitchObject.rotation.x)
      );
    }
  }
  
  update(deltaTime) {
    if (document.pointerLockElement !== this.domElement) {
      return;
    }
    
    // Calculate movement direction
    this.playerDirection.z = Number(this.moveForward) - Number(this.moveBackward);
    this.playerDirection.x = Number(this.moveRight) - Number(this.moveLeft);
    this.playerDirection.normalize();
    
    // Apply rotation to movement direction
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationY(this.yawObject.rotation.y);
    this.playerDirection.applyMatrix4(rotationMatrix);
    
    // Update player physics body
    this.physics.updatePlayerVelocity(
      this.playerDirection.x * this.playerSpeed,
      this.playerVelocity.y,
      this.playerDirection.z * this.playerSpeed
    );
    
    // Get updated position from physics
    const position = this.physics.getPlayerPosition();
    this.yawObject.position.copy(position);
    
    // Check if player is on ground
    this.canJump = this.physics.isPlayerOnGround();
  }
  
  getObject() {
    return this.yawObject;
  }
  
  getDirection() {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    return direction;
  }
} 
