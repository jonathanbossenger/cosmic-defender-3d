import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { KeyboardInput } from '../../controls/keyboard.js';
import { MouseInput } from '../../controls/mouse.js';
import { TouchInput } from '../../controls/touch.js';
import { MathUtils } from '../../utils/math.js';
import { Shield } from './Shield.js';
import { Weapon } from './Weapon.js';

export class Player {
  constructor(scene, camera, physics, loadingManager) {
    this.scene = scene;
    this.camera = camera;
    this.physics = physics;
    this.loadingManager = loadingManager;
    
    // Player state
    this.health = 100;
    this.maxHealth = 100;
    this.shield = 100;
    this.maxShield = 100;
    this.energy = 200;
    this.maxEnergy = 200;
    this.dodgeCharges = 3;
    this.maxDodgeCharges = 3;
    
    // Movement parameters
    this.moveSpeed = 6.0; // meters per second
    this.sprintMultiplier = 1.5;
    this.jumpForce = 10.0;
    this.dodgeForce = 15.0;
    this.dodgeCooldown = 2.0; // seconds
    this.dodgeTimer = 0;
    this.isGrounded = false;
    this.isSprinting = false;
    this.isDodging = false;
    this.moveDirection = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    
    // Player dimensions
    this.height = 1.8; // meters
    this.radius = 0.4; // meters
    
    // Input handlers
    this.keyboard = new KeyboardInput();
    this.mouse = new MouseInput(camera, document.body);
    this.touch = new TouchInput(camera, document.body);
    
    // Equipment
    this.createPlayerModel();
    this.createPhysicsBody();
    this.shield = new Shield(scene, this);
    this.weapon = new Weapon(scene, camera, physics, this);
    
    // Timers and cooldowns
    this.lastDodgeTime = 0;
    this.shieldRegenDelay = 3.0; // seconds
    this.lastDamageTime = 0;
    this.energyRegenRate = 10; // per second
    this.dodgeRegenRate = 0.5; // per second
    
    // Audio
    this.footstepTimer = 0;
    this.footstepInterval = 0.4; // seconds
    
    // Event listeners
    this.setupEventListeners();
  }
  
  createPlayerModel() {
    // Create a simple player model (will be replaced with a proper model later)
    const geometry = new THREE.CapsuleGeometry(this.radius, this.height - this.radius * 2, 4, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3366ff,
      roughness: 0.7,
      metalness: 0.3,
    });
    
    this.model = new THREE.Mesh(geometry, material);
    this.model.castShadow = true;
    this.model.position.y = this.height / 2;
    this.model.visible = false; // Hide in first person
    
    // Create a group to hold the player and camera
    this.playerGroup = new THREE.Group();
    this.playerGroup.add(this.model);
    
