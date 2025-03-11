import { Enemy } from '../base/Enemy.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Soldier enemy type
 * Balanced enemy with moderate health and damage
 */
export class Soldier extends Enemy {
  /**
   * Create a new soldier enemy
   * @param {THREE.Scene} scene - The scene to add the enemy to
   * @param {Object} physics - The physics world
   * @param {Object} options - Enemy options
   */
  constructor(scene, physics, options = {}) {
    // Set soldier-specific default options
    const soldierOptions = Object.assign({
      type: 'soldier',
      health: 50,
      maxHealth: 50,
      damage: 15,
      moveSpeed: 3.5,
      turnSpeed: 2.0,
      scale: 1.0,
      color: 0xff5500, // Orange color
      points: 100,
      attackRange: 12,
      attackRate: 1.0, // Attacks per second
      detectionRange: 20,
      model: null,
      // Soldier-specific properties
      coverThreshold: 0.3, // Health percentage to seek cover
      burstCount: 3,      // Number of shots in burst
      burstInterval: 0.2, // Time between shots in burst
    }, options);
    
    // Call parent constructor
    super(scene, physics, soldierOptions);
    
    // Soldier-specific properties
    this.burstCounter = 0;
    this.burstTimer = 0;
    this.isFiringBurst = false;
    this.coverPosition = null;
    this.isBehindCover = false;
    
    // Add cover state to state machine
    this.stateMachine.states.cover = {
      enter: this.enterCoverState.bind(this),
      update: this.updateCoverState.bind(this),
      exit: this.exitCoverState.bind(this)
    };
    
    // Override default mesh with soldier-specific mesh
    this.createSoldierMesh();
  }
  
