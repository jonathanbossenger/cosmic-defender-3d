import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Player - Represents the player character in the game
 */
export class Player {
  /**
   * Create a new player
   * @param {THREE.Scene} scene - The scene to add the player to
   * @param {Object} physics - The physics world
   * @param {Object} options - Player options
   */
  constructor(scene, physics, options = {}) {
    this.scene = scene;
    this.physics = physics;
    
    // Default options
    this.options = Object.assign({
      health: 100,
      maxHealth: 100,
      moveSpeed: 5,
      turnSpeed: 3,
      jumpForce: 5,
      scale: 1.0,
      color: 0x00ff88, // Cyan-green color
    }, options);
    
    // Player properties
    this.health = this.options.health;
    this.maxHealth = this.options.maxHealth;
    this.isAlive = true;
    this.isJumping = false;
    this.isMoving = false;
    this.isSprinting = false;
    
    // Movement
    this.moveDirection = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    
    // Input state
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
      shoot: false,
    };
    
    // Camera
    this.cameraOffset = new THREE.Vector3(0, 3, -5);
    this.cameraTarget = new THREE.Vector3();
    this.cameraPitch = 0;
    this.cameraYaw = 0;
    
    // Meshes and bodies
    this.mesh = null;
    this.body = null;
    this.weapon = null;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the player
   */
  init() {
    // Create player mesh
    this.createPlayerMesh();
    
    // Create physics body
    this.createPhysicsBody();
    
    // Create weapon
    this.createWeapon();
  }
  