    // Add to scene
    this.scene.add(this.playerGroup);
  }
  
  createPhysicsBody() {
    // Create a physics body for the player
    const shape = new CANNON.Cylinder(this.radius, this.radius, this.height, 8);
    
    this.body = new CANNON.Body({
      mass: 80, // kg
      shape: shape,
      position: new CANNON.Vec3(0, this.height / 2, 0),
      material: this.physics.defaultMaterial,
      linearDamping: 0.1,
      fixedRotation: true, // Don't rotate the player
    });
    
    // Add player body to physics world
    this.physics.addBody(this.body);
    
    // Set up collision detection for ground check
    this.body.addEventListener('collide', (event) => {
      const contact = event.contact;
      
      // If contact normal is pointing up, player is on ground
      if (contact.ni.y > 0.5) {
        this.isGrounded = true;
      }
    });
  }
  
  setupEventListeners() {
    // Add any additional event listeners here
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Reset input when tab is not active
        this.keyboard.resetKeys();
      }
    });
  }
  
  takeDamage(amount, damageType = 'normal') {
    // Record damage time for shield regen delay
    this.lastDamageTime = performance.now() / 1000;
    
    // Apply damage to shield first if available
    if (this.shield > 0) {
      // Different damage types affect shield differently
      let shieldDamage = amount;
      
      switch (damageType) {
        case 'energy':
          shieldDamage *= 1.2; // Energy weapons do more damage to shields
          break;
        case 'explosive':
          shieldDamage *= 1.5; // Explosives do even more damage to shields
          break;
        case 'plasma':
          shieldDamage *= 0.8; // Plasma does less damage to shields
          break;
      }
      
      this.shield -= shieldDamage;
      
      // If shield is depleted, apply remaining damage to health
      if (this.shield < 0) {
        this.health += this.shield; // Shield is negative, so this subtracts
        this.shield = 0;
      }
    } else {
      // No shield, apply damage directly to health
      this.health -= amount;
    }
    
    // Check if player is dead
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
    
    // Trigger damage effects
    this.onDamage(amount, damageType);
  }
  
  onDamage(amount, damageType) {
    // Visual feedback
    // This would be connected to UI and effects systems
    console.log(`Player took ${amount} damage of type ${damageType}`);
    
    // Screen shake based on damage amount
    const shakeIntensity = Math.min(amount / 20, 1.0);
    // this.camera.shake(shakeIntensity); // Would be implemented in a camera controller
    
    // Play damage sound
    // this.playSound('damage'); // Would be implemented with audio system
  }
  
  heal(amount) {
    this.health = Math.min(this.health + amount, this.maxHealth);
  }
  
  rechargeShield(amount) {
    this.shield = Math.min(this.shield + amount, this.maxShield);
  }
  
  useEnergy(amount) {
    if (this.energy >= amount) {
      this.energy -= amount;
      return true;
    }
    return false;
  }
  
  die() {
    console.log('Player died');
    // Implement death logic, respawn, game over, etc.
  }
  
  jump() {
    if (this.isGrounded) {
      this.body.velocity.y = this.jumpForce;
      this.isGrounded = false;
      // this.playSound('jump'); // Would be implemented with audio system
    }
  }
  
  dodge(direction) {
    if (this.dodgeCharges <= 0 || this.isDodging) return;
    
    const now = performance.now() / 1000;
    if (now - this.lastDodgeTime < this.dodgeCooldown) return;
    
    // Use a dodge charge
    this.dodgeCharges--;
    this.lastDodgeTime = now;
    this.isDodging = true;
    
    // Apply dodge force in the specified direction
    const dodgeVelocity = direction.clone().normalize().multiplyScalar(this.dodgeForce);
    this.body.velocity.x = dodgeVelocity.x;
    this.body.velocity.z = dodgeVelocity.z;
    
    // Reset dodge state after a short time
    setTimeout(() => {
      this.isDodging = false;
    }, 300);
    
    // this.playSound('dodge'); // Would be implemented with audio system
  }
  
  updateMovement(deltaTime) {
    // Reset movement direction
    this.moveDirection.set(0, 0, 0);
    
    // Get input from keyboard or touch controls
    if (this.keyboard.isPressed('forward')) this.moveDirection.z -= 1;
    if (this.keyboard.isPressed('backward')) this.moveDirection.z += 1;
    if (this.keyboard.isPressed('left')) this.moveDirection.x -= 1;
    if (this.keyboard.isPressed('right')) this.moveDirection.x += 1;
    
    // Add touch input if available
    if (this.touch.isTouchEnabled()) {
      const touchMovement = this.touch.getMovement();
      this.moveDirection.x += touchMovement.x;
      this.moveDirection.z -= touchMovement.y; // Inverted Y for forward/backward
    }
    
    // Normalize movement direction if moving diagonally
    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
      
      // Play footstep sounds
      this.footstepTimer += deltaTime;
      if (this.footstepTimer >= this.footstepInterval) {
        this.footstepTimer = 0;
        // this.playSound('footstep'); // Would be implemented with audio system
      }
    }
    
    // Check for sprint
    this.isSprinting = this.keyboard.isPressed('sprint') && this.energy > 0;
    
    // Apply sprint multiplier if sprinting
    const currentSpeed = this.isSprinting 
      ? this.moveSpeed * this.sprintMultiplier 
      : this.moveSpeed;
    
    // Use energy while sprinting
    if (this.isSprinting && this.moveDirection.lengthSq() > 0) {
      this.useEnergy(deltaTime * 20); // 20 energy per second
    }
    
    // Apply movement to velocity
    // First get the camera's rotation
    const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
    cameraDirection.y = 0; // Keep movement on the horizontal plane
    cameraDirection.normalize();
    
    // Calculate forward and right vectors
    const forward = cameraDirection;
    const right = new THREE.Vector3();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
    
    // Calculate movement vector
    const movement = new THREE.Vector3();
    movement.addScaledVector(forward, this.moveDirection.z * currentSpeed);
    movement.addScaledVector(right, this.moveDirection.x * currentSpeed);
    
    // Apply movement to physics body
    this.body.velocity.x = movement.x;
    this.body.velocity.z = movement.z;
    
    // Handle jumping
    if (this.keyboard.isPressed('jump') || this.touch.isActionPressed('jump')) {
      this.jump();
    }
    
    // Handle dodging
    if (this.keyboard.isPressed('dodge') && this.moveDirection.lengthSq() > 0) {
      this.dodge(this.moveDirection);
    }
    
    // Update player position from physics
    this.playerGroup.position.copy(this.body.position);
    this.playerGroup.position.y -= this.height / 2; // Adjust for capsule center
    
    // Reset ground check for next frame
    this.isGrounded = false;
  }
  
  updateRegeneration(deltaTime) {
    const now = performance.now() / 1000;
    
    // Shield regeneration after delay
    if (now - this.lastDamageTime > this.shieldRegenDelay && this.shield < this.maxShield) {
      this.shield = Math.min(this.shield + deltaTime * 5, this.maxShield); // 5 shield per second
    }
    
    // Energy regeneration
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.energy + deltaTime * this.energyRegenRate, this.maxEnergy);
    }
    
    // Dodge charges regeneration
    if (this.dodgeCharges < this.maxDodgeCharges) {
      this.dodgeTimer += deltaTime;
      if (this.dodgeTimer >= 1 / this.dodgeRegenRate) {
        this.dodgeTimer = 0;
        this.dodgeCharges++;
      }
    }
  }
  
  update(deltaTime) {
    // Update mouse and touch controls
    this.mouse.update();
    this.touch.update();
    
    // Update movement
    this.updateMovement(deltaTime);
    
    // Update regeneration
    this.updateRegeneration(deltaTime);
    
    // Update weapon
    this.weapon.update(deltaTime);
    
    // Update shield
    this.shield.update(deltaTime);
  }
  
  getPosition() {
    return this.playerGroup.position.clone();
  }
  
  getDirection() {
    return this.camera.getWorldDirection(new THREE.Vector3());
  }
  
  getHealth() {
    return {
      current: this.health,
      max: this.maxHealth,
      percentage: this.health / this.maxHealth
    };
  }
  
  getShield() {
    return {
      current: this.shield,
      max: this.maxShield,
      percentage: this.shield / this.maxShield
    };
  }
  
  getEnergy() {
    return {
      current: this.energy,
      max: this.maxEnergy,
      percentage: this.energy / this.maxEnergy
    };
  }
  
  getDodgeCharges() {
    return {
      current: this.dodgeCharges,
      max: this.maxDodgeCharges,
      percentage: this.dodgeCharges / this.maxDodgeCharges
    };
  }
} 