  /**
   * Create a soldier-specific mesh
   */
  createSoldierMesh() {
    // Remove default mesh
    if (this.mesh) {
      this.scene.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
    }
    
    // Create soldier group
    this.mesh = new THREE.Group();
    
    // Create body geometry
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.options.color,
      roughness: 0.7,
      metalness: 0.3,
      emissive: new THREE.Color(this.options.color).multiplyScalar(0.2)
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.6;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.mesh.add(bodyMesh);
    
    // Create head geometry
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: this.options.color,
      roughness: 0.7,
      metalness: 0.3,
      emissive: new THREE.Color(this.options.color).multiplyScalar(0.2)
    });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.y = 1.4;
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    this.mesh.add(headMesh);
    
    // Create weapon geometry
    const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.6);
    const weaponMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.8
    });
    this.weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);
    this.weaponMesh.position.set(0.4, 0.9, 0.4);
    this.mesh.add(this.weaponMesh);
    
    // Scale the entire mesh
    this.mesh.scale.multiplyScalar(this.options.scale);
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Store reference to enemy in userData
    this.mesh.userData.isEnemy = true;
    this.mesh.userData.enemyInstance = this;
    
    // Create health bar
    this.createHealthBar();
  }
  
  /**
   * Update the soldier
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.isActive || !this.isAlive) return;
    
    // Update burst firing
    if (this.isFiringBurst) {
      this.burstTimer -= deltaTime;
      
      if (this.burstTimer <= 0) {
        // Fire next shot in burst
        this.fireShot();
        
        this.burstCounter++;
        this.burstTimer = this.options.burstInterval;
        
        // End burst if all shots fired
        if (this.burstCounter >= this.options.burstCount) {
          this.isFiringBurst = false;
        }
      }
    }
    
    // Check if should seek cover
    if (this.health / this.maxHealth < this.options.coverThreshold && !this.isBehindCover) {
      this.findCover();
    }
    
    // Call parent update
    super.update(deltaTime);
  }
  
  /**
   * Find cover position
   */
  findCover() {
    // Check if arena has a cover system
    const arena = this.scene.userData.arena;
    if (arena && arena.coverSystem && this.target) {
      // Use cover system to find cover position
      const coverPosition = arena.coverSystem.findCoverPosition(
        this.position,
        this.target.position,
        15 // Max distance to search
      );
      
      if (coverPosition) {
        this.coverPosition = coverPosition;
        this.changeState('cover');
        return;
      }
    }
    
    // Fallback: just move to a random position away from the player
    if (this.target) {
      const directionFromTarget = new THREE.Vector3()
        .subVectors(this.position, this.target.position)
        .normalize();
      
      this.coverPosition = new THREE.Vector3()
        .copy(this.position)
        .add(directionFromTarget.multiplyScalar(5));
      
      // Change state to move to cover
      this.changeState('cover');
    }
  }
  
  /**
   * Override attack method to implement soldier-specific attack
   * @param {number} currentTime - Current time
   * @returns {boolean} True if attack was performed
   */
  attackTarget(currentTime) {
    if (!this.target || !this.isActive || !this.isAlive) return false;
    
    // Check if can attack
    const timeSinceLastAttack = currentTime - this.lastAttackTime;
    if (timeSinceLastAttack < 1 / this.options.attackRate) return false;
    
    // Check if target is in range
    const distanceToTarget = this.position.distanceTo(this.target.position);
    if (distanceToTarget > this.options.attackRange) return false;
    
    // Start burst fire
    this.lastAttackTime = currentTime;
    this.isFiringBurst = true;
    this.burstCounter = 0;
    this.burstTimer = 0; // Fire first shot immediately
    
    return true;
  }
  
  /**
   * Fire a single shot
   */
  fireShot() {
    if (!this.target) return;
    
    // Calculate direction to target with slight inaccuracy
    const inaccuracy = 0.05;
    const direction = new THREE.Vector3()
      .subVectors(this.target.position, this.position)
      .normalize()
      .add(new THREE.Vector3(
        (Math.random() - 0.5) * inaccuracy,
        (Math.random() - 0.5) * inaccuracy,
        (Math.random() - 0.5) * inaccuracy
      ))
      .normalize();
    
    // Create projectile geometry
    const projectileGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    
    // Create projectile material
    const projectileMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    // Create projectile mesh
    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Set initial position at weapon muzzle
    const muzzlePosition = new THREE.Vector3();
    this.weaponMesh.getWorldPosition(muzzlePosition);
    projectileMesh.position.copy(muzzlePosition);
    
    // Add to scene
    this.scene.add(projectileMesh);
    
    // Create muzzle flash
    this.createMuzzleFlash(muzzlePosition);
    
    // Animate projectile
    const speed = 20;
    const maxDistance = 30;
    const startPosition = muzzlePosition.clone();
    
    const animate = () => {
      // Move projectile
      projectileMesh.position.add(direction.clone().multiplyScalar(speed * 0.016)); // Assuming 60fps
      
      // Check if hit something
      // TODO: Implement proper collision detection
      
      // Check if traveled too far
      const distanceTraveled = projectileMesh.position.distanceTo(startPosition);
      if (distanceTraveled > maxDistance) {
        // Remove projectile
        this.scene.remove(projectileMesh);
        projectileGeometry.dispose();
        projectileMaterial.dispose();
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  /**
   * Create muzzle flash effect
   * @param {THREE.Vector3} position - Position of muzzle flash
   */
  createMuzzleFlash(position) {
    // Create flash geometry
    const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    
    // Create flash material
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });
    
    // Create flash mesh
    const flashMesh = new THREE.Mesh(flashGeometry, flashMaterial);
    flashMesh.position.copy(position);
    flashMesh.scale.set(1, 1, 1);
    
    // Add to scene
    this.scene.add(flashMesh);
    
    // Add point light
    const flashLight = new THREE.PointLight(0xffff00, 1, 3);
    flashLight.position.copy(position);
    this.scene.add(flashLight);
    
    // Animate flash
    let scale = 1;
    const animate = () => {
      scale *= 0.8;
      flashMesh.scale.set(scale, scale, scale);
      flashLight.intensity = scale;
      
      if (scale < 0.1) {
        // Remove flash
        this.scene.remove(flashMesh);
        this.scene.remove(flashLight);
        flashGeometry.dispose();
        flashMaterial.dispose();
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  // Add a new state for taking cover
  enterCoverState() {
    if (!this.coverPosition) {
      this.changeState('idle');
      return;
    }
    
    // Set target position to cover
    this.targetPosition.copy(this.coverPosition);
  }
  
  updateCoverState(deltaTime) {
    if (!this.coverPosition) {
      this.changeState('idle');
      return;
    }
    
    // Move towards cover
    const reachedCover = this.moveTowards(this.coverPosition, deltaTime);
    
    // If reached cover, switch to attack if target in range
    if (reachedCover) {
      this.isBehindCover = true;
      
      // Check if we're actually behind cover relative to the target
      const arena = this.scene.userData.arena;
      if (arena && arena.coverSystem && this.target) {
        this.isBehindCover = arena.coverSystem.isPositionBehindCover(
          this.position,
          this.target.position
        );
      }
      
      if (this.target) {
        const distanceToTarget = this.position.distanceTo(this.target.position);
        if (distanceToTarget <= this.options.attackRange) {
          this.changeState('attack');
        } else {
          this.changeState('idle');
        }
      } else {
        this.changeState('idle');
      }
    }
  }
  
  exitCoverState() {
    // Nothing to do
  }
} 