  /**
   * Create player mesh
   */
  createPlayerMesh() {
    // Create player group
    this.mesh = new THREE.Group();
    
    // Create body geometry
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.options.color,
      roughness: 0.7,
      metalness: 0.3,
      emissive: new THREE.Color(this.options.color).multiplyScalar(0.2)
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.9;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.mesh.add(bodyMesh);
    
    // Create head geometry
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: this.options.color,
      roughness: 0.7,
      metalness: 0.3,
      emissive: new THREE.Color(this.options.color).multiplyScalar(0.2)
    });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.y = 1.6;
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    this.mesh.add(headMesh);
    
    // Scale mesh
    this.mesh.scale.multiplyScalar(this.options.scale);
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Store reference to player in userData
    this.mesh.userData.isPlayer = true;
    this.mesh.userData.playerInstance = this;
  }
  
  /**
   * Create physics body
   */
  createPhysicsBody() {
    // Create body shape (capsule approximated with cylinder)
    const radius = 0.4 * this.options.scale;
    const height = 1.6 * this.options.scale;
    const shape = new CANNON.Cylinder(radius, radius, height, 8);
    
    // Create body
    this.body = new CANNON.Body({
      mass: 80, // Player mass in kg
      position: new CANNON.Vec3(0, height / 2, 0),
      shape: shape,
      material: this.physics.world.defaultMaterial,
      linearDamping: 0.9, // Air resistance
      angularDamping: 0.9,
    });
    
    // Lock rotation except for Y axis
    this.body.fixedRotation = true;
    this.body.updateMassProperties();
    
    // Add to physics world
    this.physics.world.addBody(this.body);
  }
  
  /**
   * Create weapon
   */
  createWeapon() {
    // Create weapon group
    this.weapon = new THREE.Group();
    
    // Create weapon geometry
    const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const weaponMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.8
    });
    const weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weaponMesh.position.z = 0.25;
    this.weapon.add(weaponMesh);
    
    // Add weapon to player mesh
    this.mesh.add(this.weapon);
    this.weapon.position.set(0.4, 1.4, 0.2);
  }
  
  /**
   * Handle keyboard input
   * @param {string} key - Key being pressed
   * @param {boolean} isDown - Whether key is being pressed or released
   */
  handleKeyInput(key, isDown) {
    switch (key.toLowerCase()) {
      case 'w':
        this.input.forward = isDown;
        break;
      case 's':
        this.input.backward = isDown;
        break;
      case 'a':
        this.input.left = isDown;
        break;
      case 'd':
        this.input.right = isDown;
        break;
      case ' ':
        this.input.jump = isDown;
        break;
      case 'shift':
        this.input.sprint = isDown;
        break;
    }
    
    // Update movement state
    this.isMoving = this.input.forward || this.input.backward || 
                    this.input.left || this.input.right;
    this.isSprinting = this.input.sprint && this.isMoving;
  }
  
  /**
   * Handle mouse movement
   * @param {number} deltaX - Mouse X movement
   * @param {number} deltaY - Mouse Y movement
   */
  handleMouseMove(deltaX, deltaY) {
    // Update camera angles
    const sensitivity = 0.002;
    this.cameraYaw -= deltaX * sensitivity;
    this.cameraPitch -= deltaY * sensitivity;
    
    // Clamp pitch to prevent over-rotation
    this.cameraPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraPitch));
  }
  
  /**
   * Handle mouse button input
   * @param {number} button - Mouse button (0 = left, 1 = middle, 2 = right)
   * @param {boolean} isDown - Whether button is being pressed or released
   */
  handleMouseButton(button, isDown) {
    if (button === 0) { // Left click
      this.input.shoot = isDown;
    }
  }
  
  /**
   * Update player movement
   * @param {number} deltaTime - Time since last update
   */
  updateMovement(deltaTime) {
    if (!this.isAlive) return;
    
    // Calculate move speed
    const currentSpeed = this.isSprinting ? 
      this.options.moveSpeed * 1.5 : 
      this.options.moveSpeed;
    
    // Reset movement direction
    this.moveDirection.set(0, 0, 0);
    
    // Calculate forward direction based on camera yaw
    const forward = new THREE.Vector3(
      Math.sin(this.cameraYaw),
      0,
      Math.cos(this.cameraYaw)
    );
    
    // Calculate right direction
    const right = new THREE.Vector3(
      Math.sin(this.cameraYaw + Math.PI / 2),
      0,
      Math.cos(this.cameraYaw + Math.PI / 2)
    );
    
    // Add movement inputs
    if (this.input.forward) this.moveDirection.add(forward);
    if (this.input.backward) this.moveDirection.sub(forward);
    if (this.input.right) this.moveDirection.add(right);
    if (this.input.left) this.moveDirection.sub(right);
    
    // Normalize movement direction
    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
    }
    
    // Apply movement to physics body
    const movement = this.moveDirection.multiplyScalar(currentSpeed);
    this.body.velocity.x = movement.x;
    this.body.velocity.z = movement.z;
    
    // Handle jumping
    if (this.input.jump && !this.isJumping) {
      this.body.velocity.y = this.options.jumpForce;
      this.isJumping = true;
    }
    
    // Update mesh position from physics
    this.mesh.position.copy(this.body.position);
    
    // Update mesh rotation to face movement direction
    if (this.moveDirection.lengthSq() > 0) {
      const targetRotation = Math.atan2(this.moveDirection.x, this.moveDirection.z);
      this.mesh.rotation.y = targetRotation;
    }
  }
  
  /**
   * Update camera position
   */
  updateCamera(camera) {
    if (!camera) return;
    
    // Calculate camera position
    const position = this.mesh.position.clone();
    
    // Apply offset based on pitch and yaw
    const pitchOffset = new THREE.Vector3(
      0,
      Math.cos(this.cameraPitch) * this.cameraOffset.y,
      Math.sin(this.cameraPitch) * this.cameraOffset.z
    );
    
    const yawOffset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * this.cameraOffset.z,
      0,
      Math.cos(this.cameraYaw) * this.cameraOffset.z
    );
    
    position.add(pitchOffset);
    position.add(yawOffset);
    
    // Update camera position and target
    camera.position.copy(position);
    this.cameraTarget.copy(this.mesh.position).add(new THREE.Vector3(0, 1.5, 0));
    camera.lookAt(this.cameraTarget);
  }
  
  /**
   * Take damage
   * @param {number} amount - Amount of damage to take
   */
  takeDamage(amount) {
    if (!this.isAlive) return;
    
    this.health = Math.max(0, this.health - amount);
    
    if (this.health <= 0) {
      this.die();
    }
  }
  
  /**
   * Handle player death
   */
  die() {
    this.isAlive = false;
    this.health = 0;
    
    // Disable physics
    this.body.collisionResponse = false;
    
    // TODO: Add death animation and effects
  }
  
  /**
   * Update the player
   * @param {number} deltaTime - Time since last update
   * @param {THREE.Camera} camera - Game camera
   */
  update(deltaTime, camera) {
    // Update movement
    this.updateMovement(deltaTime);
    
    // Update camera
    this.updateCamera(camera);
    
    // Check for ground contact to reset jump
    const contacts = this.physics.world.contacts;
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      if (contact.bi === this.body || contact.bj === this.body) {
        const normal = contact.ni;
        if (normal.y > 0.5) { // Contact with ground
          this.isJumping = false;
          break;
        }
      }
    }
    
    // Check for environmental hazards
    this.checkEnvironment();
  }
  
  /**
   * Check for environmental hazards and boundaries
   */
  checkEnvironment() {
    const arena = this.scene.userData.arena;
    if (!arena) return;
    
    // Check hazard zones
    const hazard = arena.isInHazardZone(this.mesh.position);
    if (hazard) {
      this.takeDamage(hazard.damage * 0.1); // Scale damage for gameplay balance
      arena.createHazardDamageEffect(this.mesh.position.clone());
    }
    
    // Check boundary
    if (arena.isOutsideBoundary(this.mesh.position)) {
      this.takeDamage(5);
      arena.createBoundaryBreachEffect(this.mesh.position.clone());
    }
  }
  
  /**
   * Dispose of player resources
   */
  dispose() {
    // Remove from scene
    if (this.mesh) {
      this.scene.remove(this.mesh);
      
      // Dispose of geometries and materials
      this.mesh.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }
    
    // Remove from physics world
    if (this.body) {
      this.physics.world.removeBody(this.body);
    }
  }
} 